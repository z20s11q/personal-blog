---
title: "附录 G：Rust 如何发布，以及 Nightly"
order: "z-appendix-07-nightly-rust"
chapter: null
---
### 稳定但不停滞

- 升级 stable 不应破坏已有代码。新功能先在隔离通道里试验，再进入 stable。

### 发布列车

开发在主分支。三条通道：

- Nightly：每晚从主分支自动构建。
- Beta：每六周从主分支切出。
- Stable：再过六周从 beta 切出。

日常用 stable。要试实验功能才用 nightly 或 beta。

```text
nightly: * - - * - - *
```

每六周从主分支切出 `beta`。

```text
nightly: * - - * - - *
                     |
beta:                *
```

切出 beta 之后，nightly 仍每晚发布。beta 放在 CI 里跑，以便在进 stable 之前发现回归。

```text
nightly: * - - * - - * - - * - - *
                     |
beta:                *
```

回归修在主分支，再回移植到 `beta`。

```text
nightly: * - - * - - * - - * - - * - - *
                     |
beta:                * - - - - - - - - *
```

beta 满六周，从 `beta` 切出 `stable`。

```text
nightly: * - - * - - * - - * - - * - - * - * - *
                     |
beta:                * - - - - - - - - *
                                       |
stable:                                *
```

`stable` 切出后，下一版的 `beta` 立刻再从主分支切出。

```text
nightly: * - - * - - * - - * - - * - - * - * - *
                     |                         |
beta:                * - - - - - - - - *       *
                                       |
stable:                                *
```

- 每六周发一班：先 beta，再 stable。错过这一班，六周后还有下一班。
- 新 stable 发布时，上一版 EOL。每个 stable 支持六周。

### 不稳定功能

- 开发中的功能先进 nightly，藏在 feature flag 后面。源码里显式打开该 flag 才启用。
- beta 和 stable 不能使用 feature flag。
- 本书只写已经稳定的功能。

### rustup 与 nightly

`rustup` 按全局或按目录切换工具链。默认安装 stable。

```console
$ rustup toolchain install nightly
```

`rustup toolchain list` 列出已安装的工具链。默认一般是 stable。

```powershell
> rustup toolchain list
stable-x86_64-pc-windows-msvc (default)
beta-x86_64-pc-windows-msvc
nightly-x86_64-pc-windows-msvc
```

某个项目要用 nightly 时，在该目录执行 `rustup override set nightly`。这个目录里的 `rustc` 和 `cargo` 走 nightly，其它目录仍用默认工具链。

```console
$ cd ~/projects/needs-nightly
$ rustup override set nightly
```

### RFC 与团队

- 语言改动走 RFC：谁都可以提，对应团队讨论后接受或拒绝。
- 接受后开实现 issue。代码先落在主分支的 feature gate 后面。
- nightly 上试过、团队确认要稳定后，去掉 gate，功能随列车进入 stable。
