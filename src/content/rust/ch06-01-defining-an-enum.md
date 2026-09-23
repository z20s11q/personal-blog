---
title: "定义枚举"
order: "ch06-01-defining-an-enum"
chapter: 6
---
struct 把相关字段放在一起。enum 表示值是若干互斥可能中的一个，这些可能仍是同一个类型。

IP 地址只有 v4 和 v6 两种，可以写成 `IpAddrKind` 的变体 `V4` 和 `V6`。一个值在某一时刻只能是其中一个变体。

```rust
enum IpAddrKind {
    V4,
    V6,
}
```

`IpAddrKind` 是自定义类型，可以在别处使用。

### 枚举值

用 `::` 得到某个变体的值。

```rust
    let four = IpAddrKind::V4;
    let six = IpAddrKind::V6;
```

变体的命名空间在 enum 名下。`IpAddrKind::V4` 和 `IpAddrKind::V6` 的类型都是 `IpAddrKind`，一个函数可以接收任意变体。

```rust
fn route(ip_kind: IpAddrKind) {}
```

```rust
    route(IpAddrKind::V4);
    route(IpAddrKind::V6);
```

上面的 enum 只记录种类，没有地址数据。可以用 struct 把变体和 `String` 放在一起。

**清单 6-1** `IpAddr` 含 `kind: IpAddrKind` 和 `address: String`

```rust
    enum IpAddrKind {
        V4,
        V6,
    }

    struct IpAddr {
        kind: IpAddrKind,
        address: String,
    }

    let home = IpAddr {
        kind: IpAddrKind::V4,
        address: String::from("127.0.0.1"),
    };

    let loopback = IpAddr {
        kind: IpAddrKind::V6,
        address: String::from("::1"),
    };
```

数据可以直接放进变体，不必再套一层 struct。`V4(String)` 和 `V6(String)` 都是 `IpAddr`。

每个变体名同时是构造函数：`IpAddr::V4` 接收一个 `String`，返回 `IpAddr`。定义 enum 时就生成这些构造函数。

```rust
    enum IpAddr {
        V4(String),
        V6(String),
    }

    let home = IpAddr::V4(String::from("127.0.0.1"));

    let loopback = IpAddr::V6(String::from("::1"));
```

各变体的关联数据可以类型不同、个数不同。例如 `V4` 用四个 `u8`，`V6` 用一个 `String`。字段布局固定的 struct 表达不了这种差别。

**对照**：这是代数数据类型。Java 用密封类给每个子类型自己的字段，C++ 用 `std::variant`。Go 没有代数类型，常见替代是接口或带标签的 struct，编译器不强制处理每一种。

```rust
    enum IpAddr {
        V4(u8, u8, u8, u8),
        V6(String),
    }

    let home = IpAddr::V4(127, 0, 0, 1);

    let loopback = IpAddr::V6(String::from("::1"));
```

标准库已有 `IpAddr`：变体仍是 `V4` 和 `V6`，数据分别是结构体 `Ipv4Addr` 和 `Ipv6Addr`。

```rust
struct Ipv4Addr {
    // --snip--
}

struct Ipv6Addr {
    // --snip--
}

enum IpAddr {
    V4(Ipv4Addr),
    V6(Ipv6Addr),
}
```

变体里可以放字符串、数值、struct，也可以再放一个 enum。标准库类型往往和手写的差不多。

自己定义的 `IpAddr` 和标准库的可以同名共存，只要没有把标准库的那个引入作用域。引入作用域见第 7 章。

**清单 6-2** `Message` 的四个变体携带不同种类和数量的数据

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(i32, i32, i32),
}
```

- `Quit`：没有数据
- `Move`：具名字段，像 struct
- `Write`：一个 `String`
- `ChangeColor`：三个 `i32`

这四种形态分别对应 unit struct、普通 struct 和 tuple struct，只是没有 `struct` 关键字，并且全部落在同一个类型 `Message` 下。

```rust
struct QuitMessage; // unit struct
struct MoveMessage {
    x: i32,
    y: i32,
}
struct WriteMessage(String); // tuple struct
struct ChangeColorMessage(i32, i32, i32); // tuple struct
```

拆成四个 struct 后，每个都是独立类型，一个函数参数很难同时接收它们。`Message` 是单一类型。

enum 也可以写 `impl`。方法里的 `self` 就是调用时所在的那个变体值。

```rust
    impl Message {
        fn call(&self) {
            // method body would be defined here
        }
    }

    let m = Message::Write(String::from("hello"));
    m.call();
