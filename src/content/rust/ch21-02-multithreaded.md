---
title: "从单线程到多线程"
order: "ch21-02-multithreaded"
chapter: 21
---
单线程按连接串行处理。慢请求会堵住后面的连接。

### 模拟慢请求

**清单 21-10** `GET /sleep HTTP/1.1` 先睡五秒再返回页面。

文件：src/main.rs

```rust
use std::{
    fs,
    io::{BufReader, prelude::*},
    net::{TcpListener, TcpStream},
    thread,
    time::Duration,
};
// --snip--

fn handle_connection(mut stream: TcpStream) {
    // --snip--

    let (status_line, filename) = match &request_line[..] {
        "GET / HTTP/1.1" => ("HTTP/1.1 200 OK", "hello.html"),
        "GET /sleep HTTP/1.1" => {
            thread::sleep(Duration::from_secs(5));
            ("HTTP/1.1 200 OK", "hello.html")
        }
        _ => ("HTTP/1.1 404 NOT FOUND", "404.html"),
    };

    // --snip--
}
```

三个分支用 `match`。匹配字符串字面量时，模式作用在 `request_line[..]` 上。

`/sleep` 会挡住后续请求。这里用固定大小的线程池，让其它连接在别的线程上处理。

### 用线程池提高吞吐

线程池是一组已经创建、等待任务的线程。来任务就交给其中一条；做完回到空闲集合。同时处理的上限是池大小 `N`。每个请求都 `spawn` 会把线程数放到无界，请求一多就耗尽资源。超过 `N` 的请求在队列里等。

先写成调用方要的 API，再用编译错误把类型补齐。

#### 每个请求一个线程

**清单 21-11** 在循环里 `thread::spawn` 处理每条流。

文件：src/main.rs

```rust
fn main() {
    let listener = TcpListener::bind("127.0.0.1:7878").unwrap();

    for stream in listener.incoming() {
        let stream = stream.unwrap();

        thread::spawn(|| {
            handle_connection(stream);
        });
    }
}
```

`thread::spawn` 在新线程跑闭包，`/sleep` 不再堵住 `/`。线程数没有上限。

#### 固定数量的线程

**清单 21-12** `ThreadPool::new(4)` 与 `pool.execute`，形状接近 `thread::spawn`。

文件：src/main.rs

```rust
fn main() {
    let listener = TcpListener::bind("127.0.0.1:7878").unwrap();
    let pool = ThreadPool::new(4);

    for stream in listener.incoming() {
        let stream = stream.unwrap();

        pool.execute(|| {
            handle_connection(stream);
        });
    }
}
```

`execute` 接收闭包，交给池里某条线程执行。

#### 用编译错误实现 `ThreadPool`

```console
$ cargo check
    Checking hello v0.1.0 (file:///projects/hello)
error[E0433]: cannot find type `ThreadPool` in this scope
  --> src/main.rs:11:16
   |
11 |     let pool = ThreadPool::new(4);
   |                ^^^^^^^^^^ use of undeclared type `ThreadPool`

For more information about this error, try `rustc --explain E0433`.
error: could not compile `hello` (bin "hello") due to 1 previous error
```

`ThreadPool` 与具体任务无关，放在库 crate 里。

文件：src/lib.rs

```rust
pub struct ThreadPool;
```

二进制通过 crate 名使用它。

文件：src/main.rs

```rust
use hello::ThreadPool;
```

```console
$ cargo check
    Checking hello v0.1.0 (file:///projects/hello)
error[E0599]: no associated function or constant named `new` found for struct `ThreadPool` in the current scope
  --> src/main.rs:12:28
   |
12 |     let pool = ThreadPool::new(4);
   |                            ^^^ associated function or constant not found in `ThreadPool`

For more information about this error, try `rustc --explain E0599`.
error: could not compile `hello` (bin "hello") due to 1 previous error
```

下一步要有关联函数 `new`：接受 `4` 这种参数，返回 `ThreadPool`。

```rust
pub struct ThreadPool;

impl ThreadPool {
    pub fn new(size: usize) -> ThreadPool {
        ThreadPool
    }
}
```

`size` 用 `usize`：线程数不能为负，并且要当集合长度。

```console
$ cargo check
    Checking hello v0.1.0 (file:///projects/hello)
error[E0599]: no method named `execute` found for struct `ThreadPool` in the current scope
  --> src/main.rs:17:14
   |
17 |         pool.execute(|| {
   |         -----^^^^^^^ method not found in `ThreadPool`

For more information about this error, try `rustc --explain E0599`.
error: could not compile `hello` (bin "hello") due to 1 previous error
```

