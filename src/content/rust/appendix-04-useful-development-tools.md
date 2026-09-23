---
title: "附录 D：常用开发工具"
order: "z-appendix-04-useful-development-tools"
chapter: null
---
- `cargo fmt`：按社区风格重排当前 crate，只改排版，不改语义。Rust 安装自带 `rustfmt` 和 `cargo-fmt`。

```console
$ cargo fmt
```

- `cargo fix`：应用编译器已经给出明确改法的警告。

文件：src/main.rs

```rust
fn main() {
    let mut x = 42;
    println!("{x}");
}
```

绑定从未被修改，却写了 `mut`。

```console
$ cargo build
   Compiling myprogram v0.1.0 (file:///projects/myprogram)
warning: variable does not need to be mutable
 --> src/main.rs:2:9
  |
2 |     let mut x = 0;
  |         ----^
  |         |
  |         help: remove this `mut`
  |
  = note: `#[warn(unused_mut)]` on by default
```

`cargo fix` 按警告删掉这个 `mut`。

```console
$ cargo fix
    Checking myprogram v0.1.0 (file:///projects/myprogram)
      Fixing src/main.rs (1 fix)
    Finished dev [unoptimized + debuginfo] target(s) in 0.59s
```

文件：src/main.rs

```rust
fn main() {
    let x = 42;
    println!("{x}");
}
```

`cargo fix` 也可以把代码迁到另一个 edition。

### Clippy

- `cargo clippy`：额外 lint，抓常见写法问题。随标准安装提供。

```console
$ cargo clippy
```

手写圆周率近似值会触发 lint。

文件：src/main.rs

```rust
fn main() {
    let x = 3.1415;
    let r = 8.0;
    println!("the area of the circle is {}", x * r * r);
}
```

标准库已有更精确的 `PI` 常量。

```text
error: approximate value of `f{32, 64}::consts::PI` found
 --> src/main.rs:2:13
  |
2 |     let x = 3.1415;
  |             ^^^^^^
  |
  = note: `#[deny(clippy::approx_constant)]` on by default
  = help: consider using the constant directly
  = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#approx_constant
```

改用 `std::f64::consts::PI` 后，`clippy::approx_constant` 消失。

文件：src/main.rs

```rust
fn main() {
    let x = std::f64::consts::PI;
    let r = 8.0;
    println!("the area of the circle is {}", x * r * r);
}
```

### `rust-analyzer`

- IDE 用 `rust-analyzer` 说 Language Server Protocol：补全、跳到定义、行内错误。先装语言服务器，再在 IDE 里启用客户端。
