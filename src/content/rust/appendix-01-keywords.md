---
title: "附录 A：关键字"
order: "z-appendix-01-keywords"
chapter: null
---
关键字不能当标识符，除非写成原始标识符 `r#`。标识符包括函数、变量、参数、字段、模块、crate、常量、宏、静态项、属性、类型、trait、生命周期的名字。

### 正在使用的关键字

- **`as`**：基本类型转换；消歧 trait 中的项；在 `use` 里重命名。
- **`async`**：返回 `Future`，不阻塞当前线程。
- **`await`**：挂起，直到 `Future` 就绪。
- **`break`**：立刻退出循环。
- **`const`**：常量项，或常量裸指针。
- **`continue`**：进入下一轮循环。
- **`crate`**：路径里表示 crate 根。
- **`dyn`**：trait 对象，动态分发。
- **`else`**：`if` / `if let` 的否则分支。
- **`enum`**：定义枚举。
- **`extern`**：链接外部函数或变量。
- **`false`**：布尔假。
- **`fn`**：定义函数，或函数指针类型。
- **`for`**：迭代；为实现写 `for Type`；高阶生命周期。
- **`if`**：按条件分支。
- **`impl`**：固有实现或 trait 实现。
- **`in`**：`for` 循环的一部分。
- **`let`**：绑定变量。
- **`loop`**：无条件循环。
- **`match`**：按模式匹配。
- **`mod`**：定义模块。
- **`move`**：闭包取得捕获值的所有权。
- **`mut`**：引用、裸指针或模式绑定可变。
- **`pub`**：字段、`impl` 或模块公开。
- **`ref`**：按引用绑定。
- **`return`**：从函数返回。
- **`Self`**：正在定义或实现的那个类型。
- **`self`**：方法接收者，或当前模块。
- **`static`**：全局变量，或贯穿整个程序的生命周期。
- **`struct`**：定义结构体。
- **`super`**：当前模块的父模块。
- **`trait`**：定义 trait。
- **`true`**：布尔真。
- **`type`**：类型别名或关联类型。
- **`union`**：定义联合体；只在联合体声明这个位置是关键字。
- **`unsafe`**：不安全的代码、函数、trait 或实现。
- **`use`**：把名字引入作用域。
- **`where`**：类型约束子句。
- **`while`**：按条件循环。

### 留给将来的关键字

尚无功能，不能当标识符：

- `abstract`
- `become`
- `box`
- `do`
- `final`
- `gen`
- `macro`
- `override`
- `priv`
- `try`
- `typeof`
- `unsized`
- `virtual`
- `yield`

### 原始标识符

关键字前加 `r#` 就能当标识符。下面把 `match` 当函数名，编不过。

文件：src/main.rs

```rust
fn match(needle: &str, haystack: &str) -> bool {
    haystack.contains(needle)
}
```

关键字不能当标识符。

```text
error: expected identifier, found keyword `match`
 --> src/main.rs:4:4
  |
4 | fn match(needle: &str, haystack: &str) -> bool {
  |    ^^^^^ expected identifier, found keyword
```

定义和调用都要写 `r#` 前缀。

文件：src/main.rs

```rust
fn r#match(needle: &str, haystack: &str) -> bool {
    haystack.contains(needle)
}

fn main() {
    assert!(r#match("foo", "foobar"));
}
```

`r#` 用来调用保留字名字，包括别的语言生成的绑定，以及更老 edition 里的同名项。`try` 在 2015 不是关键字，在 2018、2021、2024 是。依赖 2015 crate 的 `try` 函数时，新 edition 里写成 `r#try`。
