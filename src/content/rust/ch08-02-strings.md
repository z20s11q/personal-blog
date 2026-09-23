---
title: "用字符串存 UTF-8 文本"
order: "ch08-02-strings"
chapter: 8
---
### 字符串是什么

- 语言核心只有字符串切片 `str`，常见形式是 `&str`。字面量存在二进制里，类型是 `&str`。
- `String` 在标准库：可增长、可变、拥有字节、UTF-8。
- 两者都是 UTF-8。说 string 时要分清是 `String` 还是 `&str`。
- `String` 是 `Vec<u8>` 的包装，另加“内容必须是合法 UTF-8”等约束。创建、追加、读取这些集合操作它都有。整数下标取“一个字符”不行。

**对照**：`String` 拥有 UTF-8 字节，可增长，接近 C++ `std::string`。Java 的 `String` 不可变，内部是 UTF-16。`&str` 是借用，接近 C++ `string_view`。Go 的 `string` 和 Python 的 `str` 都不可变；Go 的 string 头可以复制，Rust 的 `String` 赋值是移动。

### 新建字符串

`String::new()` 得到空的、可改的 `String`。

**清单 8-11** 空 `String`。

```rust
    let mut s = String::new();
```

已有文本时，对实现了 `Display` 的类型调用 `to_string`（字面量可以），得到拥有所有权的 `String`。

**清单 8-12** 从字面量 `to_string`。

```rust
    let data = "initial contents";

    let s = data.to_string();

    // The method also works on a literal directly:
    let s = "initial contents".to_string();
```

`String::from` 和 `to_string` 做同一件事，按可读性选。

**清单 8-13** 用 `String::from` 从字面量得到 `String`。

```rust
    let s = String::from("initial contents");
```

合法 UTF-8 都能放进 `String`。

**清单 8-14** 多种语言的文本都是合法 `String`。

```rust
    let hello = String::from("السلام عليكم");
    let hello = String::from("Dobrý den");
    let hello = String::from("Hello");
    let hello = String::from("שלום");
    let hello = String::from("नमस्ते");
    let hello = String::from("こんにちは");
    let hello = String::from("안녕하세요");
    let hello = String::from("你好");
    let hello = String::from("Olá");
    let hello = String::from("Здравствуйте");
    // ANCHOR_END: russian
    let hello = String::from("Hola");
    // ANCHOR_END: spanish
```

这些都是合法的 `String`。

### 更新字符串

`String` 可以像 `Vec<T>` 一样增长。追加用 `push_str` 或 `push`，拼接用 `+` 或 `format!`。

#### 用 `push_str` 或 `push` 追加

`push_str` 接受 `&str`，不取走参数的所有权。

**清单 8-15** `push_str` 追加字符串切片。

```rust
    let mut s = String::from("foo");
    s.push_str("bar");
```

追加后内容是 `foobar`。参数是切片，调用后原来的切片仍可用。

**清单 8-16** 追加之后仍然使用 `s2`。

```rust
    let mut s1 = String::from("foo");
    let s2 = "bar";
    s1.push_str(s2);
    println!("s2 is {s2}");
```

`push` 追加一个 `char`。

**清单 8-17** `push` 追加一个字符。

```rust
    let mut s = String::from("lo");
    s.push('l');
```

追加后内容是 `lol`。

#### 用 `+` 或 `format!` 拼接

`+` 调用的 `add` 相当于 `fn add(self, s: &str) -> String`：左边的 `String` 被移动，右边必须是 `&str`。

**清单 8-18** `s1 + &s2` 之后 `s1` 不能再用。

```rust
    let s1 = String::from("Hello, ");
    let s2 = String::from("world!");
    let s3 = s1 + &s2; // note s1 has been moved here and can no longer be used
```

结果是 `Hello, world!`。`s1` 失效是因为 `add` 按值接收 `self`；右边写成引用，是因为参数类型是 `&str`。

```rust
fn add(self, s: &str) -> String {
```

标准库里的 `add` 是泛型。对 `String` 调用时，具体签名就是上面那个。

- 右边只能加 `&str`。`&String` 能用，是因为 deref 强制把 `&String` 收成 `&str`（相当于 `&s2[..]`）。`s2` 仍然有效。
- `self` 按值传递，`s1` 被移进 `add`。
- 实现是收下 `s1`，再追加 `s2` 内容的拷贝，然后把结果的所有权交出去。

```rust
    let s1 = String::from("tic");
    let s2 = String::from("tac");
    let s3 = String::from("toe");

    let s = s1 + "-" + &s2 + "-" + &s3;
```

多段连加的结果是 `tic-tac-toe`。段数一多，`+` 难读，改用 `format!`。

```rust
    let s1 = String::from("tic");
    let s2 = String::from("tac");
    let s3 = String::from("toe");

    let s = format!("{s1}-{s2}-{s3}");
```

`format!` 和 `println!` 同一套格式，返回 `String`。它只用引用，不拿走任何参数的所有权。

### 字符串下标

`String` 和 `str` 不能用整数下标。`s[0]` 编不过。

**清单 8-19** 对 `String` 使用整数下标。

