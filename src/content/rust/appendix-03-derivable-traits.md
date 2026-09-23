---
title: "附录 C：可派生 trait"
order: "z-appendix-03-derivable-traits"
chapter: null
---
`#[derive(...)]` 给结构体或枚举生成该 trait 的默认实现。下面每条是标准库里可派生的 trait 和这一句语义。要别的行为就手写实现。`Display` 不能派生：面向使用者的格式没有默认答案。外部库可以用过程宏为自己的 trait 提供 `derive`。

- **`Debug`**：调试格式 `{:?}`，给程序员看；`assert_eq!` 失败时用它打印两边的值。
- **`PartialEq`**：提供 `==` / `!=`；结构体全部字段相等才相等，枚举每个变体只等于自身。
- **`Eq`**：没有方法，标记每个值都等于自己；要求已有 `PartialEq`。`f32` / `f64` 不行，因为 `NaN != NaN`。`HashMap` 的键需要它。
- **`PartialOrd`**：提供 `<`、`>`、`<=`、`>=`，要求 `PartialEq`；`partial_cmp` 返回 `Option<Ordering>`，与 `NaN` 比较得到 `None`。结构体按字段声明顺序比较，枚举里先声明的变体更小。
- **`Ord`**：`cmp` 总是返回 `Ordering`，要求 `PartialOrd` 和 `Eq`。`BTreeSet<T>` 的元素需要它。
- **`Clone`**：显式复制，可以跑任意代码并复制堆数据；每个字段也必须 `Clone`。
- **`Copy`**：只复制栈上的位，不跑用户代码，所以没有可重载的方法；每个部分都要 `Copy`，并且类型必须同时 `Clone`。
- **`Hash`**：把值映成固定大小的哈希；每个字段也必须 `Hash`。`HashMap` 的键需要它。
- **`Default`**：`default` 由各字段的 `default` 合成，每个字段也必须 `Default`。`..Default::default()` 和 `Option::unwrap_or_default` 用它。
