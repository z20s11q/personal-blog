---
title: "何时 panic，何时不 panic"
order: "ch09-03-to-panic-or-not-to-panic"
chapter: 9
---
panic 不可恢复；返回 `Result` 把选择权交给调用方：调用方可以恢复，也可以自己 panic。因此，定义可能失败的函数时，默认返回 `Result`。

例外：示例、原型、测试中用 panic 更合适。

### 示例、原型代码、测试

示例里加健壮的错误处理会掩盖重点，用 `unwrap` 当占位符即可。

原型阶段也推荐 `unwrap` / `expect`，它们标记出「这里还没想好错误处理」。

测试里方法调用失败就该让整个测试失败，`unwrap` / `expect` 正是要的行为。

### 你比编译器知道得更多

如果逻辑上保证 `Result` 一定是 `Ok`，但编译器看不出来，用 `expect` 并写明理由：

```rust
    use std::net::IpAddr;

    let home: IpAddr = "127.0.0.1"
        .parse()
        .expect("Hardcoded IP address should be valid");
```

`127.0.0.1` 是合法 IP，所以这里用 `expect` 合理。但 `parse` 的返回类型仍是 `Result`，编译器不知道这个字符串一定合法，仍要求处理 `Err`。如果这个字符串将来改成来自用户输入，那就必须换成真正的错误处理。

### 错误处理准则

出现「坏状态」时 panic。坏状态指某个假设、保证、约定或不变量被打破：传入了非法值、矛盾值或缺失值，并且满足以下一条或多条：

- 坏状态是意料之外的，而不是偶尔会发生的（比如用户输错格式）。
- 后续代码必须依赖「不在坏状态」，而不是每一步都检查。
- 无法把这条信息编码进类型（见第 18 章「用类型编码状态与行为」）。

调用方传入无意义的值时，能返回错误就返回错误，让它自己决定。但如果继续执行不安全或有害，最好 panic，提醒调用方代码有 bug。调用你无法控制的外部代码，它返回了无法修复的无效状态，也适合 panic。

失败是预期内的，返回 `Result`：比如解析器收到格式错误的数据、HTTP 请求遇到限流。这类返回值明确告诉调用方「失败是可能的」，需要它决定怎么办。

用非法值调用可能危害用户的操作，要先校验，不合法就 panic，这是安全考虑。标准库的越界访问 panic 就是这个道理。函数有契约：输入满足特定条件，行为才有保证。违反契约永远是调用方的 bug，无法合理恢复，只能改代码。会造成 panic 的契约要写进 API 文档。

到处写错误检查又啰嗦。用类型系统让编译器帮你检查：参数类型不是 `Option` 就说明「一定有值」，不用处理 `None` 分支；用 `u32` 就保证非负，运行期不用再查。

### 用自定义类型做校验

把「用类型系统保证有效值」推进一步：自定义校验类型。第 2 章猜数字游戏只检查了正数，没检查 1 到 100 范围。

可以解析成 `i32` 再检查范围：

文件：src/main.rs

```rust
    loop {
        // --snip--

        let guess: i32 = match guess.trim().parse() {
            Ok(num) => num,
            Err(_) => continue,
        };

        if guess < 1 || guess > 100 {
            println!("The secret number will be between 1 and 100.");
            continue;
        }

        match guess.cmp(&secret_number) {
            // --snip--
    }
```

`if` 检查越界就提示并 `continue`。之后 `guess` 一定在 1 到 100 之间。

但这不理想：很多函数都要求这个范围，每个都检查既啰嗦又影响性能。

更好：新建一个类型，把校验放进构造函数，函数签名直接用这个新类型。清单 9-13 定义 `Guess`，只在数值处于 1 到 100 时才能创建成功。

**清单 9-13** 只在值处于 1 到 100 时才继续的 `Guess` 类型。

文件：src/guessing_game.rs

```rust
pub struct Guess {
    value: i32,
}

impl Guess {
    pub fn new(value: i32) -> Guess {
        if value < 1 || value > 100 {
            panic!("Guess value must be between 1 and 100, got {value}.");
        }

        Guess { value }
    }

    pub fn value(&self) -> i32 {
        self.value
    }
}
```

`value` 字段私有，外部代码必须通过 `Guess::new` 创建实例，无法绕过校验。`value` 方法作为 getter 只读返回。

这样要求「1 到 100 的数字」的函数，参数直接写 `Guess`，函数体里不用再做任何检查。

## 小结

`panic!` 表示程序处于无法处理的状态，立即停止。`Result` 通过类型系统表示可能失败、调用方可以恢复。选对工具能让代码在问题面前更可靠。

标准库在 `Option` / `Result` 里已经用了泛型，下一章讲泛型怎么工作、怎么自己用。