```

### `Option` 枚举

`Option<T>` 是标准库 enum，表示值可能存在，也可能缺失。例如非空列表的第一项是有值，空列表则没有。写进类型系统后，编译器检查有没有处理缺失。

Rust 没有 null。有 null 的语言里，变量随时可能是空，把空值当非空用就会出错。

**对照**：Java 的引用默认可空；Go 的指针、接口、切片等可以是 nil；C++ 裸指针可空，显式可选用 `std::optional`。Rust 的 `T` 一定有值，缺失要写成 `Option<T>`。

`Option<T>` 的变体是 `None` 和 `Some(T)`。

```rust
enum Option<T> {
    None,
    Some(T),
}
```

`Option`、`Some`、`None` 都在 prelude 里，可以直接写 `Some` 和 `None`，不必加 `Option::`。它仍是普通 enum，变体的类型是 `Option<T>`。

`<T>` 是泛型参数（第 10 章）。`Some` 持有一个任意类型的值；换成不同的 `T`，得到的 `Option<T>` 是不同类型。

```rust
    let some_number = Some(5);
    let some_char = Some('e');

    let absent_number: Option<i32> = None;
```

`Some(5)` 的类型是 `Option<i32>`，`Some('e')` 是 `Option<char>`，由里面的值推断。单独的 `None` 推断不出 `T`，要标注，例如 `let absent_number: Option<i32> = None;`。

`Some` 表示值在变体内部。`None` 表示当前没有有效值。`Option<T>` 和 `T` 是不同类型，不能把 `Option<i8>` 当作 `i8` 参与加法。

```rust
    let x: i8 = 5;
    let y: Option<i8> = Some(5);

    let sum = x + y;
```

`i8` 没有对 `Option<i8>` 实现 `Add`，两者不能相加。

```console
$ cargo run
   Compiling enums v0.1.0 (file:///projects/enums)
error[E0277]: cannot add `Option<i8>` to `i8`
 --> src/main.rs:5:17
  |
5 |     let sum = x + y;
  |                 ^ no implementation for `i8 + Option<i8>`
  |
  = help: the trait `Add<Option<i8>>` is not implemented for `i8`
help: the following other types implement trait `Add<Rhs>`
 --> /rustc/88d9e12ae178fab0fb5cc050a94da85685d449ea/library/core/src/ops/arith.rs:98:8
  |
  = note: `i8` implements `Add`
 ::: /rustc/88d9e12ae178fab0fb5cc050a94da85685d449ea/library/core/src/ops/arith.rs:113:0
  |
  = note: in this macro invocation
 --> /rustc/88d9e12ae178fab0fb5cc050a94da85685d449ea/library/core/src/internal_macros.rs:22:8
  |
  = note: `&i8` implements `Add<i8>`
 ::: /rustc/88d9e12ae178fab0fb5cc050a94da85685d449ea/library/core/src/internal_macros.rs:33:8
  |
  = note: `i8` implements `Add<&i8>`
 ::: /rustc/88d9e12ae178fab0fb5cc050a94da85685d449ea/library/core/src/internal_macros.rs:44:8
  |
  = note: `&i8` implements `Add`
  = note: this error originates in the macro `add_impl` (in Nightly builds, run with -Z macro-backtrace for more info)

For more information about this error, try `rustc --explain E0277`.
error: could not compile `enums` (bin "enums") due to 1 previous error
```

类型是 `i8` 时，编译器保证它是有效值，用之前不必判空。类型是 `Option<i8>` 时，必须先处理可能没有值的情况。做 `T` 的运算之前，要把 `Option<T>` 变成 `T`。

可能缺失的值必须显式标成 `Option<T>`；不是 `Option<T>` 的值就可以当作一定存在。

从 `Some` 取出 `T` 可以用 `Option<T>` 上的方法。一般要分别为 `Some(T)` 和 `None` 写代码：前者能用内部的 `T`，后者没有 `T`。`match` 按变体分支，并允许使用匹配到的内部数据。
