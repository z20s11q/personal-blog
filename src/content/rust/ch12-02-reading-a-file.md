---
title: "读取文件"
order: "ch12-02-reading-a-file"
chapter: 12
---
先准备测试文件：项目根目录建 `poem.txt`，放一首多行、含重复单词的诗。

**清单 12-3** 测试用例文本。

```text
I'm nobody! Who are you?
Are you nobody, too?
Then there's a pair of us - don't tell!
They'd banish us, you know.

How dreary to be somebody!
How public, like a frog
To tell your name the livelong day
To an admiring bog!
```

加读取文件的代码：

**清单 12-4** 读取第二个参数指定的文件。

```rust
use std::env;
use std::fs;

fn main() {
    // --snip--
    println!("In file {file_path}");

    let contents = fs::read_to_string(file_path)
        .expect("Should have been able to read the file");

    println!("With text:\n{contents}");
}
```

用 `std::fs` 处理文件。`fs::read_to_string` 打开文件并返回 `std::io::Result<String>`，其中是文件内容。

```console
$ cargo run -- the poem.txt
   Compiling minigrep v0.1.0 (file:///projects/minigrep)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.0s
     Running `target/debug/minigrep the poem.txt`
Searching for the
In file poem.txt
With text:
I'm nobody! Who are you?
Are you nobody, too?
Then there's a pair of us - don't tell!
They'd banish us, you know.

How dreary to be somebody!
How public, like a frog
To tell your name the livelong day
To an admiring bog!
```

读到了并打印出来，但有两个问题：`main` 职责太多；错误处理不到位。

程序还小，问题不大，但越往后越难改。小的代码更好重构，所以先重构。
