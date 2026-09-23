---
title: "使用环境变量"
order: "ch12-05-working-with-environment-variables"
chapter: 12
---
给 `minigrep` 加大小写不敏感搜索，用环境变量控制。这样用户设一次，该终端会话内所有搜索都不区分大小写。

### 为大小写不敏感搜索写失败的测试

新增 `search_case_insensitive`，同时把旧测试从 `one_result` 改名 `case_sensitive`：

**清单 12-20** 新失败测试。

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn case_sensitive() {
        let query = "duct";
        let contents = "\
Rust:
safe, fast, productive.
Pick three.
Duct tape.";

        assert_eq!(vec!["safe, fast, productive."], search(query, contents));
    }

    #[test]
    fn case_insensitive() {
        let query = "rUsT";
        let contents = "\
Rust:
safe, fast, productive.
Pick three.
Trust me.";

        assert_eq!(
            vec!["Rust:", "Trust me."],
            search_case_insensitive(query, contents)
        );
    }
}
```

旧测试的 `contents` 加了一行 `"Duct tape."`（大写 D），确保大小写敏感逻辑不被破坏。新测试用 `"rUsT"` 作查询，应匹配 `"Rust:"` 和 `"Trust me."`。因为函数还没定义，编译不过。

### 实现 `search_case_insensitive`

**清单 12-21** 比较前把 `query` 和 `line` 都转小写。

```rust
pub fn search_case_insensitive<'a>(
    query: &str,
    contents: &'a str,
) -> Vec<&'a str> {
    let query = query.to_lowercase();
    let mut results = Vec::new();

    for line in contents.lines() {
        if line.to_lowercase().contains(&query) {
            results.push(line);
        }
    }

    results
}
```

`to_lowercase` 处理基本 Unicode，不是 100% 准确，真实应用要做得更好；本节重点是环境变量。

`query` 从 `&str` 变成 `String`：`to_lowercase` 生成新数据。传给 `contains` 时要加 `&`。

```console
$ cargo test
   Compiling minigrep v0.1.0 (file:///projects/minigrep)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 1.33s
     Running unittests src/lib.rs (target/debug/deps/minigrep-9cd200e5fac0fc94)

running 2 tests
test tests::case_insensitive ... ok
test tests::case_sensitive ... ok

test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

     Running unittests src/main.rs (target/debug/deps/minigrep-9cd200e5fac0fc94)

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests minigrep

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

```

测试通过。在 `run` 里调用新函数，`Config` 加 `ignore_case` 字段：

文件：src/main.rs

```rust
pub struct Config {
    pub query: String,
    pub file_path: String,
    pub ignore_case: bool,
}
```

**清单 12-22** 按 `config.ignore_case` 选择调用哪个搜索函数。

```rust
use minigrep::{search, search_case_insensitive};

// --snip--

fn run(config: Config) -> Result<(), Box<dyn Error>> {
    let contents = fs::read_to_string(config.file_path)?;

    let results = if config.ignore_case {
        search_case_insensitive(&config.query, &contents)
    } else {
        search(&config.query, &contents)
    };

    for line in results {
        println!("{line}");
    }

    Ok(())
}
```

**清单 12-23** 检查 `IGNORE_CASE` 环境变量。

```rust
impl Config {
    fn build(args: &[String]) -> Result<Config, &'static str> {
        if args.len() < 3 {
            return Err("not enough arguments");
        }

        let query = args[1].clone();
        let file_path = args[2].clone();

        let ignore_case = env::var("IGNORE_CASE").is_ok();

        Ok(Config {
            query,
            file_path,
            ignore_case,
        })
    }
}
```

`env::var` 返回 `Result`：设了返回 `Ok(值)`，没设返回 `Err`。用 `is_ok` 判断是否设置，不关心值本身。

试一下，不设环境变量搜 `to`：

```console
$ cargo run -- to poem.txt
   Compiling minigrep v0.1.0 (file:///projects/minigrep)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.0s
     Running `target/debug/minigrep to poem.txt`
Are you nobody, too?
How dreary to be somebody!
```

设 `IGNORE_CASE=1`：

```console
$ IGNORE_CASE=1 cargo run -- to poem.txt
```

PowerShell 的写法：

```console
PS> $Env:IGNORE_CASE=1; cargo run -- to poem.txt
```

取消设置：

```console
PS> Remove-Item Env:IGNORE_CASE
```

应该输出含 `to` 的行，其中可能带大写字母：

```console
Are you nobody, too?
How dreary to be somebody!
To tell your name the livelong day
To an admiring bog!
```

很好，`To` 这样的行也匹配了。`minigrep` 现在支持用环境变量控制大小写不敏感搜索。

有些程序同时支持命令行参数和环境变量，这时由程序决定哪个优先。可以自己练习：把大小写开关同时做成参数和环境变量，决定冲突时谁生效。

`std::env` 模块还有很多处理环境变量的功能，详见它的文档。
