---
title: "用 async 实现并发"
order: "ch17-02-concurrency-with-async"
chapter: 17
---
本节把第 16 章的并发问题用 async 重做，重点看线程与 future 的差异。API 可能相似，但行为与性能特性不同。

### 用 `spawn_task` 创建任务

第 16 章的第一个例子是两个线程各自计数。async 版本用 `trpl::spawn_task` 和异步版 `sleep`：

**清单 17-6** `spawn_task` 创建新任务。

```rust
use std::time::Duration;

fn main() {
    trpl::block_on(async {
        trpl::spawn_task(async {
            for i in 1..10 {
                println!("hi number {i} from the first task!");
                trpl::sleep(Duration::from_millis(500)).await;
            }
        });

        for i in 1..5 {
            println!("hi number {i} from the second task!");
            trpl::sleep(Duration::from_millis(500)).await;
        }
    });
}
```

> 后续例子都省略 `main` 里 `trpl::block_on` 的包裹代码，实际写时记得加上。

两个循环各含 `trpl::sleep`（等 500 毫秒）和 `await`。

```text
hi number 1 from the second task!
hi number 1 from the first task!
hi number 2 from the first task!
hi number 2 from the second task!
hi number 3 from the first task!
hi number 3 from the second task!
hi number 4 from the first task!
hi number 4 from the second task!
hi number 5 from the first task!
```

主 async 块结束后任务被关闭。要等它跑完需要 join handle：任务句柄本身就是 future，用 `await` 即可，`Output` 是 `Result`：

**清单 17-7** 用 `await` 等待任务完成。

```rust
        let handle = trpl::spawn_task(async {
            for i in 1..10 {
                println!("hi number {i} from the first task!");
                trpl::sleep(Duration::from_millis(500)).await;
            }
        });

        for i in 1..5 {
            println!("hi number {i} from the second task!");
            trpl::sleep(Duration::from_millis(500)).await;
        }

        handle.await.unwrap();
```

两个循环都跑完：

```text
hi number 1 from the second task!
hi number 1 from the first task!
hi number 2 from the first task!
hi number 2 from the second task!
hi number 3 from the first task!
hi number 3 from the second task!
hi number 4 from the first task!
hi number 4 from the second task!
hi number 5 from the first task!
hi number 6 from the first task!
hi number 7 from the first task!
hi number 8 from the first task!
hi number 9 from the first task!
```

差别在于不需要新开操作系统线程。async 块编译成匿名 future，可以直接把两个循环放进 async 块，用 `trpl::join` 一起跑完。

`trpl::join`：给两个 future，产出新的 future，其输出是包含两者结果的元组，等两个都完成：

**清单 17-8** 用 `trpl::join` 等待两个匿名 future。

```rust
        let fut1 = async {
            for i in 1..10 {
                println!("hi number {i} from the first task!");
                trpl::sleep(Duration::from_millis(500)).await;
            }
        };

        let fut2 = async {
            for i in 1..5 {
                println!("hi number {i} from the second task!");
                trpl::sleep(Duration::from_millis(500)).await;
            }
        };

        trpl::join(fut1, fut2).await;
```

输出：

```text
hi number 1 from the first task!
hi number 1 from the second task!
hi number 2 from the first task!
hi number 2 from the second task!
hi number 3 from the first task!
hi number 3 from the second task!
hi number 4 from the first task!
hi number 4 from the second task!
hi number 5 from the first task!
hi number 6 from the first task!
hi number 7 from the first task!
hi number 8 from the first task!
hi number 9 from the first task!
```

`trpl::join` 是公平的：轮流检查每个 future，不会让一个跑过头。线程由操作系统决定调度，async 由运行时决定。（运行时底层可能用线程，公平性实现复杂，但可行。）运行时不强制公平，通常提供不同 API 让你选择。

试试这些变体：去掉某个循环的 async 块；定义后立即 await；只包第一个循环，在第二个循环体之后 await。

### 用消息传递在两个任务间发送数据

**清单 17-9** 创建 async channel。

```rust
        let (tx, mut rx) = trpl::channel();

        let val = String::from("hi");
        tx.send(val).unwrap();

        let received = rx.recv().await.unwrap();
        println!("received '{received}'");
```

