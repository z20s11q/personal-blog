---
title: "高级 trait"
order: "ch20-02-advanced-traits"
chapter: 20
---
第 10 章介绍过 trait，这里讲进阶细节。

### 关联类型

关联类型把类型占位符与 trait 关联，trait 方法签名里可以使用这些占位符。实现者指定具体类型。这让 trait 能在不预先知道类型的情况下使用类型。

标准库的 `Iterator` trait 就有关联类型 `Item`，代表迭代产出的值的类型。

**清单 20-13** `Iterator` trait 的定义，含关联类型 `Item`。

```rust
pub trait Iterator {
    type Item;

    fn next(&mut self) -> Option<Self::Item>;
}
```

`Item` 是占位符，`next` 返回 `Option<Self::Item>`。实现者为 `Item` 指定具体类型，`next` 就返回该类型的 `Option`。

实现 `Iterator` 时把 `Item` 定为 `u32`：

文件：src/lib.rs

```rust
impl Iterator for Counter {
    type Item = u32;

    fn next(&mut self) -> Option<Self::Item> {
        // --snip--
```

看起来和泛型类似。那为什么不用泛型定义 `Iterator`？

**清单 20-14** 假想的泛型版 `Iterator`。

```rust
pub trait Iterator<T> {
    fn next(&mut self) -> Option<T>;
}
```

差别在于：泛型版本每个实现都要标注类型，而且可以给一个类型写多个实现（如 `Iterator<u32>` 和 `Iterator<String>` 都给 `Counter` 实现），调用 `next` 时必须标注用哪个实现。

用关联类型则无法多次实现同一 trait（`impl Iterator for Counter` 只能有一个），因此不用标注类型。

关联类型也是 trait 契约的一部分：实现者必须给出具体类型。命名应体现用途，并写进 API 文档。

### 运算符重载与默认泛型参数

声明泛型类型时可以指定默认具体类型，写法是 `<占位类型=具体类型>`；默认类型够用时，实现者就不必再写具体类型。

最典型的场景是运算符重载：定制 `+` 等运算符在特定情况下的行为。Rust 不允许自造运算符，也不能重载任意运算符，但可以为 `std::ops` 中列出的运算符实现对应 trait 来重载运算。例：为 `Point` 实现 `Add`，两个 `Point` 就能相加。

**清单 20-15** 为 `Point` 实现 `Add`，重载 `+` 运算符。

```rust
use std::ops::Add;

#[derive(Debug, Copy, Clone, PartialEq)]
struct Point {
    x: i32,
    y: i32,
}

impl Add for Point {
    type Output = Point;

    fn add(self, other: Point) -> Point {
        Point {
            x: self.x + other.x,
            y: self.y + other.y,
        }
    }
}

fn main() {
    assert_eq!(
        Point { x: 1, y: 0 } + Point { x: 2, y: 3 },
        Point { x: 3, y: 3 }
    );
}
```

`add` 把两个 `Point` 的 `x`、`y` 分别相加得到新 `Point`。`Add` trait 有关联类型 `Output`，决定 `add` 的返回类型。

这段代码里的默认泛型参数在 `Add` trait 定义里：

```rust
trait Add<Rhs=Self> {
    type Output;

    fn add(self, rhs: Rhs) -> Self::Output;
}
```

结构熟悉：一个方法加一个关联类型。新东西是 `Rhs=Self`，即默认类型参数。`Rhs`（right-hand side）是 `add` 里 `rhs` 参数的类型。实现 `Add` 时不指定 `Rhs`，它就默认是 `Self`，即正在实现 `Add` 的那个类型。

`impl Add for Point` 用的是默认 `Rhs`，因为要把两个 `Point` 相加。下面是需要自定义 `Rhs` 的例子。

两个结构体 `Millimeters` 和 `Meters` 保存不同单位的值。这种把已有类型薄薄包一层的新结构体叫 newtype 模式（后面详述）。毫米值与米值相加时希望自动换算，于是为 `Millimeters` 实现 `Add<Meters>`。

