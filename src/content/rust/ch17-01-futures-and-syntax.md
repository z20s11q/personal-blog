---
title: "Future 与 async 语法"
order: "ch17-01-futures-and-syntax"
chapter: 17
---
Future 表示「现在未必就绪，将来会就绪」的值（类似其他语言的 task 或 promise）。Rust 提供 `Future` trait，让不同的异步操作可以用不同的数据结构实现，但拥有共同的接口。

`async` 可以标记块和函数，表示它们可以被中断和恢复。`await` 用来等待 future 就绪。检查 future 是否就绪的动作叫轮询（polling）。

`async` / `await` 是关键字，编译器把它们翻译成使用 `Future` trait 的等价代码（就像 `for` 循环被翻译成 `Iterator`）。也可以自己为数据类型实现 `Future`。

## 第一个异步程序

为专注学 async，用 `trpl` crate（重新导出了 `futures` 和 `tokio` 里需要的类型和函数）。`futures` 是 `Future` trait 的最初设计地，`tokio` 是最流行的运行时。

新建项目：

```console
$ cargo new hello-async
$ cd hello-async
$ cargo add trpl
```

写个抓取两个网页、取 `<title>`、先完成者先输出的工具。

### 定义 `page_title`

**清单 17-1** 获取页面标题的 async 函数。

```rust
use trpl::Html;

async fn page_title(url: &str) -> Option<String> {
    let response = trpl::get(url).await;
    let response_text = response.text().await;
    Html::parse(&response_text)
        .select_first("title")
        .map(|title| title.inner_html())
}
```

`async fn` 标记函数；`trpl::get(url).await` 发请求并等待；`.text().await` 等待响应体全文。

两处都必须显式 `await`，因为 Rust 的 future 是惰性的：不用 `await` 就不会执行（编译器会警告）。

> 这与 `thread::spawn` 立即运行不同，也与多数语言的 async 不同。惰性是 Rust 性能保证的一部分，与迭代器同理。

`Html::parse` 解析出结构化数据，`select_first("title")` 找第一个 `<title>`，返回 `Option<ElementRef>`；`map` 取出内容。

注意 `await` 是后缀关键字，写在表达式后面，方便链式调用：

**清单 17-2** 用 `await` 链式调用。

```rust
    let response_text = trpl::get(url).await.text().await;
```

`async` 块被编译成一个匿名的、实现了 `Future` 的类型；`async fn` 被编译成返回 future 的普通函数。`async fn page_title` 大致等价于：

```rust
use std::future::Future;
use trpl::Html;

fn page_title(url: &str) -> impl Future<Output = Option<String>> {
    async move {
        let text = trpl::get(url).await.text().await;
        Html::parse(&text)
            .select_first("title")
            .map(|title| title.inner_html())
    }
}
```

要点：

- 用 `impl Trait` 返回（第 10 章）。
- 返回值的 `Output` 是 `Option<String>`，与原返回类型一致。
- 函数体包在 `async move` 块里（块是表达式，整个块作为返回值）。
- 用 `async move` 是因为要用 `url` 参数（后面细讲 `async` 与 `async move`）。

### 用运行时执行 async 函数

**清单 17-3** 在 `main` 里调用 `page_title`（暂时编译不过）。

```rust
async fn main() {
    let args: Vec<String> = std::env::args().collect();
    let url = &args[1];
    match page_title(url).await {
        Some(title) => println!("The title for {url} was {title}"),
        None => println!("{url} had no title"),
    }
}
```

`await` 只能用在 async 函数或块里，而 `main` 不允许标 `async`：

```text
error[E0752]: `main` function is not allowed to be `async`
 --> src/main.rs:6:1
  |
6 | async fn main() {
  | ^^^^^^^^^^^^^^^ `main` function is not allowed to be `async`
```

原因是 async 代码需要运行时：一个负责执行异步代码的 crate。`main` 可以初始化运行时，但本身不是运行时。

多数支持 async 的语言内置运行时，Rust 没有，而是有多个可选运行时，各有取舍（高吞吐服务器 vs 单核微控制器）。

本章用 `trpl::block_on`：接收 future，阻塞当前线程直到它完成。底层用 `tokio` 建立运行时。

**清单 17-4** 用 `trpl::block_on` 等待 async 块。

```rust
fn main() {
    let args: Vec<String> = std::env::args().collect();

    trpl::block_on(async {
        let url = &args[1];
        match page_title(url).await {
            Some(title) => println!("The title for {url} was {title}"),
            None => println!("{url} had no title"),
        }
    })
}
```

运行成功：

```console
$ cargo run -- "https://www.rust-lang.org"
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.05s
     Running `target/debug/async_await 'https://www.rust-lang.org'`
The title for https://www.rust-lang.org was
            Rust Programming Language
```

每个 `await` 点都是把控制权交还给运行时的位置。Rust 需要保存 async 块的中间状态，相当于一个隐形的状态机：

```rust
enum PageTitleFuture<'a> {
    Initial { url: &'a str },
    GetAwaitPoint { url: &'a str },
    TextAwaitPoint { response: trpl::Response },
}
```

编译器自动生成并管理这个状态机的数据结构，借用和所有权规则照常适用。

执行状态机的是运行时（其中负责执行的部分叫 executor）。（这就是为什么要点 4 里 `main` 不能是 async：`main` 是程序起点，没人替它管理状态机。）

> 有些运行时的宏可以写 `async fn main`，实际是改写成普通 `fn main`，内部调用类似 `block_on` 的函数。

### 并发竞速两个 URL

**清单 17-5** 两个 URL 谁先返回用谁。

```rust
use trpl::{Either, Html};

fn main() {
    let args: Vec<String> = std::env::args().collect();

    trpl::block_on(async {
        let title_fut_1 = page_title(&args[1]);
        let title_fut_2 = page_title(&args[2]);

        let (url, maybe_title) =
            match trpl::select(title_fut_1, title_fut_2).await {
                Either::Left(left) => left,
                Either::Right(right) => right,
            };

        println!("{url} returned first");
        match maybe_title {
            Some(title) => println!("Its page title was: '{title}'"),
            None => println!("It had no title."),
        }
    })
}

async fn page_title(url: &str) -> (&str, Option<String>) {
    let response_text = trpl::get(url).await.text().await;
    let title = Html::parse(&response_text)
        .select_first("title")
        .map(|title| title.inner_html());
    (url, title)
}
```

`page_title` 返回的 future 还没执行（惰性）。`trpl::select` 返回先完成的那个。

> `trpl::select` 底层是 `futures` crate 的 `select`，后者功能更多但也更复杂。

哪个都可能赢，所以不用 `Result`，而用 `trpl::Either`：

```rust
enum Either<A, B> {
    Left(A),
    Right(B),
}
```

`Left` 对应第一个参数先完成，`Right` 对应第二个。

`page_title` 改为同时返回 URL，这样即使没有 `<title>` 也能输出有意义的信息。
