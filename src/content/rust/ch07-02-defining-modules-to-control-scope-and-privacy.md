---
title: "用模块控制作用域和可见性"
order: "ch07-02-defining-modules-to-control-scope-and-privacy"
chapter: 7
---
路径用来命名项；`use` 把路径引进作用域；`pub` 控制公开。后面还有 `as`、外部包和 glob。

### 模块速查

- **从 crate root 开始**：库一般是 `src/lib.rs`，二进制一般是 `src/main.rs`。
- **声明模块**：在 crate root 写 `mod garden;`。编译器按这个顺序找代码：
  - `mod garden { ... }` 内联
  - `src/garden.rs`
  - `src/garden/mod.rs`
- **声明子模块**：例如在 `src/garden.rs` 里写 `mod vegetables;`。到父模块同名目录下找：
  - 紧跟 `mod` 的 `{ ... }` 内联
  - `src/garden/vegetables.rs`
  - `src/garden/vegetables/mod.rs`
- **路径**：同一 crate 里、可见性允许时，例如 `crate::garden::vegetables::Asparagus`。
- **默认私有**：子模块对父模块私有。公开模块写 `pub mod`。公开模块里的项还要各自加 `pub`。
- **`use`**：在当前作用域建短名。`use crate::garden::vegetables::Asparagus;` 之后写 `Asparagus`。

下面是二进制 crate `backyard` 的目录。

```text
backyard
├── Cargo.lock
├── Cargo.toml
└── src
    ├── garden
    │   └── vegetables.rs
    ├── garden.rs
    └── main.rs
```

crate root 是 `src/main.rs`。

文件：src/main.rs

```rust
use crate::garden::vegetables::Asparagus;

pub mod garden;

fn main() {
    let plant = Asparagus {};
    println!("I'm growing {plant:?}!");
}
```

`pub mod garden;` 让编译器载入 `src/garden.rs`。

文件：src/garden.rs

```rust
pub mod vegetables;
```

`pub mod vegetables;` 再载入 `src/garden/vegetables.rs`。

```rust
#[derive(Debug)]
pub struct Asparagus {}
```

### 把相关代码放进模块

`mod` 在 crate 内部组织代码，并控制可见性。模块里的项默认私有。要给外部用，模块和项都要 `pub`。

模块里可以再嵌模块，也可以放 struct、enum、常量、trait、函数。

**清单 7-1** `front_of_house` 里嵌套 `hosting`、`serving` 和函数。

文件：src/lib.rs

```rust
mod front_of_house {
    mod hosting {
        fn add_to_waitlist() {}

        fn seat_at_table() {}
    }

    mod serving {
        fn take_order() {}

        fn serve_order() {}

        fn take_payment() {}
    }
}
```

`mod 名字 { ... }` 定义模块。

`src/main.rs` 和 `src/lib.rs` 的内容构成名为 `crate` 的根模块。整棵结构叫模块树。

**清单 7-2** 清单 7-1 的模块树。

```text
crate
 └── front_of_house
     ├── hosting
     │   ├── add_to_waitlist
     │   └── seat_at_table
     └── serving
         ├── take_order
         ├── serve_order
         └── take_payment
```

- 嵌套：`hosting` 在 `front_of_house` 里，是子模块；`front_of_house` 是父模块。
- 兄弟：同一模块里定义的项，如 `hosting` 和 `serving`。
- 整棵树挂在隐式模块 `crate` 下面。
- 模块树对应目录树，后面按路径找项。
