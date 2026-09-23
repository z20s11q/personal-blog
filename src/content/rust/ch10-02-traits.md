---
title: "用 trait 定义共享行为"
order: "ch10-02-traits"
chapter: 10
---
trait 定义某个类型具备、并可与其它类型共享的功能。trait bound 限定泛型类型必须具备某些行为。

> trait 类似其他语言的接口，但有差异。

### 定义 trait

行为就是能调用的方法。不同类型能调用相同方法，就共享同样的行为。trait 把方法签名聚在一起定义一组行为。

例：媒体聚合库 `aggregator`，`NewsArticle` 和 `SocialPost` 都要能输出摘要，靠 `summarize` 方法。清单 10-12 定义 `Summary` trait：

**清单 10-12** `Summary` trait，由 `summarize` 方法的行为组成。

```rust
pub trait Summary {
    fn summarize(&self) -> String;
}
```

`trait` 关键字加名字，`pub` 让依赖此 crate 的代码也能用。花括号里写方法签名，结尾是分号而不是实现体；每个实现该 trait 的类型都必须提供方法体。

trait 可以有多个方法，每行一个，都以分号结尾。

### 在类型上实现 trait

**清单 10-13** 为 `NewsArticle` 和 `SocialPost` 实现 `Summary`。

```rust
pub struct NewsArticle {
    pub headline: String,
    pub location: String,
    pub author: String,
    pub content: String,
}

impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        format!("{}, by {} ({})", self.headline, self.author, self.location)
    }
}

pub struct SocialPost {
    pub username: String,
    pub content: String,
    pub reply: bool,
    pub repost: bool,
}

impl Summary for SocialPost {
    fn summarize(&self) -> String {
        format!("{}: {}", self.username, self.content)
    }
}
```

`impl Trait for Type`：`impl` 后接 trait 名，再 `for`，再类型名。块里写具体方法体。

实现后，crate 用户就能像调用普通方法一样调用，前提是把 trait 也引入作用域。

```rust
use aggregator::{SocialPost, Summary};

fn main() {
    let post = SocialPost {
        username: String::from("horse_ebooks"),
        content: String::from(
            "of course, as you probably already know, people",
        ),
        reply: false,
        repost: false,
    };

    println!("1 new post: {}", post.summarize());
}
```

其他 crate 也能为自己的类型实现 `Summary`。限制：trait 或类型至少有一个是本地定义的（孤儿规则 / coherence），否则两个 crate 可能实现同一组合，Rust 无法判断用哪个。

**对照**：孤儿规则类似 C++ 不能为 `std::` 类型重载 `std::` 算法、Go 不能为别人的类型定义方法（除非在自己的包内包装新类型）。Java 接口无此约束，但实现类必须自己声明。

### 默认实现

trait 可以给部分方法提供默认实现，实现类型可以保留或覆盖。

**清单 10-14** 带默认实现的 `Summary`。

```rust
pub trait Summary {
    fn summarize(&self) -> String {
        String::from("(Read more...)")
    }
}
```

想用默认实现，写空 impl 块 `impl Summary for NewsArticle {}`。

```rust
    let article = NewsArticle {
        headline: String::from("Penguins win the Stanley Cup Championship!"),
        location: String::from("Pittsburgh, PA, USA"),
        author: String::from("Iceburgh"),
        content: String::from(
            "The Pittsburgh Penguins once again are the best \
             hockey team in the NHL.",
        ),
    };

    println!("New article available! {}", article.summarize());
```

打印 `New article available! (Read more...)`。

默认实现不影响 `SocialPost` 的既有实现：覆盖默认实现与实现无默认方法语法相同。

默认实现可以调用同一 trait 里的其他方法（即使那个方法没有默认实现）。这样实现者只需写一小部分：

```rust
pub trait Summary {
    fn summarize_author(&self) -> String;

    fn summarize(&self) -> String {
        format!("(Read more from {}...)", self.summarize_author())
    }
}
```

只需实现 `summarize_author`：

```rust
impl Summary for SocialPost {
    fn summarize_author(&self) -> String {
        format!("@{}", self.username)
    }
}
```

定义了 `summarize_author` 之后，`summarize` 自动可用。

```rust
    let post = SocialPost {
        username: String::from("horse_ebooks"),
        content: String::from(
            "of course, as you probably already know, people",
        ),
        reply: false,
        repost: false,
    };

    println!("1 new post: {}", post.summarize());
```

打印 `1 new post: (Read more from @horse_ebooks...)`。

注意：覆盖实现里不能调用该方法的默认实现。

### trait 作为参数

`impl Trait` 语法：

```rust
pub fn notify(item: &impl Summary) {
    println!("Breaking news! {}", item.summarize());
}
```

