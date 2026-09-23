---
title: "异步编程：async、await、Future 与 Stream"
order: "ch17-00-async-await"
chapter: 17
---
并行（parallelism）：多个操作真正同时执行。并发（concurrency）：单个执行单元在多个任务间切换，一个停下时另一个推进。两者可叠加。

CPU 密集型操作受限于计算速度，I/O 密集型受限于网络、磁盘等外部速度。操作系统会以整个程序为粒度打断任务制造并发；我们比操作系统更了解代码，能在更细粒度上找到并发机会。

给每个 I/O 任务开一个线程可以避免阻塞主线程，但线程的开销会累积。async 抽象让你以「可能暂停的点」和「最终结果」描述代码，由运行时决定执行顺序，而不是阻塞线程。

本章内容：

- `async` / `await` 语法，用运行时执行异步函数
- 用 async 解决第 16 章的部分并发问题
- 多线程与 async 互补，可以组合

async 代码通常以并发方式运行；是否用上并行取决于硬件、操作系统和运行时。

**对照**：Go 的 goroutine 由运行时抢占调度，写法是同步的；Python `async def`、Java `CompletableFuture`、C++ 协程都要靠运行时或框架驱动。Rust 的 `async` 只是编译成状态机（Future），自身不执行，必须被 `.await` 或 executor 轮询才推进。