```rust
    let s1 = String::from("hi");
    let h = s1[0];
```

`str` 不能用 `{integer}` 索引。字符串下标只能是 `usize` 的范围。

```console
$ cargo run
   Compiling collections v0.1.0 (file:///projects/collections)
error[E0277]: the type `str` cannot be indexed by `{integer}`
 --> src/main.rs:3:16
  |
3 |     let h = s1[0];
  |                ^ string indices are ranges of `usize`
  |
  = help: the trait `SliceIndex<str>` is not implemented for `{integer}`
  = note: you can use `.chars().nth()` or `.bytes().nth()`
          for more information, see chapter 8 in The Book: <https://doc.rust-lang.org/book/ch08-02-strings.html#indexing-into-strings>
help: `usize` implements trait `SliceIndex<T>`
 --> /rustc/88d9e12ae178fab0fb5cc050a94da85685d449ea/library/core/src/slice/index.rs:179:0
  |
  = note: `SliceIndex<[T]>`
 --> /rustc/88d9e12ae178fab0fb5cc050a94da85685d449ea/library/core/src/bstr/traits.rs:197:0
  |
  = note: `SliceIndex<ByteStr>`
  = note: required for `String` to implement `Index<{integer}>`

For more information about this error, try `rustc --explain E0277`.
error: could not compile `collections` (bin "collections") due to 1 previous error
```

内存里存的是 UTF-8 字节。字节下标不等于“第 n 个字符”。

#### 内部表示

`String` 包着 `Vec<u8>`。`len` 是字节数。

```rust
    let hello = String::from("Hola");
```

`"Hola"` 的 `len` 是 4：每个拉丁字母占 1 字节。

```rust
    let hello = String::from("Здравствуйте");
```

`"Здравствуйте"` 有 12 个 Unicode 标量值，UTF-8 占 24 字节，`len` 是 24。字节下标不一定落在标量值边界上。

```rust
let hello = "Здравствуйте";
let answer = &hello[0];
```

`З` 的 UTF-8 是字节 `208` 和 `151`。下标 0 只有 `208`，单独不是合法字符。全是拉丁字母时，字节下标拿到的也是字节值（`"hi"` 的第一字节是 `104`），不是字符 `h`。所以整数下标直接禁止编译。

#### 字节、标量值与字素簇

同一段 UTF-8 有三种看法：

- 字节：`u8` 序列。`len` 和存储按这个算。
- 标量值：Rust 的 `char`。
- 字素簇：人眼看到的字。

印地语 “नमस्ते” 存成 18 个字节。

```text
[224, 164, 168, 224, 164, 174, 224, 164, 184, 224, 165, 141, 224, 164, 164,
224, 165, 135]
```

这 18 个字节是实际存储。按 Unicode 标量值（`char`）看是 6 个。

```text
['न', 'म', 'स', '्', 'त', 'े']
```

6 个 `char` 里，第四个和第六个是不能单独成立的附加符号。按字素簇看是 4 个字。

```text
["न", "म", "स्", "ते"]
```

程序按需选字节、标量值或字素簇。另一个禁止整数下标的原因：下标被期望是 O(1)，而要数到第 n 个字符必须从头扫描。

**对照**：Java 的 `charAt` 取 UTF-16 code unit；Go 对 string 下标得到字节；Python 3 的 `s[i]` 得到一个码位。Rust 没有整数下标。要字节用 `bytes()`，要标量值用 `chars()`。这三者和字素簇都不是一回事。

### 字符串切片

要按位置取一段，用字节范围 `&s[start..end]`，得到 `&str`。两端必须落在字符边界上，否则运行时 panic。

```rust
let hello = "Здравствуйте";

let s = &hello[0..4];
```

前 4 个字节是 `Зд`（每个字符 2 字节）。`&hello[0..1]` 切进 `З` 的中间，运行时 panic。

```console
$ cargo run
   Compiling collections v0.1.0 (file:///projects/collections)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.43s
     Running `target/debug/collections`

thread 'main' (6017738) panicked at src/main.rs:4:19:
end byte index 1 is not a char boundary; it is inside 'З' (bytes 0..2 of string)
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

范围不是字符边界时 panic。panic 信息会指出下标落在哪个字符内部。

### 遍历字符串

要明确要的是标量值还是字节。

- `chars()`：逐个 `char`。一个 `char` 可能占多个字节。
- `bytes()`：逐个原始字节。
- 字素簇不在标准库里，需要的话用 crates.io 上的 crate。

```rust
for c in "Зд".chars() {
    println!("{c}");
}
```

```text
З
д
```

`bytes()` 返回每个原始字节。

```rust
for b in "Зд".bytes() {
    println!("{b}");
}
```

输出是构成 `"Зд"` 的 4 个字节。

```text
208
151
208
180
```

合法的 Unicode 标量值经常超过 1 字节，所以字节数不等于 `char` 数。字素簇（如天城文）标准库不拆。

### 字符串的处理方式

整数下标在编译期被拒绝，避免非 ASCII 到后面才出错。标准库在 `String` 和 `&str` 上提供 `contains`、`replace` 等，按 UTF-8 边界处理。