还缺 `execute`。闭包参数是 `Fn`、`FnMut` 或 `FnOnce` 之一。约束对齐 `thread::spawn`。

```rust
pub fn spawn<F, T>(f: F) -> JoinHandle<T>
    where
        F: FnOnce() -> T,
        F: Send + 'static,
        T: Send + 'static,
```

任务闭包只跑一次，用 `FnOnce()`。再加 `Send`（移到另一条线程）和 `'static`（线程可以比调用者活得更久，闭包不能借短生命周期的数据）。

**对照** Java、Go、Python 把连接对象的引用交给线程即可，靠 GC 保住对象。这里必须把 `TcpStream` move 进闭包，闭包本身要 `Send + 'static`。

文件：src/lib.rs

```rust
impl ThreadPool {
    // --snip--
    pub fn execute<F>(&self, f: F)
    where
        F: FnOnce() + Send + 'static,
    {
    }
}
```

`FnOnce()` 表示无参数、返回 `()`。没有参数也要写括号。

```console
$ cargo check
    Checking hello v0.1.0 (file:///projects/hello)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.24s
```

空的 `execute` 能编译，但不会调用传入的闭包。编译通过只说明类型对了。

#### 校验线程数

`0` 是合法的 `usize`，空池没有意义。`size == 0` 用 `assert!` panic，当作不可恢复错误。

**清单 21-13** `new` 在 `size` 为 0 时 panic。

文件：src/lib.rs

```rust
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

        ThreadPool
    }

    // --snip--
}
```

文档注释的 Panics 节写明 `size == 0` 会 panic。可恢复的失败才返回 `Result`。

```rust
pub fn build(size: usize) -> Result<ThreadPool, PoolCreationError> {
```

#### 存放线程

池里要存 `spawn` 的返回值。

```rust
pub fn spawn<F, T>(f: F) -> JoinHandle<T>
    where
        F: FnOnce() -> T,
        F: Send + 'static,
        T: Send + 'static,
```

`thread::spawn` 返回 `JoinHandle<T>`，`T` 是闭包的返回值。处理连接的闭包返回 `()`。

**清单 21-14** `ThreadPool` 持有 `Vec<thread::JoinHandle<()>>`。`Vec::with_capacity(size)` 预先分配，避免插入时扩容。循环还没创建线程。

文件：src/lib.rs

```rust
use std::thread;

pub struct ThreadPool {
    threads: Vec<thread::JoinHandle<()>>,
}

impl ThreadPool {
    // --snip--
    pub fn new(size: usize) -> ThreadPool {
        assert!(size > 0);

        let mut threads = Vec::with_capacity(size);

        for _ in 0..size {
            // create some threads and store them in the vector
        }

        ThreadPool { threads }
    }
    // --snip--
}
```

#### 把代码送到线程

`thread::spawn` 在创建线程时就要给出要跑的闭包。标准库没有“先把线程拉起来，以后再送任务”的接口。

在池和线程之间加私有的 `Worker`：每个持有 `id` 和一条 `JoinHandle<()>`。

1. `Worker` 持有 `id` 和 `JoinHandle<()>`。
2. `ThreadPool` 改为 `Vec<Worker>`。
3. `Worker::new` 用空闭包把线程先拉起来。
4. `ThreadPool::new` 用循环下标当 `id`。

**清单 21-15** 池存 `Worker`，不直接存 `JoinHandle`。

文件：src/lib.rs

```rust
use std::thread;

pub struct ThreadPool {
    workers: Vec<Worker>,
}

impl ThreadPool {
    // --snip--
    pub fn new(size: usize) -> ThreadPool {
        assert!(size > 0);

        let mut workers = Vec::with_capacity(size);

        for id in 0..size {
            workers.push(Worker::new(id));
        }

        ThreadPool { workers }
    }
    // --snip--
}

struct Worker {
    id: usize,
    thread: thread::JoinHandle<()>,
}

impl Worker {
    fn new(id: usize) -> Worker {
        let thread = thread::spawn(|| {});

        Worker { id, thread }
    }
}
```

`Worker` 保持私有。空闭包让线程立刻存在，但无事可做。`execute` 拿到的闭包还没送进去。

