---
title: "泛型数据类型"
order: "ch10-01-syntax"
chapter: 10
---
### 函数定义中

把泛型写在通常写参数类型和返回值类型的位置，代码更灵活且不重复。

清单 10-4 是两个只有名字和类型不同的函数，把它们合并成一个泛型函数：

**清单 10-4** 只有名称和签名类型不同的两个函数。

```rust
fn largest_i32(list: &[i32]) -> &i32 {
    let mut largest = &list[0];

    for item in list {
        if item > largest {
            largest = item;
        }
    }

    largest
}

fn largest_char(list: &[char]) -> &char {
    let mut largest = &list[0];

    for item in list {
        if item > largest {
            largest = item;
        }
    }

    largest
}

fn main() {
    let number_list = vec![34, 50, 25, 100, 65];

    let result = largest_i32(&number_list);
    println!("The largest number is {result}");

    let char_list = vec!['y', 'm', 'a', 'q'];

    let result = largest_char(&char_list);
    println!("The largest char is {result}");
}
```

类型参数名和值参数一样要先声明。惯例用一个大写字母（UpperCamelCase），`T`（type 的缩写）最常用。

在函数签名中使用类型参数前，先声明它。声明写在函数名和参数列表之间的尖括号里：

```rust
fn largest<T>(list: &[T]) -> &T {
```

读作「`largest` 对某个类型 `T` 泛型」。参数 `list` 是 `T` 的切片，返回 `T` 的引用。

清单 10-5 用泛型合并：

**清单 10-5** 泛型版 `largest`（暂时编译不过）。

```rust
fn largest<T>(list: &[T]) -> &T {
    let mut largest = &list[0];

    for item in list {
        if item > largest {
            largest = item;
        }
    }

    largest
}

fn main() {
    let number_list = vec![34, 50, 25, 100, 65];

    let result = largest(&number_list);
    println!("The largest number is {result}");

    let char_list = vec!['y', 'm', 'a', 'q'];

    let result = largest(&char_list);
    println!("The largest char is {result}");
}
```

编译报错：

```console
$ cargo run
   Compiling chapter10 v0.1.0 (file:///projects/chapter10)
error[E0369]: binary operation `>` cannot be applied to type `&T`
 --> src/main.rs:5:17
  |
5 |         if item > largest {
  |            ---- ^ ------- &T
  |            |
  |            &T
  |
help: consider restricting type parameter `T` with trait `PartialOrd`
  |
1 | fn largest<T: std::cmp::PartialOrd>(list: &[T]) -> &T {
  |             ++++++++++++++++++++++

For more information about this error, try `rustc --explain E0369`.
error: could not compile `chapter10` (bin "chapter10") due to 1 previous error
```

报错提到 `std::cmp::PartialOrd`（trait，下节讲）。函数体要比较 `T` 的值，所以 `T` 必须是有序类型。用 trait bound 限定 `T: PartialOrd` 即可修复，`i32` 和 `char` 都实现了它。

**对照**：泛型 + trait bound 相当于 Java 的 `<T extends Comparable<T>>` 或 C++ 的 `template <typename T>` 加 `requires`。区别是 Rust 不做类型擦除，编译期为每个具体类型生成专用代码，运行期没有虚调用也没有装箱。

### 结构体定义中

`<>` 声明泛型参数，字段用泛型类型。

**清单 10-6** `Point<T>`，`x` / `y` 同类型 `T`。

```rust
struct Point<T> {
    x: T,
    y: T,
}

fn main() {
    let integer = Point { x: 5, y: 10 };
    let float = Point { x: 1.0, y: 4.0 };
}
```

`Point<T>` 的 `x` 和 `y` 必须是同一个类型 `T`。传不同类型会编译失败：

**清单 10-7** `x` 和 `y` 类型不同，编译不过。

```rust
struct Point<T> {
    x: T,
    y: T,
}

fn main() {
    let wont_work = Point { x: 5, y: 4.0 };
}
```

`x = 5` 时 `T` 被推断为整数；`y = 4.0` 类型不一致，报错。

需要不同类型就用多个泛型参数：

**清单 10-8** `Point<T, U>`。

