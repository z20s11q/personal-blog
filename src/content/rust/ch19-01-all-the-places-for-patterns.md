---
title: "模式能出现的位置"
order: "ch19-01-all-the-places-for-patterns"
chapter: 19
---
### `match` 分支

形式：`match VALUE { PATTERN => EXPRESSION, ... }`。每个分支是一个模式，加上匹配成功时求值的表达式。

```rust
match x {
    None => None,
    Some(i) => Some(i + 1),
}
```

箭头左边的 `None`、`Some(i)` 就是模式。

`match` 必须穷尽。末臂可以用一个变量名兜住剩余值（总能匹配，并绑定），或用 `_`（匹配任意值，但不绑定）。

### `let` 语句

形式：`let PATTERN = EXPRESSION;`。

```rust
let x = 5;
```

`let x = 5;` 里的 `x` 就是模式：把匹配到的值绑到 `x`。模式只有这个名字时，等于绑定任意值。

**清单 19-1** 用模式解构元组，一次绑定三个变量

```rust
    let (x, y, z) = (1, 2, 3);
```

元组模式的元素个数必须与值相同：`(1, 2, 3)` 对上 `(x, y, z)`，分别绑定 `1`、`2`、`3`。个数不同则类型不匹配。

**清单 19-2** 模式变量个数与元组元素个数不一致

```rust
    let (x, y) = (1, 2, 3);
```

模式与值的元素个数必须相同，否则类型错误。

```console
$ cargo run
   Compiling patterns v0.1.0 (file:///projects/patterns)
error[E0308]: mismatched types
 --> src/main.rs:2:9
  |
2 |     let (x, y) = (1, 2, 3);
  |         ^^^^^^   --------- this expression has type `({integer}, {integer}, {integer})`
  |         |
  |         expected a tuple with 3 elements, found one with 2 elements
  |
  = note: expected tuple `({integer}, {integer}, {integer})`
             found tuple `(_, _)`

For more information about this error, try `rustc --explain E0308`.
error: could not compile `patterns` (bin "patterns") due to 1 previous error
```

值里多出来的元素用 `_` 或 `..` 忽略。模式里变量太多，就删到与元素个数一致。

### 条件 `if let`

`if let` 是只关心一个模式的 `match` 简写，可以带 `else`。还能和 `else if`、`else if let` 串起来。各条件不必相关，编译器也不检查穷尽；漏掉最后的 `else` 不会报警。

`if let` 引入的绑定会遮蔽外层同名变量，而且从 `{` 才进入作用域，不能写成 `if let Ok(age) = age && age > 30`。

**清单 19-3** 混用 `if let`、`else if`、`else if let` 和 `else`

文件：src/main.rs

```rust
fn main() {
    let favorite_color: Option<&str> = None;
    let is_tuesday = false;
    let age: Result<u8, _> = "34".parse();

    if let Some(color) = favorite_color {
        println!("Using your favorite color, {color}, as the background");
    } else if is_tuesday {
        println!("Tuesday is green day!");
    } else if let Ok(age) = age {
        if age > 30 {
            println!("Using purple as the background color");
        } else {
            println!("Using orange as the background color");
        }
    } else {
        println!("Using blue as the background color");
    }
}
```

新绑定只在该分支的块里可用，后续比较要写在块内。这条链不保证覆盖所有情况。

### `while let` 条件循环

模式一直匹配，循环就继续。

**清单 19-4** `while let` 在 `rx.recv()` 返回 `Ok` 时打印

```rust
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        for val in [1, 2, 3] {
            tx.send(val).unwrap();
        }
    });

    while let Ok(value) = rx.recv() {
        println!("{value}");
    }
```

`recv` 在发送端还在时返回 `Ok(value)`，发送端断开后返回 `Err`，循环结束。

### `for` 循环

`for` 后面紧跟的是模式。`for x in y` 里的 `x` 就是模式，可以用来解构。

**清单 19-5** 在 `for` 里解构元组

```rust
    let v = vec!['a', 'b', 'c'];

    for (index, value) in v.iter().enumerate() {
        println!("{value} is at index {index}");
    }
```

会按索引打印每个元素。

```console
$ cargo run
   Compiling patterns v0.1.0 (file:///projects/patterns)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.52s
     Running `target/debug/patterns`
a is at index 0
b is at index 1
c is at index 2
```

`enumerate` 产出 `(index, value)`。模式 `(index, value)` 把下标和元素拆开。

### 函数参数

参数位置也是模式。

**清单 19-6** 函数签名里的参数是模式

```rust
fn foo(x: i32) {
    // code goes here
}
```

参数名和 `let` 一样是模式，也可以解构元组。

**清单 19-7** 参数解构元组

文件：src/main.rs

```rust
fn print_coordinates(&(x, y): &(i32, i32)) {
    println!("Current location: ({x}, {y})");
}

fn main() {
    let point = (3, 5);
    print_coordinates(&point);
}
```

`&(3, 5)` 匹配 `&(x, y)`，得到 `x = 3`、`y = 5`。闭包参数同样可以是模式。

不同位置对模式的要求不同：有的只能是不可反驳模式，有的允许可反驳模式。
