---
title: "用生命周期校验引用"
order: "ch10-03-lifetime-syntax"
chapter: 10
---
生命周期是另一种泛型：不保证类型有某种行为，而是保证引用在需要时始终有效。

每个引用都有生命周期，即它有效的范围。多数时候隐式推断，和类型推断一样。只有当引用的生命周期关系有多种可能时，才需要标注。

其他语言大多没有这个概念。本章讲常见用法。

### 悬垂引用

生命周期的主要目的是防止悬垂引用。

**清单 10-16** 引用指向的值已离开作用域。

```rust
fn main() {
    let r;

    {
        let x = 5;
        r = &x;
    }

    println!("r: {r}");
}
```

> 清单 10-16、10-17、10-23 的变量声明不给初值。看似与「Rust 没有 null」矛盾，但使用未赋值的变量会编译报错，正是没有 null 的体现。

外层声明 `r`（无初值），内层声明 `x = 5`，把 `x` 的引用赋给 `r`，内层结束后打印 `r`。编译失败：`r` 指向的值已经失效。

```console
$ cargo run
   Compiling chapter10 v0.1.0 (file:///projects/chapter10)
error[E0597]: `x` does not live long enough
 --> src/main.rs:6:13
  |
5 |         let x = 5;
  |             - binding `x` declared here
6 |         r = &x;
  |             ^^ borrowed value does not live long enough
7 |     }
  |     - `x` dropped here while still borrowed
8 |
9 |     println!("r: {r}");
  |                   - borrow later used here

For more information about this error, try `rustc --explain E0597`.
error: could not compile `chapter10` (bin "chapter10") due to 1 previous error
```

报错说 `x` 「活的不够久」：内层结束时 `x` 离开作用域，而 `r` 在外层仍然有效。

### 借用检查器

borrow checker 比较作用域，判断所有借用是否合法。

**清单 10-17** 标注 `r` 的 `'a` 与 `x` 的 `'b`。

```rust
fn main() {
    let r;                // ---------+-- 'a
                          //          |
    {                     //          |
        let x = 5;        // -+-- 'b  |
        r = &x;           //  |       |
    }                     // -+       |
                          //          |
    println!("r: {r}");   //          |
}                         // ---------+
```

`'a` 比 `'b` 大，但 `r` 引用的是生命周期为 `'b` 的内存，`'b` 短于 `'a`，编译拒绝。

**清单 10-18** 修正后编译通过。

```rust
fn main() {
    let x = 5;            // ----------+-- 'b
                          //           |
    let r = &x;           // --+-- 'a  |
                          //   |       |
    println!("r: {r}");   //   |       |
                          // --+       |
}                         // ----------+
```

这里 `'b` 比 `'a` 大，`r` 引用 `x` 时 `x` 始终有效，合法。

### 函数中的泛型生命周期

写一个 `longest`：接收两个字符串切片，返回较长的那个。目标是打印 `The longest string is abcd`。

**清单 10-19** 调用 `longest`。

```rust
fn main() {
    let string1 = String::from("abcd");
    let string2 = "xyz";

    let result = longest(string1.as_str(), string2);
    println!("The longest string is {result}");
}
```

参数用切片而不是 `String`，避免取得所有权（见第 4 章）。

直接实现会编译失败：

**清单 10-20** 能返回较长切片但不编译的 `longest`。

```rust
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() { x } else { y }
}
```

报错与生命周期有关：

```console
$ cargo run
   Compiling chapter10 v0.1.0 (file:///projects/chapter10)
error[E0106]: missing lifetime specifier
 --> src/main.rs:9:33
  |
9 | fn longest(x: &str, y: &str) -> &str {
  |               ----     ----     ^ expected named lifetime parameter
  |
  = help: this function's return type contains a borrowed value, but the signature does not say whether it is borrowed from `x` or `y`
help: consider introducing a named lifetime parameter
  |
9 | fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
  |           ++++     ++          ++          ++

For more information about this error, try `rustc --explain E0106`.
error: could not compile `chapter10` (bin "chapter10") due to 1 previous error
```

返回类型需要生命周期参数，因为 Rust 不知道返回的是 `x` 还是 `y` 的引用，编译器无法判断返回值是否始终有效。需要标注关系。

### 生命周期标注语法

标注不改变引用的实际存活时长，只描述多个引用之间的关系。

命名以 `'` 开头，惯例用短小写字母，从 `'a` 开始。写在 `&` 之后，与类型之间用空格隔开。

