---
title: "用消息传递在线程间转移数据"
order: "ch16-02-message-passing"
chapter: 16
---
线程通过 channel 发送数据。channel 有发送端和接收端；任一半被 drop，channel 就关闭。

**清单 16-6** `mpsc::channel()` 得到 `(tx, rx)`。还没发送，编译器不知道消息类型，此时不能编译。

**对照**：对应 Go 的 channel。Go 的说法是不要通过共享内存来通信，而要通过通信来共享内存。

```rust
use std::sync::mpsc;

fn main() {
    let (tx, rx) = mpsc::channel();
}
```

`mpsc` 是 multiple producer, single consumer：可以有多个发送端，只能有一个接收端。返回值的两半习惯叫 `tx`（发送）和 `rx`（接收）。

**清单 16-7** 用 `move` 把 `tx` 移进子线程再 `send`。

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let val = String::from("hi");
        tx.send(val).unwrap();
    });
}
```

子线程必须拥有 `tx` 才能发送，所以闭包用 `move`。

`send` 拿走值的所有权，返回 `Result`。接收端已经 drop 时发送失败。示例用 `unwrap`；正式代码要处理这个 `Err`。

**清单 16-8** 主线程用 `recv` 取出消息。

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let val = String::from("hi");
        tx.send(val).unwrap();
    });

    let received = rx.recv().unwrap();
    println!("Got: {received}");
}
```

`recv` 阻塞，直到收到一条值；发送端全部关闭时返回 `Err`，表示不会再有消息。

`try_recv` 不阻塞：有消息则 `Ok`，当前没有则立刻 `Err`。本线程还有别的事要做时用它轮询。

```text
Got: hi
```

### 经通道转移所有权

`send` 之后再使用该值不允许：另一线程可能已经改掉或 drop 它。

**清单 16-9** 发送后再使用 `val`，不能编译。

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let val = String::from("hi");
        tx.send(val).unwrap();
        println!("val is {val}");
    });

    let received = rx.recv().unwrap();
    println!("Got: {received}");
}
```

`send` 把所有权交给接收端。发送后再借用，就是 use after move，编译期拦住。

```console
$ cargo run
   Compiling message-passing v0.1.0 (file:///projects/message-passing)
error[E0382]: borrow of moved value: `val`
  --> src/main.rs:10:27
   |
 8 |         let val = String::from("hi");
   |             --- move occurs because `val` has type `String`, which does not implement the `Copy` trait
 9 |         tx.send(val).unwrap();
   |                 --- value moved here
10 |         println!("val is {val}");
   |                           ^^^ value borrowed here after move

For more information about this error, try `rustc --explain E0382`.
error: could not compile `message-passing` (bin "message-passing") due to 1 previous error
```

### 发送多个值

发送端可以多次 `send`。接收端实现了 `Iterator`：`for received in rx` 会一直收到通道关闭。

**清单 16-10** 子线程逐条发送，主线程把 `rx` 当迭代器。

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let vals = vec![
            String::from("hi"),
            String::from("from"),
            String::from("the"),
            String::from("thread"),
        ];

        for val in vals {
            tx.send(val).unwrap();
            thread::sleep(Duration::from_secs(1));
        }
    });

    for received in rx {
        println!("Got: {received}");
    }
}
```

主线程的 `for` 循环会堵在下一条消息上。子线程结束、`tx` 被 drop 后通道关闭，迭代结束。

```text
Got: hi
Got: from
Got: the
Got: thread
```

### 多个生产者

克隆发送端，就能多个生产者对一个消费者。

**清单 16-11** `tx.clone()` 分给一个线程，原来的 `tx` 留给另一个线程。

```rust
    // --snip--

    let (tx, rx) = mpsc::channel();

    let tx1 = tx.clone();
    thread::spawn(move || {
        let vals = vec![
            String::from("hi"),
            String::from("from"),
            String::from("the"),
            String::from("thread"),
        ];

        for val in vals {
            tx1.send(val).unwrap();
            thread::sleep(Duration::from_secs(1));
        }
    });

    thread::spawn(move || {
        let vals = vec![
            String::from("more"),
            String::from("messages"),
            String::from("for"),
            String::from("you"),
        ];

        for val in vals {
            tx.send(val).unwrap();
            thread::sleep(Duration::from_secs(1));
        }
    });

    for received in rx {
        println!("Got: {received}");
    }

    // --snip--
```

`clone` 的是发送端，不是消息。两个 `Sender` 共用同一个 `Receiver`。两条线程的消息会交错到达。

```text
Got: hi
Got: more
Got: from
Got: messages
Got: for
Got: the
Got: thread
Got: you
```

多生产者时到达顺序取决于调度，不要依赖某一次运行的先后。
