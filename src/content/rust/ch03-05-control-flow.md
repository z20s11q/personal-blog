---
title: "控制流"
order: "ch03-05-control-flow"
chapter: 3
---
`if` 表达式，以及 `loop`、`while`、`for`。

### `if` 表达式

条件为真则执行紧跟着的块，否则跳过。可以加 `else`。

文件：src/main.rs

```rust
fn main() {
    let number = 3;

    if number < 5 {
        println!("condition was true");
    } else {
        println!("condition was false");
    }
}
```

`if` 后面是条件，再是代码块，这些块叫 arm。没有 `else` 且条件为假时，直接跳过。

```console
$ cargo run
   Compiling branches v0.1.0 (file:///projects/branches)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.31s
     Running `target/debug/branches`
condition was true
```

```rust
    let number = 7;
```

```console
$ cargo run
   Compiling branches v0.1.0 (file:///projects/branches)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.31s
     Running `target/debug/branches`
condition was false
```

条件必须是 `bool`。Rust 不会把其他类型自动当成布尔。

文件：src/main.rs

**对照**：C/C++ 里非零整数可以为条件，Python 有真值测试。Rust 的 `if` 只接受 `bool`。

```rust
fn main() {
    let number = 3;

    if number {
        println!("number was three");
    }
}
```

条件不是 `bool` 时报 `mismatched types`：期望 `bool`，得到整数。

```console
$ cargo run
   Compiling branches v0.1.0 (file:///projects/branches)
error[E0308]: mismatched types
 --> src/main.rs:4:8
  |
4 |     if number {
  |        ^^^^^^ expected `bool`, found integer

For more information about this error, try `rustc --explain E0308`.
error: could not compile `branches` (bin "branches") due to 1 previous error
```

判断非零要写成比较，例如 `number != 0`。

文件：src/main.rs

```rust
fn main() {
    let number = 3;

    if number != 0 {
        println!("number was something other than zero");
    }
}
```

#### 用 `else if` 处理多个条件

多个条件按顺序写。

文件：src/main.rs

```rust
fn main() {
    let number = 6;

    if number % 4 == 0 {
        println!("number is divisible by 4");
    } else if number % 3 == 0 {
        println!("number is divisible by 3");
    } else if number % 2 == 0 {
        println!("number is divisible by 2");
    } else {
        println!("number is not divisible by 4, 3, or 2");
    }
}
```

```console
$ cargo run
   Compiling branches v0.1.0 (file:///projects/branches)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.31s
     Running `target/debug/branches`
number is divisible by 3
```

只执行第一个为真的分支，后面的不再检查。分支一多就难读，改用第 6 章的 `match`。

#### 在 `let` 里使用 `if`

`if` 是表达式，可以放在 `let` 右边。各 arm 的类型必须相同。

**清单 3-2** 把 `if` 的结果赋给变量

**对照**：Java、Go、C++ 的 `if` 是语句。Rust 的 `if` 有值，但两个分支的类型必须一致。

```rust
fn main() {
    let condition = true;
    let number = if condition { 5 } else { 6 };

    println!("The value of number is: {number}");
}
```

被执行的那个 arm 的值，就是整个 `if` 的值。

```console
$ cargo run
   Compiling branches v0.1.0 (file:///projects/branches)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.30s
     Running `target/debug/branches`
The value of number is: 5
```

每个 arm 可能成为结果的值，类型必须相同。

文件：src/main.rs

```rust
fn main() {
    let condition = true;

    let number = if condition { 5 } else { "six" };

    println!("The value of number is: {number}");
}
```

两个 arm 类型不一致就会编译失败。

```console
$ cargo run
   Compiling branches v0.1.0 (file:///projects/branches)
error[E0308]: `if` and `else` have incompatible types
 --> src/main.rs:4:44
  |
4 |     let number = if condition { 5 } else { "six" };
  |                                 -          ^^^^^ expected integer, found `&str`
  |                                 |
  |                                 expected because of this

For more information about this error, try `rustc --explain E0308`.
error: could not compile `branches` (bin "branches") due to 1 previous error
```

