---
title: "把 crate 发布到 crates.io"
order: "ch14-02-publishing-to-crates-io"
chapter: 14
---
crates.io 分发源码。发布前要写文档注释、整理公开 API，并补齐清单元数据。

### 有用的文档注释

`///` 写在被文档化的条目前面，支持 Markdown。`cargo doc` 调用 `rustdoc`，为公开 API 生成 HTML，输出在 `target/doc`。`cargo doc --open` 生成文档（含依赖）并打开浏览器。

**清单 14-1** 函数文档：一句说明、`# Examples`、一段示例代码。

```rust
/// Adds one to the number given.
///
/// # Examples
///
/// ```
/// let arg = 5;
/// let answer = my_crate::add_one(arg);
///
/// assert_eq!(6, answer);
/// ```
pub fn add_one(x: i32) -> i32 {
    x + 1
}
```

文档里常见、按需使用的小节：

- **Panics**：哪些情况下会 panic
- **Errors**：返回 `Result` 时有哪些错误、在什么条件下出现
- **Safety**：`unsafe` 函数为何不安全，调用者必须维持哪些不变式

#### 文档注释即测试

`///` 中的代码块会被 `cargo test` 当作文档测试执行。示例与实现不一致时，测试失败。

```text
   Doc-tests my_crate

running 1 test
test src/lib.rs - add_one (line 5) ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.27s
```

函数或示例改到 `assert_eq!` panic 时，文档测试会失败。

#### 容器条目的注释

`//!` 文档化的是包含这段注释的条目（crate 根文件或模块），不是紧跟在后面的条目。惯例放在 `src/lib.rs` 或模块开头，说明整个 crate 或模块。

**清单 14-2** 用 `//!` 写 crate 级文档。

```rust
//! # My Crate
//!
//! `my_crate` is a collection of utilities to make performing certain
//! calculations more convenient.

/// Adds one to the number given.
// --snip--
```

以 `//!` 开头的注释描述 crate 根（这里就是 `src/lib.rs`）。`cargo doc` 把它显示在文档首页、公开条目列表之上。

```rust
//! # Art
//!
//! A library for modeling artistic concepts.

pub mod kinds {
    /// The primary colors according to the RYB color model.
    pub enum PrimaryColor {
        Red,
        Yellow,
        Blue,
    }

    /// The secondary colors according to the RYB color model.
    pub enum SecondaryColor {
        Orange,
        Green,
        Purple,
    }
}

pub mod utils {
    use crate::kinds::*;

    /// Combines two primary colors in equal amounts to create
    /// a secondary color.
    pub fn mix(c1: PrimaryColor, c2: PrimaryColor) -> SecondaryColor {
        // --snip--
    }
}
```

### 导出方便的公开 API

内部模块可以很深。`pub use` 再导出：把已经公开的条目在另一条路径上再次公开，文档和 `use` 路径都按新位置呈现。内部模块结构可以保持不动。

**清单 14-3** `art` 把颜色类型放在 `kinds`，把 `mix` 放在 `utils`。

```rust
use art::kinds::PrimaryColor;
use art::utils::mix;

fn main() {
    let red = PrimaryColor::Red;
    let yellow = PrimaryColor::Yellow;
    mix(red, yellow);
}
```

没有再导出时，调用者必须按内部模块路径 `use`。

**清单 14-4** 使用者写 `art::kinds::PrimaryColor` 和 `art::utils::mix`。

```rust
//! # Art
//!
//! A library for modeling artistic concepts.

pub use self::kinds::PrimaryColor;
pub use self::kinds::SecondaryColor;
pub use self::utils::mix;

pub mod kinds {
    // --snip--
}

pub mod utils {
    // --snip--
}
```

crate 根上的 `pub use` 会出现在 `cargo doc` 首页。原来的模块路径仍然可用。

**清单 14-5** 把 `PrimaryColor`、`SecondaryColor`、`mix` 再导出到 crate 根。

```rust
use art::PrimaryColor;
use art::mix;

fn main() {
    // --snip--
}
```

