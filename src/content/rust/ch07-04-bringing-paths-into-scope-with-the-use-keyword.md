---
title: "用 `use` 把路径引进作用域"
order: "ch07-04-bringing-paths-into-scope-with-the-use-keyword"
chapter: 7
---
`use` 在当前作用域给路径建短名，后面不用每次写全路径。隐私检查仍走原来的路径。

**清单 7-11** `use crate::front_of_house::hosting;` 之后，调用写成 `hosting::add_to_waitlist()`。

文件：src/lib.rs

```rust
mod front_of_house {
    pub mod hosting {
        pub fn add_to_waitlist() {}
    }
}

use crate::front_of_house::hosting;

pub fn eat_at_restaurant() {
    hosting::add_to_waitlist();
}
```

`use` 只在它所在的作用域生效。子模块看不见父模块的 `use`。

**清单 7-12** `use` 在 crate 根，函数挪进子模块 `customer` 后编不过。

文件：src/lib.rs

```rust
mod front_of_house {
    pub mod hosting {
        pub fn add_to_waitlist() {}
    }
}

use crate::front_of_house::hosting;

mod customer {
    pub fn eat_at_restaurant() {
        hosting::add_to_waitlist();
    }
}
```

短名 `hosting` 在 `customer` 里不存在。

```console
$ cargo build
   Compiling restaurant v0.1.0 (file:///projects/restaurant)
error[E0433]: cannot find module or crate `hosting` in this scope
  --> src/lib.rs:11:9
   |
11 |         hosting::add_to_waitlist();
   |         ^^^^^^^ use of unresolved module or unlinked crate `hosting`
   |
   = help: if you wanted to use a crate named `hosting`, use `cargo add hosting` to add it to your `Cargo.toml`
help: consider importing this module through its public re-export
   |
10 +     use crate::hosting;
   |

warning: unused import: `crate::front_of_house::hosting`
 --> src/lib.rs:7:5
  |
7 | use crate::front_of_house::hosting;
  |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  |
  = note: `#[warn(unused_imports)]` (part of `#[warn(unused)]`) on by default

For more information about this error, try `rustc --explain E0433`.
warning: `restaurant` (lib) generated 1 warning
error: could not compile `restaurant` (lib) due to 1 previous error; 1 warning emitted
```

把 `use` 放进 `customer`，或在子模块里写 `super::hosting`。落在用不到它的作用域里的 `use` 会告警。

### 惯用的 `use` 路径

函数：`use` 父模块，调用时写 `父模块::函数`，调用处能看出它不是本地定义的。直接 `use` 函数不惯用。

**清单 7-13** 把 `add_to_waitlist` 本身引进作用域。

文件：src/lib.rs

```rust
mod front_of_house {
    pub mod hosting {
        pub fn add_to_waitlist() {}
    }
}

use crate::front_of_house::hosting::add_to_waitlist;

pub fn eat_at_restaurant() {
    add_to_waitlist();
}
```

struct、enum 和其他类型：惯用做法是 `use` 全路径，使用处直接写类型名。

**清单 7-14** `use std::collections::HashMap;`。

文件：src/main.rs

```rust
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    map.insert(1, 2);
}
```

这是约定。同一作用域不能有两个同名项。两个同名类型改成 `use` 各自的父模块。

**清单 7-15** 用 `fmt::Result` 和 `io::Result` 区分两个 `Result`。

文件：src/lib.rs

```rust
use std::fmt;
use std::io;

fn function1() -> fmt::Result {
    // --snip--
}

fn function2() -> io::Result<()> {
    // --snip--
}
```

`use std::fmt::Result` 和 `use std::io::Result` 会在同一作用域撞名。

### 用 `as` 起别名

`use 路径 as 别名`，只改当前作用域里的名字。

**对照**：和 Python `import x as y`、Go 的 `import alias "path"`、C++ 的 namespace 别名一样。Java 的 import 没有别名，撞名时写全限定名。

**清单 7-16** `use std::io::Result as IoResult;`。

文件：src/lib.rs

```rust
use std::fmt::Result;
use std::io::Result as IoResult;

fn function1() -> Result {
    // --snip--
}

fn function2() -> IoResult<()> {
    // --snip--
}
```

`IoResult` 和 `std::fmt::Result` 不再冲突。保留父模块名或用 `as` 都可以。

### 用 `pub use` 再导出

`use` 引进的名字默认只在该作用域里可见。`pub use` 再导出：外部可以把它当成定义在当前模块里的名字来引用。内部模块结构和对外 API 可以不一样。

**清单 7-17** 在 crate 根写 `pub use crate::front_of_house::hosting;`。

文件：src/lib.rs

```rust
mod front_of_house {
    pub mod hosting {
        pub fn add_to_waitlist() {}
    }
}

pub use crate::front_of_house::hosting;

pub fn eat_at_restaurant() {
    hosting::add_to_waitlist();
}
```

再导出之前，外部要写 `restaurant::front_of_house::hosting::add_to_waitlist()`，而且 `front_of_house` 也得是 `pub`。再导出之后可以写 `restaurant::hosting::add_to_waitlist()`。

**对照**：类似在 Python 包的 `__init__.py` 里再导出子模块的名字。Java 的 import 和 Go 的 import 都不会变成你自己的公共 API。

### 使用外部包

依赖写在 `Cargo.toml` 里。Cargo 从 crates.io 下载该包及其依赖。

文件：Cargo.toml

```toml
rand = "0.10.1"
```

下载完成后，`use` 以 crate 名开头，把需要的项引进作用域。

```rust
use rand::prelude::*;

fn main() {
    let secret_number = rand::rng().random_range(1..=100);
}
```

外部包都是这两步：写进 `Cargo.toml`，再用 `use`。`std` 随编译器提供，不用写进 `Cargo.toml`，但仍要用 `use` 把项引进来。

```rust
use std::collections::HashMap;
```

这是以标准库 crate 名 `std` 开头的绝对路径。

### 用嵌套路径合并 `use`

同一前缀的多项可以合成一条 `use`。

文件：src/main.rs

```rust
// --snip--
use std::cmp::Ordering;
use std::io;
// --snip--
```

共同前缀后面接 `::`，花括号里写不同的部分。

**清单 7-18** `use std::{cmp::Ordering, io};`。

文件：src/main.rs

```rust
// --snip--
use std::{cmp::Ordering, io};
// --snip--
```

嵌套可以出现在路径的任意一层。

**清单 7-19** 一条 `use` 是另一条的子路径。

文件：src/lib.rs

```rust
use std::io;
use std::io::Write;
```

前缀本身用 `self` 表示。

**清单 7-20** `use std::io::{self, Write};`。

文件：src/lib.rs

```rust
use std::io::{self, Write};
```

这一行同时引进 `std::io` 和 `std::io::Write`。

### 用 glob 导入

`use 路径::*;` 把该路径下全部公开项引进当前作用域。

```rust
use std::collections::*;
```

glob 让人看不清名字从哪来。依赖如果新增同名项，会和当前作用域里的定义冲突。测试里常用它把被测项引进 `tests` 模块；prelude 模式也会用。

**对照**：和 Python `from m import *`、Java `import pkg.*` 一样，升级依赖时可能突然撞名。Go 没有 glob import。
