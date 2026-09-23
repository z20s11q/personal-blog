---
title: "什么是所有权"
order: "ch04-01-what-is-ownership"
chapter: 4
---
所有权是一组规则，规定 Rust 如何管理内存。与 GC（Java、Go、Python）和手动 `free`（C/C++）都不同：内存由编译器按规则检查，违反规则的代码不编译，运行时没有额外开销。

> ### 栈与堆
>
> 栈：后进先出，数据大小必须编译期已知。
> 堆：向分配器申请一块足够大的空间，拿到指针。大小未知或会变的数据放堆上。
>
> 入栈比堆分配快（不需搜索空位）；访问堆数据比栈慢（要跟指针）。
>
> 函数调用时，参数和局部变量入栈；函数结束时出栈。
>
> 所有权的核心目的就是管理堆数据：跟踪谁在用、减少重复、及时释放。

### 所有权规则

- 每个值有一个所有者。
- 同一时刻只能有一个所有者。
- 所有者离开作用域时，值被丢弃（drop）。

### 变量作用域

作用域是程序中某个项有效的范围。变量从声明处到当前作用域结束都有效。

```rust
let s = "hello";
```

`s` 是硬编码在程序里的字符串字面量。从声明处到作用域结束有效。

**清单 4-1** 标注变量 `s` 有效范围。

```rust
    {                      // s is not valid here, since it's not yet declared
        let s = "hello";   // s is valid from this point forward

        // do stuff with s
    }                      // this scope is now over, and s is no longer valid
```

两个时间点：进入作用域时有效，离开作用域时失效。

这与多数语言一致。接下来引入 `String`，它的数据在堆上。

### `String` 类型

字面量不可变，且不是所有文本都能在编译期知道（比如用户输入）。`String` 管理堆上的数据，能在运行时增长，可以容纳编译期未知的文本。

`String::from("hello")` 从字面量构造。`::` 是命名空间语法（第 5 章、第 7 章详述）。

`String` 可以修改：

```rust
let s = String::from("hello");
```

**对照**：`String` 类似 Java / C++ 的 `std::string`（可变、堆分配），`&str` 更像 Java 的不可变字符串或 C++ 的 `string_view`。Go 的 `string` 不可变，Python 的 `str` 也不可变，要可变得靠 `bytearray` / 列表拼装。

```rust
    let mut s = String::from("hello");

    s.push_str(", world!"); // push_str() appends a literal to a String

    println!("{s}"); // this will print `hello, world!`
```

字面量在编译期已知，直接嵌进可执行文件，所以快，但不可变。`String` 数据大小运行期才知道，必须在堆上分配。

### 内存与分配

`String` 的内存申请由 `String::from` 完成；释放是关键区别：

- 有 GC 的语言自动回收。
- 无 GC 的语言手动 `free`（C/C++），必须一对一配对，早释放悬垂、重复释放内存损坏。
- Rust：所有者离开作用域时自动调用 `drop` 归还内存。

```rust
    {
        let s = String::from("hello"); // s is valid from this point forward

        // do stuff with s
    }                                  // this scope is now over, and s is no
                                       // longer valid
```

`s` 出作用域时，Rust 在右花括号处自动调用 `drop`。

**对照**：等价于 C++ 的 RAII。区别是 Rust 由编译器强制在每个作用域结束插入释放逻辑，不依赖手写析构函数，也没有「三法则」「五法则」那类问题。

#### 变量与数据交互：Move

多个变量可以以不同方式操作同一份数据。先看整数：

**清单 4-2** 把 `x` 的整数值赋给 `y`。

```rust
    let x = 5;
    let y = x;
```

`x` 和 `y` 都等于 5，两个 5 各自入栈。整数是已知大小的简单值。

再看 `String` 版本：

```rust
    let s1 = String::from("hello");
    let s2 = s1;
```

`String` 由三部分组成（栈上）：指向堆数据的指针、长度、容量。赋值 `s2 = s1` 只复制栈上这三个字段，不复制堆数据。

堆数据没有复制，所以不能两个变量都释放同一块内存（double free），否则内存损坏。

Rust 的做法：`let s2 = s1;` 之后 `s1` 立即失效。再使用 `s1` 编译报错：

```rust
    let s1 = String::from("hello");
    let s2 = s1;

    println!("{s1}, world!");
```

被称为 copy 的操作在这里实际上是 _move_：`s1` 被移入 `s2`。只有 `s2` 有效，出作用域时只释放一次。

推论：Rust 从不自动做深拷贝，任何自动复制都可认为是廉价的。

**对照**：C++ 移动后对象处于「有效但未指定」状态，仍可赋新值；Rust 的 move 是编译期检查，用已移动的值直接编译错误。Java / Go / Python 的赋值是引用拷贝，两个变量指向同一对象，没有失效概念。

#### 作用域与赋值

给已存在的变量赋全新值，Rust 会立刻 `drop` 原值。

