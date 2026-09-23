---
title: "把错误输出重定向到标准错误"
order: "ch12-06-writing-to-stderr-instead-of-stdout"
chapter: 12
---
终端有两路输出：`stdout` 放正常信息，`stderr` 放错误信息。这样用户可以把正常输出重定向到文件，同时仍在屏幕上看到错误。

`println!` 只能写标准输出，写标准错误要用别的宏。

### 检查错误写到了哪里

把标准输出重定向到文件，同时故意触发错误（不传参数）：

```console
$ cargo run > output.txt
```

`>` 把标准输出写进 `output.txt`，不在屏幕上。错误信息跑进文件里了：

```text
Problem parsing arguments: not enough arguments
```

错误信息应该写到标准错误，这样文件里只会有成功运行的数据。

### 打印错误到标准错误

标准库提供 `eprintln!` 写标准错误。因为前面重构过，错误打印都集中在 `main` 里，改两处 `println!` 即可：

**清单 12-24** 用 `eprintln!` 写错误。

```rust
fn main() {
    let args: Vec<String> = env::args().collect();

    let config = Config::build(&args).unwrap_or_else(|err| {
        eprintln!("Problem parsing arguments: {err}");
        process::exit(1);
    });

    if let Err(e) = run(config) {
        eprintln!("Application error: {e}");
        process::exit(1);
    }
}
```

再跑一次：

```console
$ cargo run > output.txt
Problem parsing arguments: not enough arguments
```

错误显示在屏幕上，`output.txt` 为空，符合命令行程序的预期行为。

正常运行时：

```console
$ cargo run -- to poem.txt > output.txt
```

文件里是搜索结果：

文件：output.txt

```text
Are you nobody, too?
How dreary to be somebody!
```

输出分流正确。

## 小结

本章覆盖了命令行参数、文件、环境变量和 `eprintln!`，足以编写命令行应用。

接下来讲受函数式语言影响的特性：闭包和迭代器。
