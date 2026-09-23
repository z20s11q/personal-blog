---
title: "把模块拆到不同文件"
order: "ch07-05-separating-modules-into-different-files"
chapter: 7
---
模块变大时，把模块体挪到单独的文件。crate root 可以是 `src/lib.rs` 或 `src/main.rs`。

在 crate root 只留 `mod front_of_house;`，模块体放到 `src/front_of_house.rs`。文件还没建时编不过。

**清单 7-21** 声明 `front_of_house`，模块体在 `src/front_of_house.rs`。

文件：src/lib.rs

```rust
mod front_of_house;

pub use crate::front_of_house::hosting;

pub fn eat_at_restaurant() {
    hosting::add_to_waitlist();
}
```

编译器在 crate root 看到 `mod front_of_house`，就去读 `src/front_of_house.rs`。

**清单 7-22** `front_of_house` 的定义。

文件：src/front_of_house.rs

```rust
pub mod hosting {
    pub fn add_to_waitlist() {}
}
```

每个模块的 `mod` 在模块树里只写一次。其他文件用路径引用已经声明的项。

**对照**：`mod` 不是 C/C++ 的 `#include`，不会把文件再粘进来一遍。文件放哪，由 `mod` 写在模块树的哪一层决定。

子模块 `hosting` 的父模块是 `front_of_house`，文件放在 `src/front_of_house/`。`src/front_of_house.rs` 里只留声明。

文件：src/front_of_house.rs

```rust
pub mod hosting;
```

模块体放到 `src/front_of_house/hosting.rs`。

文件：src/front_of_house/hosting.rs

```rust
pub fn add_to_waitlist() {}
```

若把文件放成 `src/hosting.rs`，编译器会把它当成 crate 根的子模块 `hosting`，而不是 `front_of_house` 的子模块。目录跟着模块树走。

另一套仍然支持的路径（同一个模块不能两套一起用）：

- crate 根上的 `front_of_house`：`src/front_of_house.rs`，或 `src/front_of_house/mod.rs`
- 其子模块 `hosting`：`src/front_of_house/hosting.rs`，或 `src/front_of_house/hosting/mod.rs`

两种风格混在不同模块上可以编译，找文件时容易混。`mod.rs` 会在编辑器里堆出很多同名文件。

拆文件不改变模块树。调用和 `pub use` 不用改。`use` 不决定哪些文件参与编译；`mod` 声明模块，编译器按模块名找同名文件。

## 小结

- 包拆成多个 crate，crate 拆成模块。
- 跨模块用绝对路径（`crate::` 或外部 crate 名）或相对路径（`self`、`super`、当前模块里的名字）。
- `use` 把路径引进作用域；`pub use` 再导出；`as` 起别名。
- 项默认私有，要公开就加 `pub`。struct 字段另算；`pub enum` 的变体全部公开。