`trpl::channel` 是异步版的多生产者单消费者通道：接收端要 `mut`，`recv` 返回需要 await 的 future。同步版 `recv` 会阻塞，async 版会把控制权交还运行时。`send` 不用 await，因为它不阻塞（通道无界）。

> 整个 async 代码块都在 `block_on` 里，块内不阻塞；块外的代码会阻塞在 `block_on` 返回上。

此例中消息立即到达，且还没有并发，全部按序执行。

**清单 17-10** 连发多条消息并 sleep。

```rust
        let (tx, mut rx) = trpl::channel();

        let vals = vec![
            String::from("hi"),
            String::from("from"),
            String::from("the"),
            String::from("future"),
        ];

        for val in vals {
            tx.send(val).unwrap();
            trpl::sleep(Duration::from_millis(500)).await;
        }

        while let Some(value) = rx.recv().await {
            println!("received '{value}'");
        }
```

`rx.recv().await` 在收到消息时得到 `Some(message)`，通道关闭时得到 `None`。用 `while let` 循环（`if let` 的循环版）持续接收：

```rust
while let Some(message) = rx.recv().await { ... }
```

问题：消息不是每 500 毫秒到一条，而是 2 秒后一起到；程序也永不退出。

#### 一个 async 块内是顺序执行的

`await` 出现的顺序就是执行顺序。清单 17-10 只有一个 async 块，所以全顺序执行：先全部 send 和 sleep，然后 `while let` 才开始 recv。

把发送和接收放进各自的 async 块，再用 `trpl::join` 并发：

**清单 17-11** 分离 `send` 和 `recv` 到各自的 async 块。

```rust
        let tx_fut = async {
            let vals = vec![
                String::from("hi"),
                String::from("from"),
                String::from("the"),
                String::from("future"),
            ];

            for val in vals {
                tx.send(val).unwrap();
                trpl::sleep(Duration::from_millis(500)).await;
            }
        };

        let rx_fut = async {
            while let Some(value) = rx.recv().await {
                println!("received '{value}'");
            }
        };

        trpl::join(tx_fut, rx_fut).await;
```

消息现在每 500 毫秒打印一条。

#### 把所有权移进 async 块

程序仍然不退出，原因链：

- `trpl::join` 要两个 future 都完成才完成。
- `tx_fut` 发完消息后就完成。
- `rx_fut` 要等 `while let` 结束。
- `while let` 要等 `rx.recv` 得到 `None`，即通道关闭。
- 通道只在 `rx.close()` 或 `tx` 被 drop 时关闭。
- `tx` 只在最外层 async 块结束时 drop，而它阻塞在 `trpl::join` 上，循环。

现在发送块只是借用 `tx`。用 `async move` 把 `tx` 移进去，块结束就 drop：

**清单 17-12** 用 `async move` 让程序正常结束。

```rust
        let (tx, mut rx) = trpl::channel();

        let tx_fut = async move {
            // --snip--
```

#### 用 `join!` 宏等待多个 future

通道是多生产者的，`clone` 一个 `tx` 就能从多个 future 发送：

**清单 17-13** 多生产者。

```rust
        let (tx, mut rx) = trpl::channel();

        let tx1 = tx.clone();
        let tx1_fut = async move {
            let vals = vec![
                String::from("hi"),
                String::from("from"),
                String::from("the"),
                String::from("future"),
            ];

            for val in vals {
                tx1.send(val).unwrap();
                trpl::sleep(Duration::from_millis(500)).await;
            }
        };

        let rx_fut = async {
            while let Some(value) = rx.recv().await {
                println!("received '{value}'");
            }
        };

        let tx_fut = async move {
            let vals = vec![
                String::from("more"),
                String::from("messages"),
                String::from("for"),
                String::from("you"),
            ];

            for val in vals {
                tx.send(val).unwrap();
                trpl::sleep(Duration::from_millis(1500)).await;
            }
        };

        trpl::join!(tx1_fut, tx_fut, rx_fut);
```

`tx1` 移进第一个块，原 `tx` 移进新块（延迟略长）。两个发送块都要 `async move`。future 的顺序取决于 await 的顺序，与创建顺序无关。

从 `trpl::join` 换成 `trpl::join!` 宏：能等编译期已知数量的任意多个 future。

输出：

```text
received 'hi'
received 'more'
received 'from'
received 'the'
received 'messages'
received 'future'
received 'for'
received 'you'
```

下一个话题：如何以及为什么告诉运行时可以切换任务。