```rust
&i32        // a reference
&'a i32     // a reference with an explicit lifetime
&'a mut i32 // a mutable reference with an explicit lifetime
```

单个标注没有意义，因为标注是用来表达多个引用之间的关系的。

### 函数签名中

泛型生命周期参数写在函数名之后的尖括号里。

约束：返回值的引用在参数都有效时有效。命名为 `'a`，加到每个引用上：

**清单 10-21** 签名中所有引用共享生命周期 `'a`。

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

该签名含义：存在某个生命周期 `'a`，两个参数都至少活到 `'a`，返回值也至少活到 `'a`。即返回引用的有效范围是两个参数中较短的那个。

标注不会改变值的实际生命周期，只是让借用检查器拒绝不符合约束的调用。`longest` 不需要知道 `x`、`y` 具体活多久，只需要有一个 `'a` 满足签名。

标注属于函数契约，写在签名里，不写在函数体里。这样编译器分析更简单，报错也更精确。

传具体引用时，`'a` 取 `x` 和 `y` 存活区间的交集，即较短的那个。

**清单 10-22** 两个参数生命周期不同。

```rust
fn main() {
    let string1 = String::from("long string is long");

    {
        let string2 = String::from("xyz");
        let result = longest(string1.as_str(), string2.as_str());
        println!("The longest string is {result}");
    }
}
```

`string1` 活到外层结束，`string2` 活到内层结束，`result` 的有效范围到内层结束。编译通过并打印结果。

下面这个失败：

**清单 10-23** `string2` 失效后使用 `result`。

```rust
fn main() {
    let string1 = String::from("long string is long");
    let result;
    {
        let string2 = String::from("xyz");
        result = longest(string1.as_str(), string2.as_str());
    }
    println!("The longest string is {result}");
}
```

报错：

```console
$ cargo run
   Compiling chapter10 v0.1.0 (file:///projects/chapter10)
error[E0597]: `string2` does not live long enough
 --> src/main.rs:6:44
  |
5 |         let string2 = String::from("xyz");
  |             ------- binding `string2` declared here
6 |         result = longest(string1.as_str(), string2.as_str());
  |                                            ^^^^^^^ borrowed value does not live long enough
7 |     }
  |     - `string2` dropped here while still borrowed
8 |     println!("The longest string is {result}");
  |                                      ------ borrow later used here

For more information about this error, try `rustc --explain E0597`.
error: could not compile `chapter10` (bin "chapter10") due to 1 previous error
```

因为返回值与参数共享 `'a`，`result` 要活到 `println!`，就要求 `string2` 也活到外层结束，而它没有。人眼能看出 `result` 实际引用的是更长的 `string1`，但编译器按签名约定的「较短者」处理。

### 关系

怎么标注取决于函数做什么。如果 `longest` 改成总是返回第一个参数，`y` 就不需要标注：

文件：src/main.rs

```rust
fn longest<'a>(x: &'a str, y: &str) -> &'a str {
    x
}
```

只有 `x` 和返回值有关联，`y` 没有。

函数返回引用时，返回值的生命周期必须匹配某个参数的生命周期。如果返回的引用不指向参数，就必须指向函数内创建的值，那会悬垂：

文件：src/main.rs

```rust
fn longest<'a>(x: &str, y: &str) -> &'a str {
    let result = String::from("really long string");
    result.as_str()
}
```

即使写了 `'a`，返回值与任何参数都无关联，仍然编译失败。

```console
$ cargo run
   Compiling chapter10 v0.1.0 (file:///projects/chapter10)
error[E0515]: cannot return value referencing local variable `result`
  --> src/main.rs:11:5
   |
11 |     result.as_str()
   |     ------^^^^^^^^^
   |     |
   |     returns a value referencing data owned by the current function
   |     `result` is borrowed here

For more information about this error, try `rustc --explain E0515`.
error: could not compile `chapter10` (bin "chapter10") due to 1 previous error
```

`result` 在函数结束时被释放，返回它的引用必然悬垂。正确做法是返回拥有所有权的类型。

生命周期的本质是把参数和返回值的存活期连接起来，连接好之后 Rust 就有足够信息判断哪些操作安全。

### 结构体定义中

结构体持有的引用也要标注：

**清单 10-24** 持有 `&str` 的结构体。

```rust
struct ImportantExcerpt<'a> {
    part: &'a str,
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first_sentence = novel.split('.').next().unwrap();
    let i = ImportantExcerpt {
        part: first_sentence,
    };
}
```

`ImportantExcerpt` 的实例不能比 `part` 字段引用的数据活得更久。

