---
title: "深入 async 的 trait"
order: "ch17-05-traits-for-async"
chapter: 17
---
日常用 Rust 不必深究 `Future`、`Stream`、`StreamExt` 的细节，但遇到 `Pin` 和 `Unpin` 的报错时需要了解一些。

### `Future` trait

定义：

```rust
use std::pin::Pin;
use std::task::{Context, Poll};

pub trait Future {
    type Output;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>;
}
```

逐项拆解：

- `Output` 是关联类型，表示 future 最终产出的值，对应 `Iterator` 的 `Item`。
- `poll` 方法接收 `Pin` 包装的 `self`、`&mut Context`，返回 `Poll<Self::Output>`。

`Poll` 类型：

```rust
pub enum Poll<T> {
    Ready(T),
    Pending,
}
```

`Poll` 类似 `Option`，但语义不同：`Pending` 表示还没完成，调用方以后再来查；`Ready(T)` 表示完成，值可用。

> 极少需要直接调用 `poll`。多数 future 在返回 `Ready` 后再次 poll 会 panic，`Iterator::next` 也是类似约定。

`await` 在底层被编译成调用 `poll` 的代码。大致相当于：

```rust
match page_title(url).poll() {
    Ready(page_title) => match page_title {
        Some(title) => println!("The title for {url} was {title}"),
        None => println!("{url} had no title"),
    }
    Pending => {
        // But what goes here?
    }
}
```

只是这样写 `await` 就变成阻塞的了。Rust 让循环能把控制权交给运行时，由它暂停这个 future 去处理别的，稍后再回来检查。这就是运行时的调度工作。

`rx.recv` 就是例子：返回 `Pending` 时运行时挂起它，直到返回 `Poll::Ready(Some(msg))` 或 `Poll::Ready(None)`（通道关闭）。

运行时的细节超出本书范围，关键是理解基本机制：运行时轮询它负责的每个 future，未就绪的就让它继续睡。

### `Pin` 类型与 `Unpin` trait

**清单 17-23** 把多个 future 放进集合里等待。

```rust
let mut page_title_fut = page_title(url);
loop {
    match page_title_fut.poll() {
        Ready(value) => match page_title {
            Some(title) => println!("The title for {url} was {title}"),
            None => println!("{url} had no title"),
        }
        Pending => {
            // continue
        }
    }
}
```

每个 future 装进 `Box` 变成 trait 对象（第 12 章、第 18 章）。因为每个 `async` 块编译出的匿名类型都不同，即使输出都是 `()`，也只有包成 trait 对象才能放进同一个 `Vec`。

```rust
        let tx_fut = async move {
            // --snip--
        };

        let futures: Vec<Box<dyn Future<Output = ()>>> =
            vec![Box::new(tx1_fut), Box::new(rx_fut), Box::new(tx_fut)];

        trpl::join_all(futures).await;
```

编译报错：`dyn Future<Output = ()>` 不能 unpin。

```text
error[E0277]: `dyn Future<Output = ()>` cannot be unpinned
  --> src/main.rs:48:33
   |
48 |         trpl::join_all(futures).await;
   |                                 ^^^^^ the trait `Unpin` is not implemented for `dyn Future<Output = ()>`
   |
   = note: consider using the `pin!` macro
           consider using `Box::pin` if you need to access the pinned value outside of the current scope
   = note: required for `Box<dyn Future<Output = ()>>` to implement `Future`
note: required by a bound in `futures_util::future::join_all::JoinAll`
  --> file:///home/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/futures-util-0.3.30/src/future/join_all.rs:29:8
   |
27 | pub struct JoinAll<F>
   |            ------- required by a bound in this struct
28 | where
29 |     F: Future,
   |        ^^^^^^ required by this bound in `JoinAll`
```

提示用 `pin!` 把值固定（pin），保证不会被移动。`join_all` 返回的 `JoinAll<F>` 要求 `F: Future`，而 `Box<T>` 只有在 `T: Unpin` 时才是 `Future`。

直接用 `await` 会隐式 pin，所以平时不用写 `pin!`。但这里是把 future 集合交给 `join_all` 构造新 future，没有直接 await。

再看 `Future` 定义：

```rust
use std::pin::Pin;
use std::task::{Context, Poll};

pub trait Future {
    type Output;

    // Required method
    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>;
}
```

