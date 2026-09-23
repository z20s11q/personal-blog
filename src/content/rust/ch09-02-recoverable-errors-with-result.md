---
title: "可恢复的错误与 `Result`"
order: "ch09-02-recoverable-errors-with-result"
chapter: 9
---
多数错误不严重，能处理并继续：比如打开文件失败是因为文件不存在，可以改成创建它。

`Result` 定义：

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

`T` 是成功时的值类型，`E` 是失败时的错误类型（泛型详见第 10 章）。两个参数可自由组合，因此适用于各种「成功值 / 错误值」组合。

**对照**：`Result` 相当于把「可能失败」写进类型。Java 用受检异常，Go 用多返回值 `(v, err)`，Python / C++ 用异常。Rust 的 `?` 与 Go 的 `if err != nil` 思路接近，但由编译器接管传播。

调用一个可能失败的函数：打开文件。

**清单 9-3** 打开文件。

```rust
use std::fs::File;

fn main() {
    let greeting_file_result = File::open("hello.txt");
}
```

`File::open` 返回 `Result<std::fs::File, std::io::Error>`：成功拿到文件句柄，失败拿到 I/O 错误（文件不存在、无权限等）。

成功时 `greeting_file_result` 是 `Ok(file)`，失败时是 `Err(error)`。

用 `match` 分支处理：

**清单 9-4** 用 `match` 处理 `Result`。

```rust
use std::fs::File;

fn main() {
    let greeting_file_result = File::open("hello.txt");

    let greeting_file = match greeting_file_result {
        Ok(file) => file,
        Err(error) => panic!("Problem opening the file: {error:?}"),
    };
}
```

`Result` 和 `Ok` / `Err` 在 prelude 里，无需写 `Result::` 前缀。

`Ok` 分支取出 `file` 赋给 `greeting_file`，之后可以读写。`Err` 分支这里选择了 `panic!`：

```console
$ cargo run
   Compiling error-handling v0.1.0 (file:///projects/error-handling)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.73s
     Running `target/debug/error-handling`

thread 'main' (6018048) panicked at src/main.rs:8:23:
Problem opening the file: Os { code: 2, kind: NotFound, message: "No such file or directory" }
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

### 匹配不同错误

清单 9-4 中任何失败都 panic。更细的处理：文件不存在就创建，其他错误仍 panic。加一层内层 `match`：

**清单 9-5** 按错误类型分别处理。

```rust
use std::fs::File;
use std::io::ErrorKind;

fn main() {
    let greeting_file_result = File::open("hello.txt");

    let greeting_file = match greeting_file_result {
        Ok(file) => file,
        Err(error) => match error.kind() {
            ErrorKind::NotFound => match File::create("hello.txt") {
                Ok(fc) => fc,
                Err(e) => panic!("Problem creating the file: {e:?}"),
            },
            _ => {
                panic!("Problem opening the file: {error:?}");
            }
        },
    };
}
```

`Err` 里是 `io::Error`，调用 `kind()` 得到 `io::ErrorKind` 枚举。`ErrorKind::NotFound` 表示文件不存在，此时用 `File::create` 创建；创建也可能失败，所以内层 `match` 还有第二个分支。外层第二个分支保持不变，非「文件不存在」的错误仍 panic。

> #### 不用 `match` 的写法
>
> `match` 很基础但啰嗦。第 13 章的闭包配合 `Result` 上的方法更简洁，例如 `unwrap_or_else`：
>
> ```rust
> use std::fs::File;
> use std::io::ErrorKind;
>
> fn main() {
>     let greeting_file = File::open("hello.txt").unwrap_or_else(|error| {
>         if error.kind() == ErrorKind::NotFound {
>             File::create("hello.txt").unwrap_or_else(|error| {
>                 panic!("Problem creating the file: {error:?}");
>             })
>         } else {
>             panic!("Problem opening the file: {error:?}");
>         }
>     });
> }
> ```
>
> 行为与清单 9-5 相同，没有 `match`，更易读。

#### 失败即 panic 的简写

`unwrap`：`Ok` 返回值，`Err` 则调用 `panic!`。

文件：src/main.rs

```rust
use std::fs::File;

fn main() {
    let greeting_file = File::open("hello.txt").unwrap();
}
```

没有 `hello.txt` 时报错：

```text
thread 'main' panicked at src/main.rs:4:49:
called `Result::unwrap()` on an `Err` value: Os { code: 2, kind: NotFound, message: "No such file or directory" }
```

`expect` 与 `unwrap` 相同，但可以自定义 panic 信息：

文件：src/main.rs

```rust
use std::fs::File;

fn main() {
    let greeting_file = File::open("hello.txt")
        .expect("hello.txt should be included in this project");
}
```

`expect` 的参数就是 panic 的消息：

```text
thread 'main' panicked at src/main.rs:5:10:
hello.txt should be included in this project: Os { code: 2, kind: NotFound, message: "No such file or directory" }
```

生产代码里更推荐 `expect`：断言「这里不该失败」，一旦失败，消息里有足够线索。

### 传播错误

函数内不处理，把错误返回给调用方，叫传播（propagating）。调用方掌握更多上下文，更能决定怎么办。

**清单 9-6** 用 `match` 把错误返回给调用方。

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_username_from_file() -> Result<String, io::Error> {
    let username_file_result = File::open("hello.txt");

    let mut username_file = match username_file_result {
        Ok(file) => file,
        Err(e) => return Err(e),
    };

    let mut username = String::new();

    match username_file.read_to_string(&mut username) {
        Ok(_) => Ok(username),
        Err(e) => Err(e),
    }
}
```

