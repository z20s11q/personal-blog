---
title: "切片类型"
order: "ch04-03-slices"
chapter: 4
---
切片引用集合中一段连续元素，不拥有所有权。

问题：写一个函数，接收空格分隔的字符串，返回第一个单词。

> 本节假设 ASCII；UTF-8 处理见第 8 章。

先看不用切片时的签名：

```rust
fn first_word(s: &String) -> ?
```

参数用 `&String`，不需要所有权，这没问题。但返回什么？没法表达「字符串的一部分」，只好返回单词结束处的下标。

**清单 4-7** `first_word` 返回字节下标。

```rust
fn first_word(s: &String) -> usize {
    let bytes = s.as_bytes();
    // ANCHOR_END: as_bytes

    for (i, &item) in bytes.iter().enumerate() {
        // ANCHOR_END: iter
        if item == b' ' {
            return i;
        }
    }

    s.len()
    // ANCHOR_END: inside_for
}
```

需要逐字节检查是否为空格，先转成字节数组：

```rust
    let bytes = s.as_bytes();
```

用迭代器遍历字节：

```rust
    for (i, &item) in bytes.iter().enumerate() {
```

`iter` 返回每个元素，`enumerate` 把结果包成 `(下标, 元素)` 元组（详情见第 13 章）。

因为是元组，可以用模式解构：`i` 接下标，`&item` 接单个字节（第 6 章详述模式）。

```rust
        if item == b' ' {
            return i;
        }
    }

    s.len()
```

找到空格返回 `i`，否则返回 `s.len()`。

```rust
fn main() {
    let mut s = String::from("hello world");

    let word = first_word(&s); // word will get the value 5

    s.clear(); // this empties the String, making it equal to ""

    // word still has the value 5 here, but s no longer has any content that we
    // could meaningfully use with the value 5, so word is now totally invalid!
}
```

问题：返回的 `usize` 与 `&String` 无关，无法保证未来仍然有效。

**清单 4-8** 保存 `first_word` 的结果，随后修改字符串。

```rust
fn second_word(s: &String) -> (usize, usize) {
```

这段能编译，`s.clear()` 之后 `word` 仍是 5。但 `s` 内容已变，`5` 失去意义，属于逻辑错误。

维护下标与数据同步很累；写 `second_word` 更脆：

```rust
    let s = String::from("hello world");

    let hello = &s[0..5];
    let world = &s[6..11];
```

起止两个下标，加上原字符串，要同步的变量更多了。

切片解决这个问题。

### 字符串切片

字符串切片是对 `String` 中一段连续元素的引用：

```rust
let s = String::from("hello");

let slice = &s[0..2];
let slice = &s[..2];
```

`[0..5]` 是范围语法：起始下标到结束下标（左闭右开）。切片内部存起始位置和长度。

`&s[6..11]` 的 `world` 指向索引 6，长度为 5。

`..` 范围语法可以省略边界，从 0 开始时可省略起始值：

```rust
let s = String::from("hello");

let len = s.len();

let slice = &s[3..len];
let slice = &s[3..];
```

`&s[0..2]` 等价 `&s[..2]`。

到末尾可省略结束值：

```rust
let s = String::from("hello");

let len = s.len();

let slice = &s[0..len];
let slice = &s[..];
```

`&s[3..len]` 等价 `&s[3..]`。

```rust
fn first_word(s: &String) -> &str {
    let bytes = s.as_bytes();

    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return &s[0..i];
        }
    }

    &s[..]
}
```

两端都省略就是整个字符串：`&s[0..len]` 等价 `&s[..]`。

> 切片下标必须落在合法的 UTF-8 字符边界上，否则运行时直接报错退出。

改写 `first_word` 返回 `&str`：

文件：src/main.rs

```rust
fn second_word(s: &String) -> &str {
```

逻辑相同，找到空格时返回从 0 到该下标的切片。

返回的切片与底层数据绑定：包含起始引用和元素个数。`second_word` 同样可以返回切片：

```rust
fn main() {
    let mut s = String::from("hello world");

    let word = first_word(&s);

    s.clear(); // error!

    println!("the first word is: {word}");
}
```

API 更清晰，编译器保证引用有效。清单 4-8 那种「下标失效」的 bug 在切片版本里编译不过：

文件：src/main.rs

```console
$ cargo run
   Compiling ownership v0.1.0 (file:///projects/ownership)
error[E0502]: cannot borrow `s` as mutable because it is also borrowed as immutable
  --> src/main.rs:18:5
   |
16 |     let word = first_word(&s);
   |                           -- immutable borrow occurs here
17 |
18 |     s.clear(); // error!
   |     ^^^^^^^^^ mutable borrow occurs here
19 |
20 |     println!("the first word is: {word}");
   |                                   ---- immutable borrow later used here

For more information about this error, try `rustc --explain E0502`.
error: could not compile `ownership` (bin "ownership") due to 1 previous error
```

`clear` 需要可变引用，而 `word` 的不可变引用在 `println!` 处仍然活跃，借用规则不允许两者共存。编译器不但让 API 更好用，还消掉了一整类错误。

```rust
let s = "Hello, world!";
```

#### 字符串字面量就是切片

字面量存在二进制里，它的类型就是 `&str`：指向二进制中某个位置的切片。这也解释了字面量为什么不可变：`&str` 是不可变引用。

```rust
fn first_word(s: &String) -> &str {
```

#### 切片作为参数

`first_word` 的签名可以再改进：

```rust
fn first_word(s: &str) -> &str {
```

更地道的写法是用 `&str` 作参数，这样 `&String` 和 `&str` 都能传：

**清单 4-9** 参数类型改为 `&str`。

```rust
fn main() {
    let my_string = String::from("hello world");

    // `first_word` works on slices of `String`s, whether partial or whole.
    let word = first_word(&my_string[0..6]);
    let word = first_word(&my_string[..]);
    // `first_word` also works on references to `String`s, which are equivalent
    // to whole slices of `String`s.
    let word = first_word(&my_string);

    let my_string_literal = "hello world";

    // `first_word` works on slices of string literals, whether partial or
    // whole.
    let word = first_word(&my_string_literal[0..6]);
    let word = first_word(&my_string_literal[..]);

    // Because string literals *are* string slices already,
    // this works too, without the slice syntax!
    let word = first_word(my_string_literal);
}
```

传切片直接给；传 `String` 就给它的切片（或引用）。这利用了 deref coercion（第 15 章）。

**对照**：`&str` 参数类似 C++ 的 `std::string_view` 或 Go 的 `string`：不关心调用方持有哪种字符串类型，只读不拷贝。

写成 `&str` 后 API 更通用：

文件：src/main.rs

```rust
let a = [1, 2, 3, 4, 5];
```

### 其他切片

切片不限于字符串。数组也可以切片：

```rust
let a = [1, 2, 3, 4, 5];

let slice = &a[1..3];

assert_eq!(slice, &[2, 3]);
```

`&a[1..3]` 的类型是 `&[i32]`，内部同样存首元素引用和长度，适用于各种集合（第 8 章讲 `Vec`）。

## 小结

所有权、借用、切片在编译期保证内存安全，同时不引入运行时开销。数据所有者离开作用域时自动清理，因此不需要手写释放代码。

这些概念贯穿全书。下一章看如何用 `struct` 把数据组合起来。
