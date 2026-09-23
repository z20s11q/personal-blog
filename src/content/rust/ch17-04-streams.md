---
title: "Stream：按序列产出的 Future"
order: "ch17-04-streams"
chapter: 17
---
前面 async channel 的 `recv` 随时间产生一串值，这就是 stream 模式。队列里陆续出现的元素、大文件的分块读取、网络陆续到达的数据都适合用 stream 表示。

stream 与迭代器的差异：

- 迭代器同步，stream 异步。
- 迭代器调 `next`，`trpl::Receiver` 调 `recv`。

可以从任何迭代器创建 stream。用 `next` 取下一项并 await：

**清单 17-21** 从迭代器创建 stream（暂时编译不过）。

```rust
        let values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        let iter = values.iter().map(|n| n * 2);
        let mut stream = trpl::stream_from_iter(iter);

        while let Some(value) = stream.next().await {
            println!("The value was: {value}");
        }
```

把数组转成迭代器、`map` 翻倍，再用 `trpl::stream_from_iter` 转成 stream，然后 `while let` 遍历。

```text
error[E0599]: no method named `next` found for struct `tokio_stream::iter::Iter` in the current scope
  --> src/main.rs:10:40
   |
10 |         while let Some(value) = stream.next().await {
   |                                        ^^^^
   |
   = help: items from traits can only be used if the trait is in scope
help: the following traits which provide `next` are implemented but not in scope; perhaps you want to import one of them
   |
1  + use crate::trpl::StreamExt;
   |
1  + use futures_util::stream::stream::StreamExt;
   |
1  + use std::iter::Iterator;
   |
1  + use std::str::pattern::Searcher;
   |
help: there is a method `try_next` with a similar name
   |
10 |         while let Some(value) = stream.try_next().await {
   |                                        ~~~~~~~~
```

报错：`next` 方法不可用，需要引入正确的 trait。不是 `Stream` 而是 `StreamExt`（Ext 是 extension 的缩写，社区惯例：用一个 trait 扩展另一个）。

`Stream` 是底层接口，相当于 `Iterator` + `Future`；`StreamExt` 提供高层 API，包括 `next`。二者尚未进标准库，但生态里的定义类似。

**清单 17-22** 引入 `StreamExt` 后可用。

```rust
use trpl::StreamExt;

fn main() {
    trpl::block_on(async {
        let values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        // --snip--
```

引入 `StreamExt` 后就能用它的全部工具方法（与迭代器类似）。

**对照**：stream 相当于 Go 的 channel + range、Python 的 async generator、Java 的 `Flow.Publisher`。Rust 的 `async fn` + `yield` 组合（gen 块）还在推进中。
