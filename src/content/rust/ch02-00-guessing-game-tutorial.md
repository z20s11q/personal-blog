---
title: "编写猜数字游戏"
order: "ch02-00-guessing-game-tutorial"
chapter: 2
---
本章在一个程序里用到 `let`、`match`、方法、关联函数和外部 crate。细节在后面的章展开。

程序生成 1 到 100 的随机整数，读入猜测，提示太大或太小；猜对则打印并退出。

## 新建项目

```console
$ cargo new guessing_game
$ cd guessing_game
```

`cargo new` 的第一个参数是项目名。

文件：Cargo.toml

```toml
[package]
name = "guessing_game"
version = "0.1.0"
edition = "2024"

[dependencies]
```

文件：src/main.rs

```rust
fn main() {
    println!("Hello, world!");
}
```

`cargo run` 编译并运行。

```console
$ cargo run
   Compiling guessing_game v0.1.0 (file:///projects/guessing_game)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.08s
     Running `target/debug/guessing_game`
Hello, world!
```

本章的代码都写在 `src/main.rs`。

## 处理一次猜测

先读入猜测，处理输入，并检查形式是否符合预期。

**清单 2-1** 读取猜测并打印

```rust
use std::io;
// ANCHOR_END: io

fn main() {
    // ANCHOR_END: main
    println!("Guess the number!");

    println!("Please input your guess.");
    // ANCHOR_END: print

    let mut guess = String::new();
    // ANCHOR_END: string

    io::stdin()
        .read_line(&mut guess)
        // ANCHOR_END: read
        .expect("Failed to read line");
    // ANCHOR_END: expect

    println!("You guessed: {guess}");
    // ANCHOR_END: print_guess
}
```

读标准输入前，把标准库的 `io` 引入作用域。

```rust
use std::io;
```

prelude 是每个程序自动引入作用域的一组标准库项。不在其中的类型要用 `use` 显式引入。

```rust
fn main() {
```

```rust
    println!("Guess the number!");

    println!("Please input your guess.");
```

### 用变量保存值

```rust
    let mut guess = String::new();
```

`let` 创建变量。

```rust
let apples = 5;
```

`let` 把名字绑定到值。变量默认不可变，要修改就在名字前加 `mut`。

**对照**：Java 局部变量默认可变，C++ 要写 `const` 才不可变，Go 的 `:=` 默认可变。Rust 默认不可变，漏写 `mut` 就不能改。

```rust
let apples = 5; // immutable
let mut bananas = 5; // mutable
```

`//` 到行尾是注释。

`String` 是可增长的 UTF-8 文本。`String::new()` 得到空串。`类型::函数` 是关联函数，定义在类型上。`new` 是常见的构造名。

**对照**：关联函数用 `::`，值上的方法用 `.`。

### 接收用户输入

```rust
    io::stdin()
        .read_line(&mut guess)
```

没有 `use std::io` 时，写成 `std::io::stdin`。`stdin()` 返回 `std::io::Stdin`，表示标准输入句柄。

`read_line` 把用户输入追加进传入的字符串，所以参数必须可变，写成 `&mut guess`。

`&` 是引用：多处访问同一份数据，不必复制。引用默认不可变。

**对照**：`&` / `&mut` 接近 C++ 的 `const T&` / `T&`，但后面有借用检查。Java、Go、Python 没有这种默认不可变的引用。

### 用 `Result` 处理可能的失败

```rust
        .expect("Failed to read line");
```

同一条调用可以写成一行。

```rust
io::stdin().read_line(&mut guess).expect("Failed to read line");
```

链式调用拆成多行只为可读。

`read_line` 返回 `Result`。`Result` 是枚举，变体是 `Ok` 和 `Err`。`Ok` 表示成功，并带上产生的值；`Err` 表示失败，并带上原因。

`expect` 遇到 `Err` 就 panic，并打印传入的消息；遇到 `Ok` 就取出里面的值。这里的值是读到的字节数。

不调用 `expect` 也能编译，但会警告。

**对照**：`Result` 是返回值。Java 用受检异常，Go 用 `error` 返回值，Python 和 C++ 用异常。可能失败的 `Result` 不处理时，编译器会警告。

```console
$ cargo build
   Compiling guessing_game v0.1.0 (file:///projects/guessing_game)
warning: unused `Result` that must be used
  --> src/main.rs:10:5
   |
10 |     io::stdin().read_line(&mut guess);
   |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = note: this `Result` may be an `Err` variant, which should be handled
   = note: `#[warn(unused_must_use)]` (part of `#[warn(unused)]`) on by default
