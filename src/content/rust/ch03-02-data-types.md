---
title: "数据类型"
order: "ch03-02-data-types"
chapter: 3
---
每个值都有类型。这里分两类：标量、复合。

静态类型：编译期必须知道每个变量的类型。多数情况能推断。一个值可能是多种类型时（例如 `parse`）必须写类型标注。

```rust
let guess: u32 = "42".parse().expect("Not a number!");
```

不标注时编译器报 `type annotations needed`：这里推断不出唯一类型。

```console
$ cargo build
   Compiling no_type_annotations v0.1.0 (file:///projects/no_type_annotations)
error[E0284]: type annotations needed
 --> src/main.rs:2:9
  |
2 |     let guess = "42".parse().expect("Not a number!");
  |         ^^^^^        ----- type must be known at this point
  |
  = note: cannot satisfy `<_ as FromStr>::Err == _`
help: consider giving `guess` an explicit type
  |
2 |     let guess: /* Type */ = "42".parse().expect("Not a number!");
  |              ++++++++++++

For more information about this error, try `rustc --explain E0284`.
error: could not compile `no_type_annotations` (bin "no_type_annotations") due to 1 previous error
```

### 标量类型

标量是单个值。四种：整数、浮点、布尔、字符。

#### 整数类型

`u` 无符号，`i` 有符号，后面的数字是位数。有符号整数用补码。

**表 3-1** 整数类型

| 长度 | 有符号 | 无符号 |
| ---- | ------ | ------ |
| 8 位 | `i8` | `u8` |
| 16 位 | `i16` | `u16` |
| 32 位 | `i32` | `u32` |
| 64 位 | `i64` | `u64` |
| 128 位 | `i128` | `u128` |
| 取决于架构 | `isize` | `usize` |

有符号范围是 −(2^(n−1)) 到 2^(n−1)−1，`i8` 为 −128 到 127。无符号是 0 到 2^n−1，`u8` 为 0 到 255。

`isize` 和 `usize` 在 64 位平台是 64 位，在 32 位平台是 32 位。索引用 `usize`。

字面量可加类型后缀，如 `57u8`。`_` 只作视觉分隔，`1_000` 等于 `1000`。未写类型时整数默认 `i32`。

**表 3-2** 整数字面量

| 字面量 | 示例 |
| ------ | ---- |
| 十进制 | `98_222` |
| 十六进制 | `0xff` |
| 八进制 | `0o77` |
| 二进制 | `0b1111_0000` |
| 字节（仅 `u8`） | `b'A'` |

##### 整数溢出

超出该类型范围时：

- debug：运行时 panic。
- release（`--release`）：补码回绕（`u8` 的 256 变成 0），不 panic。不要依赖回绕。

显式处理：

- `wrapping_*`：任何编译模式都回绕。
- `checked_*`：溢出得到 `None`。
- `overflowing_*`：返回结果，以及是否溢出的布尔值。
- `saturating_*`：饱和到该类型的最小或最大值。

**对照**：Java 的整数运算静默回绕；C++ 有符号溢出是未定义行为。Rust 在 debug 下 panic，release 下回绕。

#### 浮点类型

`f32` 和 `f64`，默认 `f64`。都是有符号的，IEEE-754。

文件：src/main.rs

```rust
fn main() {
    let x = 2.0; // f64

    let y: f32 = 3.0; // f32
}
```

#### 数值运算

支持 `+`、`-`、`*`、`/`、`%`。整数除法向零截断。

文件：src/main.rs

```rust
fn main() {
    // addition
    let sum = 5 + 10;

    // subtraction
    let difference = 95.5 - 4.3;

    // multiplication
    let product = 4 * 30;

    // division
    let quotient = 56.7 / 32.2;
    let truncated = -5 / 3; // Results in -1

    // remainder
    let remainder = 43 % 5;
}
```

运算表达式得到一个值，再绑定到变量。全部运算符见附录 B。

