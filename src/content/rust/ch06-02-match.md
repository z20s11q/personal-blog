---
title: "`match` 控制流"
order: "ch06-02-match"
chapter: 6
---
`match` 把一个值按顺序和一系列模式比较，执行第一个匹配的分支。模式可以是字面量、变量名、通配符等，完整形式在第 19 章。编译器会确认所有可能都已覆盖。

**清单 6-3** `Coin` 的每个变体是一条 `match` 臂，返回美分

**对照**：`match` 必须穷尽。Java 的 `switch` 对枚举可以要求穷尽，对整数不必；C++ 的 `switch` 不检查是否覆盖了全部取值。

```rust
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter,
}

fn value_in_cents(coin: Coin) -> u8 {
    match coin {
        Coin::Penny => 1,
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter => 25,
    }
}
```

`match` 后的表达式可以是任意类型，这里是 `Coin`。`if` 的条件则必须是布尔值。

一条臂是模式、`=>`、以及要执行的代码。臂之间用逗号分隔。执行时按书写顺序比较，匹配则执行该臂，不再看后面的臂。臂上的代码是表达式，它的值就是整个 `match` 的值。

臂体很短时可以不写花括号。多行必须用花括号；块的最后一个表达式是该臂的值，臂后面的逗号可以省略。

```rust
fn value_in_cents(coin: Coin) -> u8 {
    match coin {
        Coin::Penny => {
            println!("Lucky penny!");
            1
        }
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter => 25,
    }
}
```

### 绑定值的模式

臂的模式可以把变体内部的数据绑到变量上，用来取出 enum 里的值。

**清单 6-4** `Quarter` 变体再携带一个 `UsState`

```rust
#[derive(Debug)] // so we can inspect the state in a minute
enum UsState {
    Alabama,
    Alaska,
    // --snip--
}

enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter(UsState),
}
```

模式 `Coin::Quarter(state)` 在匹配时把里面的 `UsState` 绑到 `state`，臂体里可以使用它。

```rust
fn value_in_cents(coin: Coin) -> u8 {
    match coin {
        Coin::Penny => 1,
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter(state) => {
            println!("State quarter from {state:?}!");
            25
        }
    }
}
```

`Coin::Quarter(UsState::Alaska)` 会跳过前面的臂，命中 `Coin::Quarter(state)`，此时 `state` 是 `UsState::Alaska`。

### 匹配 `Option<T>`

`match` 同样用于 `Option<T>`：有内部值就取出 `T`，没有就不做运算并得到 `None`。

**清单 6-5** `plus_one` 对 `Option<i32>` 匹配：`None` 得到 `None`，`Some(i)` 得到 `Some(i + 1)`

```rust
    fn plus_one(x: Option<i32>) -> Option<i32> {
        match x {
            None => None,
            // ANCHOR_END: first_arm
            Some(i) => Some(i + 1),
            // ANCHOR_END: second_arm
        }
    }

    let five = Some(5);
    let six = plus_one(five);
    let none = plus_one(None);
```

`plus_one(Some(5))` 时，函数里的 `x` 是 `Some(5)`。

```rust
            None => None,
```

`Some(5)` 不匹配 `None`，继续下一条臂。

```rust
            Some(i) => Some(i + 1),
```

`Some(5)` 与 `Some(i)` 是同一变体，`i` 绑成 `5`，结果是 `Some(6)`。

第二次调用时 `x` 是 `None`，从第一条臂开始比较。

```rust
            None => None,
```

这条臂匹配，没有值可加，`match` 的结果是 `None`，后面的臂不再比较。

### 匹配必须穷尽

各臂的模式必须盖住全部可能。只写 `Some`、不写 `None` 的 `plus_one` 不能编译。

```rust
    fn plus_one(x: Option<i32>) -> Option<i32> {
        match x {
            Some(i) => Some(i + 1),
        }
    }
```

漏掉 `None` 时，错误是 non-exhaustive patterns：模式 `None` 未覆盖。

```console
$ cargo run
   Compiling enums v0.1.0 (file:///projects/enums)
error[E0004]: non-exhaustive patterns: `None` not covered
 --> src/main.rs:3:15
  |
3 |         match x {
  |               ^ pattern `None` not covered
  |
note: `Option<i32>` defined here
 --> /rustc/88d9e12ae178fab0fb5cc050a94da85685d449ea/library/core/src/option.rs:598:0
 ::: /rustc/88d9e12ae178fab0fb5cc050a94da85685d449ea/library/core/src/option.rs:602:4
  |
  = note: not covered
  = note: the matched value is of type `Option<i32>`
help: ensure that all possible cases are being handled by adding a match arm with a wildcard pattern or an explicit pattern as shown
  |
4 ~             Some(i) => Some(i + 1),
5 ~             None => todo!(),
  |

For more information about this error, try `rustc --explain E0004`.
error: could not compile `enums` (bin "enums") due to 1 previous error
```

`match` 是穷尽的，漏掉的模式编译器会指出来。对 `Option<T>`，漏处理 `None` 就不能把可能缺失的值当成一定存在。

### 兜底模式与 `_` 占位符

少数取值单独处理、其余走同一条默认逻辑时，用一个变量模式接住剩余值。模式按顺序尝试，兜底臂必须放在最后；写在前面会使后续臂不可达，编译器会警告。

```rust
    let dice_roll = 9;
    match dice_roll {
        3 => add_fancy_hat(),
        7 => remove_fancy_hat(),
        other => move_player(other),
    }

    fn add_fancy_hat() {}
    fn remove_fancy_hat() {}
    fn move_player(num_spaces: u8) {}
```

字面量 `3` 和 `7` 是精确模式。变量 `other` 绑定其余任何值，并可以传给函数。最后这条模式让 `match` 在未列出每个 `u8` 时仍然穷尽。

不需要使用该值时写 `_`。`_` 匹配任意值，但不绑定，因此不会产生未使用变量的警告。

```rust
    let dice_roll = 9;
    match dice_roll {
        3 => add_fancy_hat(),
        7 => remove_fancy_hat(),
        _ => reroll(),
    }

    fn add_fancy_hat() {}
    fn remove_fancy_hat() {}
    fn reroll() {}
```

`_` 臂明确忽略其余值，穷尽检查仍然通过。

```rust
    let dice_roll = 9;
    match dice_roll {
        3 => add_fancy_hat(),
        7 => remove_fancy_hat(),
        _ => (),
    }

    fn add_fancy_hat() {}
    fn remove_fancy_hat() {}
```

`_ => ()` 表示这些值既不使用，也不执行其他代码。`()` 是单元值。

更多模式在第 19 章。只想处理一个模式时，可以用 `if let`。
