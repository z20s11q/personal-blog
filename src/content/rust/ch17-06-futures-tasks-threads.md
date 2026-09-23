---
title: "综合：Future、任务与线程"
order: "ch17-06-futures-tasks-threads"
chapter: 17
---
线程与 async 不是二选一，多数情况下是配合使用。

线程模型：每个线程内存开销较大，且要求操作系统和硬件支持（部分嵌入式系统没有线程）。

async 模型：并发操作不需要各自开线程，可以在任务（task）上运行。任务类似线程，但由运行时（库层代码）管理，而不是操作系统。

概念层级：

- 线程是同步操作集合的边界，线程之间可以并发。
- 任务是异步操作集合的边界，任务之间、任务内部都可以并发（任务可以在自己的 future 之间切换）。
- future 是最细粒度的并发单位，一个 future 可能是一棵 future 树。

运行时的 executor 管理任务，任务管理 future。

async 并非总是更好：线程模型更简单（「发射后不管」，没有 future 概念，一直运行到结束）。而且任务可以在线程之间迁移，`spawn_blocking`、`spawn_task` 底层默认就是多线程的。很多运行时用 work stealing 在空闲线程间调度任务。

选择经验：

- CPU 密集型、高度可并行（如批量数据处理）：线程。
- I/O 密集型、高度并发（如处理多来源消息）：async。

两者结合很常见：

**清单 17-25** 线程里用阻塞代码发消息，async 块里接收。

```rust
use std::{thread, time::Duration};

fn main() {
    let (tx, mut rx) = trpl::channel();

    thread::spawn(move || {
        for i in 1..11 {
            tx.send(i).unwrap();
            thread::sleep(Duration::from_secs(1));
        }
    });

    trpl::block_on(async {
        while let Some(message) = rx.recv().await {
            println!("{message}");
        }
    });
}
```

创建 async channel，把发送端 `move` 进新线程，发送 1 到 10 并每次 sleep 一秒；主线程用 `block_on` 等待 async 块接收消息。

典型场景：视频编码用专门线程（CPU 密集），完成后用 async channel 通知 UI。

## 小结

第 21 章会把这些概念用在更真实的项目里。

无论选哪种方式，Rust 都提供了写出安全、快速并发代码的工具。

接下来讲如何用惯用方式为越来越大的程序建模和设计方案，以及 Rust 的做法与面向对象编程的关系。