`cx` 参数与 `Context` 是运行时知道何时检查 future 的关键，写自定义 `Future` 实现时才需要关心。这里关注 `self: Pin<&mut Self>` 这个写法：

- 它规定调用该方法时 `self` 必须是什么类型。
- 类型受限：只能是实现该方法的类型、它的引用或智能指针，或包着引用的 `Pin`。

要 poll future，就需要 `Pin` 包装的可变引用。

`Pin` 是 `&`、`&mut`、`Box`、`Rc` 等指针类类型的包装（严格说是实现了 `Deref` / `DerefMut` 的类型）。`Pin` 本身不是指针，没有运行时行为，纯粹是编译器用来约束指针使用的工具。

为什么需要它：async 块的多个 await 点被编译成状态机，编译器为每个段生成一个变体，各持有该段需要的字段。某些变体里会出现指向同一结构其他字段的引用，即自引用类型。

自引用的值移动后，内部引用还指向旧地址，而旧地址可能已被复用，读到垃圾数据。理论上编译器可以在移动时修正所有引用，但代价高。更简单地保证「这个值不移动」就行，`Pin` 提供的正是这个保证：`Pin<Box<SomeType>>` 固定的是 `SomeType`，`Box` 指针本身可以移动。

大多数类型即使被 `Pin` 包着也照常可以移动，因为它们的字段里没有自引用。`Unpin` 是标记 trait（类似 `Send` / `Sync`），告诉编译器某类型可以安全移动。编译器为所有能证明安全的类型自动实现 `Unpin`，不能的类型会显式标注 `impl !Unpin for SomeType`。

两点要记住：`Unpin` 是常态，`!Unpin` 是特例；是否实现 `Unpin` 只在使用 `Pin<&mut SomeType>` 这类固定指针时才重要。

`String` 自动实现 `Unpin`（大多数类型如此），所以即使包在 `Pin` 里，替换成另一个 `String` 也合法，因为 `String` 没有自引用。async 块创建的 future 可能有自引用，所以不自动 `Unpin`。

回到清单 17-23：把 future 装进 `Vec<Box<dyn Future<Output = ()>>>`，future 可能自引用，不满足 `Unpin`。pin 之后装进 `Vec` 就安全了。

**清单 17-24** 用 `pin!` 固定 future 后再放入 `Vec`。

```rust
use std::pin::{Pin, pin};

// --snip--

        let tx1_fut = pin!(async move {
            // --snip--
        });

        let rx_fut = pin!(async {
            // --snip--
        });

        let tx_fut = pin!(async move {
            // --snip--
        });

        let futures: Vec<Pin<&mut dyn Future<Output = ()>>> =
            vec![tx1_fut, rx_fut, tx_fut];
```

现在编译通过，而且可以在运行时增删 `Vec` 中的 future。

`Pin` 和 `Unpin` 主要给底层库和运行时开发者用。日常看到相关报错时，现在知道怎么改了。

> `Pin` / `Unpin` 让自引用类型能安全实现。具体的规则在 `std::pin` 文档里有详细说明。

### `Stream` trait

`Iterator` 有 `next -> Option<Item>`，`Future` 有 `poll -> Poll<Output>`。`Stream` 合并两者：

```rust
use std::pin::Pin;
use std::task::{Context, Poll};

trait Stream {
    type Item;

    fn poll_next(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>
    ) -> Poll<Option<Self::Item>>;
}
```

`Item` 类似 `Iterator`（零到多个），不同于 `Future`（只有一个 `Output`）。

`poll_next`：`Poll` 外层表示就绪检查，`Option` 内层表示是否还有下一项。

这类定义很可能进入标准库，目前主要在各运行时里。

实际用的是 `next` 和 `StreamExt` 而不是 `poll_next` 和 `Stream`：

```rust
trait StreamExt: Stream {
    async fn next(&mut self) -> Option<Self::Item>
    where
        Self: Unpin;

    // other methods...
}
```

> `trpl` 里的实际定义略有不同，是为了兼容还不支持 trait 中 async fn 的 Rust 版本，形如 `fn next(&mut self) -> Next<'_, Self> where Self: Unpin;`。

`StreamExt` 为所有实现 `Stream` 的类型自动实现，且提供 `next` 的默认实现。所以自己实现流类型时只需实现 `Stream`，使用者自动获得 `StreamExt` 的方法。

下一步看 future、任务、线程如何配合。