变量只能有一个类型，而且编译期就要确定。`if` 的类型不能拖到运行时再定。

### 用循环重复执行

三种循环：`loop`、`while`、`for`。

#### 用 `loop` 重复

`loop` 一直执行，直到 `break`。

文件：src/main.rs

```rust
fn main() {
    loop {
        println!("again!");
    }
}
```

没有 `break` 的 `loop` 不会自己停。终端里用 Ctrl-C 打断。

```console
$ cargo run
   Compiling loops v0.1.0 (file:///projects/loops)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.08s
     Running `target/debug/loops`
again!
again!
again!
again!
^Cagain!
```

`break` 退出当前循环。`continue` 跳过本轮剩下的代码，进入下一轮。

#### 从循环返回值

`break` 后面可以带一个值，这个值就是整个 `loop` 表达式的值。`return` 退出的是当前函数，不只是这一层循环。

```rust
fn main() {
    let mut counter = 0;

    let result = loop {
        counter += 1;

        if counter == 10 {
            break counter * 2;
        }
    };

    println!("The result is {result}");
}
```

`break 表达式` 把该表达式的值传出 `loop`。

#### 用循环标签区分嵌套循环

嵌套时，`break` 和 `continue` 默认作用于最内层。循环标签以单引号开头，写在 `loop` 前面。`break '标签` 或 `continue '标签` 作用于那一层。

```rust
fn main() {
    let mut count = 0;
    'counting_up: loop {
        println!("count = {count}");
        let mut remaining = 10;

        loop {
            println!("remaining = {remaining}");
            if remaining == 9 {
                break;
            }
            if count == 2 {
                break 'counting_up;
            }
            remaining -= 1;
        }

        count += 1;
    }
    println!("End count = {count}");
}
```

不带标签的 `break` 只退出内层。`break '标签` 退出被标记的循环。

```console
$ cargo run
   Compiling loops v0.1.0 (file:///projects/loops)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.58s
     Running `target/debug/loops`
count = 0
remaining = 10
remaining = 9
count = 1
remaining = 10
remaining = 9
count = 2
remaining = 10
End count = 2
```

#### 用 `while` 写条件循环

条件为真就继续，为假就退出。比手写 `loop`、`if`、`break` 少一层嵌套。

**清单 3-3** 条件为真时用 `while` 循环

```rust
fn main() {
    let mut number = 3;

    while number != 0 {
        println!("{number}!");

        number -= 1;
    }

    println!("LIFTOFF!!!");
}
```

条件为真执行循环体，否则离开循环。

#### 用 `for` 遍历集合

**清单 3-4** 用 `while` 和下标遍历数组

```rust
fn main() {
    let a = [10, 20, 30, 40, 50];
    let mut index = 0;

    while index < 5 {
        println!("the value is: {}", a[index]);

        index += 1;
    }
}
```

手写下标容易写错边界而 panic，而且每轮都要做越界检查。

```console
$ cargo run
   Compiling loops v0.1.0 (file:///projects/loops)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.32s
     Running `target/debug/loops`
the value is: 10
the value is: 20
the value is: 30
the value is: 40
the value is: 50
```

`for` 对集合里的每个元素执行循环体，不会越界。元素个数变了也不用改循环条件。

**清单 3-5** 用 `for` 遍历集合

```rust
fn main() {
    let a = [10, 20, 30, 40, 50];

    for element in a {
        println!("the value is: {element}");
    }
}
```

`for` 是最常用的循环。固定次数也优先用 `for` 配合范围：`起..止` 含起点、不含终点。`.rev()` 把范围反过来。

文件：src/main.rs

```rust
fn main() {
    for number in (1..4).rev() {
        println!("{number}!");
    }
    println!("LIFTOFF!!!");
}
```

## 小结

本章是变量、标量与复合类型、函数、注释、`if` 和循环。下一章是所有权。
