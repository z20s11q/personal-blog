---
title: "变量与可变性"
order: "ch03-01-variables-and-mutability"
chapter: 3
---
`let` 绑定默认不可变。绑定后再赋值会编译失败。

**对照**：Java 局部变量默认可变，C++ 要写 `const` 才不可变，Go 的 `:=` 默认可变。

文件：src/main.rs

```rust
fn main() {
    let x = 5;
    println!("The value of x is: {x}");
    x = 6;
    println!("The value of x is: {x}");
}
```

报错 `cannot assign twice to immutable variable`：不可变绑定不能再次赋值。

```console
$ cargo run
   Compiling variables v0.1.0 (file:///projects/variables)
error[E0384]: cannot assign twice to immutable variable `x`
 --> src/main.rs:4:5
  |
2 |     let x = 5;
  |         - first assignment to `x`
3 |     println!("The value of x is: {x}");
4 |     x = 6;
  |     ^^^^^ cannot assign twice to immutable variable
  |
help: consider making this binding mutable
  |
2 |     let mut x = 5;
  |         +++

For more information about this error, try `rustc --explain E0384`.
error: could not compile `variables` (bin "variables") due to 1 previous error
```

要修改就写成 `let mut`。`mut` 也标明这个绑定会被改。

文件：src/main.rs

```rust
fn main() {
    let mut x = 5;
    println!("The value of x is: {x}");
    x = 6;
    println!("The value of x is: {x}");
}
```

```console
$ cargo run
   Compiling variables v0.1.0 (file:///projects/variables)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.30s
     Running `target/debug/variables`
The value of x is: 5
The value of x is: 6
```

### 声明常量

`const` 和不可变变量的差别：

- 不能加 `mut`，永远不可变。
- 用 `const` 而不是 `let`，并且必须标注类型。
- 可以写在任意作用域，包括全局。
- 只能是常量表达式，不能是只在运行时才能算出的值。

```rust
const THREE_HOURS_IN_SECONDS: u32 = 60 * 60 * 3;
```

常量名全大写，单词之间用下划线。编译器会做有限的编译期求值，所以可以写成运算式。

常量在声明它的作用域内、程序整个运行期间都有效。

### 遮蔽

同一名字可以再用 `let` 声明一次。新绑定遮蔽旧绑定，直到它自己被遮蔽，或作用域结束。

文件：src/main.rs

```rust
fn main() {
    let x = 5;

    let x = x + 1;

    {
        let x = x * 2;
        println!("The value of x in the inner scope is: {x}");
    }

    println!("The value of x is: {x}");
}
```

内层 `{}` 里的遮蔽只在该块内有效。离开后，名字回到外层那个绑定。

```console
$ cargo run
   Compiling variables v0.1.0 (file:///projects/variables)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.31s
     Running `target/debug/variables`
The value of x in the inner scope is: 12
The value of x is: 6
```

遮蔽和 `mut` 不同：

- 不写 `let` 就再赋值，编译失败。变换做完后，绑定仍不可变。
- 再次 `let` 是新绑定，类型可以变，名字可以复用。`mut` 不能改类型。

```rust
    let spaces = "   ";
    let spaces = spaces.len();
```

用 `mut` 赋成另一种类型会编译失败。

```rust
    let mut spaces = "   ";
    spaces = spaces.len();
```

报错 `mismatched types`：绑定的类型不能变。

```console
$ cargo run
   Compiling variables v0.1.0 (file:///projects/variables)
error[E0308]: mismatched types
 --> src/main.rs:3:14
  |
2 |     let mut spaces = "   ";
  |                      ----- expected due to this value
3 |     spaces = spaces.len();
  |              ^^^^^^^^^^^^ expected `&str`, found `usize`

For more information about this error, try `rustc --explain E0308`.
error: could not compile `variables` (bin "variables") due to 1 previous error
```
