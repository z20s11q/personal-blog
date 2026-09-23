---
title: "高级函数与闭包"
order: "ch20-04-advanced-functions-and-closures"
chapter: 20
---
本节讲函数指针和返回闭包。

### 函数指针

函数也能传给函数，不必每次都定义闭包。函数会强制转换成 `fn` 类型（小写 f，别和 `Fn` 闭包 trait 混淆），即函数指针。用它可以把函数当参数传递。

语法与闭包类似。

**清单 20-28** 用 `fn` 类型接收函数指针参数。

```rust
fn add_one(x: i32) -> i32 {
    x + 1
}

fn do_twice(f: fn(i32) -> i32, arg: i32) -> i32 {
    f(arg) + f(arg)
}

fn main() {
    let answer = do_twice(add_one, 5);

    println!("The answer is: {answer}");
}
```

输出 `The answer is: 12`。`do_twice` 的参数 `f` 是接收一个 `i32` 返回 `i32` 的 `fn`，函数体里直接调用。

`fn` 是类型而不是 trait，所以参数类型直接写 `fn`，不用泛型加 `Fn` 约束。

函数指针实现了全部三个闭包 trait（`Fn`、`FnMut`、`FnOnce`），凡是需要闭包的地方都能传函数指针。反过来最好用泛型加闭包 trait，这样函数和闭包都能收。

只想收 `fn` 而不收闭包的场景：与没有闭包的外部代码交互，比如 C 函数可以接收函数指针，但 C 没有闭包。

同一个 `map` 调用可以用闭包也可以用命名函数。

**清单 20-29** 用闭包配合 `map` 把数字转成字符串。

```rust
    let list_of_numbers = vec![1, 2, 3];
    let list_of_strings: Vec<String> =
        list_of_numbers.iter().map(|i| i.to_string()).collect();
```

也可以把命名函数传给 `map`。

**清单 20-30** 用 `String::to_string` 配合 `map` 把数字转成字符串。

```rust
    let list_of_numbers = vec![1, 2, 3];
    let list_of_strings: Vec<String> =
        list_of_numbers.iter().map(ToString::to_string).collect();
```

这里必须用完全限定语法，因为叫 `to_string` 的函数不止一个。

用的是 `ToString` trait 里的 `to_string`，标准库为所有实现了 `Display` 的类型实现了它。

枚举变体名也是初始化函数（第 6 章），可以作为函数指针传给需要闭包的方法。

**清单 20-31** 用枚举初始化函数配合 `map` 从数字创建 `Status` 实例。

```rust
    enum Status {
        Value(u32),
        Stop,
    }

    let list_of_statuses: Vec<Status> = (0u32..20).map(Status::Value).collect();
```

用 `Status::Value` 的初始化函数把范围内每个 `u32` 变成 `Status::Value`。两种写法编译结果相同，选清晰的那种。

### 返回闭包

闭包用 trait 表示，不能直接返回。通常想返回 trait 时会返回实现它的具体类型，但闭包没有可返回的具体类型：如果闭包捕获了作用域中的值，就不能用 `fn` 做返回类型。

解决办法是用 `impl Trait`（第 10 章）。可以返回 `Fn`、`FnOnce`、`FnMut` 任一函数类型。

**清单 20-32** 用 `impl Trait` 从函数返回闭包。

```rust
fn returns_closure() -> impl Fn(i32) -> i32 {
    |x| x + 1
}
```

但第 13 章提过，每个闭包都是独有的类型。需要多个签名相同、实现不同的函数时，得用 trait object。

**清单 20-33** 创建由返回 `impl Fn` 的函数构成的 `Vec<T>`。

```rust
fn main() {
    let handlers = vec![returns_closure(), returns_initialized_closure(123)];
    for handler in handlers {
        let output = handler(5);
        println!("{output}");
    }
}

fn returns_closure() -> impl Fn(i32) -> i32 {
    |x| x + 1
}

fn returns_initialized_closure(init: i32) -> impl Fn(i32) -> i32 {
    move |x| x + init
}
```

两个函数都返回 `impl Fn(i32) -> i32`，但返回的闭包不同。编译不过：

```text
$ cargo build
   Compiling functions-example v0.1.0 (file:///projects/functions-example)
error[E0308]: mismatched types
  --> src/main.rs:2:44
   |
 2 |     let handlers = vec![returns_closure(), returns_initialized_closure(123)];
   |                                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected opaque type, found a different opaque type
...
 9 | fn returns_closure() -> impl Fn(i32) -> i32 {
   |                         ------------------- the expected opaque type
...
13 | fn returns_initialized_closure(init: i32) -> impl Fn(i32) -> i32 {
   |                                              ------------------- the found opaque type
   |
   = note: expected opaque type `impl Fn(i32) -> i32`
              found opaque type `impl Fn(i32) -> i32`
   = note: distinct uses of `impl Trait` result in different opaque types

For more information about this error, try `rustc --explain E0308`.
error: could not compile `functions-example` (bin "functions-example") due to 1 previous error
```

返回 `impl Trait` 时，Rust 会创建独有的不透明类型，你无法窥探或写出它。两个函数返回的闭包即使实现了同一个 trait，Rust 生成的不透明类型也互不相同（与第 17 章不同 async 块生成不同类型同理）。解决办法还是 trait object。

**清单 20-34** 让函数返回 `Box<dyn Fn>`，使 `Vec<T>` 里元素类型统一。

```rust
fn returns_closure() -> Box<dyn Fn(i32) -> i32> {
    Box::new(|x| x + 1)
}

fn returns_initialized_closure(init: i32) -> Box<dyn Fn(i32) -> i32> {
    Box::new(move |x| x + init)
}
```

这样就能编译。trait object 详见第 18 章。

下一节讲宏。
