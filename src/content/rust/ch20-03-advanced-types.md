---
title: "高级类型"
order: "ch20-03-advanced-types"
chapter: 20
---
前面提过但没展开的类型系统特性：newtype、类型别名、`!` 类型、动态大小类型。

### 用 newtype 保证类型安全与封装

newtype 除了实现外部 trait，还能强制区分不同含义的值、标明单位。清单 20-16 里 `Millimeters` 和 `Meters` 都包装 `u32`：参数类型写成 `Millimeters` 的函数，误传 `Meters` 或裸 `u32` 都编译不过。

newtype 也能隐藏实现细节：新类型可以只暴露与内部类型不同的公开 API。例：用 `People` 包装 `HashMap<i32, String>`（ID 对应姓名），使用者只调用添加姓名的公开方法，不需要知道内部用 `i32` 编号。这是第 18 章讲的「封装」的轻量做法。

### 类型别名

`type` 关键字给已有类型起别名：

```rust
    type Kilometers = i32;
```

`Kilometers` 只是 `i32` 的同义词，不像 `Millimeters` / `Meters` 那样是新类型。`Kilometers` 的值当 `i32` 用：

```rust
    type Kilometers = i32;
    // ANCHOR_END: here

    let x: i32 = 5;
    let y: Kilometers = 5;

    println!("x + y = {}", x + y);
```

两者是同一类型，可以混合相加，也可以把 `Kilometers` 传给需要 `i32` 的函数。代价是没有 newtype 的类型检查：混用不会报错。

别名主要用来减少重复。比如这个长类型：

```rust
Box<dyn Fn() + Send + 'static>
```

在函数签名和类型标注里反复写长类型既累又容易错。

**清单 20-25** 在多处使用一个长类型。

```rust
    let f: Box<dyn Fn() + Send + 'static> = Box::new(|| println!("hi"));

    fn takes_long_type(f: Box<dyn Fn() + Send + 'static>) {
        // --snip--
    }

    fn returns_long_type() -> Box<dyn Fn() + Send + 'static> {
        // --snip--
    }
```

用别名 `Thunk` 代替长类型。

**清单 20-26** 引入类型别名 `Thunk` 减少重复。

```rust
    type Thunk = Box<dyn Fn() + Send + 'static>;

    let f: Thunk = Box::new(|| println!("hi"));

    fn takes_long_type(f: Thunk) {
        // --snip--
    }

    fn returns_long_type() -> Thunk {
        // --snip--
    }
```

好读也好写。取名有含义还能表达意图（thunk 指延后求值的代码，很适合存储起来的闭包）。

别名也常用于缩短 `Result<T, E>`。标准库 `std::io` 里 I/O 操作的错误类型是 `std::io::Error`，很多函数返回 `Result<T, std::io::Error>`，例如 `Write` trait 的这些函数：

```rust
use std::fmt;
use std::io::Error;

pub trait Write {
    fn write(&mut self, buf: &[u8]) -> Result<usize, Error>;
    fn flush(&mut self) -> Result<(), Error>;

    fn write_all(&mut self, buf: &[u8]) -> Result<(), Error>;
    fn write_fmt(&mut self, fmt: fmt::Arguments) -> Result<(), Error>;
}
```

`Result<..., Error>` 重复太多，于是 `std::io` 定义了别名：

```rust
type Result<T> = std::result::Result<T, std::io::Error>;
```

因为别名定义在 `std::io` 模块里，可以写 `std::io::Result<T>`，即把 `E` 填成 `std::io::Error` 的 `Result<T, E>`。`Write` trait 的函数签名就变成这样：

```rust
pub trait Write {
    fn write(&mut self, buf: &[u8]) -> Result<usize>;
    fn flush(&mut self) -> Result<()>;

    fn write_all(&mut self, buf: &[u8]) -> Result<()>;
    fn write_fmt(&mut self, fmt: fmt::Arguments) -> Result<()>;
}
```

别名有两个好处：写起来简单，且整个 `std::io` 接口统一。它本质上还是 `Result<T, E>`，所以 `Result<T, E>` 的方法和 `?` 运算符都能用。

