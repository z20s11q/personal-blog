---
title: "宏"
order: "ch20-05-macros"
chapter: 20
---
全书一直在用 `println!` 这类宏。宏是一族特性：`macro_rules!` 声明式宏，以及三类过程宏：

- 自定义 `#[derive]` 宏：为 `derive` 属性生成代码，用在结构体和枚举上
- 类属性宏：定义任意条目上可用的自定义属性
- 类函数宏：看起来像函数调用，实际作用于传入的 token

先看有了函数为什么还需要宏。

### 宏与函数的区别

宏本质是「写代码的代码」，即元编程。`derive`、`println!`、`vec!` 都属于此类，它们展开后产生的代码比你手写的多。

函数也能减少重复，但宏还有额外能力。函数签名必须声明参数个数和类型，宏可以接收不定数量的参数：`println!("hello")` 一个参数、`println!("hello {}", name)` 两个参数都行。宏在编译器解释代码之前展开，所以可以给某个类型实现 trait；函数做不到，因为函数在运行时才被调用，而 trait 实现必须发生在编译期。

代价是宏定义比函数复杂：你写的是「生成 Rust 代码的 Rust 代码」，可读性和可维护性更差。还有一点重要差异：宏必须先定义（或引入作用域）再调用，函数则随处可用。

### 声明式宏

最常用的是声明式宏（也叫「示例宏」「`macro_rules!` 宏」）。核心思路类似 `match` 表达式：`match` 拿一个值去比对模式，宏拿传入的字面源代码去比对模式，匹配后把代码替换进去，整个替换发生在编译期。

定义用 `macro_rules!`。以 `vec!` 为例：

```rust
let v: Vec<u32> = vec![1, 2, 3];
```

`vec!` 可以装两个整数或五个字符串切片，函数做不到，因为无法预先知道值的个数和类型。

**清单 20-35** `vec!` 宏的简化版定义。

```rust
#[macro_export]
macro_rules! vec {
    ( $( $x:expr ),* ) => {
        {
            let mut temp_vec = Vec::new();
            $(
                temp_vec.push($x);
            )*
            temp_vec
        }
    };
}
```

> 标准库真正的定义加了一段预分配内存的优化代码，这里为简单起见略去。

`#[macro_export]` 表示定义宏的 crate 被引入时这个宏可用；不写则无法引入。

定义以 `macro_rules!` 加宏名开头（名字不带感叹号），后面是花括号包住的宏体。

宏体结构与 `match` 类似：一条臂的模式是 `( $( $x:expr ),* )`，`=>` 后是配套代码。模式匹配就生成对应代码；只有一个模式时，写法不对就报错。复杂宏会有多条臂。

宏的模式语法与第 19 章的匹配模式不同，它比对的是代码结构而不是值：

- 外层括号包住整个模式。
- `$` 声明宏变量，用于存放匹配到的代码，以便在替换代码里使用。
- `$()` 捕获匹配到的内容，供替换代码使用；里面的 `$x:expr` 匹配任意表达式并命名为 `$x`。
- `$()` 后的逗号表示各部分之间必须有字面逗号分隔。
- `*` 表示前面的模式匹配零次或多次。

用 `vec![1, 2, 3];` 调用时，`$x` 匹配三次：`1`、`2`、`3`。替换代码里 `$()*` 中的 `temp_vec.push()` 按匹配次数生成，`$x` 逐个替换。生成结果：

```rust
{
    let mut temp_vec = Vec::new();
    temp_vec.push(1);
    temp_vec.push(2);
    temp_vec.push(3);
    temp_vec
}
```

至此我们定义了一个能接收任意数量、任意类型参数并生成创建 vector 代码的宏。想深入宏的写法，可参考在线文档和《The Little Book of Rust Macros》。

### 过程宏

过程宏更像函数：接收代码作为输入，处理后再输出代码，而不是按模式匹配替换。三类过程宏（自定义 `derive`、类属性、类函数）工作方式相似。

过程宏的定义必须放在单独的、带特殊 crate 类型的 crate 里（这是暂时性的技术限制）。

**清单 20-36** 定义过程宏的示例，`some_attribute` 是具体宏类型的占位符。

```rust
use proc_macro::TokenStream;

#[some_attribute]
pub fn some_name(input: TokenStream) -> TokenStream {
}
```

