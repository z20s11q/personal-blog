---
title: "Hello, World!"
order: "ch01-02-hello-world"
chapter: 1
---
第一个程序打印 `Hello, world!`。假定会用命令行，也可以用 IDE。官方侧重 `rust-analyzer`（附录 D）。

### 项目目录

代码放在哪里都可以。本书的练习放在主目录的 `projects` 下。

Linux、macOS、Windows PowerShell：

```console
$ mkdir ~/projects
$ cd ~/projects
$ mkdir hello_world
$ cd hello_world
```

Windows CMD：

```cmd
> mkdir "%USERPROFILE%\projects"
> cd /d "%USERPROFILE%\projects"
> mkdir hello_world
> cd hello_world
```

### Rust 程序基础

源文件以 `.rs` 结尾。多个单词用下划线，例如 `hello_world.rs`。

**清单 1-1** 打印 `Hello, world!`

```rust
fn main() {
    println!("Hello, world!");
}
```

保存后在项目目录编译并运行。Linux 或 macOS：

```console
$ rustc main.rs
$ ./main
Hello, world!
```

Windows 运行编译结果用 `.\main`。

```powershell
> rustc main.rs
> .\main
Hello, world!
```

终端应打出 `Hello, world!`。没有输出时，回到安装一节的排错。

### 程序剖析

```rust
fn main() {

}
```

`main` 是可执行程序的入口，最先运行。`fn main()` 没有参数，也没有返回值；有参数时写在 `()` 里。

函数体必须包在 `{}` 里。风格是 `{` 与函数声明同一行，中间一个空格。

`rustfmt` 按统一风格格式化代码，随 Rust 发行版提供。

```rust
println!("Hello, world!");
```

`println!` 是宏。带 `!` 的是宏调用，普通函数没有 `!`。宏不总遵守函数的规则（第 20 章）。

`"Hello, world!"` 是传给宏的参数，会被打印出来。

`;` 表示这条语句结束。多数代码行以 `;` 结尾。

### 编译与运行

运行前用 `rustc` 编译源文件。

```console
$ rustc main.rs
```

编译成功后得到二进制可执行文件。

Linux、macOS、PowerShell 用 `ls` 查看。

```console
$ ls
main  main.rs
```

Linux 和 macOS 上是源文件和可执行文件。PowerShell 与 CMD 一样是三个文件。CMD：

```cmd
> dir /B %= the /B option says to only show the file names =%
main.exe
main.pdb
main.rs
```

产物有：`.rs` 源文件；可执行文件在 Windows 上是 `main.exe`，其他平台是 `main`；Windows 另有 `.pdb` 调试信息。然后运行该可执行文件。

```console
$ ./main # or .\main on Windows
```

**对照**：Python、Ruby、JavaScript 把源文件交给对方时，对方要安装对应运行时。Rust 是提前编译，可执行文件不依赖对方安装 Rust。

简单程序用 `rustc` 即可。项目变大、需要共享时用 Cargo。
