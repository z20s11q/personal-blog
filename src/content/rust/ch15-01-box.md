---
title: "用 `Box<T>` 指向堆上的数据"
order: "ch15-01-box"
chapter: 15
---
`Box<T>` 把值放在堆上，栈上只留指针。除堆分配外没有额外开销，也没有别的能力。

适用：

- 编译期大小未知，但使用处要求大小确定
- 转移大量数据的所有权，只移动指针，避免在栈上整份复制
- 只关心实现了某个 trait，不关心具体类型（trait object，第 18 章）

### 把数据放在堆上

**清单 15-1** 用 `Box::new` 把一个 `i32` 放到堆上。

```rust
fn main() {
    let b = Box::new(5);
    println!("b = {b}");
}
```

`Box` 离开作用域时，栈上的指针和堆上的数据一起释放。单个 `i32` 默认就在栈上，不必装箱。

### 用 Box 启用递归类型

递归类型把同类型的值嵌在自身里。编译期必须知道类型占多少空间；无限嵌套则大小无法确定。`Box<T>` 的大小固定（一个指针），放进递归位置就能打断这条链。

#### 理解 cons list

cons list 是嵌套对：当前值加下一项，末尾是 `Nil`。

```text
(1, (2, (3, Nil)))
```

每一项是当前值加下一项；最后一项只有 `Nil`。这里的 `Nil` 是递归基例，不是第 6 章那种无效或缺失的值。

Rust 里普通列表用 `Vec<T>`。这个例子只用来演示递归类型。

**清单 15-2** 用 enum 定义只存 `i32` 的 cons list，此时还没有已知大小，不能编译。

```rust
enum List {
    Cons(i32, List),
    Nil,
}
```

示例限定存 `i32`。要存任意类型，按第 10 章做成泛型即可。

**清单 15-3** 用 `List` 表示 `1, 2, 3`。

```rust
// --snip--

use crate::List::{Cons, Nil};

fn main() {
    let list = Cons(1, Cons(2, Cons(3, Nil)));
}
```

外层 `Cons` 持有 `1` 和下一个 `List`，一层层嵌到 `Nil`。

**清单 15-4** 变体直接包含同类型时的编译错误。

```console
$ cargo run
   Compiling cons-list v0.1.0 (file:///projects/cons-list)
error[E0072]: recursive type `List` has infinite size
 --> src/main.rs:1:1
  |
1 | enum List {
  | ^^^^^^^^^
2 |     Cons(i32, List),
  |               ---- recursive without indirection
  |
help: insert some indirection (e.g., a `Box`, `Rc`, or `&`) to break the cycle
  |
2 |     Cons(i32, Box<List>),
  |               ++++    +

For more information about this error, try `rustc --explain E0072`.
error: could not compile `cons-list` (bin "cons-list") due to 1 previous error
```

报错是 recursive type has infinite size：变体直接持有另一个 `List`，编译器算不出固定大小。

#### 非递归类型怎么算大小

非递归 enum 只可能处于一个变体，大小取最占空间的那个。

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(i32, i32, i32),
}
```

`Quit` 不占数据，`Move` 是两个 `i32`，整个 `Message` 按最大变体分配。

`List` 的 `Cons` 需要一个 `i32` 再加一个 `List`，而这个 `List` 又含 `Cons`，展开没有尽头。

#### 得到大小已知的递归类型

编译器建议插入间接层（`Box`、`Rc` 或引用）来打断循环。

```text
help: insert some indirection (e.g., a `Box`, `Rc`, or `&`) to break the cycle
  |
2 |     Cons(i32, Box<List>),
  |               ++++    +
```

间接层是不直接存值，而存指向值的指针。`Box<T>` 的大小与所指向的数据无关，所以 `Cons` 里放 `Box<List>`，下一节 `List` 在堆上。

**清单 15-5** 用 `Box<T>` 定义大小已知的 `List`。

```rust
enum List {
    Cons(i32, Box<List>),
    Nil,
}

use crate::List::{Cons, Nil};

fn main() {
    let list = Cons(1, Box::new(Cons(2, Box::new(Cons(3, Box::new(Nil))))));
}
```

`Cons` 的大小是一个 `i32` 加上 box 的指针；`Nil` 更小。enum 取最大变体，所以任意 `List` 都是这个固定大小。

`Box<T>` 只提供间接和堆分配。它实现 `Deref`（可以当引用用）和 `Drop`（离开作用域时释放堆数据）。

**对照**：`Box<T>` 接近 C++ `unique_ptr`：独占所有权，移动的是指针，不复制堆上的数据。
