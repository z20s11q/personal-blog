---
title: "用路径指向模块树中的项"
order: "ch07-03-paths-for-referring-to-an-item-in-the-module-tree"
chapter: 7
---
路径用 `::` 连接标识符。

- **绝对路径**：从 crate 根开始。当前 crate 用字面量 `crate`；外部 crate 用 crate 名。
- **相对路径**：从当前模块开始，用 `self`、`super`，或当前模块里的名字。

**清单 7-3** 在 crate 根用绝对路径和相对路径调用 `add_to_waitlist`。路径写对了，仍编不过。作为库的公共 API 的函数要 `pub`。

文件：src/lib.rs

```rust
mod front_of_house {
    mod hosting {
        fn add_to_waitlist() {}
    }
}

pub fn eat_at_restaurant() {
    // Absolute path
    crate::front_of_house::hosting::add_to_waitlist();

    // Relative path
    front_of_house::hosting::add_to_waitlist();
}
```

- 绝对路径从 `crate` 往下走，相当于从文件系统根 `/` 出发。
- 相对路径从与调用方同级的模块名出发。

定义和调用会一起搬走时，相对路径少改；各自搬走时，绝对路径少改。更常见的是分开搬，所以更常用绝对路径。

**清单 7-4** 编译错误：模块 `hosting` 私有。

```console
$ cargo build
   Compiling restaurant v0.1.0 (file:///projects/restaurant)
error[E0603]: module `hosting` is private
 --> src/lib.rs:9:28
  |
9 |     crate::front_of_house::hosting::add_to_waitlist();
  |                            ^^^^^^^  --------------- function `add_to_waitlist` is not publicly re-exported
  |                            |
  |                            private module
  |
note: the module `hosting` is defined here
 --> src/lib.rs:2:5
  |
2 |     mod hosting {
  |     ^^^^^^^^^^^

error[E0603]: module `hosting` is private
  --> src/lib.rs:12:21
   |
12 |     front_of_house::hosting::add_to_waitlist();
   |                     ^^^^^^^  --------------- function `add_to_waitlist` is not publicly re-exported
   |                     |
   |                     private module
   |
note: the module `hosting` is defined here
  --> src/lib.rs:2:5
   |
 2 |     mod hosting {
   |     ^^^^^^^^^^^

For more information about this error, try `rustc --explain E0603`.
error: could not compile `restaurant` (lib) due to 2 previous errors
```

项（函数、方法、struct、enum、模块、常量）默认对父模块私有。

- 父模块不能用子模块里的私有项。
- 子模块可以用祖先模块里的项。
- `pub` 把子模块的项暴露给祖先。

**对照**：父模块看不见子模块的私有项。Java 的包私有是同一包可见；Go 靠首字母大写对包外可见；Python 的 `_` 只是约定；C++ 的 `private` 在类上。Rust 的可见性沿着模块树。

### 用 `pub` 暴露路径

**清单 7-5** 给 `hosting` 加 `pub`。

文件：src/lib.rs

```rust
mod front_of_house {
    pub mod hosting {
        fn add_to_waitlist() {}
    }
}

// -- snip --
```

**清单 7-6** 模块公开之后，`add_to_waitlist` 仍是私有函数。

```console
$ cargo build
   Compiling restaurant v0.1.0 (file:///projects/restaurant)
error[E0603]: function `add_to_waitlist` is private
  --> src/lib.rs:10:37
   |
10 |     crate::front_of_house::hosting::add_to_waitlist();
   |                                     ^^^^^^^^^^^^^^^ private function
   |
note: the function `add_to_waitlist` is defined here
  --> src/lib.rs:3:9
   |
 3 |         fn add_to_waitlist() {}
   |         ^^^^^^^^^^^^^^^^^^^^

error[E0603]: function `add_to_waitlist` is private
  --> src/lib.rs:13:30
   |
13 |     front_of_house::hosting::add_to_waitlist();
   |                              ^^^^^^^^^^^^^^^ private function
   |
note: the function `add_to_waitlist` is defined here
  --> src/lib.rs:3:9
   |
 3 |         fn add_to_waitlist() {}
   |         ^^^^^^^^^^^^^^^^^^^^

For more information about this error, try `rustc --explain E0603`.
error: could not compile `restaurant` (lib) due to 2 previous errors
```

