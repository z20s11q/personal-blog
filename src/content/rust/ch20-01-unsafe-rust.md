---
title: "Unsafe Rust"
order: "ch20-01-unsafe-rust"
chapter: 20
---
静态分析偏保守：证明不了安全就拒绝，哪怕程序其实没问题。`unsafe` 表示这部分改由程序员保证。用错会出现空指针解引用一类内存不安全。和操作系统、硬件打交道时也需要它。

### 五类能力

`unsafe { ... }` 里才能做、安全 Rust 不能做的五件事：

1. 解引用裸指针
2. 调用 unsafe 函数或方法
3. 读或写可变静态变量
4. 实现 unsafe trait
5. 访问 `union` 的字段

`unsafe` 不关闭借用检查，其他安全检查也不关。引用在块里照样检查。它只是放开这五项，编译器不再替你证明内存安全。

块尽量小，最好包进安全函数，对外仍是安全 API。标准库里不少安全接口就是审过的 unsafe 实现。

### 解引用裸指针

裸指针写成 `*const T` 和 `*mut T`。这里的 `*` 是类型名的一部分，不是解引用运算符。对 `*const T` 来说，不可变指不能通过这个指针赋值。

和引用的差别：

- 可以无视借用规则：同一地址上同时有不可变和可变裸指针，或多个可变裸指针
- 不保证指向有效内存
- 可以为空
- 没有自动清理

**对照**：接近 C/C++ 指针，没有 Rust 引用的借用保证。

**清单 20-1** 用裸借用运算符创建裸指针

```rust
    let mut num = 5;

    let r1 = &raw const num;
    let r2 = &raw mut num;
```

创建裸指针在安全代码里合法，解引用必须在 `unsafe` 块里。

`&raw const` 得到 `*const T`，`&raw mut` 得到 `*mut T`。从局部变量造出来的指针此处有效；任意裸指针不能默认当成有效。

也可以用 `as` 把整数地址转成裸指针。指向任意地址是未定义行为。

**清单 20-2** 创建指向任意地址的裸指针

```rust
    let address = 0x012345usize;
    let r = address as *const i32;
```

解引用用 `*`，并且必须放在 `unsafe` 块里。

**清单 20-3** 在 `unsafe` 块里解引用裸指针

```rust
    let mut num = 5;

    let r1 = &raw const num;
    let r2 = &raw mut num;

    unsafe {
        println!("r1 is: {}", *r1);
        println!("r2 is: {}", *r2);
    }
```

创建指针本身不访问内存；解引用才可能读到无效值。

同一位置可以同时有 `*const` 和 `*mut`，并通过可变指针改数据，可能造成数据竞争。普通引用不允许这样。

用途：与 C 交互，或实现借用检查器无法理解、但人能证明安全的抽象。

### 调用 unsafe 函数或方法

定义前加 `unsafe`，表示有调用方必须遵守、编译器无法检查的契约。调用必须包在 `unsafe` 块里。

```rust
    unsafe fn dangerous() {}

    unsafe {
        dangerous();
    }
```

不在 `unsafe` 块里调用 `unsafe fn`，编译失败。

```console
$ cargo run
   Compiling unsafe-example v0.1.0 (file:///projects/unsafe-example)
error[E0133]: call to unsafe function `dangerous` is unsafe and requires unsafe block
 --> src/main.rs:4:5
  |
4 |     dangerous();
  |     ^^^^^^^^^^^ call to unsafe function
  |
  = note: consult the function's documentation for information on how to avoid undefined behavior

For more information about this error, try `rustc --explain E0133`.
error: could not compile `unsafe-example` (bin "unsafe-example") due to 1 previous error
```

`unsafe` 块表示调用方已核对文档并满足契约。

`unsafe fn` 的函数体里再做 unsafe 操作，仍要另写 `unsafe` 块。这样不安全的范围可以保持很小。

#### 在 unsafe 之上做安全抽象

体内有 unsafe，不代表整个函数都要标 `unsafe`。常见做法是安全函数包住 unsafe。

`split_at_mut` 在下标处把可变切片拆成两段不重叠的可变切片。

**清单 20-4** 使用安全的 `split_at_mut`

```rust
    let mut v = vec![1, 2, 3, 4, 5, 6];

    let r = &mut v[..];

    let (a, b) = r.split_at_mut(3);

    assert_eq!(a, &mut [1, 2, 3]);
    assert_eq!(b, &mut [4, 5, 6]);
```

只用安全 Rust 写不出来：编译器认为对同一切片做了两次可变借用。

**清单 20-5** 仅用安全 Rust 实现 `split_at_mut`（不能编译）

```rust
fn split_at_mut(values: &mut [i32], mid: usize) -> (&mut [i32], &mut [i32]) {
    let len = values.len();

    assert!(mid <= len);

    (&mut values[..mid], &mut values[mid..])
}
```