#### 布尔类型

`bool` 只有 `true` 和 `false`，占 1 字节。

文件：src/main.rs

```rust
fn main() {
    let t = true;

    let f: bool = false; // with explicit type annotation
}
```

`bool` 主要用于 `if` 这类条件。

#### 字符类型

文件：src/main.rs

```rust
fn main() {
    let c = 'z';
    let z: char = 'ℤ'; // with explicit type annotation
    let heart_eyed_cat = '😻';
}
```

`char` 字面量用单引号，字符串字面量用双引号。`char` 占 4 字节，是一个 Unicode 标量值，范围 `U+0000`–`U+D7FF` 和 `U+E000`–`U+10FFFF`。它不等于用户眼里的“一个字符”。

**对照**：Java 的 `char` 是 16 位 UTF-16 码元；Rust 的 `char` 是 32 位 Unicode 标量值。

### 复合类型

复合类型把多个值收成一个类型。原生有两种：元组和数组。

#### 元组类型

元组长度固定，元素类型可以不同。写成括号里的逗号分隔列表。

文件：src/main.rs

```rust
fn main() {
    let tup: (i32, f64, u8) = (500, 6.4, 1);
}
```

元组是一个值。用模式解构取出各个元素。

文件：src/main.rs

```rust
fn main() {
    let tup = (500, 6.4, 1);

    let (x, y, z) = tup;

    println!("The value of y is: {y}");
}
```

也可以用 `.0`、`.1` 按下标访问，下标从 0 开始。

文件：src/main.rs

```rust
fn main() {
    let x: (i32, f64, u8) = (500, 6.4, 1);

    let five_hundred = x.0;

    let six_point_four = x.1;

    let one = x.2;
}
```

没有任何值的元组叫 unit，值和类型都写作 `()`。表达式没有其他返回值时，得到的就是 `()`。

#### 数组类型

数组每个元素类型相同，长度固定。

文件：src/main.rs

**对照**：Python 的 `list`、Java 的 `ArrayList`、Go 的切片都可以变长。Rust 数组的长度是类型的一部分（`[T; N]`），不能增减；要变长用 `Vec`。

```rust
fn main() {
    let a = [1, 2, 3, 4, 5];
}
```

数组放在栈上，元素个数在编译期固定。个数会变就用标准库的 `Vec`（在堆上）。

```rust
let months = ["January", "February", "March", "April", "May", "June", "July",
              "August", "September", "October", "November", "December"];
```

数组类型写作 `[元素类型; 长度]`。

```rust
let a: [i32; 5] = [1, 2, 3, 4, 5];
```

分号前是每个元素的类型，分号后是元素个数。

`[初值; 长度]` 用同一个值填满整个数组。

```rust
let a = [3; 5];
```

`[3; 5]` 就是五个 `3`。

#### 访问数组元素

用下标访问。

文件：src/main.rs

```rust
fn main() {
    let a = [1, 2, 3, 4, 5];

    let first = a[0];
    let second = a[1];
}
```

下标从 0 开始。

#### 非法的数组元素访问

下标要到运行时才知道时，编译期查不了越界。

文件：src/main.rs

```rust
use std::io;

fn main() {
    let a = [1, 2, 3, 4, 5];

    println!("Please enter an array index.");

    let mut index = String::new();

    io::stdin()
        .read_line(&mut index)
        .expect("Failed to read line");

    let index: usize = index
        .trim()
        .parse()
        .expect("Index entered was not a number");

    let element = a[index];

    println!("The value of the element at index {index} is: {element}");
}
```

下标在长度以内就取出元素；超出则 panic。

```console
thread 'main' panicked at src/main.rs:19:19:
index out of bounds: the len is 5 but the index is 10
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

用下标访问时，Rust 检查下标小于长度，否则 panic，不去读那块内存。

**对照**：C/C++ 越界是未定义行为；Rust 在运行时拦住并 panic。
