---
title: "模式语法"
order: "ch19-03-pattern-syntax"
chapter: 19
---
### 匹配字面量

模式可以直接是字面量，值相等才走该臂。

```rust
    let x = 1;

    match x {
        1 => println!("one"),
        2 => println!("two"),
        3 => println!("three"),
        _ => println!("anything"),
    }
```

### 匹配命名变量

命名变量不可反驳，匹配任意值。`match`、`if let`、`while let` 各自开辟作用域，模式里的名字会遮蔽外层同名变量。

**清单 19-11** 模式里的新变量遮蔽外层 `y`

文件：src/main.rs

```rust
    let x = Some(5);
    let y = 10;

    match x {
        Some(50) => println!("Got 50"),
        Some(y) => println!("Matched, y = {y}"),
        _ => println!("Default case, x = {x:?}"),
    }

    println!("at the end: x = {x:?}, y = {y}");
```

`Some(y)` 在 `match` 内新建 `y`，绑定的是 `Some` 里面的值，不是外层那个 `y`。`match` 结束后内层绑定消失。

`_` 臂不引入绑定，表达式里的名字仍是外层变量。

要用外层变量做比较，不要在模式里复用它的名字，改用匹配守卫。

### 多模式

`|` 是模式的或：同一臂里任一子模式匹配，该臂就执行。

```rust
    let x = 1;

    match x {
        1 | 2 => println!("one or two"),
        3 => println!("three"),
        _ => println!("anything"),
    }
```

### 用 `..=` 匹配范围

`..=` 是闭区间，比把每个值用 `|` 串起来短。

- 只允许数值和 `char`：编译器只能对这两类判断区间是否为空
- 空区间在编译期报错

```rust
    let x = 5;

    match x {
        1..=5 => println!("one through five"),
        _ => println!("something else"),
    }
```

`char` 同样可以用 `..=`。

### 解构

可以按结构拆开 struct、enum、元组。

#### 结构体

**清单 19-12** 把结构体字段解构到单独变量

文件：src/main.rs

```rust
    let x = 'c';

    match x {
        'a'..='j' => println!("early ASCII letter"),
        'k'..='z' => println!("late ASCII letter"),
        _ => println!("something else"),
    }
```

`Point { x: a, y: b }` 把字段 `x`、`y` 绑到 `a`、`b`。绑定名不必与字段名相同。

简写：只写字段名，绑定名与字段名相同，不必写 `x: x`。

**清单 19-13** 用字段简写解构结构体

文件：src/main.rs

```rust
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p = Point { x: 0, y: 7 };

    let Point { x: a, y: b } = p;
    assert_eq!(0, a);
    assert_eq!(7, b);
}
```

模式里可以混用字面量和绑定：某些字段必须等于给定值，其余字段拆出来用。

**清单 19-14** 同一模式里既解构又匹配字面量

文件：src/main.rs

```rust
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p = Point { x: 0, y: 7 };

    let Point { x, y } = p;
    assert_eq!(0, x);
    assert_eq!(7, y);
}
```

- `Point { x, y: 0 }`：`y` 为 0 时匹配，并绑定 `x`
- `Point { x: 0, y }`：`x` 为 0 时匹配，并绑定 `y`
- `Point { x, y }`：其余 `Point`

命中第一臂就停止。`(0, 0)` 同时落在两轴上，也只走先写的那一臂。

#### 枚举

模式形状跟变体里的数据一致。

**清单 19-15** 解构持有不同数据的枚举变体

文件：src/main.rs

```rust
fn main() {
    let p = Point { x: 0, y: 7 };

    match p {
        Point { x, y: 0 } => println!("On the x axis at {x}"),
        Point { x: 0, y } => println!("On the y axis at {y}"),
        Point { x, y } => {
            println!("On neither axis: ({x}, {y})");
        }
    }
}
```

- 无数据变体（`Message::Quit`）：只能匹配变体本身，不能再拆
- 结构体式变体：变体名后接 `{}`，规则同结构体，可用字段简写
- 元组式变体：变体名后接 `()`，变量个数必须等于元素个数

#### 嵌套结构体与枚举

模式可以多层嵌套。

**清单 19-16** 匹配嵌套枚举

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(i32, i32, i32),
}