定义过程宏的函数接收 `TokenStream`、返回 `TokenStream`。`TokenStream` 由随 Rust 提供的 `proc_macro` crate 定义，表示一串 token：输入是宏作用的源代码，输出是宏生成的代码。函数上的属性标明这是哪类过程宏。同一个 crate 里可以有多种过程宏。

下面从自定义 `derive` 宏讲起，再看其他两类的差异。

### 自定义 `derive` 宏

做一个 `hello_macro` crate：定义 trait `HelloMacro` 及关联函数 `hello_macro`。用户不必为每个类型手写实现，只要写 `#[derive(HelloMacro)]` 就能获得默认实现，打印 `Hello, Macro! My name is TypeName!`（`TypeName` 是实现该 trait 的类型名）。

**清单 20-37** 使用我们这个 crate 的程序员最终能写出的代码。

```rust
use hello_macro::HelloMacro;
use hello_macro_derive::HelloMacro;

#[derive(HelloMacro)]
struct Pancakes;

fn main() {
    Pancakes::hello_macro();
}
```

最终会打印 `Hello, Macro! My name is Pancakes!`。先建库 crate：

```console
$ cargo new hello_macro --lib
```

**清单 20-38** 将配合 `derive` 宏使用的简单 trait。

```rust
pub trait HelloMacro {
    fn hello_macro();
}
```

一个 trait 加一个函数。用户可以手动实现它：

**清单 20-39** 用户手写 `HelloMacro` 实现时的样子。

```rust
use hello_macro::HelloMacro;

struct Pancakes;

impl HelloMacro for Pancakes {
    fn hello_macro() {
        println!("Hello, Macro! My name is Pancakes!");
    }
}

fn main() {
    Pancakes::hello_macro();
}
```

但每个类型都要手写实现块，我们想省掉这步。而且默认实现没法打印类型名：Rust 没有反射，运行时查不到类型名，必须在编译期由宏生成代码。

按约定，对名为 `foo` 的 crate，其自定义 `derive` 宏 crate 叫 `foo_derive`。在 `hello_macro` 项目里新建 `hello_macro_derive` crate：

```console
$ cargo new hello_macro_derive --lib
```

两个 crate 紧密相关，所以放在同一目录下。改 trait 定义就得改宏实现，发布时分开发布、分开引入。也可以让 `hello_macro` 依赖并重新导出宏，不这么做的好处是用户不需要 `derive` 时可以只用 `hello_macro`。

要把 `hello_macro_derive` 声明为过程宏 crate，并加上 `syn`、`quote` 依赖。在它的 Cargo.toml 里写：

```toml
[lib]
proc-macro = true

[dependencies]
syn = "2.0"
quote = "1.0"
```

宏定义放在 `hello_macro_derive` 的 src/lib.rs 里，注意 `impl_hello_macro` 未定义前这段代码编不过。

**清单 20-40** 大多数过程宏 crate 都需要的代码骨架。

```rust
use proc_macro::TokenStream;
use quote::quote;

#[proc_macro_derive(HelloMacro)]
pub fn hello_macro_derive(input: TokenStream) -> TokenStream {
    // Construct a representation of Rust code as a syntax tree
    // that we can manipulate.
    let ast = syn::parse(input).unwrap();

    // Build the trait implementation.
    impl_hello_macro(&ast)
}
```

代码拆成两个函数：外层 `hello_macro_derive` 负责解析 `TokenStream`，几乎每个过程宏都一样；内层 `impl_hello_macro` 负责转换语法树，随宏的用途变化。

用到三个 crate：`proc_macro`（随 Rust 提供，编译器 API，用于读写 Rust 代码）、`syn`（把 Rust 代码解析成可操作的数据结构）、`quote`（把数据结构转回 Rust 代码）。自己写完整的 Rust 解析器不现实，这两个 crate 省了大量工作。

用户在类型上写 `#[derive(HelloMacro)]` 时调用 `hello_macro_derive`：函数标注了 `proc_macro_derive` 且名字与 trait 相同，这是通用约定。

`hello_macro_derive` 先用 `syn::parse` 把 `TokenStream` 解析成 `DeriveInput` 结构体。

**清单 20-41** 解析 `struct Pancakes;` 得到的 `DeriveInput` 实例。

