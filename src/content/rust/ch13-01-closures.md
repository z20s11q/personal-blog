---
title: "闭包"
order: "ch13-01-closures"
chapter: 13
---
闭包是可存入变量或作为参数传递的匿名函数，定义后可在别处调用。与 `fn` 不同，闭包能捕获定义处作用域里的值。

### 捕获环境

**清单 13-1** `giveaway` 在偏好为 `None` 时，用闭包调用 `self.most_stocked()`。

```rust
#[derive(Debug, PartialEq, Copy, Clone)]
enum ShirtColor {
    Red,
    Blue,
}

struct Inventory {
    shirts: Vec<ShirtColor>,
}

impl Inventory {
    fn giveaway(&self, user_preference: Option<ShirtColor>) -> ShirtColor {
        user_preference.unwrap_or_else(|| self.most_stocked())
    }

    fn most_stocked(&self) -> ShirtColor {
        let mut num_red = 0;
        let mut num_blue = 0;

        for color in &self.shirts {
            match color {
                ShirtColor::Red => num_red += 1,
                ShirtColor::Blue => num_blue += 1,
            }
        }
        if num_red > num_blue {
            ShirtColor::Red
        } else {
            ShirtColor::Blue
        }
    }
}

fn main() {
    let store = Inventory {
        shirts: vec![ShirtColor::Blue, ShirtColor::Red, ShirtColor::Blue],
    };

    let user_pref1 = Some(ShirtColor::Red);
    let giveaway1 = store.giveaway(user_pref1);
    println!(
        "The user with preference {:?} gets {:?}",
        user_pref1, giveaway1
    );

    let user_pref2 = None;
    let giveaway2 = store.giveaway(user_pref2);
    println!(
        "The user with preference {:?} gets {:?}",
        user_pref2, giveaway2
    );
}
```

`Option::unwrap_or_else` 接收无参、返回 `T` 的闭包：值为 `Some` 时直接取出内部值；为 `None` 时才调用闭包并返回其结果。闭包参数写在一对 `|` 之间，无参则写成 `||`。闭包在此处定义，由 `unwrap_or_else` 在需要时再求值。

```console
$ cargo run
   Compiling shirt-company v0.1.0 (file:///projects/shirt-company)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.27s
     Running `target/debug/shirt-company`
The user with preference Some(Red) gets Red
The user with preference None gets Blue
```

该闭包捕获了当前 `Inventory` 的不可变引用，连同闭包体一起交给标准库。标准库不必知道 `Inventory` 的类型。`fn` 项不能这样捕获环境。

### 推断与标注闭包类型

闭包参数和返回值通常不必标注：它们不构成对外接口，编译器在窄上下文里推断。需要明确时可以写类型。`fn` 必须标注参数和返回类型，因为签名是公开接口。

**清单 13-2** 为闭包的参数和返回值写上可选类型标注。

```rust
    let expensive_closure = |num: u32| -> u32 {
        println!("calculating slowly...");
        thread::sleep(Duration::from_secs(2));
        num
    };
```

带完整标注时，闭包语法接近 `fn`：参数用 `|` 而不是圆括号；类型和花括号都可以省略。

```rust
fn  add_one_v1   (x: u32) -> u32 { x + 1 }
let add_one_v2 = |x: u32| -> u32 { x + 1 };
let add_one_v3 = |x|             { x + 1 };
let add_one_v4 = |x|               x + 1  ;
```

单表达式闭包体可省略花括号。未标注类型时，闭包必须被调用（或另有类型约束）才能通过编译，类型从使用处推断，类似 `let v = Vec::new()` 需要标注或插入元素。

每个参数和返回值只推断出一种具体类型，之后锁定。

**清单 13-3** 先用 `String` 调用同一闭包，再传入整数。

```rust
    let example_closure = |x| x;

    let s = example_closure(String::from("hello"));
    let n = example_closure(5);
```

报错规则：闭包的参数类型已由第一次调用锁定为 `String`，再传入整数即类型不匹配。

