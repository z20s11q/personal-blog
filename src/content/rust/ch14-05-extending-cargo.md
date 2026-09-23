---
title: "用自定义命令扩展 Cargo"
order: "ch14-05-extending-cargo"
chapter: 14
---
`$PATH` 中名为 `cargo-something` 的二进制，可以用 `cargo something` 调用，并出现在 `cargo --list` 里。这类扩展可以用 `cargo install` 安装，调用方式与内置子命令相同。

## 小结

标准库小而稳定；可复用代码以 crate 的形式单独发布和依赖。
