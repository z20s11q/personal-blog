---
title: "优雅关闭与清理"
order: "ch21-03-graceful-shutdown-and-cleanup"
chapter: 21
---
`ctrl-C` 会立刻停掉所有线程，包括正在处理请求的。`ThreadPool` 实现 `Drop`：先让各线程做完当前任务再 `join`，并通知它们停止接收新任务。

执行闭包的路径不变。异步运行时里的线程池，关闭规则相同。

### 为 `ThreadPool` 实现 `Drop`

**清单 21-22** 池离开作用域时 `join` 每条线程。这一版编不过。

文件：src/lib.rs

```rust
impl Drop for ThreadPool {
    fn drop(&mut self) {
        for worker in &mut self.workers {
            println!("Shutting down worker {}", worker.id);

            worker.thread.join().unwrap();
        }
    }
}
```

遍历 `&mut self.workers`。对每个 `Worker` 调用 `JoinHandle::join`；`join` 失败则 `unwrap`，进程 panic。

```console
$ cargo check
    Checking hello v0.1.0 (file:///projects/hello)
error[E0507]: cannot move out of `worker.thread` which is behind a mutable reference
  --> src/lib.rs:52:13
   |
52 |             worker.thread.join().unwrap();
   |             ^^^^^^^^^^^^^ ------ `worker.thread` moved due to this method call
   |             |
   |             move occurs because `worker.thread` has type `JoinHandle<()>`, which does not implement the `Copy` trait
   |
note: `JoinHandle::<T>::join` takes ownership of the receiver `self`, which moves `worker.thread`
  --> /rustc/88d9e12ae178fab0fb5cc050a94da85685d449ea/library/std/src/thread/join_handle.rs:149:16

For more information about this error, try `rustc --explain E0507`.
error: could not compile `hello` (lib) due to 1 previous error
```

`join(self)` 要拿走 `JoinHandle` 的所有权。`JoinHandle` 不是 `Copy`，不能从 `&mut Worker` 后面移出（E0507）。

`Vec::drain(..)` 按范围把元素移出向量并交回迭代器，`..` 清空整个 `workers`。得到拥有所有权的 `Worker` 之后才能 `join`。

改成 `Option<JoinHandle<()>>` 再用 `take` 也能移出，但只有 drop 需要移出，其余代码却要一直拆 `Option`。

```rust
impl Drop for ThreadPool {
    fn drop(&mut self) {
        for worker in self.workers.drain(..) {
            println!("Shutting down worker {}", worker.id);

            worker.thread.join().unwrap();
        }
    }
}
```

`drain` 消掉移动错误。`drop` 可能发生在 panic 展开期间；这里再 `unwrap` 会双重 panic，进程立刻中止，清理停在半路。

### 通知线程停止接收任务

只 `join` 不够。`Worker` 在无限循环里 `recv`，任务线程不退出，主线程的 `join` 就一直阻塞。

先 drop 发送端，关掉 channel，再 `join`。要从 `&mut ThreadPool` 里移出 `sender`，字段做成 `Option<mpsc::Sender<Job>>`，用 `Option::take`。

**清单 21-23** `join` 之前 `drop(self.sender.take())`。

文件：src/lib.rs

```rust
pub struct ThreadPool {
    workers: Vec<Worker>,
    sender: Option<mpsc::Sender<Job>>,
}
// --snip--
impl ThreadPool {
    pub fn new(size: usize) -> ThreadPool {
        // --snip--

        ThreadPool {
            workers,
            sender: Some(sender),
        }
    }

    pub fn execute<F>(&self, f: F)
    where
        F: FnOnce() + Send + 'static,
    {
        let job = Box::new(f);

        self.sender.as_ref().unwrap().send(job).unwrap();
    }
}

impl Drop for ThreadPool {
    fn drop(&mut self) {
        drop(self.sender.take());

        for worker in self.workers.drain(..) {
            println!("Shutting down worker {}", worker.id);

            worker.thread.join().unwrap();
        }
    }
}
```

drop 掉全部 `Sender` 会关闭 channel，此后不再有消息。`recv` 返回 `Err`。`Worker` 在 `Err` 时 `break`，线程结束后 `join` 才能返回。

**对照** Go 关闭 channel 后，接收得到零值和 `ok == false`。这里没有单独的关闭操作：最后一个 `Sender` 被 drop，`recv` 就返回 `Err`。

**清单 21-24** `recv` 得到 `Err` 时退出循环。

文件：src/lib.rs

```rust
impl Worker {
    fn new(id: usize, receiver: Arc<Mutex<mpsc::Receiver<Job>>>) -> Worker {
        let thread = thread::spawn(move || {
            loop {
                let message = receiver.lock().unwrap().recv();

                match message {
                    Ok(job) => {
                        println!("Worker {id} got a job; executing.");

                        job();
                    }
                    Err(_) => {
                        println!("Worker {id} disconnected; shutting down.");
                        break;
                    }
                }
            }
        });

        Worker { id, thread }
    }
}
```

**清单 21-25** `Iterator::take(2)` 只接受两个连接，离开 `main` 时 drop 线程池。

