---
title: "把智能指针当普通引用用"
order: "ch15-02-deref"
chapter: 15
---
实现 `Deref` 可以自定义解引用运算符 `*`。写给引用的代码就能同样用于智能指针。

### 顺着引用拿到值

**清单 15-6** 对 `&i32` 使用 `*`，才能比较到里面的整数。

```rust
fn main() {
    let x = 5;
    let y = &x;

    assert_eq!(5, x);
    assert_eq!(5, *y);
}
```

`*` 顺着引用拿到被指向的值。整数和 `&整数` 类型不同，不能直接比较。

```console
$ cargo run
   Compiling deref-example v0.1.0 (file:///projects/deref-example)
error[E0277]: can't compare `{integer}` with `&{integer}`
 --> src/main.rs:6:5
  |
6 |     assert_eq!(5, y);
  |     ^^^^^^^^^^^^^^^^ no implementation for `{integer} == &{integer}`
  |
  = help: the trait `PartialEq<&{integer}>` is not implemented for `{integer}`
  = help: the following other types implement trait `PartialEq<Rhs>`:
            f128
            f16
            f32
            f64
            i128
            i16
            i32
            i64
          and 8 others

For more information about this error, try `rustc --explain E0277`.
error: could not compile `deref-example` (bin "deref-example") due to 1 previous error
```

### 像引用一样使用 `Box<T>`

**清单 15-7** 对 `Box<i32>` 使用 `*`，效果与对引用使用 `*` 相同。

```rust
fn main() {
    let x = 5;
    let y = Box::new(x);

    assert_eq!(5, x);
    assert_eq!(5, *y);
}
```

`Box::new(x)` 拥有的是 `x` 的副本（`i32` 是 `Copy`），不是指向原来那个 `x` 的引用。`*` 仍能顺着 box 取值。

### 定义自己的智能指针

下面的 `MyBox<T>` 不在堆上分配，只用来演示 `Deref`。`Box<T>` 本质是单字段元组结构体。

**清单 15-8** 定义 `MyBox<T>` 和 `MyBox::new`。

```rust
struct MyBox<T>(T);

impl<T> MyBox<T> {
    fn new(x: T) -> MyBox<T> {
        MyBox(x)
    }
}
```

`MyBox<T>` 是持有一个 `T` 的元组结构体。`new` 把传入的值包进去。

**清单 15-9** 对没实现 `Deref` 的 `MyBox<T>` 使用 `*`，不能编译。

```rust
fn main() {
    let x = 5;
    let y = MyBox::new(x);

    assert_eq!(5, x);
    assert_eq!(5, *y);
}
```

```console
$ cargo run
   Compiling deref-example v0.1.0 (file:///projects/deref-example)
error[E0614]: type `MyBox<{integer}>` cannot be dereferenced
  --> src/main.rs:14:19
   |
14 |     assert_eq!(5, *y);
   |                   ^^ can't be dereferenced

For more information about this error, try `rustc --explain E0614`.
error: could not compile `deref-example` (bin "deref-example") due to 1 previous error
```

没实现 `Deref` 就不能用 `*`。要实现 `deref`：借 `self`，返回内部数据的引用。

**清单 15-10** 为 `MyBox<T>` 实现 `Deref`。

```rust
use std::ops::Deref;

impl<T> Deref for MyBox<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
```

`type Target = T` 是关联类型，指明解引用后的类型。`deref` 返回 `&self.0`，不把内部值移出。

没有 `Deref` 时，编译器只会解引用 `&`。有了 `deref`，`*` 会先调用它，再做一次普通解引用。

```rust
*(y.deref())
```

`*y` 等价于 `*(y.deref())`，只替换一层，不会无限递归。

`deref` 必须返回引用。若直接返回值，就会把内部数据从 `self` 移走。外面的 `*` 再对这个引用做普通解引用，所有权不受影响。

```rust
fn hello(name: &str) {
    println!("Hello, {name}!");
}
```

### 函数和方法参数上的 Deref 强制转换

Deref 强制转换把实现了 `Deref` 的类型的引用，转成另一种类型的引用。例如 `String: Deref<Target = str>`，所以 `&String` 能变成 `&str`。

它发生在函数和方法的实参上：编译期按需插入若干次 `deref`，没有运行时开销。这样少写显式的 `&` 和 `*`，同一套代码既能吃引用，也能吃智能指针。

**清单 15-11** `hello` 的参数类型是 `&str`。

```rust
fn main() {
    let m = MyBox::new(String::from("Rust"));
    hello(&m);
}
```

**清单 15-12** 传入 `&MyBox<String>`：`deref` 先得到 `&String`，`String` 的 `Deref` 再得到 `&str`。

**清单 15-13** 没有强制转换时，调用处要自己写解引用和切片。

```rust
fn main() {
    let m = MyBox::new(String::from("Rust"));
    hello(&(*m)[..]);
}
```

`(*m)` 把 `MyBox<String>` 解成 `String`，`&` 和 `[..]` 再取整段 `&str`。有 `Deref` 时，插入几次 `Deref::deref` 在编译期就定了。

### 可变引用上的强制转换

`Deref` 管不可变引用上的 `*`，`DerefMut` 管可变引用上的 `*`。三种转换：

1. `&T` → `&U`，当 `T: Deref<Target = U>`
2. `&mut T` → `&mut U`，当 `T: DerefMut<Target = U>`
3. `&mut T` → `&U`，当 `T: Deref<Target = U>`

不可变引用不会转成可变引用。已有的 `&mut T` 必须是唯一引用，再收成 `&U` 不破坏借用规则；反过来，编译器无法保证这份不可变引用是唯一的。