资源不足时 `thread::spawn` panic，整个服务器一起停。生产代码用 `std::thread::Builder::spawn`，它返回 `Result`。

#### 用 channel 把请求送给线程

`std::sync::mpsc` 当任务队列：

1. `ThreadPool` 创建 channel，保留 `Sender`。
2. 每个 `Worker` 持有接收端。
3. `Job` 表示送进 channel 的闭包。
4. `execute` 经 `Sender` 发送。
5. `Worker` 线程循环 `recv` 并执行。

**清单 21-16** 池保存 `mpsc::Sender<Job>`。

文件：src/lib.rs

```rust
use std::{sync::mpsc, thread};

pub struct ThreadPool {
    workers: Vec<Worker>,
    sender: mpsc::Sender<Job>,
}

struct Job;

impl ThreadPool {
    // --snip--
    pub fn new(size: usize) -> ThreadPool {
        assert!(size > 0);

        let (sender, receiver) = mpsc::channel();

        let mut workers = Vec::with_capacity(size);

        for id in 0..size {
            workers.push(Worker::new(id));
        }

        ThreadPool { workers, sender }
    }
    // --snip--
}
```

channel 在 `ThreadPool::new` 里创建，池留下发送端。

**清单 21-17** 把接收端传给每个 `Worker`。这一版编不过。

文件：src/lib.rs

```rust
impl ThreadPool {
    // --snip--
    pub fn new(size: usize) -> ThreadPool {
        assert!(size > 0);

        let (sender, receiver) = mpsc::channel();

        let mut workers = Vec::with_capacity(size);

        for id in 0..size {
            workers.push(Worker::new(id, receiver));
        }

        ThreadPool { workers, sender }
    }
    // --snip--
}

// --snip--

impl Worker {
    fn new(id: usize, receiver: mpsc::Receiver<Job>) -> Worker {
        let thread = thread::spawn(|| {
            receiver;
        });

        Worker { id, thread }
    }
}
```

`Receiver<Job>` 不是 `Copy`。循环里不能把同一个接收端移给多个 `Worker`。

```console
$ cargo check
    Checking hello v0.1.0 (file:///projects/hello)
error[E0382]: use of moved value: `receiver`
  --> src/lib.rs:26:42
   |
21 |         let (sender, receiver) = mpsc::channel();
   |                      -------- move occurs because `receiver` has type `std::sync::mpsc::Receiver<Job>`, which does not implement the `Copy` trait
...
25 |         for id in 0..size {
   |         ----------------- inside of this loop
26 |             workers.push(Worker::new(id, receiver));
   |                                          ^^^^^^^^ value moved here, in previous iteration of loop
   |
note: consider changing this parameter type in method `new` to borrow instead if owning the value isn't necessary
  --> src/lib.rs:47:33
   |
47 |     fn new(id: usize, receiver: mpsc::Receiver<Job>) -> Worker {
   |        --- in this method       ^^^^^^^^^^^^^^^^^^^ this parameter takes ownership of the value

For more information about this error, try `rustc --explain E0382`.
error: could not compile `hello` (lib) due to 1 previous error
```

标准库这条 channel 是多生产者、单消费者。接收端不能克隆，每条消息也只应被一个 `Worker` 取走。`recv` 会改接收端，多线程共享要用互斥，否则数据竞争。

`Arc<Mutex<mpsc::Receiver<Job>>>`：`Arc` 让多个 `Worker` 共享所有权，`Mutex` 保证同一时刻只有一个 `Worker` 取任务。

**对照** Go 的 channel 可以有多个接收者。Rust 的 `mpsc` 只有一个消费者，多个 `Worker` 共享它要再套 `Arc<Mutex<_>>`。

**清单 21-18** 用 `Arc::clone` 把接收端分给每个 `Worker`。

文件：src/lib.rs

```rust
use std::{
    sync::{Arc, Mutex, mpsc},
    thread,
};
// --snip--

impl ThreadPool {
    // --snip--
    pub fn new(size: usize) -> ThreadPool {
        assert!(size > 0);

        let (sender, receiver) = mpsc::channel();

        let receiver = Arc::new(Mutex::new(receiver));

        let mut workers = Vec::with_capacity(size);

        for id in 0..size {
            workers.push(Worker::new(id, Arc::clone(&receiver)));
        }

        ThreadPool { workers, sender }
    }

    // --snip--
}

// --snip--

impl Worker {
    fn new(id: usize, receiver: Arc<Mutex<mpsc::Receiver<Job>>>) -> Worker {
        // --snip--
    }
}
```

