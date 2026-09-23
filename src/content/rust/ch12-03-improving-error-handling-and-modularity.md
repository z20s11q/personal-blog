---
title: "重构：模块化与错误处理"
order: "ch12-03-improving-error-handling-and-modularity"
chapter: 12
---
要修的四个问题：

- `main` 职责过多：既解析参数又读文件。一个函数一个职责。
- 配置变量（`query`、`file_path`）和逻辑变量（`contents`）混在一起，该把配置收进一个结构体。
- 读文件失败时错误信息只有一句 `Should have been able to read the file`，无法区分文件缺失、没权限等情况。
- 参数不够时只报 `index out of bounds`，用户看不懂。错误处理应集中一处。

### 二进制项目的关注点分离

`main` 太大时，常见做法：

- 拆成 `main.rs` 和 `lib.rs`，逻辑放 `lib.rs`。
- 参数解析逻辑简单时留在 `main`，复杂了就抽出去。

拆分后 `main` 只负责：解析参数、做其他配置、调用 `lib.rs` 里的 `run`、处理 `run` 的错误。

`main` 无法直接测试，把逻辑移出去就可以测了。

#### 提取参数解析

**清单 12-5** 抽出 `parse_config` 函数。

```rust
fn main() {
    let args: Vec<String> = env::args().collect();

    let (query, file_path) = parse_config(&args);

    // --snip--
}

fn parse_config(args: &[String]) -> (&str, &str) {
    let query = &args[1];
    let file_path = &args[2];

    (query, file_path)
}
```

`main` 不再决定参数与变量的对应关系，整包交给 `parse_config`。

#### 把配置值分组

`parse_config` 返回元组，调用方立刻又拆开，说明抽象不对。两个值同属一份配置，应该放进结构体：

**清单 12-6** `parse_config` 返回 `Config` 结构体。

```rust
fn main() {
    let args: Vec<String> = env::args().collect();

    let config = parse_config(&args);

    println!("Searching for {}", config.query);
    println!("In file {}", config.file_path);

    let contents = fs::read_to_string(config.file_path)
        .expect("Should have been able to read the file");

    // --snip--
}

struct Config {
    query: String,
    file_path: String,
}

fn parse_config(args: &[String]) -> Config {
    let query = args[1].clone();
    let file_path = args[2].clone();

    Config { query, file_path }
}
```

`Config` 有 `query` 和 `file_path` 两个字段。`args` 仍持有参数字符串，`Config` 若借用它们会违反借用规则，所以 `Config` 存有所有权的 `String`，用 `clone` 复制。

`clone` 有运行开销，但代码更直接，不用管生命周期。这里字符串很小、只复制一次，值得。

> ### 关于 `clone` 的取舍
>
> 很多 Rust 程序员不愿用 `clone` 绕开所有权问题。第 13 章会讲更高效的方式。但现阶段先跑通程序比极致优化更重要，路径和查询串都很小，复制一次无妨。

`main` 里改成用 `config` 实例的字段。

#### 为 `Config` 写构造函数

把 `parse_config` 改成关联函数 `new`，更符合惯例（类似 `String::new`）：

**清单 12-7** `parse_config` 变成 `Config::new`。

```rust
fn main() {
    let args: Vec<String> = env::args().collect();

    let config = Config::new(&args);

    // --snip--
}

// --snip--

impl Config {
    fn new(args: &[String]) -> Config {
        let query = args[1].clone();
        let file_path = args[2].clone();

        Config { query, file_path }
    }
}
```

### 修复错误处理

参数不足时会 panic：