`pub mod` 只让祖先能引用这个模块。模块里的项仍默认私有，函数、方法、struct、enum 都要各自加 `pub`。

**清单 7-7** `hosting` 和 `add_to_waitlist` 都 `pub` 之后，调用才能通过。

文件：src/lib.rs

```rust
mod front_of_house {
    pub mod hosting {
        pub fn add_to_waitlist() {}
    }
}

// -- snip --
```

路径上每一级都要对当前位置可见：

- `eat_at_restaurant` 和 `front_of_house` 同在 crate 根，是兄弟。`front_of_house` 没有 `pub` 也能互相引用。
- `hosting` 和 `add_to_waitlist` 是 `pub`，而且调用方能看见它们的父模块，所以能继续往下。
- 相对路径只是起点换成同级模块名，后面规则相同。

对外发布的库，公共 API 是契约。

同一个包既有 `src/main.rs` 又有 `src/lib.rs` 时，模块树放在库里。二进制用包名当路径前缀，和外部使用者一样，只能调用库的公共项。

### 用 `super` 开头的相对路径

`super` 表示父模块，类似路径里的 `..`。子模块会跟着父模块一起搬时，用它少改调用点。

**清单 7-8** `back_of_house` 里用 `super::deliver_order()` 调用父模块的函数。

文件：src/lib.rs

```rust
fn deliver_order() {}

mod back_of_house {
    fn fix_incorrect_order() {
        cook_order();
        super::deliver_order();
    }

    fn cook_order() {}
}
```

`super` 从 `back_of_house` 上到父模块 `crate`，找到 `deliver_order`。

### 公开 struct 和 enum

- `pub struct` 只公开类型。字段仍默认私有，要公开的字段单独加 `pub`。
- 有私有字段时，模块外不能用字面量构造，要提供公开的关联函数来填私有字段。
- `pub enum` 会公开全部变体，变体不用再写 `pub`。

**对照**：struct 字段逐个标 `pub`。enum 变体跟着 enum 一起公开，不用像 C++ 那样每个枚举项再标一次，也不是 Java 那种类和成员各写各的访问修饰符就能混用同一套默认。

**清单 7-9** 公开的 `Breakfast`：`toast` 公开，`seasonal_fruit` 私有。

文件：src/lib.rs

```rust
mod back_of_house {
    pub struct Breakfast {
        pub toast: String,
        seasonal_fruit: String,
    }

    impl Breakfast {
        pub fn summer(toast: &str) -> Breakfast {
            Breakfast {
                toast: String::from(toast),
                seasonal_fruit: String::from("peaches"),
            }
        }
    }
}

pub fn eat_at_restaurant() {
    // Order a breakfast in the summer with Rye toast.
    let mut meal = back_of_house::Breakfast::summer("Rye");
    // Change our mind about what bread we'd like.
    meal.toast = String::from("Wheat");
    println!("I'd like {} toast please", meal.toast);

    // The next line won't compile if we uncomment it; we're not allowed
    // to see or modify the seasonal fruit that comes with the meal.
    // meal.seasonal_fruit = String::from("blueberries");
}
```

模块外可以读写 `toast`，不能读写 `seasonal_fruit`。私有字段只能在模块内赋值，所以要有公开构造函数（这里是 `summer`）。

**清单 7-10** `pub enum` 的变体在模块外都可用。

文件：src/lib.rs

```rust
mod back_of_house {
    pub enum Appetizer {
        Soup,
        Salad,
    }
}

pub fn eat_at_restaurant() {
    let order1 = back_of_house::Appetizer::Soup;
    let order2 = back_of_house::Appetizer::Salad;
}
```

`Appetizer` 公开后，`Soup` 和 `Salad` 都能在 `eat_at_restaurant` 里用。`use` 见下一节。