**清单 20-16** 在 `Millimeters` 上实现 `Add`，使 `Millimeters` 与 `Meters` 能相加。

```rust
use std::ops::Add;

struct Millimeters(u32);
struct Meters(u32);

impl Add<Meters> for Millimeters {
    type Output = Millimeters;

    fn add(self, other: Meters) -> Millimeters {
        Millimeters(self.0 + (other.0 * 1000))
    }
}
```

写 `impl Add<Meters>` 就是把 `Rhs` 定为 `Meters`，而不是默认的 `Self`。

默认类型参数主要有两种用途：

1. 扩展类型时不破坏已有代码
2. 让多数用户用不到的定制能力成为可选

标准库的 `Add` 属于第二种：通常是把两个同类型值相加，但也允许定制。有默认参数，多数场景就不用写额外参数，省掉样板代码。

第一种与第二种相反：给已有 trait 加类型参数时，给它设默认值，就能扩展功能又不破坏既有实现。

### 同名方法的消歧

Rust 允许不同 trait 有同名方法，也允许一个类型同时实现它们，还允许类型本身有同名方法。调用时必须告诉 Rust 用哪个。

例：`Pilot` 和 `Wizard` 都有 `fly` 方法，`Human` 同时实现两个 trait，自己也有 `fly` 方法，三者行为不同。

**清单 20-17** 两个 trait 各有 `fly` 方法并被 `Human` 实现，`Human` 本身也有 `fly` 方法。

```rust
trait Pilot {
    fn fly(&self);
}

trait Wizard {
    fn fly(&self);
}

struct Human;

impl Pilot for Human {
    fn fly(&self) {
        println!("This is your captain speaking.");
    }
}

impl Wizard for Human {
    fn fly(&self) {
        println!("Up!");
    }
}

impl Human {
    fn fly(&self) {
        println!("*waving arms furiously*");
    }
}
```

调用 `fly` 时编译器默认调用直接实现在类型上的方法。

**清单 20-18** 在 `Human` 实例上调用 `fly`。

```rust
fn main() {
    let person = Human;
    person.fly();
}
```

输出 `*waving arms furiously*`，说明调用的是直接实现在 `Human` 上的 `fly`。

要调用 `Pilot` 或 `Wizard` 的 `fly`，得用更明确的语法。

**清单 20-19** 指定调用哪个 trait 的 `fly`。

```rust
fn main() {
    let person = Human;
    Pilot::fly(&person);
    Wizard::fly(&person);
    person.fly();
}
```

在方法名前写 trait 名，Rust 就知道调哪个实现。`Human::fly(&person)` 与 `person.fly()` 等价，但不需要消歧时后者更短。

输出如下：

```console
$ cargo run
   Compiling traits-example v0.1.0 (file:///projects/traits-example)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.46s
     Running `target/debug/traits-example`
This is your captain speaking.
Up!
*waving arms furiously*
```

`fly` 带 `self` 参数，若两个类型实现同一 trait，Rust 能靠 `self` 的类型判断用哪个实现。

但非方法的关联函数没有 `self`。当多个类型或 trait 定义了同名非方法函数时，Rust 无法判断你要哪个，必须用完全限定语法。例：动物收容所要把所有小狗都叫 Spot。

**清单 20-20** trait 有关联函数，类型上也有同名关联函数，且该类型实现了这个 trait。

```rust
trait Animal {
    fn baby_name() -> String;
}

struct Dog;

impl Dog {
    fn baby_name() -> String {
        String::from("Spot")
    }
}

impl Animal for Dog {
    fn baby_name() -> String {
        String::from("puppy")
    }
}

fn main() {
    println!("A baby dog is called a {}", Dog::baby_name());
}
```

`baby_name` 定义在 `Dog` 上，`Dog` 又实现了 `Animal` trait，其中也有 `baby_name`。