help: use `let _ = ...` to ignore the resulting value
   |
10 |     let _ = io::stdin().read_line(&mut guess);
   |     +++++++

warning: `guessing_game` (bin "guessing_game") generated 1 warning
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.59s
```

这条警告表示 `read_line` 的 `Result` 没有使用，错误可能被忽略。这里用 `expect`，出错就 panic。可恢复错误见第 9 章。

```rust
    println!("You guessed: {guess}");
```

### 用 `println!` 的占位符打印

`{}` 是占位符。打印变量时把名字写进 `{}`。打印表达式时，格式串里留空 `{}`，后面再写逗号分隔的表达式，按顺序填入。

```rust
let x = 5;
let y = 10;

println!("x = {x} and y + 2 = {}", y + 2);
```

上面的调用输出 `x = 5 and y + 2 = 12`。

### 测试第一部分

```console
$ cargo run
   Compiling guessing_game v0.1.0 (file:///projects/guessing_game)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 6.44s
     Running `target/debug/guessing_game`
Guess the number!
Please input your guess.
6
You guessed: 6
```

此时已经能读入并打印猜测。

## 生成秘密数字

标准库没有随机数，用 `rand` crate。秘密数字取 1 到 100。

### 用 crate 增加功能

crate 是一组 Rust 源文件。当前项目是二进制 crate，会生成可执行文件。`rand` 是库 crate，供其他程序使用，自己不能运行。

在 `Cargo.toml` 的 `[dependencies]` 下声明依赖。版本要和示例一致，否则后面的 API 可能对不上。

文件：Cargo.toml

```toml
[dependencies]
rand = "0.10.1"
```

一个标题下的内容一直延续到下一个标题。

`[dependencies]` 写外部 crate 及其版本。`0.10.1` 是 `^0.10.1` 的简写：不低于 0.10.1，且低于 0.11.0，公共 API 与 0.10.1 兼容。0.11.0 及以上不保证 API 相同。

**清单 2-2** 加入 `rand` 依赖后 `cargo build` 的输出

```console
$ cargo build
    Updating crates.io index
     Locking 8 packages to latest Rust 1.96.0 compatible versions
  Downloaded rand_core v0.10.1
  Downloaded chacha20 v0.10.1
  Downloaded rand v0.10.1
  Downloaded 3 crates (162.9KiB) in 0.59s
   Compiling libc v0.2.186
   Compiling rand_core v0.10.1
   Compiling getrandom v0.4.3
   Compiling cfg-if v1.0.4
   Compiling chacha20 v0.10.1
   Compiling rand v0.10.1
   Compiling guessing_game v0.1.0 (file:///projects/guessing_game)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 2.03s
```

版本号、行内容和顺序可能不同，但按 SemVer 与本章代码兼容。

外部依赖从 registry 拉取，数据来自 crates.io。Cargo 会一并下载传递依赖，先编译它们，再编译本项目。

`Cargo.toml` 和代码都没改时再次 `cargo build`，只会看到 `Finished`：依赖和代码都已经编译过。

```console
$ cargo build
   Compiling guessing_game v0.1.0 (file:///projects/guessing_game)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.13s
```

只改了自己的源文件时，依赖不会重新编译。

#### 保证可复现构建

第一次 `cargo build` 把解析出的版本写入 `Cargo.lock`。之后的构建使用锁里的版本。因此会停在 0.10.1，直到显式升级。`Cargo.lock` 通常和源码一起进版本控制。

#### 把 crate 更新到新版本

`cargo update` 按 `Cargo.toml` 的版本要求重新解析，并写回 `Cargo.lock`。默认范围是大于 0.10.1 且小于 0.11.0，所以会选中 0.10.2，忽略 0.999.0。

```console
$ cargo update
    Updating crates.io index
     Locking 1 package to latest Rust 1.96.0 compatible version
    Updating rand v0.10.1 -> v0.10.2 (available: v0.999.0)
```

要用 0.999.x，必须改 `Cargo.toml` 里的版本要求。本章示例按 `rand` 0.10。

```toml
[dependencies]
rand = "0.999.0"
```

下次 `cargo build` 会按新的版本要求重新解析。Cargo 的其余内容在第 14 章。

### 生成一个随机数

**清单 2-3** 生成随机数

```rust
use std::io;

use rand::prelude::*;

fn main() {
    // ANCHOR_END: ch07-04
    println!("Guess the number!");

    let secret_number = rand::rng().random_range(1..=100);
    // ANCHOR_END: ch07-04

    println!("The secret number is: {secret_number}");

    println!("Please input your guess.");

    let mut guess = String::new();

    io::stdin()
        .read_line(&mut guess)
        .expect("Failed to read line");

    println!("You guessed: {guess}");
}
// ANCHOR_END: ch07-04
```

`use rand::prelude::*` 把该 crate 最常用的项引入作用域。

`rand::rng()` 返回当前线程的生成器，种子来自操作系统。`random_range` 由 prelude 里的 `RngExt` 提供，参数是范围。`start..=end` 两端都包含，`1..=100` 就是 1 到 100。

`cargo doc --open` 在本地构建并打开全部依赖的文档。打印秘密数字只为调试，最终版本会删掉。

```console
$ cargo run
   Compiling guessing_game v0.1.0 (file:///projects/guessing_game)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.02s
     Running `target/debug/guessing_game`
Guess the number!
The secret number is: 7
Please input your guess.
4
You guessed: 4

$ cargo run
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.02s
     Running `target/debug/guessing_game`
Guess the number!
The secret number is: 83
Please input your guess.
5
You guessed: 5
```

得到的数应在 1 到 100。警告可以忽略。编译失败时，确认 `Cargo.toml` 里是 `rand = "0.10.1"`。`0.10` 系列可以配合本章代码；更高主版本的 API 可能不同。

## 把猜测和秘密数字比较

**清单 2-4** 处理比较的三种结果

这段还不能编译。

```rust
use std::cmp::Ordering;
use std::io;

use rand::prelude::*;

fn main() {
    // --snip--

    println!("You guessed: {guess}");

    match guess.cmp(&secret_number) {
        Ordering::Less => println!("Too small!"),
        Ordering::Greater => println!("Too big!"),
        Ordering::Equal => println!("You win!"),
    }
}
```

`Ordering` 是枚举，变体为 `Less`、`Greater`、`Equal`。

`cmp` 比较两个值，参数是对方的引用，返回 `Ordering`。`match` 按这个变体分支。

一个 arm 由模式和对应代码组成。按书写顺序尝试，第一个匹配的 arm 执行后，`match` 结束。

**对照**：`match` 要覆盖各个变体，漏掉就不能编译。Java 和 C++ 的 switch 可以不穷尽。

```console
$ cargo build
   Compiling libc v0.2.186
   Compiling rand_core v0.10.1
   Compiling cfg-if v1.0.0
   Compiling getrandom v0.4.3
   Compiling chacha20 v0.10.1
   Compiling rand v0.10.1
   Compiling guessing_game v0.1.0 (file:///projects/guessing_game)
error[E0308]: mismatched types
  --> src/main.rs:23:21
   |
23 |     match guess.cmp(&secret_number) {
   |                 --- ^^^^^^^^^^^^^^ expected `&String`, found `&{integer}`
   |                 |
   |                 arguments to this method are incorrect
   |
   = note: expected reference `&String`
              found reference `&{integer}`
note: method defined here
  --> /rustc/88d9e12ae178fab0fb5cc050a94da85685d449ea/library/core/src/cmp.rs:1000:7

For more information about this error, try `rustc --explain E0308`.
error: could not compile `guessing_game` (bin "guessing_game") due to 1 previous error
```

报错是类型不匹配。`let mut guess = String::new()` 被推断为 `String`。整数未另行标注时默认 `i32`，因此 `secret_number` 是 `i32`。`String` 不能和数字比较。

把输入解析成数字后再比较。其他位置的类型标注会改变这里推断出的数字类型。

文件：src/main.rs

```rust
    // --snip--

    let mut guess = String::new();

    io::stdin()
        .read_line(&mut guess)
        .expect("Failed to read line");

    let guess: u32 = guess.trim().parse().expect("Please type a number!");

    println!("You guessed: {guess}");

    match guess.cmp(&secret_number) {
        Ordering::Less => println!("Too small!"),
        Ordering::Greater => println!("Too big!"),
        Ordering::Equal => println!("You win!"),
    }
```

```rust
let guess: u32 = guess.trim().parse().expect("Please type a number!");
```

遮蔽：同一作用域可以再次 `let guess`，新绑定盖住旧名字。右边的 `guess` 仍是原来的字符串。常用来把值换成另一种类型。

**对照**：Java、Go、C++ 在同一作用域不能再次声明同名变量。Rust 的遮蔽是新绑定，类型可以不同。

`trim` 去掉首尾空白。`read_line` 会留下换行，Unix 是 `\n`，Windows 是 `\r\n`。`u32` 只能包含数字，要先去掉这些字符。

`parse` 把字符串转成其他类型。目标类型靠标注，这里是 `let guess: u32`。`u32` 是无符号 32 位整数，适合较小的非负数。这个标注加上后面和 `secret_number` 的比较，会使 `secret_number` 也被推断为 `u32`。

`parse` 返回 `Result`。字符串不是数字时得到 `Err`，`expect` 会 panic 并打印给定消息；成功时 `expect` 取出 `Ok` 里的数字。

```console
$ cargo run
   Compiling guessing_game v0.1.0 (file:///projects/guessing_game)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.26s
     Running `target/debug/guessing_game`
Guess the number!
The secret number is: 58
Please input your guess.
  76
You guessed: 76
Too big!
```

```rust
    // --snip--

    println!("The secret number is: {secret_number}");

    loop {
        println!("Please input your guess.");

        // --snip--

        match guess.cmp(&secret_number) {
            Ordering::Less => println!("Too small!"),
            Ordering::Greater => println!("Too big!"),
            Ordering::Equal => println!("You win!"),
        }
    }
}
```

## 用循环允许多次猜测

`loop` 是无限循环。非数字输入会在 `parse` 处 panic。也可以用 Ctrl-C 中断进程。

文件：src/main.rs

```console
$ cargo run
   Compiling guessing_game v0.1.0 (file:///projects/guessing_game)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.23s
     Running `target/debug/guessing_game`
Guess the number!
The secret number is: 59
Please input your guess.
45
You guessed: 45
Too small!
Please input your guess.
60
You guessed: 60
Too big!
Please input your guess.
59
You guessed: 59
You win!
Please input your guess.
quit

thread 'main' (6694925) panicked at src/main.rs:28:47:
Please type a number!: ParseIntError { kind: InvalidDigit }
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

任意非数字都会让程序 panic。猜对时也要结束循环。

### 猜对后退出

文件：src/main.rs

```rust
        // --snip--

        match guess.cmp(&secret_number) {
            Ordering::Less => println!("Too small!"),
            Ordering::Greater => println!("Too big!"),
            Ordering::Equal => {
                println!("You win!");
                break;
            }
        }
    }
}
```

猜对时 `break` 离开 `loop`。这个循环是 `main` 的最后一部分，离开循环后程序结束。

### 处理无效输入

非数字时忽略这次输入，再要一次猜测。

**清单 2-5** 忽略非数字猜测并继续循环

```rust
        // --snip--

        io::stdin()
            .read_line(&mut guess)
            .expect("Failed to read line");

        let guess: u32 = match guess.trim().parse() {
            Ok(num) => num,
            Err(_) => continue,
        };
        // ANCHOR_END: ch19

        println!("You guessed: {guess}");

        // --snip--
```

用 `match` 处理 `parse` 返回的 `Result`，失败时不再 panic。

`Ok(num)` 匹配转换成功，`match` 的结果就是那个数字，绑定到新的 `guess`。

`Err(_)` 匹配失败。`_` 匹配任意内容，这里忽略 `Err` 里的具体信息。`continue` 进入 `loop` 的下一轮。

```console
$ cargo run
   Compiling guessing_game v0.1.0 (file:///projects/guessing_game)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.13s
     Running `target/debug/guessing_game`
Guess the number!
The secret number is: 61
Please input your guess.
10
You guessed: 10
Too small!
Please input your guess.
99
You guessed: 99
Too big!
Please input your guess.
foo
Please input your guess.
61
You guessed: 61
You win!
```

删掉打印秘密数字的那一行。

**清单 2-6** 完整的猜数字程序

```rust
use std::cmp::Ordering;
use std::io;

use rand::prelude::*;

fn main() {
    println!("Guess the number!");

    let secret_number = rand::rng().random_range(1..=100);

    loop {
        println!("Please input your guess.");

        let mut guess = String::new();

        io::stdin()
            .read_line(&mut guess)
            .expect("Failed to read line");

        let guess: u32 = match guess.trim().parse() {
            Ok(num) => num,
            Err(_) => continue,
        };

        println!("You guessed: {guess}");

        match guess.cmp(&secret_number) {
            Ordering::Less => println!("Too small!"),
            Ordering::Greater => println!("Too big!"),
            Ordering::Equal => {
                println!("You win!");
                break;
            }
        }
    }
}
```

## 小结

本章用到了 `let`、`match`、函数和外部 crate。第 3 章是变量、数据类型和函数。第 4 章是所有权。第 5 章是结构体和方法。第 6 章是枚举。
