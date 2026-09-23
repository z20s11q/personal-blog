---
title: "接收命令行参数"
order: "ch12-01-accepting-command-line-arguments"
chapter: 12
---
新建项目 `minigrep`：

```console
$ cargo new minigrep
     Created binary (application) `minigrep` project
$ cd minigrep
```

目标是接收两个参数：搜索字符串和文件路径，运行方式：

```console
$ cargo run -- searchstring example-filename.txt
```

`cargo new` 生成的程序还不能处理参数。crates.io 上有现成的参数解析库，这里先手写。

### 读取参数值

用 `std::env::args`，它返回命令行参数的迭代器。迭代器逐个产出值，`collect` 把迭代结果收进集合（迭代器详解见第 13 章）。

**清单 12-1** 把参数收集进 `Vec` 并打印。

```rust
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    dbg!(args);
}
```

`use std::env;` 引入父模块而不是 `env::args`：这样可以方便地用 `std::env` 里的其他函数，也避免 `args` 与本地函数混淆（第 7 章）。

> `args` 遇到非 Unicode 参数会 panic。要接受这类参数用 `args_os`，返回 `OsString`。这里图简单用 `args`。

`main` 第一行调用 `env::args`，`collect` 收集成交互。

**对照**：`collect` 泛型可以产出多种集合，所以通常要显式标注类型：`Vec<String>`。Go 用 `os.Args`，Java 用 `args` 数组，Python 用 `sys.argv`。

```console
$ cargo run
   Compiling minigrep v0.1.0 (file:///projects/minigrep)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.61s
     Running `target/debug/minigrep`
[src/main.rs:5:5] args = [
    "target/debug/minigrep",
]
```

```console
$ cargo run -- needle haystack
   Compiling minigrep v0.1.0 (file:///projects/minigrep)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 1.57s
     Running `target/debug/minigrep needle haystack`
[src/main.rs:5:5] args = [
    "target/debug/minigrep",
    "needle",
    "haystack",
]
```

第一个元素是程序名 `"target/debug/minigrep"`，与 C 的 `argv[0]` 一致。本章忽略它。

### 把参数存进变量

**清单 12-2** 用变量保存查询串和文件路径。

```rust
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();

    let query = &args[1];
    let file_path = &args[2];

    println!("Searching for {query}");
    println!("In file {file_path}");
}
```

`args[0]` 是程序名，从 `args[1]` 开始才是参数。第一个是查询串，第二个是文件路径。

```console
$ cargo run -- test sample.txt
   Compiling minigrep v0.1.0 (file:///projects/minigrep)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.0s
     Running `target/debug/minigrep test sample.txt`
Searching for test
In file sample.txt
```

打印验证。后面再加错误处理（比如用户没传参数的情况）。