`main` 里调 `Dog::baby_name`，调用的是直接定义在 `Dog` 上的那个。输出：

```console
$ cargo run
   Compiling traits-example v0.1.0 (file:///projects/traits-example)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.54s
     Running `target/debug/traits-example`
A baby dog is called a Spot
```

这不是想要的结果。想要 `Animal` trait 里的 `baby_name`，输出 `A baby dog is called a puppy`。只写 trait 名在这里没用：改成下面这样会编译报错。

**清单 20-21** 试图调用 `Animal` trait 的 `baby_name`，但 Rust 不知道用哪个实现。

```rust
fn main() {
    println!("A baby dog is called a {}", Animal::baby_name());
}
```

`Animal::baby_name` 没有 `self` 参数，且可能有别的类型也实现了 `Animal`，Rust 无法判断用哪个实现。编译器报错：

```console
$ cargo run
   Compiling traits-example v0.1.0 (file:///projects/traits-example)
error[E0790]: cannot call associated function on trait without specifying the corresponding `impl` type
  --> src/main.rs:20:43
   |
 2 |     fn baby_name() -> String;
   |     ------------------------- `Animal::baby_name` defined here
...
20 |     println!("A baby dog is called a {}", Animal::baby_name());
   |                                           ^^^^^^^^^^^^^^^^^^^ cannot call associated function of trait
   |
help: use the fully-qualified path to the only available implementation
   |
20 |     println!("A baby dog is called a {}", <Dog as Animal>::baby_name());
   |                                           +++++++       +

For more information about this error, try `rustc --explain E0790`.
error: could not compile `traits-example` (bin "traits-example") due to 1 previous error
```

要明确用 `Dog` 上的 `Animal` 实现，得用完全限定语法。

**清单 20-22** 用完全限定语法调用 `Dog` 所实现的 `Animal` trait 的 `baby_name`。

```rust
fn main() {
    println!("A baby dog is called a {}", <Dog as Animal>::baby_name());
}
```

尖括号里给出类型标注，表示这次调用把 `Dog` 当作 `Animal`。输出就对了：

```console
$ cargo run
   Compiling traits-example v0.1.0 (file:///projects/traits-example)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.48s
     Running `target/debug/traits-example`
A baby dog is called a puppy
```

完全限定语法的一般形式：

```rust
<Type as Trait>::function(receiver_if_method, next_arg, ...);
```

非方法的关联函数没有 receiver，只有参数列表。其实任何函数或方法调用都可以用完全限定语法；Rust 能从上下文推断出的部分可以省略，只有存在多个同名实现、需要消歧时才必须写全。

### 使用 supertrait

有时一个 trait 的定义依赖另一个 trait：要求实现本 trait 的类型也必须实现另一个 trait，这样才能使用后者提供的功能。被依赖的 trait 叫本 trait 的 supertrait。

例：`OutlinePrint` trait 的 `outline_print` 方法把值用星号框起来打印。`Point` 实现了标准库的 `Display`，输出 `(x, y)`；给 `x = 1`、`y = 3` 的实例调用 `outline_print`，应该输出：

```text
**********
*        *
* (1, 3) *
*        *
**********
```

`outline_print` 的实现要用 `Display` 的功能，所以要求 `OutlinePrint` 只对同时实现了 `Display` 的类型生效。在 trait 定义里写 `OutlinePrint: Display` 即可，相当于给 trait 加约束。

**清单 20-23** 实现 `OutlinePrint`，它要求 `Display` 的功能。

```rust
use std::fmt;

trait OutlinePrint: fmt::Display {
    fn outline_print(&self) {
        let output = self.to_string();
        let len = output.len();
        println!("{}", "*".repeat(len + 4));
        println!("*{}*", " ".repeat(len + 2));
        println!("* {output} *");
        println!("*{}*", " ".repeat(len + 2));
        println!("{}", "*".repeat(len + 4));
    }
}
```

