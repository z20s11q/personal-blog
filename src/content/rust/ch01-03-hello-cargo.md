---
title: "Hello, Cargo!"
order: "ch01-03-hello-cargo"
chapter: 1
---
Cargo 是构建系统和包管理器：编译你的代码，并下载、编译依赖。

没有依赖的小程序只用到构建。本书后面默认使用 Cargo。官方安装方式会带上 Cargo。检查是否安装：

```console
$ cargo --version
```

能看到版本号就是已安装。出现 `command not found` 时，按你的安装方式单独安装 Cargo。

### 用 Cargo 创建项目

在项目存放目录执行：

```console
$ cargo new hello_cargo
$ cd hello_cargo
```

`cargo new` 按项目名建立目录，并生成 `Cargo.toml` 和 `src/main.rs`。

同时初始化 Git 仓库和 `.gitignore`。已经处在 Git 仓库内时不会再生成；需要时用 `cargo new --vcs=git`。`--vcs` 用来换一种版本控制，或完全不用。选项见 `cargo new --help`。

**清单 1-2** `cargo new` 生成的 `Cargo.toml`

```toml
[package]
name = "hello_cargo"
version = "0.1.0"
edition = "2024"

[dependencies]
```

Cargo 的配置格式是 TOML。

`[package]` 段配置这个包。编译需要 `name`、`version`、`edition`。`edition` 见附录 E。

`[dependencies]` 列出依赖。Rust 里的代码包叫 crate。

文件：src/main.rs

```rust
fn main() {
    println!("Hello, world!");
}
```

生成的程序与清单 1-1 相同。差别是源码在 `src/`，`Cargo.toml` 在项目顶层。

源文件放在 `src/`。顶层放 README、许可证、配置等与代码无关的文件。

把已有项目改成 Cargo 项目：源码移进 `src/`，并提供 `Cargo.toml`。`cargo init` 会生成这个文件。

### 构建并运行 Cargo 项目

在项目目录执行：

```console
$ cargo build
   Compiling hello_cargo v0.1.0 (file:///projects/hello_cargo)
    Finished dev [unoptimized + debuginfo] target(s) in 2.85 secs
```

可执行文件在 `target/debug/hello_cargo`（Windows 为 `target\debug\hello_cargo.exe`）。默认是 debug 构建，所以目录名是 `debug`。

```console
$ ./target/debug/hello_cargo # or .\target\debug\hello_cargo.exe on Windows
Hello, world!
```

第一次 `cargo build` 还会生成顶层 `Cargo.lock`，记录依赖的确切版本。内容由 Cargo 维护。

`cargo run` 先编译再运行。

```console
$ cargo run
    Finished dev [unoptimized + debuginfo] target(s) in 0.0 secs
     Running `target/debug/hello_cargo`
Hello, world!
```

源文件没有变化时，Cargo 跳过编译，直接运行已有二进制。改过源码则会先编译再运行。

```console
$ cargo run
   Compiling hello_cargo v0.1.0 (file:///projects/hello_cargo)
    Finished dev [unoptimized + debuginfo] target(s) in 0.33 secs
     Running `target/debug/hello_cargo`
Hello, world!
```

`cargo check` 检查能否编译，不生成可执行文件。

```console
$ cargo check
   Checking hello_cargo v0.1.0 (file:///projects/hello_cargo)
    Finished dev [unoptimized + debuginfo] target(s) in 0.32 secs
```

`cargo check` 跳过生成可执行文件，通常比 `cargo build` 快。写代码时用它确认能编译；需要二进制时再用 `cargo build`。

- `cargo new`：创建项目
- `cargo build`：构建
- `cargo run`：构建并运行
- `cargo check`：只检查，不产出二进制
- 构建结果在 `target/debug`

这些命令在各操作系统上相同。

### 发布构建

`cargo build --release` 打开优化，产物在 `target/release`。编译更慢，运行更快。开发时经常重建，用 debug；交给用户的最终程序用 release。测量运行时间时，用 `target/release` 里的二进制。

### 沿用 Cargo 的约定

多个文件或有依赖时，由 Cargo 协调构建。已有项目克隆下来后，在项目目录执行 `cargo build`。

```console
$ git clone example.org/someproject
$ cd someproject
$ cargo build
```

Cargo 文档：https://doc.rust-lang.org/cargo/

## 小结

- 用 `rustup` 安装最新 stable，并用它更新
- `rustup doc` 打开本地文档
- 用 `rustc` 直接编译并运行 Hello, world
- 用 Cargo 的目录约定创建并运行项目

第 2 章做猜数字。想先学通用概念，就先读第 3 章，再回到第 2 章。