返回类型 `Result<String, io::Error>`：`T` 是 `String`，`E` 是 `io::Error`（与 `File::open` 和 `read_to_string` 的错误类型一致）。

`File::open` 成功就把句柄放进 `username_file`；失败用 `return` 直接返回错误。之后把文件内容读进 `username`，`read_to_string` 也可能失败，再 match 一次；成功返回 `Ok(username)`，失败返回 `Err`。

调用方拿到 `Ok` 或 `Err` 自行决定：panic、用默认用户名，或换个来源。

这个模式太常见，于是有了 `?`。

#### `?` 运算符

**清单 9-7** 用 `?` 实现同样的逻辑。

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_username_from_file() -> Result<String, io::Error> {
    let mut username_file = File::open("hello.txt")?;
    let mut username = String::new();
    username_file.read_to_string(&mut username)?;
    Ok(username)
}
```

`?` 放在 `Result` 后：`Ok` 就取出内部值继续，`Err` 就整个函数提前返回该错误，等价于清单 9-6 的 match。

区别：`?` 会对错误值调用 `From` trait 的 `from` 函数做类型转换，转成当前函数返回类型里的错误类型。这样即使一个函数内多处失败原因不同，也能统一成一个错误类型返回。

例如可以让 `read_username_from_file` 返回自定义的 `OurError`；只要实现 `impl From<io::Error> for OurError`，`?` 就会自动转换，函数体不用改。

在清单 9-7 里，`File::open(...)?` 成功则把句柄给 `username_file`，失败则提前返回。`read_to_string(...)?` 同理。

`?` 省掉大量样板。还能链式调用：

**清单 9-8** 在 `?` 后继续链式调用。

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_username_from_file() -> Result<String, io::Error> {
    let mut username = String::new();

    File::open("hello.txt")?.read_to_string(&mut username)?;

    Ok(username)
}
```

不再需要 `username_file`，直接把 `read_to_string` 链到 `File::open("hello.txt")?` 的结果上。功能相同，写法更紧凑。

还可以更短：

**清单 9-9** 用 `fs::read_to_string`。

```rust
use std::fs;
use std::io;

fn read_username_from_file() -> Result<String, io::Error> {
    fs::read_to_string("hello.txt")
}
```

`fs::read_to_string` 一步完成打开、创建 `String`、读取、返回，是最常用的写法。

#### `?` 的使用位置

`?` 只能用在返回类型与它操作的值兼容的函数里：对 `Result` 用 `?`，函数就要返回 `Result`（或 `Option` 等实现了 `FromResidual` 的类型）。

`main` 返回 `()` 时用 `?` 会编译报错：

**清单 9-10** 在返回 `()` 的 `main` 里用 `?`。

```rust
use std::fs::File;

fn main() {
    let greeting_file = File::open("hello.txt")?;
}
```

`File::open` 返回 `Result`，但 `main` 返回 `()`，类型不匹配。

```console
$ cargo run
   Compiling error-handling v0.1.0 (file:///projects/error-handling)
error[E0277]: the `?` operator can only be used in a function that returns `Result` or `Option` (or another type that implements `FromResidual`)
 --> src/main.rs:4:48
  |
3 | fn main() {
  | --------- this function should return `Result` or `Option` to accept `?`
4 |     let greeting_file = File::open("hello.txt")?;
  |                                                ^ cannot use the `?` operator in a function that returns `()`
  |
help: consider adding return type
  |
3 ~ fn main() -> Result<(), Box<dyn std::error::Error>> {
4 |     let greeting_file = File::open("hello.txt")?;
5 +     Ok(())
  |

For more information about this error, try `rustc --explain E0277`.
error: could not compile `error-handling` (bin "error-handling") due to 1 previous error
```

两种改法：把函数返回类型改成兼容的；或用 `match` / `Result` 上的方法就地处理。

`?` 也可以用在 `Option<T>` 上，同样要求函数返回 `Option`：`None` 提前返回，`Some` 取出继续。示例：

**清单 9-11** 对 `Option<T>` 使用 `?`。

```rust
fn last_char_of_first_line(text: &str) -> Option<char> {
    text.lines().next()?.chars().last()
}
```

返回 `Option<char>`：可能没有字符。`lines().next()?` 拿第一行，空串时 `next` 返回 `None`，`?` 提前返回。`chars().last()` 取最后一个字符，可能为空（如 `"\nhi"`）。

`Result` 与 `Option` 不能混用：`?` 不会自动互转，需要 `ok()` 或 `ok_or()` 显式转换。

`main` 可以返回 `Result<(), E>`：

**清单 9-12** 把 `main` 改为返回 `Result<(), E>`，就能用 `?`。

```rust
use std::error::Error;
use std::fs::File;

fn main() -> Result<(), Box<dyn Error>> {
    let greeting_file = File::open("hello.txt")?;

    Ok(())
}
```

`Box<dyn Error>` 是 trait 对象（第 18 章），意思是「任意错误」。这样 `main` 里任何 `Err` 都能提前返回。

`main` 返回 `Result<(), E>` 时：`Ok(())` 退出码 0，`Err` 非 0，与 C 程序约定一致。

`main` 还可以返回任何实现了 `std::process::Termination` 的类型（其 `report` 方法返回 `ExitCode`）。

接下来讨论何时该 panic、何时该返回 `Result`。
