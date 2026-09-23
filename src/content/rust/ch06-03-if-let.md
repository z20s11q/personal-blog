---
title: "用 `if let` 和 `let else` 简化控制流"
order: "ch06-03-if-let"
chapter: 6
---
`if let` 把 `if` 和 `let` 合在一起：值匹配一个模式就执行代码，其余情况忽略。

**清单 6-6** `match` 只在 `Some(max)` 时打印，`None` 用 `_ => ()` 忽略

```rust
    let config_max = Some(3u8);
    match config_max {
        Some(max) => println!("The maximum is configured to be {max}"),
        _ => (),
    }
```

只关心 `Some` 时，为了满足穷尽还得写 `_ => ()`。`if let` 的行为与这段 `match` 相同，写法更短。

```rust
    let config_max = Some(3u8);
    if let Some(max) = config_max {
        println!("The maximum is configured to be {max}");
    }
```

`if let 模式 = 表达式` 相当于只写一条臂的 `match`。这里模式是 `Some(max)`，`max` 绑到内部值，只在匹配时执行块。

少掉的是穷尽检查。需要确认每种情况都处理到时，用 `match`。

`if let` 可以带 `else`，对应等价 `match` 里的 `_` 臂。

```rust
    let mut count = 0;
    match coin {
        Coin::Quarter(state) => println!("State quarter from {state:?}!"),
        _ => count += 1,
    }
```

同一逻辑可以写成 `if let Coin::Quarter(state) = coin`，`else` 里处理其余硬币。

```rust
    let mut count = 0;
    if let Coin::Quarter(state) = coin {
        println!("State quarter from {state:?}!");
    } else {
        count += 1;
    }
```

## 用 `let else` 留在主路径

常见需求是：值在就继续算，不在就返回默认值。`if let` 会把后续逻辑嵌进成功分支。

```rust
impl UsState {
    fn existed_in(&self, year: u16) -> bool {
        match self {
            UsState::Alabama => year >= 1819,
            UsState::Alaska => year >= 1959,
            // -- snip --
        }
    }
}
```

**清单 6-7** 在 `if let Coin::Quarter(state)` 里面再判断州是否在 1900 年已存在；不是 quarter 则返回 `None`。后续工作全在 `if let` 体内，分支一多就难跟。

```rust
fn describe_state_quarter(coin: Coin) -> Option<String> {
    if let Coin::Quarter(state) = coin {
        if state.existed_in(1900) {
            Some(format!("{state:?} is pretty old, for America!"))
        } else {
            Some(format!("{state:?} is relatively new."))
        }
    } else {
        None
    }
}
```

也可以让 `if let` 在匹配时产出 `state`，否则 `return`。

**清单 6-8** 用 `if let` 取出 `state`，不匹配则提前 `return None`。一个分支给值，另一个分支直接返回，两条路径的控制流仍然不一样。

```rust
fn describe_state_quarter(coin: Coin) -> Option<String> {
    let state = if let Coin::Quarter(state) = coin {
        state
    } else {
        return None;
    };

    if state.existed_in(1900) {
        Some(format!("{state:?} is pretty old, for America!"))
    } else {
        Some(format!("{state:?} is relatively new."))
    }
}
```

`let 模式 = 表达式 else { ... }` 与 `if let` 类似，但没有成功分支的块。匹配时，绑定进入外层作用域。不匹配时进入 `else`，这个分支必须从函数返回。

**清单 6-9** `let Coin::Quarter(state) = coin else { return None; };`，成功路径留在函数主体

```rust
fn describe_state_quarter(coin: Coin) -> Option<String> {
    let Coin::Quarter(state) = coin else {
        return None;
    };

    if state.existed_in(1900) {
        Some(format!("{state:?} is pretty old, for America!"))
    } else {
        Some(format!("{state:?} is relatively new."))
    }
}
```

失败时从 `else` 离开，函数主体只写匹配成功之后的逻辑。

逻辑用 `match` 会过长时，可以用 `if let` 或 `let else`。

## 小结

enum 定义一组可枚举的变体。`Option<T>` 用类型系统表达缺失，避免把空值当成有值。变体里的数据用 `match` 或 `if let` 取出，选哪个取决于要处理多少种情况。

struct 和 enum 用来表达领域概念。自定义类型进 API 之后，编译器保证函数只收到它声明的那种值。
