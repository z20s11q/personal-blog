---
title: "注释"
order: "ch03-04-comments"
chapter: 3
---
`//` 开始一行注释，直到行尾。编译器忽略注释。

```rust
// hello, world
```

多行时每一行都写 `//`。

```rust
// So we're doing something complicated here, long enough that we need
// multiple lines of comments to do it! Whew! Hopefully, this comment will
// explain what's going on.
```

注释可以写在代码同一行的末尾。

文件：src/main.rs

```rust
fn main() {
    let lucky_number = 7; // I'm feeling lucky today
}
```

更常见的是写在所说明代码的上一行。

文件：src/main.rs

```rust
fn main() {
    // I'm feeling lucky today
    let lucky_number = 7;
}
```

另外还有文档注释，第 14 章再讲。
