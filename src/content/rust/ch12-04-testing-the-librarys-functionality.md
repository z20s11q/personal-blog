---
title: "用测试驱动开发添加功能"
order: "ch12-04-testing-the-librarys-functionality"
chapter: 12
---
搜索逻辑挪到 `src/lib.rs` 后能直接测试，不用从命令行跑二进制。

本节的 TDD 流程：

1. 写一个会失败的测试，运行它，确认失败原因符合预期。
2. 写刚好够让它通过的代码。
3. 重构，保持测试通过。
4. 重复。

### 写一个失败的测试

在 `src/lib.rs` 加 `tests` 模块（同第 11 章）：

**清单 12-15** 为 `search` 写测试。

```rust
// --snip--

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn one_result() {
        let query = "duct";
        let contents = "\
Rust:
safe, fast, productive.
Pick three.";

        assert_eq!(vec!["safe, fast, productive."], search(query, contents));
    }
}
```

搜 `"duct"`，三行文本只有一行包含它，断言返回值只含这一行。

现在跑会因 `unimplemented!()` panic 而失败。先返回空 `Vec` 让函数能编译：

**清单 12-16** 让 `search` 不 panic。

```rust
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    vec![]
}
```

为什么签名要写显式生命周期 `'a`：返回值借用的是 `contents` 而不是 `query`（第 10 章）。不写会报错：

```console
$ cargo build
   Compiling minigrep v0.1.0 (file:///projects/minigrep)
error[E0106]: missing lifetime specifier
 --> src/lib.rs:1:51
  |
1 | pub fn search(query: &str, contents: &str) -> Vec<&str> {
  |                      ----            ----         ^ expected named lifetime parameter
  |
  = help: this function's return type contains a borrowed value, but the signature does not say whether it is borrowed from `query` or `contents`
help: consider introducing a named lifetime parameter
  |
1 | pub fn search<'a>(query: &'a str, contents: &'a str) -> Vec<&'a str> {
  |              ++++         ++                 ++              ++

For more information about this error, try `rustc --explain E0106`.
error: could not compile `minigrep` (lib) due to 1 previous error
```

编译器不知道返回值该关联哪个参数。注意提示建议「所有参数共用同一个生命周期」是错的：`contents` 才持有全部文本，返回值来自它。

### 写通过测试的代码

步骤：

1. 遍历每行。
2. 检查是否包含 `query`。
3. 包含就加入结果。
4. 不包含就跳过。
5. 返回结果。

#### 用 `lines` 逐行迭代

**清单 12-17** 遍历 `contents` 的每一行。

```rust
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    for line in contents.lines() {
        // do something with line
    }
}
```

`lines` 返回迭代器（第 13 章详解）。

#### 每行检查是否包含查询串

**清单 12-18** 用 `contains` 判断。

```rust
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    for line in contents.lines() {
        if line.contains(query) {
            // do something with line
        }
    }
}
```

#### 收集匹配的行

**清单 12-19** 用可变 `Vec` 收集并返回。

```rust
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    let mut results = Vec::new();

    for line in contents.lines() {
        if line.contains(query) {
            results.push(line);
        }
    }

    results
}
// ANCHOR_END: ch13
```

测试通过：

```console
$ cargo test
   Compiling minigrep v0.1.0 (file:///projects/minigrep)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 1.22s
     Running unittests src/lib.rs (target/debug/deps/minigrep-9cd200e5fac0fc94)

running 1 test
test tests::one_result ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

     Running unittests src/main.rs (target/debug/deps/minigrep-9cd200e5fac0fc94)

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests minigrep

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

```

现在程序能跑了。试试 `frog`：

```console
$ cargo run -- frog poem.txt
   Compiling minigrep v0.1.0 (file:///projects/minigrep)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.38s
     Running `target/debug/minigrep frog poem.txt`
How public, like a frog
```

再试匹配多行的 `body`：

```console
$ cargo run -- body poem.txt
   Compiling minigrep v0.1.0 (file:///projects/minigrep)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.0s
     Running `target/debug/minigrep body poem.txt`
I'm nobody! Who are you?
Are you nobody, too?
How dreary to be somebody!
```

最后试诗里没有的词 `monomorphization`：

```console
$ cargo run -- monomorphization poem.txt
   Compiling minigrep v0.1.0 (file:///projects/minigrep)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.0s
     Running `target/debug/minigrep monomorphization poem.txt`
```

完成。接下来看环境变量和标准错误输出。