### 生命周期省略

每个引用都有生命周期，但有些函数不写标注也能编译：

**清单 10-25** 无生命周期标注但能编译的函数。

```rust
fn first_word(s: &str) -> &str {
    let bytes = s.as_bytes();

    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return &s[0..i];
        }
    }

    &s[..]
}
```

早期 Rust 要求每个引用都显式标注：

```rust
fn first_word<'a>(s: &'a str) -> &'a str {
```

Rust 团队发现几种模式反复出现，把它们内置进编译器，即生命周期省略规则。符合这些模式就不必手写标注。

省略规则不是完整推断：套用后仍有歧义就报错，不会瞎猜。

参数上的叫输入生命周期，返回值上的叫输出生命周期。

三条规则（适用于 `fn` 和 `impl`）：

1. 每个引用参数各得一个生命周期参数：`fn foo(x: &i32)` 变成 `fn foo<'a>(x: &'a i32)`；两个参数就两个独立生命周期。
2. 只有一个输入生命周期时，它赋给所有输出生命周期：`fn foo<'a>(x: &'a i32) -> &'a i32`。
3. 有多个输入生命周期，但其中一个是 `&self` 或 `&mut self` 时，`self` 的生命周期赋给所有输出。

套用到 `first_word`：

```rust
fn first_word(s: &str) -> &str {
```

第一步，给参数各自的生命周期：

```rust
fn first_word<'a>(s: &'a str) -> &str {
```

第二步，只有一个输入生命周期，赋给输出：

```rust
fn first_word<'a>(s: &'a str) -> &'a str {
```

所有引用都有生命周期了，编译器可以继续分析。

再看 `longest`：

```rust
fn longest(x: &str, y: &str) -> &str {
```

第一步，两个参数两个生命周期：

```rust
fn longest<'a, 'b>(x: &'a str, y: &'b str) -> &str {
```

第二步不适用（多于一个输入生命周期），第三步也不适用（不是方法，没有 `self`）。三条规则走完仍无法确定返回值，所以编译报错。

第三步只适用于方法，所以方法签名通常不用手写生命周期。

### 方法定义中

`impl` 上的生命周期声明与泛型一样。字段的生命周期写在 `impl` 后和类型名后。

方法签名里的引用可以关联字段的生命周期，也可以独立。

第一个例子：

```rust
impl<'a> ImportantExcerpt<'a> {
    fn level(&self) -> i32 {
        3
    }
}
```

`impl<'a>` 和 `ImportantExcerpt<'a>` 都必须写，但 `&self` 因为第一条规则不用标注。

第三个规则的例子：

```rust
impl<'a> ImportantExcerpt<'a> {
    fn announce_and_return_part(&self, announcement: &str) -> &str {
        println!("Attention please: {announcement}");
        self.part
    }
}
```

两个输入生命周期，第一条规则给 `&self` 和 `announcement` 各自的生命周期；因为有 `&self`，返回值取 `&self` 的生命周期。

### `'static` 生命周期

`'static` 表示引用可以活到程序结束。所有字符串字面量都是 `'static`：

```rust
let s: &'static str = "I have a static lifetime.";
```

字面量的内容直接存在二进制里，总是可用，所以是 `'static`。

报错信息有时会建议用 `'static`。但先想清楚：这个引用真的需要活到程序结束吗？多数情况下，这个建议说明代码里有悬垂引用或生命周期不匹配，正确做法是修问题，而不是写 `'static`。

**对照**：`'static` 类似 Java 的静态常量或 Go 全局变量，但 Rust 里它也可能来自 `Box::leak` 之类显式泄漏；普通局部变量的引用不会是 `'static`。

## 泛型参数、trait bound 与生命周期一起用

```rust
use std::fmt::Display;

fn longest_with_an_announcement<'a, T>(
    x: &'a str,
    y: &'a str,
    ann: T,
) -> &'a str
where
    T: Display,
{
    println!("Announcement! {ann}");
    if x.len() > y.len() { x } else { y }
}
```

`longest` 增加了泛型参数 `ann: T`，`T: Display`（因为要用 `{}` 打印）。生命周期参数和类型参数写在同一个尖括号列表里。

## 小结

泛型参数让代码适用于多种类型，trait bound 保证这些类型具备所需行为，生命周期标注保证不产生悬垂引用，而且这些分析都在编译期完成，不影响运行时性能。

第 18 章讲 trait 对象；更复杂的生命周期场景见 Rust Reference。下一章讲测试。
