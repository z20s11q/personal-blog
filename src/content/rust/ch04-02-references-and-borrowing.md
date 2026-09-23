---
title: "引用与借用"
order: "ch04-02-references-and-borrowing"
chapter: 4
---
清单 4-5 的问题：`String` 被 move 进函数，调用后不能再用，只能靠元组还回来。改用引用：引用像指针，是可跟随到数据的地址；区别是数据属于别的变量，引用只保证在其有效期内指向该类型的有效值。

下面把 `calculate_length` 改成接收引用，不再取得所有权：

文件：src/main.rs

```rust
fn main() {
    let s1 = String::from("hello");

    let len = calculate_length(&s1);
    // ANCHOR_END: here

    println!("The length of '{s1}' is {len}.");
}

fn calculate_length(s: &String) -> usize {
    s.len()
}
```

调用处写 `&s1`，定义处参数类型写 `&String`。`&` 表示引用，使用值但不取得所有权。

取引用的反面是解引用，用 `*`（第 8 章、第 15 章详述）。

```rust
    let s1 = String::from("hello");

    let len = calculate_length(&s1);
```

`&s1` 创建的引用指向 `s1` 的值但不拥有它，因此引用失效时不会 drop 目标值。

函数签名里的 `&` 表示参数是引用：

```rust
fn calculate_length(s: &String) -> usize { // s is a reference to a String
    s.len()
} // Here, s goes out of scope. But because s does not have ownership of what
  // it refers to, the String is not dropped.
```

参数 `s` 的作用域与普通参数相同，但它不持有所有权，失效时不会 drop 指向的值。传引用就无需靠返回值交还所有权。

创建引用的动作叫借用：借来的东西，用完要还，不属于你。

试着修改借来的值会怎样：

**清单 4-6** 试图修改被借用的值。

```rust
fn main() {
    let s = String::from("hello");

    change(&s);
}

fn change(some_string: &String) {
    some_string.push_str(", world");
}
```

编译报错。变量默认不可变，引用也一样。

```console
$ cargo run
   Compiling ownership v0.1.0 (file:///projects/ownership)
error[E0596]: cannot borrow `*some_string` as mutable, as it is behind a `&` reference
 --> src/main.rs:8:5
  |
8 |     some_string.push_str(", world");
  |     ^^^^^^^^^^^ `some_string` is a `&` reference, so it cannot be borrowed as mutable
  |
help: consider changing this to be a mutable reference
  |
7 | fn change(some_string: &mut String) {
  |                         +++

For more information about this error, try `rustc --explain E0596`.
error: could not compile `ownership` (bin "ownership") due to 1 previous error
```

### 可变引用

改成可变引用：变量加 `mut`，调用处传 `&mut s`，参数类型写 `&mut String`。

文件：src/main.rs

```rust
fn main() {
    let mut s = String::from("hello");

    change(&mut s);
}

fn change(some_string: &mut String) {
    some_string.push_str(", world");
}
```

签名写明 `&mut String`，一眼看出 `change` 会修改借来的值。

可变引用的核心限制：同一份数据只能有一个可变引用，其他任何引用都不能与之共存。下面创建两个可变引用，编译失败：

文件：src/main.rs

```rust
    let mut s = String::from("hello");

    let r1 = &mut s;
    let r2 = &mut s;

    println!("{r1}, {r2}");
```

编译报错。`r1` 的可变借用到 `println!` 才结束，期间 `r2` 又去借，不允许。

```console
$ cargo run
   Compiling ownership v0.1.0 (file:///projects/ownership)
error[E0499]: cannot borrow `s` as mutable more than once at a time
 --> src/main.rs:5:14
  |
4 |     let r1 = &mut s;
  |              ------ first mutable borrow occurs here
5 |     let r2 = &mut s;
  |              ^^^^^^ second mutable borrow occurs here
6 |
7 |     println!("{r1}, {r2}");
  |                -- first borrow later used here

For more information about this error, try `rustc --explain E0499`.
error: could not compile `ownership` (bin "ownership") due to 1 previous error
```

同一时刻只能有一个可变借用，换来的是编译期消除数据竞争。数据竞争的三个条件：

- 两个或更多指针同时访问同一数据。
- 至少一个指针在写。
- 没有同步机制。