```console
$ cargo run
   Compiling chapter10 v0.1.0 (file:///projects/chapter10)
error[E0308]: mismatched types
 --> src/main.rs:7:38
  |
7 |     let wont_work = Point { x: 5, y: 4.0 };
  |                                      ^^^ expected integer, found floating-point number

For more information about this error, try `rustc --explain E0308`.
error: could not compile `chapter10` (bin "chapter10") due to 1 previous error
```

泛型参数过多会难读，通常意味着该拆分代码了。

### 枚举定义中

枚举变体也可以持有泛型数据。`Option<T>`：

```rust
struct Point<T, U> {
    x: T,
    y: U,
}

fn main() {
    let both_integer = Point { x: 5, y: 10 };
    let both_float = Point { x: 1.0, y: 4.0 };
    let integer_and_float = Point { x: 5, y: 4.0 };
}
```

`Some` 持有 `T`，`None` 不持有。`Result<T, E>`：

```rust
enum Option<T> {
    Some(T),
    None,
}
```

`Ok(T)` 与 `Err(E)`，对应成功值和错误值。清单 9-3 打开文件时 `T` 是 `File`，`E` 是 `io::Error`。

多个结构体或枚举只有内部值的类型不同时，用泛型消除重复。

### 方法定义中

在 `impl` 上使用泛型：

**清单 10-9** 在 `Point<T>` 上实现返回 `x` 引用的方法。

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

`impl` 后必须声明 `T`，否则 Rust 会把 `Point` 尖括号里的类型当成具体类型。名字可以和结构体声明里的不同，但惯例一致。在声明了泛型的 `impl` 块里写的方法，适用于 `T` 的任何具体实例。

也可以只为某个具体类型实现方法：

**清单 10-10** 只对 `Point<f32>` 实现的方法。

```rust
struct Point<T> {
    x: T,
    y: T,
}

impl<T> Point<T> {
    fn x(&self) -> &T {
        &self.x
    }
}

fn main() {
    let p = Point { x: 5, y: 10 };

    println!("p.x = {}", p.x());
}
```

`impl Point<f32>` 意味着只有 `Point<f32>` 有 `distance_from_origin`，其他 `Point<T>` 没有。该计算只对浮点类型可用。

结构体的泛型参数可以与方法签名的不一致：

**清单 10-11** 方法的泛型参数与结构体定义不同。

```rust
impl Point<f32> {
    fn distance_from_origin(&self) -> f32 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}
```

`X1` / `Y1` 写在 `impl` 后（跟着结构体），`X2` / `Y2` 写在 `fn mixup` 后（只跟方法有关）。`p3` 的 `x` 来自 `p1`（`i32`），`y` 来自 `p2`（`char`）。

### 泛型的性能

泛型不带来运行时开销。

Rust 在编译期做单态化（monomorphization）：找出所有调用点，为每个具体类型生成专门的代码。就像把泛型代码手工展开成多份具体版本。

例如：

```rust
struct Point<X1, Y1> {
    x: X1,
    y: Y1,
}

impl<X1, Y1> Point<X1, Y1> {
    fn mixup<X2, Y2>(self, other: Point<X2, Y2>) -> Point<X1, Y2> {
        Point {
            x: self.x,
            y: other.y,
        }
    }
}

fn main() {
    let p1 = Point { x: 5, y: 10.4 };
    let p2 = Point { x: "Hello", y: 'c' };

    let p3 = p1.mixup(p2);

    println!("p3.x = {}, p3.y = {}", p3.x, p3.y);
}
```

编译时识别出 `i32` 和 `f64` 两种 `Option<T>`，展开成两份专用定义：

文件：src/main.rs

```rust
let integer = Some(5);
let float = Some(5.0);
```

`Option<T>` 被替换为具体定义。因为每个实例都生成专用代码，运行期没有泛型开销，与手写重复代码等价。

**对照**：这是 C++ 模板的思路（编译期实例化）。Java 泛型擦除后要装箱、有虚调用开销；Go 1.18 起的泛型也有字典/单态化策略。

```rust
enum Option_i32 {
    Some(i32),
    None,
}

enum Option_f64 {
    Some(f64),
    None,
}

fn main() {
    let integer = Option_i32::Some(5);
    let float = Option_f64::Some(5.0);
}
```