文件：src/main.rs

```rust
fn main() {
    let listener = TcpListener::bind("127.0.0.1:7878").unwrap();
    let pool = ThreadPool::new(4);

    for stream in listener.incoming().take(2) {
        let stream = stream.unwrap();

        pool.execute(|| {
            handle_connection(stream);
        });
    }

    println!("Shutting down.");
}
```

`take(2)` 最多产生两项。`pool` 在 `main` 末尾离开作用域，`Drop` 运行。真实服务器不会服务两次就退出，这里只用来观察关闭顺序。

```console
$ cargo run
   Compiling hello v0.1.0 (file:///projects/hello)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.41s
     Running `target/debug/hello`
Worker 0 got a job; executing.
Shutting down.
Shutting down worker 0
Worker 3 got a job; executing.
Worker 1 disconnected; shutting down.
Worker 2 disconnected; shutting down.
Worker 3 disconnected; shutting down.
Worker 0 disconnected; shutting down.
Shutting down worker 1
Shutting down worker 2
Shutting down worker 3
```

先 drop `sender`，各 `Worker` 的 `recv` 得到 `Err` 后退出循环，再按顺序 `join`。

`join` 会等到该线程结束。若先 `join` 一个还在执行任务、尚未从 `recv` 看到错误的 `Worker`，主线程堵住，直到那个任务返回；其它 `Worker` 仍可在此期间收到任务或断开。正在执行的 `job()` 不会被 channel 关闭打断。

文件：src/main.rs

```rust
use hello::ThreadPool;
use std::{
    fs,
    io::{BufReader, prelude::*},
    net::{TcpListener, TcpStream},
    thread,
    time::Duration,
};

fn main() {
    let listener = TcpListener::bind("127.0.0.1:7878").unwrap();
    let pool = ThreadPool::new(4);

    for stream in listener.incoming().take(2) {
        let stream = stream.unwrap();

        pool.execute(|| {
            handle_connection(stream);
        });
    }

    println!("Shutting down.");
}

fn handle_connection(mut stream: TcpStream) {
    let buf_reader = BufReader::new(&stream);
    let request_line = buf_reader.lines().next().unwrap().unwrap();

    let (status_line, filename) = match &request_line[..] {
        "GET / HTTP/1.1" => ("HTTP/1.1 200 OK", "hello.html"),
        "GET /sleep HTTP/1.1" => {
            thread::sleep(Duration::from_secs(5));
            ("HTTP/1.1 200 OK", "hello.html")
        }
        _ => ("HTTP/1.1 404 NOT FOUND", "404.html"),
    };

    let contents = fs::read_to_string(filename).unwrap();
    let length = contents.len();

    let response =
        format!("{status_line}\r\nContent-Length: {length}\r\n\r\n{contents}");

    stream.write_all(response.as_bytes()).unwrap();
}
```

文件：src/lib.rs

```rust
use std::{
    sync::{Arc, Mutex, mpsc},
    thread,
};

pub struct ThreadPool {
    workers: Vec<Worker>,
    sender: Option<mpsc::Sender<Job>>,
}

type Job = Box<dyn FnOnce() + Send + 'static>;

impl ThreadPool {
    /// Create a new ThreadPool.
    ///
    /// The size is the number of threads in the pool.
    ///
    /// # Panics
    ///
    /// The `new` function will panic if the size is zero.
    pub fn new(size: usize) -> ThreadPool {
        assert!(size > 0);

        let (sender, receiver) = mpsc::channel();

        let receiver = Arc::new(Mutex::new(receiver));

        let mut workers = Vec::with_capacity(size);

        for id in 0..size {
            workers.push(Worker::new(id, Arc::clone(&receiver)));
        }

        ThreadPool {
            workers,
            sender: Some(sender),
        }
    }

    pub fn execute<F>(&self, f: F)
    where
        F: FnOnce() + Send + 'static,
    {
        let job = Box::new(f);

        self.sender.as_ref().unwrap().send(job).unwrap();
    }
}

impl Drop for ThreadPool {
    fn drop(&mut self) {
        drop(self.sender.take());

        for worker in &mut self.workers {
            println!("Shutting down worker {}", worker.id);

            if let Some(thread) = worker.thread.take() {
                thread.join().unwrap();
            }
        }
    }
}

struct Worker {
    id: usize,
    thread: Option<thread::JoinHandle<()>>,
}

impl Worker {
    fn new(id: usize, receiver: Arc<Mutex<mpsc::Receiver<Job>>>) -> Worker {
        let thread = thread::spawn(move || {
            loop {
                let message = receiver.lock().unwrap().recv();

                match message {
                    Ok(job) => {
                        println!("Worker {id} got a job; executing.");

                        job();
                    }
                    Err(_) => {
                        println!("Worker {id} disconnected; shutting down.");
                        break;
                    }
                }
            }
        });

        Worker {
            id,
            thread: Some(thread),
        }
    }
}
```

## 小结

固定大小的线程池并发处理连接。关闭时先 drop `Sender`，让 `recv` 返回 `Err` 并退出循环，再 `join` 每条线程。