参数类型写 `impl Summary`，接受任何实现了 `Summary` 的类型。函数体里能调用 trait 的方法。传 `String` 或 `i32` 编译不过。

#### trait bound 语法

`impl Trait` 是 `trait bound` 的语法糖：

```rust
pub fn notify<T: Summary>(item: &T) {
    println!("Breaking news! {}", item.summarize());
}
```

把约束写在泛型参数声明后，冒号加 trait 名。复杂场景下 trait bound 能表达更多：两个参数都用 `impl Trait` 时允许类型不同：

```rust
pub fn notify(item1: &impl Summary, item2: &impl Summary) {
```

要强制两个参数类型相同，必须用 trait bound：

```rust
pub fn notify<T: Summary>(item1: &T, item2: &T) {
```

`T` 同时是 `item1` 和 `item2` 的类型，二者必须是同一具体类型。

#### 用 `+` 指定多个 trait bound

`item` 既要 `Display` 又要 `Summary`：

```rust
pub fn notify(item: &(impl Summary + Display)) {
```

泛型上同样可用：

```rust
pub fn notify<T: Summary + Display>(item: &T) {
```

加了两个约束后，函数体里既能调 `summarize`，也能用 `{}` 格式化。

#### 用 `where` 子句让约束更清晰

约束太多会让签名难读。`where` 子句把约束挪到函数签名之后：

```rust
fn some_function<T: Display + Clone, U: Clone + Debug>(t: &T, u: &U) -> i32 {
```

改成：

```rust
fn some_function<T, U>(t: &T, u: &U) -> i32
where
    T: Display + Clone,
    U: Clone + Debug,
{
```

函数名、参数列表、返回类型靠在一起，签名更清爽。

### 返回实现 trait 的类型

返回位置也能用 `impl Trait`：

```rust
fn returns_summarizable() -> impl Summary {
    SocialPost {
        username: String::from("horse_ebooks"),
        content: String::from(
            "of course, as you probably already know, people",
        ),
        reply: false,
        repost: false,
    }
}
```

`impl Summary` 表示返回某个实现了 `Summary` 的类型，调用方不需要知道具体是哪个。

这在闭包和迭代器场景特别有用（第 13 章）：它们的类型要么编译器才知道，要么长得没法写。

限制：只能返回单一类型。下面这个返回 `NewsArticle` 或 `SocialPost` 的写法不合法：

```rust
fn returns_summarizable(switch: bool) -> impl Summary {
    if switch {
        NewsArticle {
            headline: String::from(
                "Penguins win the Stanley Cup Championship!",
            ),
            location: String::from("Pittsburgh, PA, USA"),
            author: String::from("Iceburgh"),
            content: String::from(
                "The Pittsburgh Penguins once again are the best \
                 hockey team in the NHL.",
            ),
        }
    } else {
        SocialPost {
            username: String::from("horse_ebooks"),
            content: String::from(
                "of course, as you probably already know, people",
            ),
            reply: false,
            repost: false,
        }
    }
}
```

返回多种类型要用 trait 对象（第 18 章）。

### 用 trait bound 条件式实现方法

`impl` 块上加 trait bound，就能只为满足条件的类型实现方法。

**清单 10-15** 按 trait bound 条件实现方法。

```rust
use std::fmt::Display;

struct Pair<T> {
    x: T,
    y: T,
}

impl<T> Pair<T> {
    fn new(x: T, y: T) -> Self {
        Self { x, y }
    }
}

impl<T: Display + PartialOrd> Pair<T> {
    fn cmp_display(&self) {
        if self.x >= self.y {
            println!("The largest member is x = {}", self.x);
        } else {
            println!("The largest member is y = {}", self.y);
        }
    }
}
```

`Pair<T>` 始终有 `new`；但只有当 `T` 同时实现 `PartialOrd` 和 `Display` 时，才有 `cmp_display`。

也能为「任何实现了某 trait 的类型」实现另一个 trait，这叫 blanket implementation：

```rust
impl<T: Display> ToString for T {
    // --snip--
}
```

因为标准库有这个 blanket 实现，任何实现了 `Display` 的类型都能调用 `to_string`：

```rust
let s = 3.to_string();
```

trait 和 trait bound 让我们用泛型减少重复，同时告诉编译器泛型必须有哪些行为；编译器据此检查所有具体类型。动态类型语言里这类错误要到运行时才暴露，Rust 把它提前到编译期，且运行期无须再检查行为，性能和灵活性兼得。

**对照**：`impl Trait` 参数等价于 Java 的 `<? extends Interface>` 或 Go 的 interface 参数，但 Rust 是静态单态化（每个具体类型生成一份代码），Go / Java 走动态或接口表分发。