```console
$ cargo run
   Compiling ownership v0.1.0 (file:///projects/ownership)
error[E0382]: borrow of moved value: `s1`
 --> src/main.rs:5:16
  |
2 |     let s1 = String::from("hello");
  |         -- move occurs because `s1` has type `String`, which does not implement the `Copy` trait
3 |     let s2 = s1;
  |              -- value moved here
4 |
5 |     println!("{s1}, world!");
  |                ^^ value borrowed here after move
  |
help: consider cloning the value if the performance cost is acceptable
  |
3 |     let s2 = s1.clone();
  |                ++++++++

For more information about this error, try `rustc --explain E0382`.
error: could not compile `ownership` (bin "ownership") due to 1 previous error
```

`s = String::from("ahoy")` 之后，原 `"hello"` 立即被 drop 释放。最后打印 `"ahoy, world!"`。

#### 变量与数据交互：Clone

要深拷贝堆数据，用 `clone`。

```rust
    let mut s = String::from("hello");
    s = String::from("ahoy");

    println!("{s}, world!");
```

`clone` 显式复制堆数据。看到 `clone` 就知道有代价发生。

#### 只在栈上的数据：Copy

```rust
    let s1 = String::from("hello");
    let s2 = s1.clone();

    println!("s1 = {s1}, s2 = {s2}");
```

`x` 在 `y` 创建后仍然有效，因为没有发生 move。

编译期已知大小的类型整个存栈上，复制廉价。这类类型实现 `Copy` trait：赋值不 move，而是按位复制，原变量仍可用。

实现 `Drop` 的类型（或其字段）不能实现 `Copy`，二者冲突。

**对照**：`Copy` 类似 C++ 里可平凡复制的 POD 类型，但 Rust 是显式标记，不是按类型形态自动推断。

实现了 `Copy` 的类型：

- 所有整数类型，如 `u32`。
- `bool`。
- 所有浮点类型，如 `f64`。
- 字符类型 `char`。
- 元素都是 `Copy` 的元组，如 `(i32, i32)`；`(i32, String)` 不是。

### 所有权与函数

把值传给函数，与赋值一样：可能 move，可能 copy。

**清单 4-3** 标注变量进出作用域。

```rust
    let x = 5;
    let y = x;

    println!("x = {x}, y = {y}");
```

传给 `takes_ownership` 后 `s` 失效，再用会编译错误。这类静态检查挡住错误。

### 返回值与作用域

返回值也会转移所有权。

**清单 4-4** 返回值的所有权转移。

```rust
fn main() {
    let s = String::from("hello");  // s comes into scope

    takes_ownership(s);             // s's value moves into the function...
                                    // ... and so is no longer valid here

    let x = 5;                      // x comes into scope

    makes_copy(x);                  // Because i32 implements the Copy trait,
                                    // x does NOT move into the function,
                                    // so it's okay to use x afterward.

} // Here, x goes out of scope, then s. However, because s's value was moved,
  // nothing special happens.

fn takes_ownership(some_string: String) { // some_string comes into scope
    println!("{some_string}");
} // Here, some_string goes out of scope and `drop` is called. The backing
  // memory is freed.

fn makes_copy(some_integer: i32) { // some_integer comes into scope
    println!("{some_integer}");
} // Here, some_integer goes out of scope. Nothing special happens.
```

规律：赋值给另一个变量就 move；包含堆数据的变量出作用域时，未 move 就被 drop。

每次传参又归还太啰嗦。Rust 提供了借用（references）来使用值而不用交所有权。

```rust
fn main() {
    let s1 = gives_ownership();        // gives_ownership moves its return
                                       // value into s1

    let s2 = String::from("hello");    // s2 comes into scope

    let s3 = takes_and_gives_back(s2); // s2 is moved into
                                       // takes_and_gives_back, which also
                                       // moves its return value into s3
} // Here, s3 goes out of scope and is dropped. s2 was moved, so nothing
  // happens. s1 goes out of scope and is dropped.

fn gives_ownership() -> String {       // gives_ownership will move its
                                       // return value into the function
                                       // that calls it

    let some_string = String::from("yours"); // some_string comes into scope

    some_string                        // some_string is returned and
                                       // moves out to the calling
                                       // function
}

// This function takes a String and returns a String.
fn takes_and_gives_back(a_string: String) -> String {
    // a_string comes into
    // scope

    a_string  // a_string is returned and moves out to the calling function
}
```

**清单 4-5** 用元组把参数的所有权交还。

```rust
fn main() {
    let s1 = String::from("hello");

    let (s2, len) = calculate_length(s1);

    println!("The length of '{s2}' is {len}.");
}

fn calculate_length(s: String) -> (String, usize) {
    let length = s.len(); // len() returns the length of a String

    (s, length)
}
```

太繁琐。下一节引入引用：使用值但不转移所有权。
