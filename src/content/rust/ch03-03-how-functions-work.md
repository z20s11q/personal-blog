---
title: "函数"
order: "ch03-03-how-functions-work"
chapter: 3
---
用 `fn` 声明。函数和变量的惯例命名是 snake_case：全小写，单词用下划线。

文件：src/main.rs

```rust
fn main() {
    println!("Hello, world!");

    another_function();
}

fn another_function() {
    println!("Another function.");
}
```

定义是 `fn 名字()` 加函数体。调用写 `名字()`。函数可以写在调用之后，只要定义在调用方能看见的作用域里。

```console
$ cargo run
   Compiling functions v0.1.0 (file:///projects/functions)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.28s
     Running `target/debug/functions`
Hello, world!
Another function.
```

### 参数

参数是签名里的变量，实参是调用时传入的值。

文件：src/main.rs

```rust
fn main() {
    another_function(5);
}

fn another_function(x: i32) {
    println!("The value of x is: {x}");
}
```

```console
$ cargo run
   Compiling functions v0.1.0 (file:///projects/functions)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 1.21s
     Running `target/debug/functions`
The value of x is: 5
```

签名里每个参数都必须写类型。多个参数用逗号分隔。

文件：src/main.rs

```rust
fn main() {
    print_labeled_measurement(5, 'h');
}

fn print_labeled_measurement(value: i32, unit_label: char) {
    println!("The measurement is: {value}{unit_label}");
}
```

```console
$ cargo run
   Compiling functions v0.1.0 (file:///projects/functions)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.31s
     Running `target/debug/functions`
The measurement is: 5h
```

### 语句与表达式

函数体是一系列语句，结尾可以是一个表达式。

- 语句做动作，不产生值。
- 表达式求值，得到一个值。

`let` 是语句。

**清单 3-1** 只含一条语句的 `main`

```rust
fn main() {
    let y = 6;
}
```

函数定义也是语句。语句没有值，所以不能把 `let` 赋给变量。

文件：src/main.rs

**对照**：C 和 C++ 里赋值是表达式，可以写 `x = y = 6`。Rust 的 `let` 没有值。

```rust
fn main() {
    let x = (let y = 6);
}
```

```console
$ cargo run
   Compiling functions v0.1.0 (file:///projects/functions)
error: expected expression, found `let` statement
 --> src/main.rs:2:14
  |
2 |     let x = (let y = 6);
  |              ^^^
  |
  = note: only supported directly in conditions of `if` and `while` expressions

warning: unnecessary parentheses around assigned value
 --> src/main.rs:2:13
  |
2 |     let x = (let y = 6);
  |             ^         ^
  |
  = note: `#[warn(unused_parens)]` (part of `#[warn(unused)]`) on by default
help: remove these parentheses
  |
2 -     let x = (let y = 6);
2 +     let x = let y = 6;
  |

warning: `functions` (bin "functions") generated 1 warning
error: could not compile `functions` (bin "functions") due to 1 previous error; 1 warning emitted
```

表达式包括算术、函数调用、宏调用，以及 `{}` 块。块的值是其中最后一条表达式。

文件：src/main.rs

```rust
fn main() {
    let y = {
        let x = 3;
        x + 1
    };

    println!("The value of y is: {y}");
}
```

```rust
{
    let x = 3;
    x + 1
}
```

块的值来自最后一条不带分号的表达式。末尾加上分号，它就变成语句，值变成 `()`。

### 带返回值的函数

返回类型写在 `->` 后面，不给返回值起名字。返回值就是函数体最后一个表达式。`return` 可以提前返回。

文件：src/main.rs

```rust
fn five() -> i32 {
    5
}

fn main() {
    let x = five();

    println!("The value of x is: {x}");
}
```

函数体可以只有一个表达式，没有分号。

```console
$ cargo run
   Compiling functions v0.1.0 (file:///projects/functions)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.30s
     Running `target/debug/functions`
The value of x is: 5
```

调用的返回值可以用来初始化变量。

```rust
let x = 5;
```

作为返回值的那一行不加分号。

文件：src/main.rs

```rust
fn main() {
    let x = plus_one(5);

    println!("The value of x is: {x}");
}

fn plus_one(x: i32) -> i32 {
    x + 1
}
```

在返回表达式末尾加分号，函数就不再返回这个值。

文件：src/main.rs

```rust
fn main() {
    let x = plus_one(5);

    println!("The value of x is: {x}");
}

fn plus_one(x: i32) -> i32 {
    x + 1;
}
```

```console
$ cargo run
   Compiling functions v0.1.0 (file:///projects/functions)
error[E0308]: mismatched types
 --> src/main.rs:7:24
  |
7 | fn plus_one(x: i32) -> i32 {
  |    --------            ^^^ expected `i32`, found `()`
  |    |
  |    implicitly returns `()` as its body has no tail or `return` expression
8 |     x + 1;
  |          - help: remove this semicolon to return this value

For more information about this error, try `rustc --explain E0308`.
error: could not compile `functions` (bin "functions") due to 1 previous error
```

声明返回 `i32`，但语句的值是 `()`，类型对不上。去掉分号，让它重新成为表达式。