fn main() {
    let msg = Message::ChangeColor(0, 160, 255);

    match msg {
        Message::Quit => {
            println!("The Quit variant has no data to destructure.");
        }
        Message::Move { x, y } => {
            println!("Move in the x direction {x} and in the y direction {y}");
        }
        Message::Write(text) => {
            println!("Text message: {text}");
        }
        Message::ChangeColor(r, g, b) => {
            println!("Change color to red {r}, green {g}, and blue {b}");
        }
    }
}
```

一条模式可以同时匹配外层变体和内层变体，并把最里面的值绑出来。

#### 结构体与元组

结构体模式和元组模式可以互相嵌套，一次拆到最内层的值。

```rust
enum Color {
    Rgb(i32, i32, i32),
    Hsv(i32, i32, i32),
}

enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(Color),
}

fn main() {
    let msg = Message::ChangeColor(Color::Hsv(0, 160, 255));

    match msg {
        Message::ChangeColor(Color::Rgb(r, g, b)) => {
            println!("Change color to red {r}, green {g}, and blue {b}");
        }
        Message::ChangeColor(Color::Hsv(h, s, v)) => {
            println!("Change color to hue {h}, saturation {s}, value {v}");
        }
        _ => (),
    }
}
```

### 在模式里忽略值

四种写法：

- `_`：匹配整值，不绑定
- 嵌在别的模式里的 `_`：只忽略一部分
- 以 `_` 开头的名字：仍然绑定，但抑制未使用警告
- `..`：忽略没写出的其余部分

#### 用 `_` 忽略整值

`_` 匹配任意值且不绑定。可用在 `match` 末臂，也可用于函数参数。实现 trait 时签名不能改、函数体又用不到某个参数，写成 `_` 以避免未使用警告。

**清单 19-17** 函数签名里使用 `_`

文件：src/main.rs

```rust
    let ((feet, inches), Point { x, y }) = ((3, 10), Point { x: 3, y: -10 });
```

#### 用嵌套 `_` 忽略一部分

只检查某一部分的形状、不用里面的值时，在该位置写 `_`。同一模式里可以写多个。

**清单 19-18** 匹配 `Some`，但不用里面的值

```rust
fn foo(_: i32, y: i32) {
    println!("This code only uses the y parameter: {y}");
}

fn main() {
    foo(3, 4);
}
```

**清单 19-19** 忽略元组中的若干元素

```rust
    let mut setting_value = Some(5);
    let new_setting_value = Some(10);

    match (setting_value, new_setting_value) {
        (Some(_), Some(_)) => {
            println!("Can't overwrite an existing customized value");
        }
        _ => {
            setting_value = new_setting_value;
        }
    }

    println!("setting is {setting_value:?}");
```

#### 以下划线开头的未使用变量

未使用的绑定默认警告。名字以 `_` 开头则不警告。

**对照**：和 Go 的空白标识符 `_` 不同。`_x` 仍然绑定；非 `Copy` 的值会被移动。

**清单 19-20** 名字以 `_` 开头以避开未使用警告

文件：src/main.rs

```rust
    let numbers = (2, 4, 8, 16, 32);

    match numbers {
        (first, _, third, _, fifth) => {
            println!("Some numbers: {first}, {third}, {fifth}");
        }
    }
```

单独的 `_` 完全不绑定；`_x` 这种名字仍然绑定。

**清单 19-21** 以下划线开头的名字仍会取得所有权

```rust
fn main() {
    let _x = 5;
    let y = 10;
}
```

`Some(_s)` 会把内部的 `String` 移进 `_s`，之后不能再使用原来的值。

**清单 19-22** 单独的 `_` 不绑定、不移动

```rust
    let s = Some(String::from("Hello!"));

    if let Some(_s) = s {
        println!("found a string");
    }

    println!("{s:?}");
```

`Some(_)` 不取得所有权，外层值仍可用。

#### 用 `..` 忽略剩余部分

`..` 吃掉本模式里没有明确写出的其余部分，不必为每个忽略位置写 `_`。它会展开成所需的个数。

**清单 19-23** 用 `..` 只保留 `Point` 的 `x`

```rust
    let s = Some(String::from("Hello!"));

    if let Some(_) = s {
        println!("found a string");
    }

    println!("{s:?}");
