---
title: "用 vector 存值列表"
order: "ch08-01-vectors"
chapter: 8
---
`Vec<T>` 把同一类型的值在内存里连续存放，长度运行时可变。

### 新建 vector

空 vector 用 `Vec::new()`。还没有元素时，编译器推不出 `T`，要写类型标注。

**清单 8-1** 空的 `Vec<i32>`。

```rust
    let v: Vec<i32> = Vec::new();
```

`Vec<T>` 是泛型，能装任意 `T`。有初值时用 `vec!`，类型从元素推断。整数默认 `i32`。

**清单 8-2** `vec![1, 2, 3]` 得到 `Vec<i32>`。

```rust
    let v = vec![1, 2, 3];
```

有初值时不必再写 `Vec<i32>`。

### 更新 vector

追加用 `push`。要修改 vector，绑定必须是 `mut`。

**清单 8-3** `push` 追加元素，类型由实参推断。

```rust
    let mut v = Vec::new();

    v.push(5);
    v.push(6);
    v.push(7);
    v.push(8);
```

实参都是 `i32` 时，不用写 `Vec<i32>`。

### 读取元素

下标从 0 开始。

- `&v[i]`：得到 `&T`。越界 panic。适合越界就是程序错误的情况。
- `v.get(i)`：得到 `Option<&T>`。越界是 `None`，不 panic。适合下标在正常流程里可能不合法。

**清单 8-4** 下标和 `get`。

```rust
    let v = vec![1, 2, 3, 4, 5];

    let third: &i32 = &v[2];
    println!("The third element is {third}");

    let third: Option<&i32> = v.get(2);
    match third {
        Some(third) => println!("The third element is {third}"),
        None => println!("There is no third element."),
    }
```

下标 `2` 是第三个元素。`&v[2]` 是引用；`get` 得到 `Option<&T>`，用 `match` 分开 `Some` 和 `None`。

**清单 8-5** 只有 5 个元素时访问下标 100。

```rust
    let v = vec![1, 2, 3, 4, 5];

    let does_not_exist = &v[100];
    let does_not_exist = v.get(100);
```

`[]` 越界 panic。`get` 越界返回 `None`。

持有元素引用时，借用规则仍在：同一作用域里不能既有不可变借用又有可变借用。`push` 可能重新分配，已有的元素引用会悬空。

**对照**：`Vec<T>` 接近 Java `ArrayList<T>`、C++ `std::vector<T>`、Go 的 slice。元素必须是同一个具体类型，没有 Python `list` 那种异构列表。扩容可能搬家，已有元素引用不能跨过 `push`，和 `std::vector` 迭代器失效同类，但是编译期就拒绝。

**清单 8-6** 持有 `&v[0]` 时再 `push`。

```rust
    let mut v = vec![1, 2, 3, 4, 5];

    let first = &v[0];

    v.push(6);

    println!("The first element is: {first}");
```

`v` 已经被不可变借用，不能再 `push`。

```console
$ cargo run
   Compiling collections v0.1.0 (file:///projects/collections)
error[E0502]: cannot borrow `v` as mutable because it is also borrowed as immutable
 --> src/main.rs:6:5
  |
4 |     let first = &v[0];
  |                  - immutable borrow occurs here
5 |
6 |     v.push(6);
  |     ^^^^^^^^^ mutable borrow occurs here
7 |
8 |     println!("The first element is: {first}");
  |                                      ----- immutable borrow later used here

For more information about this error, try `rustc --explain E0502`.
error: could not compile `collections` (bin "collections") due to 1 previous error
```

`Vec` 连续存放。容量不够时 `push` 会重新分配并搬走旧元素，旧引用会指向已释放的内存。借用检查在编译期挡住这种情况。

### 遍历 vector

`for i in &v` 得到每个元素的 `&T`。`for i in &mut v` 得到 `&mut T`，改值要先 `*` 解引用。循环持有对整个 vector 的借用，循环体内不能插入或删除。

**清单 8-7** 遍历不可变引用。

```rust
    let v = vec![100, 32, 57];
    for i in &v {
        println!("{i}");
    }
```

改 `&mut T` 指向的值要先 `*`。

**清单 8-8** 遍历可变引用，每个元素加 50。

```rust
    let mut v = vec![100, 32, 57];
    for i in &mut v {
        *i += 50;
    }
```

遍历时 `for` 借用整个 `Vec`，循环里插入或删除会和清单 8-6 一样被拒绝。

### 用 enum 在 vector 里存多种类型

元素类型必须相同，编译期要知道每个元素占多大。把不同数据放进同一个 enum 的变体，vector 的 `T` 就是这个 enum。`match` 必须覆盖全部分支。运行时才知道有哪些类型时，enum 不够，用 trait object（第 18 章）。

**对照**：Java 的 `ArrayList<Object>` 和 Python 的 `list` 可以混类型。Rust 要在编译期定下每个槽的大小，混类型用带数据的 enum（接近 C++ `std::variant`）。

**清单 8-9** 一个 vector 里存整数、浮点和字符串。

```rust
    enum SpreadsheetCell {
        Int(i32),
        Float(f64),
        Text(String),
    }

    let row = vec![
        SpreadsheetCell::Int(3),
        SpreadsheetCell::Text(String::from("blue")),
        SpreadsheetCell::Float(10.12),
    ];
```

类型集合在运行时才封闭时，这段写法不适用。除 `push` 外还有 `pop`（弹出并返回最后一个元素）等，见标准库。

### vector 被 drop 时元素一并 drop

`Vec` 离开作用域就 drop，元素也 drop。指向元素的引用只能在 vector 仍然有效时使用。

**清单 8-10** vector 离开作用域时释放。

```rust
    {
        let v = vec![1, 2, 3, 4];

        // do stuff with v
    } // <- v goes out of scope and is freed here
```

vector drop 时，里面的值一并清理。借用检查保证不会在 vector 失效后使用它的内容。
