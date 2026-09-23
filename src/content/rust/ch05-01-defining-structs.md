---
title: "定义并实例化结构体"
order: "ch05-01-defining-structs"
chapter: 5
---
struct 和元组都能保存多个不同类型的值。struct 的每一项是命名字段，实例化时字段顺序可以和定义不同。

定义写法：`struct`、类型名、花括号里的字段名和类型。

**清单 5-1** 定义 `User`：`active`、`username`、`email`、`sign_in_count`

```rust
struct User {
    active: bool,
    username: String,
    email: String,
    sign_in_count: u64,
}
```

实例是该类型的具体值：类型名后跟花括号，里面是 `字段: 值`。定义是模板，实例填入数据。

**清单 5-2** 创建一个 `User` 实例

```rust
fn main() {
    let user1 = User {
        active: true,
        username: String::from("someusername123"),
        email: String::from("someone@example.com"),
        sign_in_count: 1,
    };
}
```

用点号读字段，例如 `user1.email`。实例为 `mut` 时，可以给字段赋新值。

**清单 5-3** 修改可变 `User` 的 `email`

```rust
fn main() {
    let mut user1 = User {
        active: true,
        username: String::from("someusername123"),
        email: String::from("someone@example.com"),
        sign_in_count: 1,
    };

    user1.email = String::from("anotheremail@example.com");
}
```

可变性标在整个实例上。函数体的最后一个表达式如果是 struct 实例，就是返回值。

**清单 5-4** `build_user` 用参数填 `email` 和 `username`，其余字段写死

```rust
fn build_user(email: String, username: String) -> User {
    User {
        active: true,
        username: username,
        email: email,
        sign_in_count: 1,
    }
}
```

### 字段初始化简写

字段名与已在作用域中的变量名相同时，只写字段名，不必写 `email: email`。

**清单 5-5** `build_user` 对 `username` 和 `email` 使用简写

```rust
fn build_user(email: String, username: String) -> User {
    User {
        active: true,
        username,
        email,
        sign_in_count: 1,
    }
}
```

### 用结构体更新语法创建实例

新实例复用同类型另一个实例的大部分字段、只改少数字段时，用更新语法。

**清单 5-6** 逐字段从 `user1` 抄到 `user2`，只换 `email`

```rust
fn main() {
    // --snip--

    let user2 = User {
        active: user1.active,
        username: user1.username,
        email: String::from("another@example.com"),
        sign_in_count: user1.sign_in_count,
    };
}
```

`..实例` 表示其余未写出的字段取自该实例，并且必须放在最后。显式字段可以任意顺序，数量不限。

**清单 5-7** 只写新的 `email`，其余 `..user1`

```rust
fn main() {
    // --snip--

    let user2 = User {
        email: String::from("another@example.com"),
        ..user1
    };
}
```

更新语法按移动处理，和赋值一样。`username` 是 `String`，移进 `user2` 之后，`user1` 不能再整体使用。若 `email` 和 `username` 都重新构造，只从 `user1` 取实现了 `Copy` 的 `active` 和 `sign_in_count`，则 `user1` 仍然有效。本例里 `user1.email` 没有被移走，仍可单独使用。

**对照**：Java、Go、Python 复制的是引用，原对象还在。这里非 `Copy` 字段会被移走。

### 用元组结构体区分类型

tuple struct 有类型名，字段没有名字，只有类型。适合给一整组值单独的类型，而逐字段命名又多余。

定义是 `struct`、名字、括号里的类型。构造写成 `Color(0, 0, 0)`、`Point(0, 0, 0)`。

```rust
struct Color(i32, i32, i32);
struct Point(i32, i32, i32);

fn main() {
    let black = Color(0, 0, 0);
    let origin = Point(0, 0, 0);
}
```

每个 tuple struct 都是独立类型。`Color` 和 `Point` 都是三个 `i32`，参数类型是 `Color` 的函数不能接收 `Point`。

可以 `.0`、`.1` 按下标访问，也可以解构。解构必须写出类型名：`let Point(x, y, z) = origin;`。

**对照**：C++ 的 `using` 别名不产生新类型。tuple struct 是新类型。

### 定义类单元结构体

没有字段的 struct 叫 unit-like struct，行为类似单元类型 `()`。定义是 `struct AlwaysEqual;`，分号结尾，没有花括号或圆括号。实例同样只写类型名。

适合实现 trait、但类型本身不存数据。trait 在第 10 章。

```rust
struct AlwaysEqual;

fn main() {
    let subject = AlwaysEqual;
}
```

### 结构体数据的所有权

`User` 的字符串字段用拥有所有权的 `String`，数据的有效期就和实例一致。

字段也可以是引用，但必须写生命周期，否则编译器报缺少生命周期参数（E0106）。生命周期保证被引用的数据至少和 struct 一样久。第 10 章之前，用 `String` 这类拥有型字段。