```

结构体写成 `Point { x, .. }`。元组同理，例如只绑定首尾。

**清单 19-24** 只匹配元组的首尾

文件：src/main.rs

```rust
    struct Point {
        x: i32,
        y: i32,
        z: i32,
    }

    let origin = Point { x: 0, y: 0, z: 0 };

    match origin {
        Point { x, .. } => println!("x is {x}"),
    }
```

`(first, .., last)` 绑定首尾，中间全部忽略。`..` 的位置必须没有歧义。

**清单 19-25** 有歧义地使用 `..`

文件：src/main.rs

```rust
fn main() {
    let numbers = (2, 4, 8, 16, 32);

    match numbers {
        (first, .., last) => {
            println!("Some numbers: {first}, {last}");
        }
    }
}
```

一个元组模式里 `..` 只能出现一次。

```rust
fn main() {
    let numbers = (2, 4, 8, 16, 32);

    match numbers {
        (.., second, ..) => {
            println!("Some numbers: {second}")
        },
    }
}
```

出现两次时，编译器无法确定每个 `..` 各吞掉几个元素。绑定的名字没有特殊含义。

### 匹配守卫

匹配守卫是模式后面的 `if` 条件：模式匹配且条件为真，才选中该臂。

- 只能用在 `match`，不能用在 `if let` 或 `while let`
- 条件里可以使用该模式引入的绑定
- 一旦有守卫，编译器不再检查穷尽

**清单 19-26** 给模式加匹配守卫

```console
$ cargo run
   Compiling patterns v0.1.0 (file:///projects/patterns)
error: `..` can only be used once per tuple pattern
 --> src/main.rs:5:22
  |
5 |         (.., second, ..) => {
  |          --          ^^ can only be used once per tuple pattern
  |          |
  |          previously used here

error: could not compile `patterns` (bin "patterns") due to 1 previous error
```

模式表达不了的条件（例如 `x % 2 == 0`）放在守卫里。守卫为假就继续试下一臂。

**清单 19-27** 用守卫比较外层变量

文件：src/main.rs

```rust
    let num = Some(4);

    match num {
        Some(x) if x % 2 == 0 => println!("The number {x} is even"),
        Some(x) => println!("The number {x} is odd"),
        None => (),
    }
```

守卫不是模式，不引入绑定，因此能读到外层变量。模式里改用别的名字，例如 `Some(n) if n == y`，避免遮蔽外层的 `y`。

`|` 与守卫一起写时，守卫作用于整组或模式，即 `(4 | 5 | 6) if y`，不是只约束最后一个值。

**清单 19-28** 多模式配一个匹配守卫

```rust
fn main() {
    let x = Some(5);
    let y = 10;

    match x {
        Some(50) => println!("Got 50"),
        Some(n) if n == y => println!("Matched, n = {n}"),
        _ => println!("Default case, x = {x:?}"),
    }

    println!("at the end: x = {x:?}, y = {y}");
}
```

第一臂的模式能匹配，但守卫为假，于是落到后面的臂。

```rust
    let x = 4;
    let y = false;

    match x {
        4 | 5 | 6 if y => println!("yes"),
        _ => println!("no"),
    }
```

守卫套在 `|` 连接的整个模式上。

```text
(4 | 5 | 6) if y => ...
```

不是只套在最后一项上。

```text
4 | 5 | (6 if y) => ...
```

### `@` 绑定

`@` 在测试子模式的同时，把匹配到的值绑到一个名字：`id @ 3..=7`。

- 只写范围：能测试，臂里没有具体值
- 只写变量（字段简写）：能用到值，但不测试范围
- `名字 @ 子模式`：两件事一起做

**清单 19-29** 用 `@` 一边测试范围一边绑定

```rust
    enum Message {
        Hello { id: i32 },
    }

    let msg = Message::Hello { id: 5 };

    match msg {
        Message::Hello { id: id @ 3..=7 } => {
            println!("Found an id in range: {id}")
        }
        Message::Hello { id: 10..=12 } => {
            println!("Found an id in another range")
        }
        Message::Hello { id } => println!("Found some other id: {id}"),
    }
```

`id @ 3..=7` 既要求落在 `3..=7`，又把实际的值留在 `id`。只写 `10..=12` 时，臂内不知道是 10、11 还是 12。最后一臂的 `id` 是字段简写，任意值都匹配，并且能使用该值。

## 小结

`match` 的模式必须穷尽，否则不能编译。`let` 和函数参数上的模式用来把值拆开再绑定。
