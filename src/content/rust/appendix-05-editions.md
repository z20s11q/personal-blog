---
title: "附录 E：Edition"
order: "z-appendix-05-editions"
chapter: null
---
- 编译器约每六周发布一次。edition 大约每三年把已落地的不兼容改动收成一包。现有 2015、2018、2021、2024。本书用 2024 的写法。
- `Cargo.toml` 的 `edition` 决定按哪一版解析。缺这个键时默认 `2015`。
- 新关键字这类不兼容改动只在你选定的 edition 里生效。编译器升级而 edition 不变，旧代码继续能编。
- 编译器支持它发布时已经存在的全部 edition。不同 edition 的 crate 可以链接在一起。edition 只影响最初的解析。
- 多数功能在所有 edition 上都可用。依赖新关键字的功能要换到相应 edition 才打开。
- `cargo fix` 可以把代码迁到新 edition。
