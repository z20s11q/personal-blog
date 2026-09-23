---
title: "改进 I/O 项目"
order: "ch13-03-improving-our-io-project"
chapter: 13
---
用迭代器改 `Config::build` 和 `search`：前者去掉 `clone`，后者去掉手写循环。

### 用迭代器去掉 `clone`

`build` 若接收 `&[String]`，自己不拥有这些 `String`，要让 `Config` 持有它们就得 `clone`。

**清单 13-17** 旧的 `Config::build`：按下标取参数并 `clone`。

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

改为让 `build` 拥有一个产出 `String` 的迭代器，用 `next` 把 `String` 移进 `Config`，不再为 `query` 和 `file_path` 另做分配。

#### 直接使用返回的迭代器

文件：src/main.rs

```rust
fn main() {
    let args: Vec<String> = env::args().collect();

    let config = Config::build(&args).unwrap_or_else(|err| {
        eprintln!("Problem parsing arguments: {err}");
        process::exit(1);
    });

    // --snip--
}
```

`env::args` 返回的就是迭代器。把这份所有权直接交给 `Config::build`，不必先 `collect` 成 `Vec<String>` 再借出切片。

**清单 13-18** `Config::build(env::args())`。

```rust
fn main() {
    let config = Config::build(env::args()).unwrap_or_else(|err| {
        eprintln!("Problem parsing arguments: {err}");
        process::exit(1);
    });

    // --snip--
}
```

`env::args` 的具体类型是 `std::env::Args`，实现 `Iterator<Item = String>`。

参数写成 `impl Iterator<Item = String>`，表示任意产出 `String` 的迭代器。遍历会改内部状态，所以参数是 `mut`。

**清单 13-19** `build` 接收 `mut args: impl Iterator<Item = String>`。

```rust
impl Config {
    fn build(
        mut args: impl Iterator<Item = String>,
    ) -> Result<Config, &'static str> {
        // --snip--
```

#### 使用 `Iterator` 的方法

`args` 实现 `Iterator`，用 `next` 逐项取出 `String`。

**清单 13-20** `Config::build` 的函数体改为调用 `next`。

```rust
impl Config {
    fn build(
        mut args: impl Iterator<Item = String>,
    ) -> Result<Config, &'static str> {
        args.next();

        let query = match args.next() {
            Some(arg) => arg,
            None => return Err("Didn't get a query string"),
        };

        let file_path = match args.next() {
            Some(arg) => arg,
            None => return Err("Didn't get a file path"),
        };

        let ignore_case = env::var("IGNORE_CASE").is_ok();

        Ok(Config {
            query,
            file_path,
            ignore_case,
        })
    }
}
```

`env::args` 的第一项是程序名，先 `next` 丢掉。后面两次 `next`：`Some` 里的 `String` 直接移进 `query` 和 `file_path`；`None` 表示参数不够，返回 `Err`。

### 用迭代器适配器写清楚逻辑

**清单 13-21** 旧的 `search`：`for` 加可变的 `results`。

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
```

适配器版本不需要这块可变缓冲。少一块共享可变状态，以后若要并行搜索，就不必为结果向量做同步。

**清单 13-22** `lines`、`filter`、`collect` 实现 `search`。

```rust
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    contents
        .lines()
        .filter(|line| line.contains(query))
        .collect()
}
```

`filter` 保留 `line.contains(query)` 为真的行，`collect` 收成 `Vec<&'a str>`。`search_case_insensitive` 同样改。

可以去掉 `collect`，把返回类型改成 `impl Iterator<Item = &'a str>`，让 `search` 自己成为适配器。调用方的 `for` 会利用惰性：匹配到一行就产出。先 `collect` 再返回时，则要等全部行收集完才开始打印。测试也要改成消费这个迭代器。

### 循环还是迭代器

同样是收集完全部结果再返回时，惯用写法是迭代器：代码写的是过滤条件，下标和 `push` 由适配器承担。两种写法的性能见下一节。