应先保证下标不超过长度，再返回两段切片。失败原因是同一引用被可变借用了两次。

```console
$ cargo run
   Compiling unsafe-example v0.1.0 (file:///projects/unsafe-example)
error[E0499]: cannot borrow `*values` as mutable more than once at a time
 --> src/main.rs:6:31
  |
1 | fn split_at_mut(values: &mut [i32], mid: usize) -> (&mut [i32], &mut [i32]) {
  |                         - let's call the lifetime of this reference `'1`
...
6 |     (&mut values[..mid], &mut values[mid..])
  |     --------------------------^^^^^^--------
  |     |     |                   |
  |     |     |                   second mutable borrow occurs here
  |     |     first mutable borrow occurs here
  |     returning this value requires that `*values` is borrowed for `'1`
  |
  = help: use `.split_at_mut(position)` to obtain two mutable non-overlapping sub-slices

For more information about this error, try `rustc --explain E0499`.
error: could not compile `unsafe-example` (bin "unsafe-example") due to 1 previous error
```

两段其实不重叠，借用检查器只看到“同一切片借了两次”。人能证明安全、编译器不能时，用 unsafe。

**清单 20-6** 在 `split_at_mut` 的实现里使用 unsafe

```rust
use std::slice;

fn split_at_mut(values: &mut [i32], mid: usize) -> (&mut [i32], &mut [i32]) {
    let len = values.len();
    let ptr = values.as_mut_ptr();

    assert!(mid <= len);

    unsafe {
        (
            slice::from_raw_parts_mut(ptr, mid),
            slice::from_raw_parts_mut(ptr.add(mid), len - mid),
        )
    }
}
```

切片是指针加长度。`as_mut_ptr` 给出 `*mut i32`。

- `slice::from_raw_parts_mut(ptr, len)` 用裸指针和长度造出切片，unsafe：必须信任指针有效
- 裸指针的 `add` 也是 unsafe：必须信任偏移之后仍然有效

`assert!(mid <= len)` 把两段都限制在原切片内，因此 `split_at_mut` 本身可以是安全函数，安全 Rust 可以直接调用。

没有这层保证时，任意地址造出的切片是未定义行为。

**清单 20-7** 从任意内存地址创建切片

```rust
    use std::slice;

    let address = 0x01234usize;
    let r = address as *mut i32;

    let values: &[i32] = unsafe { slice::from_raw_parts_mut(r, 10000) };
```

不拥有该地址，也不能保证里面是有效的 `i32`。把它当切片用是未定义行为。

#### 用 `extern` 调用外部代码

`extern` 用于 FFI。`extern` 块里声明的函数默认 unsafe，块本身也要标 `unsafe`：别的语言不遵守 Rust 的规则，编译器查不了。

**清单 20-8** 声明并调用 C ABI 的外部函数

文件：src/main.rs

```rust
unsafe extern "C" {
    fn abs(input: i32) -> i32;
}

fn main() {
    unsafe {
        println!("Absolute value of -3 according to C: {}", abs(-3));
    }
}
```

`unsafe extern "C" { fn abs(input: i32) -> i32; }`。`"C"` 是 ABI，规定汇编层如何调用，也是最常见的一种。

块内声明默认隐式 unsafe。确认某个函数没有内存安全前提时，可以写成 `safe fn`，之后调用不必再包 `unsafe` 块。

**清单 20-9** 在 `unsafe extern` 块里把函数标成 `safe`

文件：src/main.rs

```rust
unsafe extern "C" {
    safe fn abs(input: i32) -> i32;
}

fn main() {
    println!("Absolute value of -3 according to C: {}", abs(-3));
}
```

`safe` 只是对编译器的承诺，是否真安全仍由你保证。

#### 让其他语言调用 Rust

在 `fn` 前写 `extern "ABI"`。加上 `#[unsafe(no_mangle)]` 禁止名字改编，否则其他语言对不上符号。这是 unsafe：没有改编可能跨库重名，导出的名字要自己保证不冲突。

```
#[unsafe(no_mangle)]
pub extern "C" fn call_from_c() {
    println!("Just called a Rust function from C!");
}
```

这种写法只在属性上需要 `unsafe`，不是一个 `extern` 块。

### 读或写可变静态变量

全局变量叫静态变量。多个线程同时改同一可变静态变量会数据竞争。

**清单 20-10** 定义并使用不可变静态变量

文件：src/main.rs

```rust
static HELLO_WORLD: &str = "Hello, world!";

fn main() {
    println!("value is: {HELLO_WORLD}");
}
```

不可变静态变量可以安全访问。约定名字用 `SCREAMING_SNAKE_CASE`。只能存放 `'static` 引用，生命周期由编译器推断。

和常量的差别：

