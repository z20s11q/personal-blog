---
title: "用结构体改写的示例"
order: "ch05-02-example-structs"
chapter: 5
---
用矩形面积看数据怎么组织：先是独立变量，再改成元组，最后改成 struct。

**清单 5-8** 用分开的宽、高变量计算面积

```rust
fn main() {
    let width1 = 30;
    let height1 = 50;

    println!(
        "The area of the rectangle is {} square pixels.",
        area(width1, height1)
    );
}

fn area(width: u32, height: u32) -> u32 {
    // ANCHOR_END: here
    width * height
}
```

```console
$ cargo run
   Compiling rectangles v0.1.0 (file:///projects/rectangles)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.42s
     Running `target/debug/rectangles`
The area of the rectangle is 1500 square pixels.
```

面积能算出来。问题在 `area` 的签名。

```rust
fn area(width: u32, height: u32) -> u32 {
```

两个 `u32` 看不出是同一个矩形的宽和高。元组可以把它们收成一个值。

### 用元组重构

**清单 5-9** 用 `(u32, u32)` 表示宽和高

```rust
fn main() {
    let rect1 = (30, 50);

    println!(
        "The area of the rectangle is {} square pixels.",
        area(rect1)
    );
}

fn area(dimensions: (u32, u32)) -> u32 {
    dimensions.0 * dimensions.1
}
```

元组让函数变成单参数。元素没有名字，计算得用 `.0` 和 `.1`。算面积时顺序颠倒结果相同；绘制矩形时，宽和高不能弄反。含义没进类型，调用方只能靠约定记住下标。

### 用结构体重构

struct 给整体和每个部分命名。

**清单 5-10** 定义 `Rectangle`，`area` 接收 `&Rectangle`

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!(
        "The area of the rectangle is {} square pixels.",
        area(&rect1)
    );
}

fn area(rectangle: &Rectangle) -> u32 {
    rectangle.width * rectangle.height
}
```

`area` 的参数是 `rectangle: &Rectangle`：共享借用，`main` 仍拥有 `rect1`。通过借用读字段，字段不会被移走。签名表达的是：用这个矩形自己的 `width` 和 `height` 算面积。

### 用派生 trait 增加功能

调试时希望打印实例的全部字段。`println!` 的 `{}` 使用 `Display`。自定义 struct 没有 `Display`，`{rect1}` 不能编译。

**清单 5-11** 用 `{}` 打印 `Rectangle`

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!("rect1 is {rect1}");
}
```

`Rectangle` 没有实现 `std::fmt::Display`。

```text
error[E0277]: `Rectangle` doesn't implement `std::fmt::Display`
```

`{}` 是给最终用户看的 `Display`。整数等基本类型只有一种展示方式，所以自带 `Display`。struct 的打印格式（逗号、花括号、是否列出字段）并不唯一，标准库不为 struct 提供 `Display`。

```text
help: the trait `std::fmt::Display` is not implemented for `Rectangle`
  --> src/main.rs:1:1
```

`{:?}` 选择 `Debug` 格式，面向开发者。类型仍须实现 `Debug`，否则同样失败。

```text
error[E0277]: `Rectangle` doesn't implement `Debug`
```

编译器指出这个格式化参数要求 `Debug`。

```text
   |                        required by this formatting parameter
   |
```

调试打印要显式打开：在 struct 定义前加 `#[derive(Debug)]`。

**清单 5-12** 派生 `Debug`，用 `{rect1:?}` 打印

```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!("rect1 is {rect1:?}");
}
```

派生之后可以编译。`{:?}` 打出类型名和每个字段的值。

```console
$ cargo run
   Compiling rectangles v0.1.0 (file:///projects/rectangles)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.48s
     Running `target/debug/rectangles`
rect1 is Rectangle { width: 30, height: 50 }
```

字段多时用 `{:#?}`，按行缩进打印。

```console
$ cargo run
   Compiling rectangles v0.1.0 (file:///projects/rectangles)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.48s
     Running `target/debug/rectangles`
rect1 is Rectangle {
    width: 30,
    height: 50,
}
```

`dbg!` 取得表达式的所有权，打印调用所在的文件、行号和结果，再把值的所有权交还。`println!` 接收的是引用。

`dbg!` 写到 stderr，`println!` 写到 stdout。

**对照**：Java、Python 的调试打印不拿走对象。`dbg!` 会移动值；要保留原绑定，传入引用。

```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let scale = 2;
    let rect1 = Rectangle {
        width: dbg!(30 * scale),
        height: 50,
    };

    dbg!(&rect1);
}
```

`dbg!` 的返回值就是表达式的值，可以放进字段初始化。对整个 `rect1` 应写 `dbg!(&rect1)`，避免移走实例。

```console
$ cargo run
   Compiling rectangles v0.1.0 (file:///projects/rectangles)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.61s
     Running `target/debug/rectangles`
[src/main.rs:10:16] 30 * scale = 60
[src/main.rs:14:5] &rect1 = Rectangle {
    width: 60,
    height: 50,
}
```

输出带源码位置。整数的 `Debug` 就是数字本身；struct 会用带字段的格式。

`derive` 还能派生附录 C 里的其他 trait。手写实现和自定义 trait 在第 10 章。`derive` 以外的属性见 Rust Reference 的 Attributes 一节。

`area` 只对矩形有意义，下一步把它做成 `Rectangle` 的方法。