```console
$ cargo run
   Compiling minigrep v0.1.0 (file:///projects/minigrep)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.0s
     Running `target/debug/minigrep`

thread 'main' (6023615) panicked at src/main.rs:27:21:
index out of bounds: the len is 1 but the index is 1
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

`index out of bounds: the len is 1 but the index is 1` 是给程序员看的，用户看不懂。

#### 改进错误信息

**清单 12-8** 检查参数数量。

```rust
    // --snip--
    fn new(args: &[String]) -> Config {
        if args.len() < 3 {
            panic!("not enough arguments");
        }
        // --snip--
```

与清单 9-13 的 `Guess::new` 思路相同：参数少于 3 个就 `panic!`。

```console
$ cargo run
   Compiling minigrep v0.1.0 (file:///projects/minigrep)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.0s
     Running `target/debug/minigrep`

thread 'main' (6023776) panicked at src/main.rs:26:13:
not enough arguments
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

信息清楚了，但多了用户不需要的内容。`panic!` 更适合程序问题而不是用法问题（第 9 章），应该返回 `Result`。

#### 用 `Result` 替代 `panic!`

改名 `new` → `build`（惯例：`new` 不失败）。返回 `Result<Config, &'static str>`。

**清单 12-9** `Config::build` 返回 `Result`。

```rust
impl Config {
    fn build(args: &[String]) -> Result<Config, &'static str> {
        if args.len() < 3 {
            return Err("not enough arguments");
        }

        let query = args[1].clone();
        let file_path = args[2].clone();

        Ok(Config { query, file_path })
    }
}
```

成功时给 `Config`，失败时给字符串字面量（`'static`）。

#### 调用 `Config::build` 并处理错误

**清单 12-10** 构建失败时以错误码退出。

```rust
use std::process;

fn main() {
    let args: Vec<String> = env::args().collect();

    let config = Config::build(&args).unwrap_or_else(|err| {
        println!("Problem parsing arguments: {err}");
        process::exit(1);
    });

    // --snip--
```

`unwrap_or_else`：`Ok` 时行为和 `unwrap` 一样取出值；`Err` 时执行闭包。闭包接收错误值，这里打印并 `process::exit(1)`（非零退出码表示出错）。

```console
$ cargo run
   Compiling minigrep v0.1.0 (file:///projects/minigrep)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.48s
     Running `target/debug/minigrep`
Problem parsing arguments: not enough arguments
```

输出对用户友好了。

### 从 `main` 提取逻辑

**清单 12-11** 抽出 `run` 函数，收 `Config` 实例。

```rust
fn main() {
    // --snip--

    println!("Searching for {}", config.query);
    println!("In file {}", config.file_path);

    run(config);
}

fn run(config: Config) {
    let contents = fs::read_to_string(config.file_path)
        .expect("Should have been able to read the file");

    println!("With text:\n{contents}");
}

// --snip--
```

#### `run` 返回错误

**清单 12-12** `run` 返回 `Result`。

```rust
use std::error::Error;

// --snip--

fn run(config: Config) -> Result<(), Box<dyn Error>> {
    let contents = fs::read_to_string(config.file_path)?;

    println!("With text:\n{contents}");

    Ok(())
}
```

三处改动：

- 返回类型改为 `Result<(), Box<dyn Error>>`。`Box<dyn Error>` 是 trait 对象（第 18 章），表示「任意实现了 `Error` 的类型」，便于返回多种错误类型；`dyn` 是 dynamic 的缩写。
- `expect` 换成 `?`：出错就返回给调用方，而不是 panic。
- 成功时返回 `Ok(())`。

```console
$ cargo run -- the poem.txt
   Compiling minigrep v0.1.0 (file:///projects/minigrep)
warning: unused `Result` that must be used
  --> src/main.rs:19:5
   |
19 |     run(config);
   |     ^^^^^^^^^^^
   |
   = note: this `Result` may be an `Err` variant, which should be handled
   = note: `#[warn(unused_must_use)]` (part of `#[warn(unused)]`) on by default
help: use `let _ = ...` to ignore the resulting value
   |
19 |     let _ = run(config);
   |     +++++++

warning: `minigrep` (bin "minigrep") generated 1 warning
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.71s
     Running `target/debug/minigrep the poem.txt`
Searching for the
In file poem.txt
With text:
I'm nobody! Who are you?
Are you nobody, too?
Then there's a pair of us - don't tell!
They'd banish us, you know.

How dreary to be somebody!
How public, like a frog
To tell your name the livelong day
To an admiring bog!

```

编译器警告：`run` 的 `Result` 被忽略了。需要处理。

#### 在 `main` 中处理 `run` 的错误

文件：src/main.rs

```rust
fn main() {
    // --snip--

    println!("Searching for {}", config.query);
    println!("In file {}", config.file_path);

    if let Err(e) = run(config) {
        println!("Application error: {e}");
        process::exit(1);
    }
}
```

用 `if let` 而不是 `unwrap_or_else`：`run` 成功时返回 `()`，我们只关心有没有错，不需要取出值。

### 拆出库 crate

把搜索逻辑放进 `src/lib.rs`，便于测试，也让 `main.rs` 更精简。

**清单 12-13** 在 `src/lib.rs` 定义 `search`（函数体暂用 `unimplemented!()`）。

```rust
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    unimplemented!();
}
```

`pub` 让 `search` 成为库的公开 API。库 crate 可以被二进制 crate 使用，也可以测试。

**清单 12-14** 在 `main.rs` 中使用 `search`。

```rust
// --snip--
use minigrep::search;

fn main() {
    // --snip--
}

// --snip--

fn run(config: Config) -> Result<(), Box<dyn Error>> {
    let contents = fs::read_to_string(config.file_path)?;

    for line in search(&config.query, &contents) {
        println!("{line}");
    }

    Ok(())
}
```

`use minigrep::search;` 引入函数；`run` 不再直接打印文件内容，而是调用 `search` 并逐行打印结果。同时删掉 `main` 里的临时 `println!`。

注意 `search` 会先把结果收集进 `Vec` 再打印，大文件时较慢；第 13 章用迭代器改进。
