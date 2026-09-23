---
title: "可反驳性：模式是否可能匹配失败"
order: "ch19-02-refutability"
chapter: 19
---
- **不可反驳**：任何值都能匹配。`let x = 5;` 里的 `x` 就是。
- **可反驳**：有些值会匹配失败。`if let Some(x) = a_value` 里的 `Some(x)` 就是；值为 `None` 时不匹配。

只接受不可反驳模式：函数参数、`let`、`for`。匹配失败时没有合理的后续。

`if let`、`while let`、`let...else` 两者都接受。对不可反驳模式会警告：条件的意义就是可能失败。

报错时，要么改模式，要么换成能处理失败的结构。

**清单 19-8** 在 `let` 上使用可反驳模式 `Some(x)`

```rust
    let Some(x) = some_option_value;
```

`let` 要求不可反驳模式。`Some(x)` 盖不住 `None`，编译失败。

```console
$ cargo run
   Compiling patterns v0.1.0 (file:///projects/patterns)
error[E0005]: refutable pattern in local binding
 --> src/main.rs:3:9
  |
3 |     let Some(x) = some_option_value;
  |         ^^^^^^^ pattern `None` not covered
  |
  = note: `let` bindings require an "irrefutable pattern", like a `struct` or an `enum` with only one variant
  = note: for more information, visit https://doc.rust-lang.org/book/ch19-02-refutability.html
  = note: the matched value is of type `Option<i32>`
help: you might want to use `let...else` to handle the variant that isn't matched
  |
3 |     let Some(x) = some_option_value else { todo!() };
  |                                     ++++++++++++++++

For more information about this error, try `rustc --explain E0005`.
error: could not compile `patterns` (bin "patterns") due to 1 previous error
```

可反驳模式改用 `let...else`：不匹配时执行 `else` 块。

**清单 19-9** 用 `let...else` 处理可反驳模式

```rust
    let Some(x) = some_option_value else {
        return;
    };
```

`let...else` 配上总能匹配的模式（例如单独的 `x`）时，`else` 到不了，编译器会警告。

**清单 19-10** 在 `let...else` 上使用不可反驳模式

```rust
    let x = 5 else {
        return;
    };
```

不可反驳模式使 `else` 不可达，默认警告 `irrefutable_let_patterns`。

```console
$ cargo run
   Compiling patterns v0.1.0 (file:///projects/patterns)
warning: unreachable `else` clause
 --> src/main.rs:2:15
  |
2 |     let x = 5 else {
  |     --------- ^^^^
  |     |
  |     assigning to binding pattern will always succeed
  |
  = note: this pattern always matches, so the else clause is unreachable
  = note: `#[warn(irrefutable_let_patterns)]` on by default

warning: `patterns` (bin "patterns") generated 1 warning
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.39s
     Running `target/debug/patterns`
```

`match` 的各臂必须可反驳，最后一臂用不可反驳模式兜住剩余值。只有一个不可反驳臂的 `match` 合法，但和 `let` 等价，没有额外用处。