数据竞争导致未定义行为，运行时极难排查。Rust 直接拒绝编译这类代码。

用花括号开新作用域可以有多个可变引用，只要不同时存在。

```rust
    let mut s = String::from("hello");

    {
        let r1 = &mut s;
    } // r1 goes out of scope here, so we can make a new reference with no problems.

    let r2 = &mut s;
```

可变引用与不可变引用同样不能共存：

```rust
    let mut s = String::from("hello");

    let r1 = &s; // no problem
    let r2 = &s; // no problem
    let r3 = &mut s; // BIG PROBLEM

    println!("{r1}, {r2}, and {r3}");
```

编译报错。不可变引用的读者不期望值被偷偷改掉。

多个不可变引用可以共存：只读互不影响。

引用的作用域从引入处到最后一次使用处。下面这段能编译，因为不可变引用的最后一次使用在 `println!`，早于可变引用创建：

```console
$ cargo run
   Compiling ownership v0.1.0 (file:///projects/ownership)
error[E0502]: cannot borrow `s` as mutable because it is also borrowed as immutable
 --> src/main.rs:6:14
  |
4 |     let r1 = &s; // no problem
  |              -- immutable borrow occurs here
5 |     let r2 = &s; // no problem
6 |     let r3 = &mut s; // BIG PROBLEM
  |              ^^^^^^ mutable borrow occurs here
7 |
8 |     println!("{r1}, {r2}, and {r3}");
  |                -- immutable borrow later used here

For more information about this error, try `rustc --explain E0502`.
error: could not compile `ownership` (bin "ownership") due to 1 previous error
```

`r1`、`r2` 的作用域在 `println!` 后结束，早于 `r3` 创建，不重叠，合法。

**对照**：C++ 的 `const T&` 与 `T&` 类似，但 C++ 没有编译期别名检查；Rust 把读写冲突变成编译错误。

```rust
    let mut s = String::from("hello");

    let r1 = &s; // no problem
    let r2 = &s; // no problem
    println!("{r1} and {r2}");
    // Variables r1 and r2 will not be used after this point.

    let r3 = &mut s; // no problem
    println!("{r3}");
```

### 悬垂引用

有指针的语言容易产生悬垂指针：内存已释放，指针还留着。Rust 编译器保证引用永不悬垂：有引用存在时，数据不会先于引用离开作用域。

试着制造一个：

文件：src/main.rs

```rust
fn main() {
    let reference_to_nothing = dangle();
}

fn dangle() -> &String {
    let s = String::from("hello");

    &s
}
```

编译报错，涉及生命周期（第 10 章详解）。关键是：

```console
$ cargo run
   Compiling ownership v0.1.0 (file:///projects/ownership)
error[E0106]: missing lifetime specifier
 --> src/main.rs:5:16
  |
5 | fn dangle() -> &String {
  |                ^ expected named lifetime parameter
  |
  = help: this function's return type contains a borrowed value, but there is no value for it to be borrowed from
help: consider using the `'static` lifetime, but this is uncommon unless you're returning a borrowed value from a `const` or a `static`
  |
5 | fn dangle() -> &'static String {
  |                 +++++++
help: instead, you are more likely to want to return an owned value
  |
5 - fn dangle() -> &String {
5 + fn dangle() -> String {
  |

For more information about this error, try `rustc --explain E0106`.
error: could not compile `ownership` (bin "ownership") due to 1 previous error
```

细看 `dangle`：

文件：src/main.rs

```text
this function's return type contains a borrowed value, but there is no value
for it to be borrowed from
```

`s` 在 `dangle` 内创建，函数结束时被释放，返回它的引用会指向无效数据，编译器不允许。正确做法是直接返回 `String`：

```rust
fn dangle() -> &String { // dangle returns a reference to a String

    let s = String::from("hello"); // s is a new String

    &s // we return a reference to the String, s
} // Here, s goes out of scope and is dropped, so its memory goes away.
  // Danger!
```

所有权被移出，没有值被释放，编译通过。

```rust
fn no_dangle() -> String {
    let s = String::from("hello");

    s
}
```

### 引用规则

- 同一时刻，要么只有一个可变引用，要么有任意多个不可变引用。
- 引用必须始终有效。

接下来看另一种引用：切片。
