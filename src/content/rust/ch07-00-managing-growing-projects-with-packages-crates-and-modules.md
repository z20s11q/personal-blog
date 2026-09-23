---
title: "包、crate 与模块"
order: "ch07-00-managing-growing-projects-with-packages-crates-and-modules"
chapter: 7
---
模块系统分成四块：

- **包（package）**：Cargo 用来构建、测试、分享 crate 的单位
- **crate**：一棵模块树，编译成库或可执行文件
- **模块和 `use`**：组织代码、作用域和可见性
- **路径**：给 struct、函数、模块等项命名

一个包可以有多个二进制 crate，库 crate 最多一个。再大就拆成外部依赖。一组一起演进的包用 workspace（第 14 章）。

同一作用域不能有两个同名项。`pub` 划出公共接口，其余是实现细节。

**对照**：package 是 Cargo 的构建和发布单位，接近 Go module 或一份 Maven/Gradle 工程，不是 Java 的 `package` 声明。crate 是一次编译出的库或可执行文件。module 才接近 Java 包、Go package、C++ namespace、Python module：嵌套在 crate 里，并且默认私有。
