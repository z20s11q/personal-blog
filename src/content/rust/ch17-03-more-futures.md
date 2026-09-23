---
title: "把控制权让给运行时"
order: "ch17-03-more-futures"
chapter: 17
---
Rust 只在 `await` 点暂停任务。await 点之间全是同步代码。

所以一个 async 块里如果长时间没有 `await`，就会饿死（starve）其他 future。做昂贵初始化或长时间计算时，需要考虑在哪儿交还控制权。

用 `slow` 模拟：

**清单 17-14** 用 `thread::sleep` 模拟慢操作。

```rust
fn slow(name: &str, ms: u64) {
    thread::sleep(Duration::from_millis(ms));
    println!("'{name}' ran for {ms}ms");
}
```

用 `std::thread::sleep` 是为了真正阻塞线程。

**清单 17-15** 在两个 future 里模拟 CPU 密集工作。

```rust
        let a = async {
            println!("'a' started.");
            slow("a", 30);
            slow("a", 10);
            slow("a", 20);
            trpl::sleep(Duration::from_millis(50)).await;
            println!("'a' finished.");
        };

        let b = async {
            println!("'b' started.");
            slow("b", 75);
            slow("b", 10);
            slow("b", 15);
            slow("b", 350);
            trpl::sleep(Duration::from_millis(50)).await;
            println!("'b' finished.");
        };

        trpl::select(a, b).await;
```

每个 future 只在做完一堆慢操作后才交还控制权：

```text
'a' started.
'a' ran for 30ms
'a' ran for 10ms
'a' ran for 20ms
'b' started.
'b' ran for 75ms
'b' ran for 10ms
'b' ran for 15ms
'b' ran for 350ms
'a' finished.
```

`select` 在 `a` 完成后就结束，两个 future 的 `slow` 调用完全没有交错。要让它们交错，需要 await 点。

去掉 `a` 末尾的 `trpl::sleep`，`b` 就完全不会运行。加 sleep 作 await 点：

**清单 17-16** 用 `trpl::sleep` 让出进度。

```rust
        let one_ms = Duration::from_millis(1);

        let a = async {
            println!("'a' started.");
            slow("a", 30);
            trpl::sleep(one_ms).await;
            slow("a", 10);
            trpl::sleep(one_ms).await;
            slow("a", 20);
            trpl::sleep(one_ms).await;
            println!("'a' finished.");
        };

        let b = async {
            println!("'b' started.");
            slow("b", 75);
            trpl::sleep(one_ms).await;
            slow("b", 10);
            trpl::sleep(one_ms).await;
            slow("b", 15);
            trpl::sleep(one_ms).await;
            slow("b", 350);
            trpl::sleep(one_ms).await;
            println!("'b' finished.");
        };
```

现在交错执行：

```text
'a' started.
'a' ran for 30ms
'b' started.
'b' ran for 75ms
'a' ran for 10ms
'b' ran for 10ms
'a' ran for 20ms
'b' ran for 15ms
'a' finished.
```

但这里并不真要 sleep，只是想交还控制权，用 `trpl::yield_now`：

**清单 17-17** 用 `yield_now`。

```rust
        let a = async {
            println!("'a' started.");
            slow("a", 30);
            trpl::yield_now().await;
            slow("a", 10);
            trpl::yield_now().await;
            slow("a", 20);
            trpl::yield_now().await;
            println!("'a' finished.");
        };

        let b = async {
            println!("'b' started.");
            slow("b", 75);
            trpl::yield_now().await;
            slow("b", 10);
            trpl::yield_now().await;
            slow("b", 15);
            trpl::yield_now().await;
            slow("b", 350);
            trpl::yield_now().await;
            println!("'b' finished.");
        };
```

意图更清楚，也比 `sleep` 快得多：`sleep` 的粒度通常至少 1 毫秒，即使传 1 纳秒。

async 对 CPU 密集任务也有用（代价是状态机开销），这是一种协作式多任务：每个 future 自己决定何时交还控制权，也有责任不长时间阻塞。某些嵌入式操作系统只有这种多任务。

实际代码中不必每行都加 await 点：让出控制权不免费，硬拆 CPU 密集任务可能更慢。要测量真实瓶颈。但如果发现本该并发的代码在串行执行，就要想起这个机制。

### 构建自己的异步抽象

future 可以组合。实现一个 `timeout`：

**清单 17-18** 用 `timeout` 给慢操作加时限。

```rust
        let slow = async {
            trpl::sleep(Duration::from_secs(5)).await;
            "Finally finished"
        };

        match timeout(slow, Duration::from_secs(2)).await {
            Ok(message) => println!("Succeeded with '{message}'"),
            Err(duration) => {
                println!("Failed after {} seconds", duration.as_secs())
            }
        }
```

API 设计：

- 本身是 async fn，才能被 await。
- 第一个参数是任意 future（泛型）。
- 第二个参数是最大等待时间（`Duration`）。
- 返回 `Result`：future 先完成给出 `Ok(值)`，超时给出 `Err(等待时长)`。

**清单 17-19** `timeout` 签名。

```rust
async fn timeout<F: Future>(
    future_to_try: F,
    max_time: Duration,
) -> Result<F::Output, Duration> {
    // Here is where our implementation will go!
}
```

行为：把传入的 future 和时长赛跑。用 `trpl::sleep` 造计时 future，`trpl::select` 让二者竞争：

**清单 17-20** 实现 `timeout`。

```rust
use trpl::Either;

// --snip--

async fn timeout<F: Future>(
    future_to_try: F,
    max_time: Duration,
) -> Result<F::Output, Duration> {
    match trpl::select(future_to_try, trpl::sleep(max_time)).await {
        Either::Left(output) => Ok(output),
        Either::Right(_) => Err(max_time),
    }
}
```

`trpl::select` 不公平：总按参数顺序轮询（其他实现可能随机）。所以 `future_to_try` 放前面。先完成返回 `Left(输出)`，计时器先到返回 `Right(())`：

```rust
match trpl::select(future_to_try, timer).await {
    Either::Left(output) => Ok(output),
    Either::Right(_) => Err(max_time),
}
```

输出：

```text
Failed after 2 seconds
```

future 可以组合成强大的工具，比如超时 + 重试再配合网络调用。

日常主要用 `async` / `await`，再用 `select`、`join!` 这类工具控制最外层 future 的执行。

下一节看按时间顺序处理多个 future：stream。