```console
$ cargo run
   Compiling closure-example v0.1.0 (file:///projects/closure-example)
error[E0308]: mismatched types
 --> src/main.rs:5:29
  |
5 |     let n = example_closure(5);
  |             --------------- ^ expected `String`, found integer
  |             |
  |             arguments to this function are incorrect
  |
note: expected because the closure was earlier called with an argument of type `String`
 --> src/main.rs:4:29
  |
4 |     let s = example_closure(String::from("hello"));
  |             --------------- ^^^^^^^^^^^^^^^^^^^^^ expected because this argument is of type `String`
  |             |
  |             in this closure call
note: closure parameter defined here
 --> src/main.rs:2:28
  |
2 |     let example_closure = |x| x;
  |                            ^
help: try using a conversion method
  |
5 |     let n = example_closure(5.to_string());
  |                              ++++++++++++

For more information about this error, try `rustc --explain E0308`.
error: could not compile `closure-example` (bin "closure-example") due to 1 previous error
```

### 捕获引用或获取所有权

闭包按闭包体对捕获值的用法，自动选择一种捕获方式，对应函数参数的三种接收方式：

- 只读：不可变借用
- 要改：可变借用
- 需要所有权：移动

**清单 13-4** 闭包只打印 `list`，因此捕获不可变引用。

```rust
fn main() {
    let list = vec![1, 2, 3];
    println!("Before defining closure: {list:?}");

    let only_borrows = || println!("From closure: {list:?}");

    println!("Before calling closure: {list:?}");
    only_borrows();
    println!("After calling closure: {list:?}");
}
```

变量可以绑定闭包，之后用名字加括号调用，写法同函数调用。

不可变捕获期间可以并存多个共享借用，因此 `list` 在闭包定义前、调用前、调用后都仍可使用。

```console
$ cargo run
   Compiling closure-example v0.1.0 (file:///projects/closure-example)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.43s
     Running `target/debug/closure-example`
Before defining closure: [1, 2, 3]
Before calling closure: [1, 2, 3]
From closure: [1, 2, 3]
After calling closure: [1, 2, 3]
```

闭包体对 `list` 调用 `push` 时，改为捕获可变引用。存放该闭包的变量也必须是 `mut`，调用才会通过。

**清单 13-5** 闭包修改 `list`，捕获可变引用。

```rust
fn main() {
    let mut list = vec![1, 2, 3];
    println!("Before defining closure: {list:?}");

    let mut borrows_mutably = || list.push(7);

    borrows_mutably();
    println!("After calling closure: {list:?}");
}
```

```console
$ cargo run
   Compiling closure-example v0.1.0 (file:///projects/closure-example)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.43s
     Running `target/debug/closure-example`
Before defining closure: [1, 2, 3]
After calling closure: [1, 2, 3, 7]
```

可变借用从闭包定义持续到最后一次使用。这段区间内不能再借用 `list`，包括只读的 `println!`：已有独占借用时，不允许其他借用。

闭包体并不需要所有权时，仍可在参数列表前写 `move`，强制把用到的环境值移进闭包。

`thread::spawn` 的闭包必须在主线程结束后仍然有效。若主线程保留 `list` 并先 drop，线程里的引用会悬空，所以编译器要求把 `list` `move` 进闭包。

**对照** Java、Python、Go 的闭包捕获的是引用，不转移被捕获变量的所有权。Go 没有 `move` 闭包；循环变量还会被各闭包共享。C++ lambda 默认不捕获，要写 `[=]`、`[&]` 或 init-capture。Rust 默认按需借用，`move` 才把捕获值的所有权转进闭包。

**清单 13-6** `move` 闭包把 `list` 的所有权交给新线程。

```rust
use std::thread;

fn main() {
    let list = vec![1, 2, 3];
    println!("Before defining closure: {list:?}");

    thread::spawn(move || println!("From thread: {list:?}"))
        .join()
        .unwrap();
}
```

### 把捕获的值移出闭包

捕获决定什么移入闭包；闭包体决定调用时是否把值移出、是否修改。据此闭包自动实现一个或多个 `Fn` trait，关系是累加的：

- `FnOnce`：至少能调用一次。所有闭包都实现它。闭包体若把捕获值移出，就只有 `FnOnce`，不能再调用第二次。
- `FnMut`：不把捕获值移出，但可能修改它们。可以多次调用。
- `Fn`：不移出也不修改捕获值，或者什么都不捕获。可以多次调用且不改变环境，因此可以并发调用。

函数和类型用这些 trait 作约束，声明自己能接受哪一类闭包。

