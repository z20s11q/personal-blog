---
title: "包与 crate"
order: "ch07-01-packages-and-crates"
chapter: 7
---
- **crate**：编译器一次处理的最小代码单位。只把一个源文件交给 `rustc`，该文件也是一个 crate。crate 里可以有模块，模块可以在别的文件。
- **二进制 crate**：编译成可执行文件，必须有 `main`。
- **库 crate**：没有 `main`，不产出可执行文件，给别的项目用。口语里的 crate 多半指库。
- **crate root**：编译起点，也是根模块。
- **包**：一个或多个 crate，由 `Cargo.toml` 描述怎么构建。至少有一个 crate。二进制 crate 不限个数，库 crate 最多一个。

`cargo new my-project` 会建一个二进制包。

```console
$ cargo new my-project
     Created binary (application) `my-project` package
$ ls my-project
Cargo.toml
src
$ ls my-project/src
main.rs
```

`cargo new` 生成 `Cargo.toml`（这就是一个包）和 `src/main.rs`。`Cargo.toml` 不写源文件路径，靠约定：

- `src/main.rs`：与包同名的二进制 crate 的 crate root
- `src/lib.rs`：与包同名的库 crate 的 crate root
- 两个都在：同一个包里有两个同名 crate，一个二进制、一个库
- `src/bin` 里每个文件再各算一个二进制 crate

Cargo 把这些 crate root 交给 `rustc`。

**对照**：一个 Cargo 包里最多一个库、可以有多个二进制。Go 的 module 下面是多个 package；Java 工程里的包没有这层“最多一个库 crate”的限制。
