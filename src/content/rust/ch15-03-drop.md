---
title: "用 `Drop` 在清理时运行代码"
order: "ch15-03-drop"
chapter: 15
---
`Drop` 指定值离开作用域时要跑的代码，用来释放文件、连接、锁、堆内存等。`Box<T>` 被 drop 时会释放它指向的堆。

编译器在作用域结束处自动插入这次调用。`drop` 的签名是 `fn drop(&mut self)`。

**清单 15-14** 为 `CustomSmartPointer` 实现 `Drop`。

**对照**：相当于 C++ 析构函数。调用点由所有权决定，不用像手动 `delete` 那样自己找地方写。

```rust
struct CustomSmartPointer {
    data: String,
}

impl Drop for CustomSmartPointer {
    fn drop(&mut self) {
        println!("Dropping CustomSmartPointer with data `{}`!", self.data);
    }
}

fn main() {
    let c = CustomSmartPointer {
        data: String::from("my stuff"),
    };
    let d = CustomSmartPointer {
        data: String::from("other stuff"),
    };
    println!("CustomSmartPointers created");
}
```

`Drop` 在预导入里，不用 `use`。离开作用域时自动调用，不要自己调 `drop`。

```console
$ cargo run
   Compiling drop-example v0.1.0 (file:///projects/drop-example)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.60s
     Running `target/debug/drop-example`
CustomSmartPointers created
Dropping CustomSmartPointer with data `other stuff`!
Dropping CustomSmartPointer with data `my stuff`!
```

多个值按创建的相反顺序 drop。

不能关掉自动 `drop`。需要提前释放（例如早点放开锁）时，不要调用 `Drop::drop`，改用 `std::mem::drop`。

**清单 15-15** 手动调用 `Drop::drop`，不能编译。

```rust
fn main() {
    let c = CustomSmartPointer {
        data: String::from("some data"),
    };
    println!("CustomSmartPointer created");
    c.drop();
    println!("CustomSmartPointer dropped before the end of main");
}
```

```console
$ cargo run
   Compiling drop-example v0.1.0 (file:///projects/drop-example)
error[E0040]: explicit use of destructor method
  --> src/main.rs:16:7
   |
16 |     c.drop();
   |       ^^^^ explicit destructor calls not allowed
   |
help: consider using `drop` function
   |
16 -     c.drop();
16 +     drop(c);
   |

For more information about this error, try `rustc --explain E0040`.
error: could not compile `drop-example` (bin "drop-example") due to 1 previous error
```

不允许显式调用 `drop`：作用域结束时编译器还会再调一次，同一份值会被清理两次。

提前清理用预导入里的函数 `std::mem::drop`（不是 trait 方法）。它取走所有权并立刻 drop，作用域结束时不会再 drop 这一次。

**清单 15-16** 用 `drop(c)` 在 `main` 结束前提前 drop。

```rust
fn main() {
    let c = CustomSmartPointer {
        data: String::from("some data"),
    };
    println!("CustomSmartPointer created");
    drop(c);
    println!("CustomSmartPointer dropped before the end of main");
}
```

```console
$ cargo run
   Compiling drop-example v0.1.0 (file:///projects/drop-example)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.73s
     Running `target/debug/drop-example`
CustomSmartPointer created
Dropping CustomSmartPointer with data `some data`!
CustomSmartPointer dropped before the end of main
```

`drop(c)` 那一行就会执行 `Drop::drop`，不必等到作用域结束。

所有权保证 `drop` 只在值不再被使用时发生一次：还有有效引用时不会清理。