```rust
impl<T> Option<T> {
    pub fn unwrap_or_else<F>(self, f: F) -> T
    where
        F: FnOnce() -> T
    {
        match self {
            Some(x) => x,
            None => f(),
        }
    }
}
```

`unwrap_or_else` 的闭包参数约束是 `F: FnOnce() -> T`：无参、返回 `T`、最多调用一次。`Some` 时不调用 `f`，`None` 时调用一次。所有闭包都实现 `FnOnce`，所以三种闭包都能传入。

不需要捕获环境时，可以直接传函数项，例如 `unwrap_or_else(Vec::new)`。`fn` 项会自动实现适用的 `Fn` trait。

`sort_by_key` 对切片里每个元素调用一次闭包，闭包接收元素的引用并返回可排序的键 `K`，因此约束是 `FnMut`，不能是只允许调用一次的 `FnOnce`。

**清单 13-7** 用 `sort_by_key` 按 `width` 排序。

```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let mut list = [
        Rectangle { width: 10, height: 1 },
        Rectangle { width: 3, height: 5 },
        Rectangle { width: 7, height: 12 },
    ];

    list.sort_by_key(|r| r.width);
    println!("{list:#?}");
}
```

```console
$ cargo run
   Compiling rectangles v0.1.0 (file:///projects/rectangles)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.41s
     Running `target/debug/rectangles`
[
    Rectangle {
        width: 3,
        height: 5,
    },
    Rectangle {
        width: 7,
        height: 12,
    },
    Rectangle {
        width: 10,
        height: 1,
    },
]
```

`|r| r.width` 不捕获、不修改、不移出环境，满足 `FnMut`。

闭包若把环境里的非 `Copy` 值移出（把 `String` 推进另一个 `Vec`），就只实现 `FnOnce`，不能传给 `sort_by_key`。移出之后环境里不再有该值，第二次调用无法再移动它。

**清单 13-8** 闭包移出 `value`，不满足 `FnMut`。

```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let mut list = [
        Rectangle { width: 10, height: 1 },
        Rectangle { width: 3, height: 5 },
        Rectangle { width: 7, height: 12 },
    ];

    let mut sort_operations = vec![];
    let value = String::from("closure called");

    list.sort_by_key(|r| {
        sort_operations.push(value);
        r.width
    });
    println!("{list:#?}");
}
```

报错规则：`Fn` 和 `FnMut` 要求捕获值能被多次使用；把捕获值移出闭包后，该闭包只是 `FnOnce`。

```console
$ cargo run
   Compiling rectangles v0.1.0 (file:///projects/rectangles)
error[E0507]: cannot move out of `value`, a captured variable in an `FnMut` closure
  --> src/main.rs:18:30
   |
15 |     let value = String::from("closure called");
   |         -----   ------------------------------ move occurs because `value` has type `String`, which does not implement the `Copy` trait
   |         |
   |         captured outer variable
16 |
17 |     list.sort_by_key(|r| {
   |                      --- captured by this `FnMut` closure
18 |         sort_operations.push(value);
   |                              ^^^^^ `value` is moved here
   |
help: `Fn` and `FnMut` closures require captured values to be able to be consumed multiple times, but `FnOnce` closures may consume them only once
  --> /rustc/88d9e12ae178fab0fb5cc050a94da85685d449ea/library/alloc/src/slice.rs:249:11
help: consider cloning the value if the performance cost is acceptable
   |
18 |         sort_operations.push(value.clone());
   |                                   ++++++++

For more information about this error, try `rustc --explain E0507`.
error: could not compile `rectangles` (bin "rectangles") due to 1 previous error
```

要多次调用，闭包体就不能移出捕获值。对计数器做 `+=` 只捕获可变引用，闭包是 `FnMut`，可以反复调用。

**清单 13-9** `FnMut` 闭包可以传给 `sort_by_key`。

```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let mut list = [
        Rectangle { width: 10, height: 1 },
        Rectangle { width: 3, height: 5 },
        Rectangle { width: 7, height: 12 },
    ];

    let mut num_sort_operations = 0;
    list.sort_by_key(|r| {
        num_sort_operations += 1;
        r.width
    });
    println!("{list:#?}, sorted in {num_sort_operations} operations");
}
```

接受闭包的 API 用 `Fn`、`FnMut`、`FnOnce` 表达能否多次调用、会不会修改环境。迭代器方法大量接收闭包，约束同上。