```rust
DeriveInput {
    // --snip--

    ident: Ident {
        ident: "Pancakes",
        span: #0 bytes(95..103)
    },
    data: Struct(
        DataStruct {
            struct_token: Struct,
            fields: Unit,
            semi_token: Some(
                Semi
            )
        }
    )
}
```

从字段可见解析出的是个 unit 结构体，`ident`（标识符，即名字）为 `Pancakes`。其余字段用于描述各种 Rust 代码，详见 `syn` 文档。

`derive` 宏的输出也是 `TokenStream`，它会被追加到用户代码里，编译时生效。

这里用 `unwrap` 简化错误处理：过程宏 API 要求 `proc_macro_derive` 函数返回 `TokenStream` 而非 `Result`，所以出错只能 panic。生产代码里应该用 `panic!` 或 `expect` 给出具体错误信息。

接下来生成 `HelloMacro` 的实现。

**清单 20-42** 用解析结果生成 `HelloMacro` 实现。

```rust
fn impl_hello_macro(ast: &syn::DeriveInput) -> TokenStream {
    let name = &ast.ident;
    let generated = quote! {
        impl HelloMacro for #name {
            fn hello_macro() {
                println!("Hello, Macro! My name is {}!", stringify!(#name));
            }
        }
    };
    generated.into()
}
```

`ast.ident` 取出被标注类型的名字。清单 20-37 的代码跑一遍，`name` 里就是打印出来为 `"Pancakes"` 的 `Ident` 实例。

用 `quote!` 定义要返回的 Rust 代码。它的直接产物不是编译器要的类型，需要调用 `into` 转成 `TokenStream`。

`quote!` 还支持模板：写 `#name` 会被替换成 `name` 变量的值，也支持和普通宏类似的重复写法。

`#name` 生成 `HelloMacro` 实现，其中 `hello_macro` 函数体打印前缀和类型名。

`stringify!` 是内置宏：把表达式在编译期变成字符串字面量（如 `1 + 2` 变 `"1 + 2"`），这与先求值再转字符串的 `format!` / `println!` 不同。因为 `#name` 可能是需要原样打印的表达式，用 `stringify!` 更稳妥，还能省一次分配。

此时两个 crate 都能 `cargo build` 通过。建一个二进制项目 `pancakes` 测试：把清单 20-37 的代码放进 src/main.rs，在 Cargo.toml 里以 `path` 依赖方式引入两个 crate：

```toml
[dependencies]
hello_macro = { path = "../hello_macro" }
hello_macro_derive = { path = "../hello_macro/hello_macro_derive" }
```

`cargo run` 输出 `Hello, Macro! My name is Pancakes!`。`pancakes` 没有手写任何实现，`#[derive(HelloMacro)]` 就加上了 trait 实现。

再看其他两类过程宏与 `derive` 的差异。

### 类属性宏

类属性宏与自定义 `derive` 宏类似，但生成的是新属性而不是实现 `derive`。它更灵活：`derive` 只能用于结构体和枚举，属性可用于函数等任意条目。例：Web 框架里给函数标注路由：

```rust
#[route(GET, "/")]
fn index() {
```

这个 `#[route]` 属性由框架以过程宏实现，定义函数的签名是：

```rust
#[proc_macro_attribute]
pub fn route(attr: TokenStream, item: TokenStream) -> TokenStream {
```

两个 `TokenStream` 参数：第一个是属性的内容（`GET, "/"`），第二个是属性所标注条目的内容（`fn index() {}` 及函数体）。其余用法与自定义 `derive` 宏相同：建一个 `proc-macro` 类型的 crate，实现生成代码的函数。

### 类函数宏

类函数宏看起来像函数调用，和 `macro_rules!` 一样比函数灵活（可接收不定数量参数），但定义方式不同：它接收 `TokenStream`，用 Rust 代码对它做任意处理。例如 `sql!`：

```rust
let sql = sql!(SELECT * FROM posts WHERE id=1);
```

它会解析并校验 SQL 语法，这种复杂处理是 `macro_rules!` 做不到的。定义：

```rust
#[proc_macro]
pub fn sql(input: TokenStream) -> TokenStream {
```

与自定义 `derive` 宏的签名类似：接收括号里的 token，返回要生成的代码。

## 小结

本章特性平时用得不多，但遇到时应当能认出它们，在报错建议或别人的代码里识别这些概念。可以把本章当参考手册。

下一章用一个完整项目把全书内容串起来。