- 静态变量有固定地址，每次访问同一份数据
- 常量在每次使用时可以复制一份
- 静态变量可以是 `mut`；读写 `static mut` 是 unsafe

多线程访问 `static mut` 是未定义行为。提供这种操作的函数应标成 `unsafe`，并写明调用限制。

**清单 20-11** 读写可变静态变量是 unsafe

文件：src/main.rs

```rust
static mut COUNTER: u32 = 0;

/// SAFETY: Calling this from more than a single thread at a time is undefined
/// behavior, so you *must* guarantee you only call it from a single thread at
/// a time.
unsafe fn add_to_count(inc: u32) {
    unsafe {
        COUNTER += inc;
    }
}

fn main() {
    unsafe {
        // SAFETY: This is only called from a single thread in `main`.
        add_to_count(3);
        println!("COUNTER: {}", *(&raw const COUNTER));
    }
}
```

读写 `static mut` 必须在 `unsafe` 块里。

惯例：unsafe 函数用 `SAFETY` 注释说明调用方要保证什么；unsafe 操作处也用 `SAFETY` 说明不变式如何成立。

默认禁止为 `static mut` 建立引用。要么 `#[allow(static_mut_refs)]`，要么用 `&raw const` / `&raw mut` 先得到裸指针。`println!` 这类会隐式建引用的地方同样受限制。

能用线程安全的共享方式时，优先用那些，让编译器检查跨线程访问。

### 实现 unsafe trait

至少有一项不变式编译器无法验证时，trait 标成 `unsafe`，`impl` 也要 `unsafe`。

**清单 20-12** 定义并实现 unsafe trait

```rust
unsafe trait Foo {
    // methods go here
}

unsafe impl Foo for i32 {
    // method implementations go here
}
```

`unsafe impl` 表示由实现者保证那些不变式。

`Send` 和 `Sync` 在字段全都实现了它们时自动实现。类型里若有裸指针这类没有 `Send` / `Sync` 的成分，又仍要标记这两个 trait，必须 `unsafe impl`：编译器无法证明跨线程发送或共享是安全的。

### 访问联合体字段

`union` 类似结构体，但同一时刻只用其中一个字段。主要用于对接 C 的 union。读字段是 unsafe：编译器不知道当前存的是哪种类型。

### 用 Miri 检查 unsafe 代码

Miri 在运行程序或测试时检测未定义行为，是动态工具；借用检查是编译期的静态工具。需要 nightly：`rustup +nightly component add miri`，然后 `cargo +nightly miri run` 或 `cargo +nightly miri test`。这不改变项目默认工具链。

```console
$ cargo +nightly miri run
   Compiling unsafe-example v0.1.0 (file:///projects/unsafe-example)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.17s
     Running `file:///home/.rustup/toolchains/nightly/bin/cargo-miri runner target/miri/debug/unsafe-example`
warning: integer-to-pointer cast
 --> src/main.rs:5:13
  |
5 |     let r = address as *mut i32;
  |             ^^^^^^^^^^^^^^^^^^^ integer-to-pointer cast
  |
  = help: this program is using integer-to-pointer casts or (equivalently) `ptr::with_exposed_provenance`, which means that Miri might miss pointer bugs in this program
  = help: see https://doc.rust-lang.org/nightly/std/ptr/fn.with_exposed_provenance.html for more details on that operation
  = help: to ensure that Miri does not miss bugs in your program, use Strict Provenance APIs (https://doc.rust-lang.org/nightly/std/ptr/index.html#strict-provenance, https://crates.io/crates/sptr) instead
  = help: you can then set `MIRIFLAGS=-Zmiri-strict-provenance` to ensure you are not relying on `with_exposed_provenance` semantics
  = help: alternatively, `MIRIFLAGS=-Zmiri-permissive-provenance` disables this warning

error: Undefined Behavior: constructing invalid value of type &mut [i32]: encountered a dangling reference (0x1234[noalloc] has no provenance)
 --> src/main.rs:7:35
  |
7 |     let values: &[i32] = unsafe { slice::from_raw_parts_mut(r, 10000) };
  |                                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Undefined Behavior occurred here
  |
  = help: this indicates a bug in the program: it performed an invalid operation, and caused Undefined Behavior
  = help: see https://doc.rust-lang.org/nightly/reference/behavior-considered-undefined.html for further information

note: some details are omitted, run with `MIRIFLAGS=-Zmiri-backtrace=full` for a verbose backtrace

error: aborting due to 1 previous error; 1 warning emitted

```

Miri 报出问题，就说明有 bug。它只看实际执行到的路径，也覆盖不了所有 unsound。没报错不等于没有问题。

### 正确使用 unsafe

五类能力可以用。显式的 `unsafe` 便于事后定位。写完可以用 Miri 增加信心。更完整的规则见 The Rustonomicon。
