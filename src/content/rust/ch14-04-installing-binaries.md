---
title: "用 `cargo install` 安装二进制"
order: "ch14-04-installing-binaries"
chapter: 14
---
`cargo install` 把带二进制目标的 crate 装到本机，用来安装别人发布的工具，不替代系统包管理器。只有含 `src/main.rs` 或其他 binary target 的包能装；纯库目标不能装。

二进制放在安装根的 `bin` 目录。用 rustup 安装且未改配置时，该目录是 `$HOME/.cargo/bin`，需要在 `$PATH` 里才能直接运行。

```console
$ cargo install ripgrep
    Updating crates.io index
  Downloaded ripgrep v14.1.1
  Downloaded 1 crate (213.6 KB) in 0.40s
  Installing ripgrep v14.1.1
--snip--
   Compiling grep v0.3.2
    Finished `release` profile [optimized + debuginfo] target(s) in 6.73s
  Installing ~/.cargo/bin/rg
   Installed package `ripgrep v14.1.1` (executable `rg`)
```

安装输出会给出二进制的路径和可执行文件名（`ripgrep` 的可执行文件是 `rg`）。该目录在 `$PATH` 中即可运行。
