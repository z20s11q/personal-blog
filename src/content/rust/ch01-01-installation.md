---
title: "安装"
order: "ch01-01-installation"
chapter: 1
---
用 `rustup` 安装并管理 Rust 版本，需要联网。另有其他安装方式。

安装最新 stable。本书能编译的例子，在更新的 stable 上仍能编译。错误和警告的文案可能随版本改进。

### 命令行记号

`$` 是提示符，输入时不要带上。不以 `$` 开头的行是上一条命令的输出。PowerShell 示例用 `>`。

### 在 Linux 或 macOS 上安装 `rustup`

在终端执行下面的命令。

```console
$ curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```

该命令下载脚本并安装 `rustup`，再装上最新 stable。可能要求输入密码。成功时出现下一行。

```text
Rust is installed now. Great!
```

链接器把编译产物拼成一个文件。出现链接错误时，安装 C 编译器（通常自带链接器）。依赖 C 代码的 crate 也需要 C 编译器。

macOS 用下面的命令安装 C 编译器。

```console
$ xcode-select --install
```

Linux 按发行版安装 GCC 或 Clang。Ubuntu 安装 `build-essential`。

### 在 Windows 上安装 `rustup`

从 https://www.rust-lang.org/tools/install 安装。安装过程会提示安装 Visual Studio，用来提供链接器和本地库。细节见 https://rust-lang.github.io/rustup/installation/windows-msvc.html 。

本书其余命令在 cmd.exe 和 PowerShell 中都能用；有差别时会单独说明。

### 排错

用下面的命令确认是否装好。

```console
$ rustc --version
```

应看到版本号、提交哈希和日期，格式如下。

```text
rustc x.y.z (abcabcabc yyyy-mm-dd)
```

看不到版本信息时，检查 `PATH`。Windows CMD：

```console
> echo %PATH%
```

PowerShell：

```powershell
> echo $env:Path
```

Linux 和 macOS：

```console
$ echo $PATH
```

`PATH` 正确仍不能用时，到社区页找帮助：https://www.rust-lang.org/community

### 更新与卸载

`rustup` 安装之后，用下面的命令更新到新发布的版本。

```console
$ rustup update
```

卸载 Rust 和 `rustup`：

```console
$ rustup self uninstall
```

### 阅读本地文档

安装包含离线文档。`rustup doc` 在浏览器中打开。标准库类型和函数的用法查 API 文档。

### 使用文本编辑器和 IDE

不限定编辑器。编辑器和 IDE 的 Rust 支持列表见 https://www.rust-lang.org/tools 。

### 离线阅读本书

部分例子依赖标准库以外的包，需要联网，或事先下载依赖。下面的命令会把后续用到的包缓存下来。

```console
$ cargo new get-dependencies
$ cd get-dependencies
$ cargo add rand@0.10.1 trpl@0.2.0
```

这些包会被缓存。`get-dependencies` 目录之后可以删除。本书后面的 `cargo` 命令可以加 `--offline`，使用缓存。
