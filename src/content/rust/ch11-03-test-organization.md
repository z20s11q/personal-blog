---
title: "测试组织"
order: "ch11-03-test-organization"
chapter: 11
---
单元测试一次测一个模块，可以调用私有接口。集成测试在库外面，只用公开 API，一个测试可以跨多个模块。

### 单元测试

放在 `src` 里、与被测代码同一文件。惯例是文件内的 `tests` 模块，并标 `#[cfg(test)]`。

#### `tests` 模块与 `#[cfg(test)]`

`#[cfg(test)]` 使该模块只在 `cargo test` 时编译，不进入 `cargo build` 的产物。集成测试在另一个目录，不需要这个属性。

文件：src/lib.rs

```rust
pub fn add(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
```

`cfg` 按编译配置决定是否包含该项。`test` 只在跑测试时打开。模块里的辅助函数同样只在 `cargo test` 时编译。

#### 测试私有函数

子模块可以访问祖先模块的私有项，所以单元测试能直接调用没有 `pub` 的函数。

**对照** Java、C++ 测私有成员通常要放宽可见性或走反射。Rust 里子模块天然看得到父模块的私有项。

**清单 11-12** 测试私有函数 `internal_adder`。

```rust
pub fn add_two(a: u64) -> u64 {
    internal_adder(a, 2)
}

fn internal_adder(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn internal() {
        let result = internal_adder(2, 2);
        assert_eq!(result, 4);
    }
}
```

`internal_adder` 没有 `pub`。`use super::*;` 把父模块引进 `tests` 之后就可以调用它。

### 集成测试

集成测试完全在库外面，只能调用公开 API，用来检查多个部分合在一起是否正确。目录是项目根下的 `tests`，与 `src` 并列。

#### `tests` 目录

Cargo 把 `tests` 里的每个文件编译成单独的 crate。

```text
adder
├── Cargo.lock
├── Cargo.toml
├── src
│   └── lib.rs
└── tests
    └── integration_test.rs
```

**清单 11-13** 集成测试通过 `use adder::add_two` 调用库的公开函数。

```rust
use adder::add_two;

#[test]
fn it_adds_two() {
    let result = add_two(2);
    assert_eq!(result, 4);
}
```

每个集成测试文件都是独立 crate，要用库名路径把 API 引进来。这里不写 `#[cfg(test)]`：Cargo 只在 `cargo test` 时编译 `tests`。

```console
$ cargo test
   Compiling adder v0.1.0 (file:///projects/adder)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 1.31s
     Running unittests src/lib.rs (target/debug/deps/adder-1082c4b063a8fbe6)

running 1 test
test tests::internal ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

     Running tests/integration_test.rs (target/debug/deps/integration_test-1082c4b063a8fbe6)

running 1 test
test it_adds_two ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests adder

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

```

`cargo test` 按顺序输出单元测试、集成测试、文档测试。前面一段有失败，后面的段不运行。

每个集成测试文件单独一段。只跑某一个文件用 cargo 的 `--test`，参数是不带扩展名的文件名，例如 `integration_test`。按函数名过滤仍然有效。

```console
$ cargo test --test integration_test
   Compiling adder v0.1.0 (file:///projects/adder)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.64s
     Running tests/integration_test.rs (target/debug/deps/integration_test-82e7799c1bc62298)

running 1 test
test it_adds_two ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

```

`cargo test --test integration_test` 只编译并运行这个集成测试 crate。

#### 集成测试里的子模块

`tests` 下每个文件各自是一个 crate，不能把 `tests/common.rs` 当成其他测试文件的子模块。Cargo 会把它也当成一个集成测试。

文件：tests/common.rs

```rust
pub fn setup() {
    // setup code specific to your library's tests would go here
}
```

没有 `#[test]` 的 `tests/common.rs` 仍会占一段输出，显示 `running 0 tests`。

```console
$ cargo test
   Compiling adder v0.1.0 (file:///projects/adder)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.89s
     Running unittests src/lib.rs (target/debug/deps/adder-92948b65e88960b4)

running 1 test
test tests::internal ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

     Running tests/common.rs (target/debug/deps/common-92948b65e88960b4)

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

     Running tests/integration_test.rs (target/debug/deps/integration_test-92948b65e88960b4)

running 1 test
test it_adds_two ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests adder

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

```

共享的辅助代码放在 `tests/common/mod.rs`，不要放在 `tests/common.rs`。

```text
├── Cargo.lock
├── Cargo.toml
├── src
│   └── lib.rs
└── tests
    ├── common
    │   └── mod.rs
    └── integration_test.rs
```

`tests` 的子目录不会被编译成独立的集成测试 crate，输出里也不再单独出现。

测试文件里写 `mod common;`，即可调用 `common::setup()`。

文件：tests/integration_test.rs

```rust
use adder::add_two;

mod common;

#[test]
fn it_adds_two() {
    common::setup();

    let result = add_two(2);
    assert_eq!(result, 4);
}
```

`mod common;` 就是普通的模块声明。

#### 二进制 crate 的集成测试

只有 `src/main.rs`、没有 `src/lib.rs` 时，其他 crate 无法 `use` 二进制里的函数。对外暴露 API 的是库 crate。

带可执行文件的项目把逻辑放在 `src/lib.rs`，`main` 只调用库。集成测试覆盖库即可。

## 小结

单元测试在库内部，能测私有实现。集成测试走公开 API，检查多个部分一起工作时行为是否符合预期。类型系统和所有权盖不住“结果对不对”，这部分靠测试。