**清单 14-6** 使用者改为 `use art::PrimaryColor` 和 `use art::mix`。

嵌套深时，顶层 `pub use` 能缩短对外路径。也可以把依赖里的定义再导出，使它成为本 crate 公开 API 的一部分。内部布局和对外 API 因此可以分开改。

### 登录

发布需要 API token。用 `cargo login` 把它交给 Cargo。

```console
$ cargo login
abcdefghijklmnopqrstuvwxyz012345
```

`cargo login` 把 token 写到本机 `~/.cargo/credentials.toml`。token 是密钥；泄露后应作废并重新生成。

### 给新 crate 加元数据

crates.io 上的 crate 名先到先得，占用后不能再发布同名包。发布前先查重，改 `[package] name`。

文件：Cargo.toml

```toml
[package]
name = "guessing_game"
```

只有名字不够。缺少 `description` 和 `license` 时，`cargo publish` 会失败。

```console
$ cargo publish
    Updating crates.io index
warning: manifest has no description, license, license-file, documentation, homepage or repository.
See https://doc.rust-lang.org/cargo/reference/manifest.html#package-metadata for more info.
--snip--
error: failed to publish to registry at https://crates.io

Caused by:
  the remote server responded with an error (status 400 Bad Request): missing or empty metadata fields: description, license. Please see https://doc.rust-lang.org/cargo/reference/manifest.html for more information on configuring these fields
```

`description` 一两句，会出现在搜索结果里。`license` 填 SPDX 许可证标识符，例如 `MIT`。

文件：Cargo.toml

```toml
[package]
name = "guessing_game"
license = "MIT"
```

SPDX 列表之外的许可证：把全文放进仓库里的文件，用 `license-file` 指向它。

多个许可证用 `OR` 连接，例如 `MIT OR Apache-2.0`。

可以发布的清单至少要有：唯一的 `name`、`version`、`description`，以及 `license` 或 `license-file`。

文件：Cargo.toml

```toml
[package]
name = "guessing_game"
version = "0.1.0"
edition = "2024"
description = "A fun game where you guess what number the computer has chosen."
license = "MIT OR Apache-2.0"

[dependencies]
```

### 发布到 crates.io

`cargo publish` 上传一个确定的版本。发布是永久的：该版本不能覆盖；除少数例外外也不能删除，这样依赖它的构建才能继续重现。版本个数没有上限。

```console
$ cargo publish
    Updating crates.io index
   Packaging guessing_game v0.1.0 (file:///projects/guessing_game)
    Packaged 6 files, 1.2KiB (895.0B compressed)
   Verifying guessing_game v0.1.0 (file:///projects/guessing_game)
   Compiling guessing_game v0.1.0
(file:///projects/guessing_game/target/package/guessing_game-0.1.0)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.19s
   Uploading guessing_game v0.1.0 (file:///projects/guessing_game)
    Uploaded guessing_game v0.1.0 to registry `crates-io`
note: waiting for `guessing_game v0.1.0` to be available at registry
`crates-io`.
You may press ctrl-c to skip waiting; the crate should be available shortly.
   Published guessing_game v0.1.0 at registry `crates-io`
```

### 发布已有 crate 的新版本

修改 `Cargo.toml` 里的 `version`，再执行 `cargo publish`。下一个版本号按语义化版本规则决定。

### 用 yank 弃用版本

已发布的版本不能删。`cargo yank --vers <版本>` 使新的依赖解析不再选中该版本；已经把该版本写进 `Cargo.lock` 的项目仍可构建。之后新生成的 lock 不会再选用被 yank 的版本。

```console
$ cargo yank --vers 1.0.1
    Updating crates.io index
        Yank guessing_game@1.0.1
```

`cargo yank --vers <版本> --undo` 撤销 yank，新项目可以再次依赖该版本。

```console
$ cargo yank --vers 1.0.1 --undo
    Updating crates.io index
      Unyank guessing_game@1.0.1
```

yank 不删除已上传的代码，也清不掉误传的密钥。密钥泄露后必须立刻轮换。
