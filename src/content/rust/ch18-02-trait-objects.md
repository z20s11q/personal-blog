---
title: "用 trait 对象抽象共享行为"
order: "ch18-02-trait-objects"
chapter: 18
---
`Vec` 只能存同一类型。枚举可以容纳已知的固定几种类型（第 8 章的 `SpreadsheetCell`），但如果要让**库的使用者**扩展类型集合就不够了。

例：写一个 GUI 库 `gui`，遍历组件列表，逐个调用 `draw`。库提供 `Button`、`TextField`，使用者自己加 `Image`、`SelectBox`。

有继承的语言会定义 `Component` 基类，子类继承并覆盖 `draw`。Rust 没有继承，改用 trait。

### 定义通用行为的 trait

trait 对象指向「实现了指定 trait 的某个类型」的实例，以及一张运行时查找方法的表。写法：指针（引用或 `Box<T>`）+ `dyn` + trait 名。用 trait 对象的地方，编译器会保证类型的实现存在。

> trait 对象不能加数据（这点和其他语言的对象不同），它的用途就是跨类型抽象行为。

**清单 18-3** `Draw` trait。

```rust
pub trait Draw {
    fn draw(&self);
}
```

**清单 18-4** `Screen` 的字段是 `Vec<Box<dyn Draw>>`。

```rust
pub struct Screen {
    pub components: Vec<Box<dyn Draw>>,
}
```

**清单 18-5** `run` 方法逐个调用 `draw`。

```rust
impl Screen {
    pub fn run(&self) {
        for component in self.components.iter() {
            component.draw();
        }
    }
}
```

与泛型 + trait bound 的写法对比：

**清单 18-6** 泛型版本的 `Screen<T: Draw>`。

```rust
pub struct Screen<T: Draw> {
    pub components: Vec<T>,
}

impl<T> Screen<T>
where
    T: Draw,
{
    pub fn run(&self) {
        for component in self.components.iter() {
            component.draw();
        }
    }
}
```

泛型版本要求 `components` 全是同一类型（全 `Button` 或全 `TextField`）。同质集合优先用泛型，因为编译期单态化。

trait 对象版本可以在一个 `Vec` 里放 `Box<Button>` 和 `Box<TextField>`。

### 实现 trait

**清单 18-7** `Button` 实现 `Draw`。

```rust
pub struct Button {
    pub width: u32,
    pub height: u32,
    pub label: String,
}

impl Draw for Button {
    fn draw(&self) {
        // code to actually draw a button
    }
}
```

**清单 18-8** 使用者在自己的 crate 里为 `SelectBox` 实现 `Draw`。

```rust
use gui::Draw;

struct SelectBox {
    width: u32,
    height: u32,
    options: Vec<String>,
}

impl Draw for SelectBox {
    fn draw(&self) {
        // code to actually draw a select box
    }
}
```

**清单 18-9** 用 trait 对象存放不同类型。

```rust
use gui::{Button, Screen};

fn main() {
    let screen = Screen {
        components: vec![
            Box::new(SelectBox {
                width: 75,
                height: 10,
                options: vec![
                    String::from("Yes"),
                    String::from("Maybe"),
                    String::from("No"),
                ],
            }),
            Box::new(Button {
                width: 50,
                height: 10,
                label: String::from("OK"),
            }),
        ],
    };

    screen.run();
}
```

这与动态类型语言的鸭子类型（duck typing）思路类似：只关心能响应什么方法，不关心具体类型。区别是 Rust 在编译期检查，不会在运行时才发现方法不存在。

**清单 18-10** 传 `String` 会编译失败，因为没实现 `Draw`。

```rust
use gui::Screen;

fn main() {
    let screen = Screen {
        components: vec![Box::new(String::from("Hi"))],
    };

    screen.run();
}
```

编译报错，因为 `String` 没实现 `Draw`：

```console
$ cargo run
   Compiling gui v0.1.0 (file:///projects/gui)
error[E0277]: the trait bound `String: Draw` is not satisfied
  --> src/main.rs:5:26
   |
 5 |         components: vec![Box::new(String::from("Hi"))],
   |                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ the trait `Draw` is not implemented for `String`
   |
help: the trait `Draw` is implemented for `Button`
  --> src/lib.rs:23:1
   |
23 | impl Draw for Button {
   | ^^^^^^^^^^^^^^^^^^^^
   = note: required for the cast from `Box<String>` to `Box<dyn Draw>`

For more information about this error, try `rustc --explain E0277`.
error: could not compile `gui` (bin "gui") due to 1 previous error
```

这个错误提示你：要么传错了类型，要么为 `String` 实现 `Draw`。

### 动态分发

第 10 章讲过泛型单态化：为每个具体类型生成专用代码，这叫静态分发（static dispatch），编译期就知道调用哪个方法。

trait 对象用动态分发（dynamic dispatch）：运行时通过指针查表决定调哪个方法。代价是查表开销、无法内联。还有一套 dyn 兼容性规则限制使用场景。换来的是灵活性。

**对照**：trait 对象相当于 Java / C++ 的虚函数表（vtable），Go 的 interface 值也是类似机制。区别是 Rust 的 vtable 由编译器生成，且只有显式用 `dyn` 才走动态分发。