### 永不返回的 never 类型

`!` 在类型理论里叫空类型，因为它没有任何值。它用作永不返回的函数的返回类型，这类函数叫发散函数。`!` 的值无法构造，所以这种函数不可能返回。

看个例子：

```rust
fn bar() -> ! {
    // --snip--
}
```

这段代码读作「函数 `bar` 永不返回」。那这种类型有什么用？回看第 2 章猜数字游戏里的一段代码：

**清单 20-27** 一条以 `continue` 结尾的 `match` 臂。

```rust
        let guess: u32 = match guess.trim().parse() {
            Ok(num) => num,
            Err(_) => continue,
        };
```

当时略过了一些细节。第 6 章说过 `match` 各臂必须返回同一类型，所以下面这样不行：

```rust
    let guess = match guess.trim().parse() {
        Ok(_) => 5,
        Err(_) => "hello",
    };
```

`guess` 的类型不能既是整数又是字符串。那 `continue` 返回什么？为什么清单 20-27 里一条臂给 `u32`、另一条以 `continue` 结尾也合法？

因为 `continue` 的值是 `!`。Rust 计算 `guess` 类型时看两条臂：`u32` 和 `!`。`!` 不可能有值，于是推断 `guess` 是 `u32`。

正式说法：`!` 类型的表达式可以强制转换成任何类型。`continue` 不返回值，它把控制流送回循环开头，所以 `Err` 分支不会给 `guess` 赋任何值。

`panic!` 也一样。`unwrap` 的定义：

```rust
impl<T> Option<T> {
    pub fn unwrap(self) -> T {
        match self {
            Some(val) => val,
            None => panic!("called `Option::unwrap()` on a `None` value"),
        }
    }
}
```

与清单 20-27 同理：`val` 是 `T`，`panic!` 是 `!`，整个 `match` 结果是 `T`。`panic!` 不产生值而是终止程序，`None` 分支不会返回，所以合法。

最后一个 `!` 表达式是循环：

```rust
    print!("forever ");

    loop {
        print!("and ever ");
    }
```

循环不结束，表达式的值就是 `!`。加了 `break` 就不成立了，因为循环会终止。

### 动态大小类型与 `Sized`

Rust 需要知道每种类型占多少内存，但有一类类型的大小只有运行时才知道，叫动态大小类型（DST）或 unsized 类型。

`str` 本身就是 DST（不是 `&str`）。用户输入的文本长度事先未知，所以不能声明 `str` 类型的变量，也不能收 `str` 参数：

```rust
    let s1: str = "Hello there!";
    let s2: str = "How's it going?";
```

同一类型的值必须占同样大小的内存，而这两个 `str` 长度不同（12 字节和 15 字节），所以不能直接持有。解决方案是 `&str`：切片保存起始位置和长度，是「地址 + 长度」两个值，大小是 `usize` 的两倍，编译期可知。

这就是 DST 的通用用法：附带一份存储大小的元数据。规则是 DST 的值必须放在某种指针后面。`str` 可以配 `Box<str>`、`Rc<str>` 等。

trait 也是 DST：用 trait 名引用时必须加指针，如 `&dyn Trait` 或 `Box<dyn Trait>`（见第 18 章）。

`Sized` trait 表示类型的编译期大小已知，编译期大小已知的类型自动实现它。泛型函数默认隐式加上 `Sized` 约束，所以：

```rust
fn generic<T>(t: T) {
    // --snip--
}
```

实际等同于：

```rust
fn generic<T: Sized>(t: T) {
    // --snip--
}
```

要让泛型函数接受可能非 `Sized` 的类型，用特殊语法 `?Sized`：

```rust
fn generic<T: ?Sized>(t: &T) {
    // --snip--
}
```

`?Sized` 表示「`T` 可能有大小限制也可能没有」，覆盖默认约束。`?Trait` 这种写法只对 `Sized` 可用。

注意参数类型从 `T` 改成了 `&T`：类型可能不是 `Sized`，必须放在指针后面，这里选了引用。

下一节讲函数和闭包。
