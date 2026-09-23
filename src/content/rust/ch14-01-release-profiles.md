---
title: "用 release profile 定制构建"
order: "ch14-01-release-profiles"
chapter: 14
---
release profile 是一套预定义、可分别改写的编译配置，各 profile 互不影响。

- `dev`：`cargo build` 使用，默认偏向开发
- `release`：`cargo build --release` 使用，默认偏向发布

未在 `Cargo.toml` 里声明时，这两套默认就会生效。

```console
$ cargo build
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.00s
$ cargo build --release
    Finished `release` profile [optimized] target(s) in 0.32s
```

写了 `[profile.*]` 只覆盖列出来的键，其余仍用该 profile 的默认。

文件：Cargo.toml

```toml
[profile.dev]
opt-level = 0

[profile.release]
opt-level = 3
```

`opt-level` 取值 0 到 3。等级越高，优化越多，编译越慢。

- `dev` 默认 `0`：编译频繁，优先缩短编译时间
- `release` 默认 `3`：编译次数少、运行次数多，优先运行速度

在 `Cargo.toml` 里给同一键写新值，即覆盖默认。

文件：Cargo.toml

```toml
[profile.dev]
opt-level = 1
```

`[profile.dev]` 里只把 `opt-level` 设为 `1` 时，其余仍是 `dev` 的默认：优化多于默认的 `dev`，少于 `release`。

各 profile 的键和默认值见 Cargo 的 profiles 文档。
