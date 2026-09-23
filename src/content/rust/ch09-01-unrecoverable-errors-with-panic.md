---
title: "不可恢复的错误与 `panic!`"
order: "ch09-01-unrecoverable-errors-with-panic"
chapter: 9
---
`panic!` 用于无法处理的情况。两种触发方式：代码本身触发（如数组越界）或显式调用宏。默认行为是打印失败信息、展开栈、清理、退出。

> ### 展开还是直接终止
>
> 默认展开（unwind）：逐层回退清理数据。
> 可选终止（abort）：不清理直接结束，由操作系统回收内存。
>
> 想减小二进制体积，在 Cargo.toml 里配置：
>
> ```toml
> [profile.release]
> panic = 'abort'
> ```

示例：

文件：src/main.rs

```rust
fn main() {
    panic!("crash and burn");
}
```

运行输出：

```console
$ cargo run
   Compiling panic v0.1.0 (file:///projects/panic)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.25s
     Running `target/debug/panic`

thread 'main' (6018279) panicked at src/main.rs:2:5:
crash and burn
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

错误信息指向 `panic!` 所在位置：`_src/main.rs:2:5` 表示第二行第五列。

位置可能落在你调用的库里，此时要用回溯（backtrace）定位真正的原因。

看另一个例子：访问超出范围的索引。

**清单 9-1** 越界访问 `Vec`，触发 `panic!`。

```rust
fn main() {
    let v = vec![1, 2, 3];

    v[99];
}
```

`v` 只有 3 个元素，访问索引 99 会 panic。`[]` 本应返回元素，索引无效时 Rust 无法返回正确值。

C 里越界读是未定义行为：可能读到不属于该结构的内存（缓冲区越界读），攻击者利用它可以窃取数据。

Rust 直接停止执行：

```console
$ cargo run
   Compiling panic v0.1.0 (file:///projects/panic)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.27s
     Running `target/debug/panic`

thread 'main' (6017887) panicked at src/main.rs:4:6:
index out of bounds: the len is 3 but the index is 99
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

错误指向 `main.rs` 第 4 行，即访问索引 99 处。

`note:` 提示可以设置 `RUST_BACKTRACE` 获取回溯。回溯是从上往下读：遇到你自己写的文件就是问题起点；上面的行是你的代码调用的，下面的是调用你的代码的。

设置 `RUST_BACKTRACE=1`（任何非 0 值）得到清单 9-2 的输出。

**清单 9-2** 设置 `RUST_BACKTRACE` 后的回溯。

```console
$ RUST_BACKTRACE=1 cargo run
thread 'main' panicked at src/main.rs:4:6:
index out of bounds: the len is 3 but the index is 99
stack backtrace:
   0: rust_begin_unwind
             at /rustc/4d91de4e48198da2e33413efdcd9cd2cc0c46688/library/std/src/panicking.rs:692:5
   1: core::panicking::panic_fmt
             at /rustc/4d91de4e48198da2e33413efdcd9cd2cc0c46688/library/core/src/panicking.rs:75:14
   2: core::panicking::panic_bounds_check
             at /rustc/4d91de4e48198da2e33413efdcd9cd2cc0c46688/library/core/src/panicking.rs:273:5
   3: <usize as core::slice::index::SliceIndex<[T]>>::index
             at file:///home/.rustup/toolchains/1.85/lib/rustlib/src/rust/library/core/src/slice/index.rs:274:10
   4: core::slice::index::<impl core::ops::index::Index<I> for [T]>::index
             at file:///home/.rustup/toolchains/1.85/lib/rustlib/src/rust/library/core/src/slice/index.rs:16:9
   5: <alloc::vec::Vec<T,A> as core::ops::index::Index<I>>::index
             at file:///home/.rustup/toolchains/1.85/lib/rustlib/src/rust/library/alloc/src/vec/mod.rs:3361:9
   6: panic::main
             at ./src/main.rs:4:6
   7: core::ops::function::FnOnce::call_once
             at file:///home/.rustup/toolchains/1.85/lib/rustlib/src/rust/library/core/src/ops/function.rs:250:5
note: Some details are omitted, run with `RUST_BACKTRACE=full` for a verbose backtrace.
```

输出取决于操作系统和 Rust 版本。要拿到带符号的回溯信息，需要开启调试符号：不带 `--release` 的 `cargo build` / `cargo run` 默认开启。

回溯里第一条提到你项目文件的行就是问题所在（这里是 `src/main.rs` 第 4 行）。修复方式是不越界访问。

何时该用 `panic!`、何时不该用，见本章后面「何时 panic，何时不 panic」一节。下一节讲用 `Result` 恢复错误。