`Arc::clone` 只增加引用计数。到这里能编译，任务还没发出去。

#### 实现 `execute`

`Job` 改成 trait object 的类型别名。

**清单 21-19** `Job = Box<dyn FnOnce() + Send + 'static>`，`execute` 装箱后 `send`。

文件：src/lib.rs

```rust
// --snip--

type Job = Box<dyn FnOnce() + Send + 'static>;

impl ThreadPool {
    // --snip--

    pub fn execute<F>(&self, f: F)
    where
        F: FnOnce() + Send + 'static,
    {
        let job = Box::new(f);

        self.sender.send(job).unwrap();
    }
}

// --snip--
```

接收端已经全部关掉时 `send` 返回 `Err`，这里 `unwrap`。当前这些线程不会退出，这条路径暂时走不到。

`Worker` 的闭包要 `move` 接收端，并循环取任务。

**清单 21-20** 线程里 `lock`、`recv`，再调用 `job`。

文件：src/lib.rs

```rust
// --snip--

impl Worker {
    fn new(id: usize, receiver: Arc<Mutex<mpsc::Receiver<Job>>>) -> Worker {
        let thread = thread::spawn(move || {
            loop {
                let job = receiver.lock().unwrap().recv().unwrap();

                println!("Worker {id} got a job; executing.");

                job();
            }
        });

        Worker { id, thread }
    }
}
```

`Mutex::lock` 在锁中毒时返回 `Err`：别的线程持锁期间 panic，锁没有正常释放。这里 `unwrap` 让当前线程也 panic。

`recv` 在没有任务时阻塞。发送端关闭时 `recv` 返回 `Err`。持有 `Mutex` 时只有一个 `Worker` 能取任务；`MutexGuard` 必须在 `job()` 之前丢掉。

池里最多 `size` 条线程。一条线程停在 `/sleep` 上时，其它线程仍可处理别的连接。同一 URL 在多个窗口里串行加载，常是浏览器对相同请求排队。

```console
$ cargo run
   Compiling hello v0.1.0 (file:///projects/hello)
warning: field `workers` is never read
 --> src/lib.rs:7:5
  |
6 | pub struct ThreadPool {
  |            ---------- field in this struct
7 |     workers: Vec<Worker>,
  |     ^^^^^^^
  |
  = note: `#[warn(dead_code)]` on by default

warning: fields `id` and `thread` are never read
  --> src/lib.rs:48:5
   |
47 | struct Worker {
   |        ------ fields in this struct
48 |     id: usize,
   |     ^^
49 |     thread: thread::JoinHandle<()>,
   |     ^^^^^^

warning: `hello` (lib) generated 2 warnings
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 4.91s
     Running `target/debug/hello`
Worker 0 got a job; executing.
Worker 2 got a job; executing.
Worker 1 got a job; executing.
Worker 3 got a job; executing.
Worker 0 got a job; executing.
Worker 2 got a job; executing.
Worker 1 got a job; executing.
Worker 3 got a job; executing.
Worker 0 got a job; executing.
Worker 2 got a job; executing.
```

**清单 21-21** 用 `while let` 写接收循环。能编译，锁会握过整个任务。

文件：src/lib.rs

```rust
// --snip--

impl Worker {
    fn new(id: usize, receiver: Arc<Mutex<mpsc::Receiver<Job>>>) -> Worker {
        let thread = thread::spawn(move || {
            while let Ok(job) = receiver.lock().unwrap().recv() {
                println!("Worker {id} got a job; executing.");

                job();
            }
        });

        Worker { id, thread }
    }
}
```

`Mutex` 没有公开的 `unlock`。锁绑在 `lock` 返回的 `MutexGuard<T>` 上，守卫 drop 时解锁。

`let job = receiver.lock().unwrap().recv().unwrap();` 里，`let` 语句结束就丢掉右侧临时值，守卫立刻 drop，然后才执行 `job()`。

`while let`、`if let`、`match` 把临时值留到整个关联块结束。清单 21-21 在 `job()` 期间一直持锁，其它 `Worker` 无法 `recv`。

**对照** C++ 的 `lock_guard` 也在析构时解锁，作用域就是你写下的那个块。这里 `while let` 的临时值生命周期被延长到整个块，守卫比单独一条 `let` 活得更久。