因为指定了 `OutlinePrint` 依赖 `Display`，就能用 `to_string`（任何实现了 `Display` 的类型都自动获得）。不写冒号和 `Display` 的话，会报找不到 `to_string` 方法。

在一个没实现 `Display` 的类型上实现 `OutlinePrint` 会怎样？

文件：src/main.rs

```rust
struct Point {
    x: i32,
    y: i32,
}

impl OutlinePrint for Point {}
```

报错说需要 `Display` 但没有实现：

```console
$ cargo run
   Compiling traits-example v0.1.0 (file:///projects/traits-example)
error[E0277]: `Point` doesn't implement `std::fmt::Display`
  --> src/main.rs:20:23
   |
20 | impl OutlinePrint for Point {}
   |                       ^^^^^ unsatisfied trait bound
   |
help: the trait `std::fmt::Display` is not implemented for `Point`
  --> src/main.rs:15:1
   |
15 | struct Point {
   | ^^^^^^^^^^^^
note: required by a bound in `OutlinePrint`
  --> src/main.rs:3:21
   |
 3 | trait OutlinePrint: fmt::Display {
   |                     ^^^^^^^^^^^^ required by this bound in `OutlinePrint`

error[E0277]: `Point` doesn't implement `std::fmt::Display`
  --> src/main.rs:24:7
   |
24 |     p.outline_print();
   |       ^^^^^^^^^^^^^ unsatisfied trait bound
   |
help: the trait `std::fmt::Display` is not implemented for `Point`
  --> src/main.rs:15:1
   |
15 | struct Point {
   | ^^^^^^^^^^^^
note: required by a bound in `OutlinePrint::outline_print`
  --> src/main.rs:3:21
   |
 3 | trait OutlinePrint: fmt::Display {
   |                     ^^^^^^^^^^^^ required by this bound in `OutlinePrint::outline_print`
 4 |     fn outline_print(&self) {
   |        ------------- required by a bound in this associated function

For more information about this error, try `rustc --explain E0277`.
error: could not compile `traits-example` (bin "traits-example") due to 2 previous errors
```

为 `Point` 实现 `Display`，满足约束：

文件：src/main.rs

```rust
use std::fmt;

impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}
```

之后为 `Point` 实现 `OutlinePrint` 就能通过，可以调用 `outline_print` 用星号框打印。

### 用 newtype 实现外部 trait

第 10 章讲过孤儿规则：只有当 trait 或类型（或两者）属于本地 crate 时，才能为类型实现 trait。用 newtype 模式可以绕过：把要实现的类型包进一个单字段元组结构体（第 5 章讲过元组结构体），包装类型是本地类型，就能为它实现 trait。newtype 是 Haskell 的术语；这种包装没有运行时开销，编译期就消除了。

例：想给 `Vec<T>` 实现 `Display`，但 trait 和类型都在外部，孤儿规则不允许。用 `Wrapper` 包一层：

**清单 20-24** 在 `Vec<String>` 外包一层 `Wrapper` 并实现 `Display`。

```rust
use std::fmt;

struct Wrapper(Vec<String>);

impl fmt::Display for Wrapper {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "[{}]", self.0.join(", "))
    }
}

fn main() {
    let w = Wrapper(vec![String::from("hello"), String::from("world")]);
    println!("w = {w}");
}
```

`Wrapper` 是元组结构体，用 `self.0` 访问内部的 `Vec<T>`。于是 `Wrapper` 也有了 `Display` 的功能。

缺点是 `Wrapper` 是新类型，没有内部值的方法。想让 `Wrapper` 完全像 `Vec<T>`，得把 `Vec<T>` 的方法逐个转发到 `self.0`，或者实现 `Deref` 返回内部类型（见第 15 章）。如果只想限制行为、暴露部分方法，就手动实现需要的那些。

newtype 模式不涉及 trait 时也有用。接下来看类型系统的一些进阶用法。
