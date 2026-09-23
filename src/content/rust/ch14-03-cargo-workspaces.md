---
title: "Cargo workspace"
order: "ch14-03-cargo-workspaces"
chapter: 14
---
workspace 是一组一起开发的包，共享同一个 `Cargo.lock` 和同一个输出目录。

### 创建 workspace

```console
$ mkdir add
$ cd add
```

workspace 根的 `Cargo.toml` 没有 `[package]`，以 `[workspace]` 开头。`resolver = "3"` 选用当前的依赖解析算法。成员路径写在 `members` 里。

文件：Cargo.toml

```toml
[workspace]
resolver = "3"
```

```console
$ cargo new adder
     Created binary (application) `adder` package
      Adding `adder` as member of workspace at `file:///projects/add`
```

在 workspace 根目录执行 `cargo new`，新包会自动追加进根清单的 `members`。

```toml
[workspace]
resolver = "3"
members = ["adder"]
```

```text
├── Cargo.lock
├── Cargo.toml
├── adder
│   ├── Cargo.toml
│   └── src
│       └── main.rs
└── target
```

整个 workspace 只有根目录下一份 `target`。在成员目录里执行 `cargo build`，产物仍写入根 `target`。成员互相依赖时，因此不必各自重编同一份依赖。

### 在 workspace 里加第二个包

```console
$ cargo new add_one --lib
     Created library `add_one` package
      Adding `add_one` as member of workspace at `file:///projects/add`
```

`cargo new <name> --lib` 同样会把新库追加进 `members`。

文件：Cargo.toml

```toml
[workspace]
resolver = "3"
members = ["adder", "add_one"]
```

```text
├── Cargo.lock
├── Cargo.toml
├── add_one
│   ├── Cargo.toml
│   └── src
│       └── lib.rs
├── adder
│   ├── Cargo.toml
│   └── src
│       └── main.rs
└── target
```

文件：add_one/src/lib.rs

```rust
pub fn add_one(x: i32) -> i32 {
    x + 1
}
```

workspace 不假定成员彼此依赖。依赖关系要写在使用方自己的 `Cargo.toml` 里，用 path 依赖指向兄弟包。

文件：adder/Cargo.toml

```toml
[dependencies]
add_one = { path = "../add_one" }
```

path 必须写明。成员之间没有隐式依赖。

**清单 14-7** `adder` 调用 `add_one::add_one`。

```rust
fn main() {
    let num = 10;
    println!("Hello, world! {num} plus one is {}!", add_one::add_one(num));
}
```

```console
$ cargo build
   Compiling add_one v0.1.0 (file:///projects/add/add_one)
   Compiling adder v0.1.0 (file:///projects/add/adder)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.22s
```

在根目录用 `cargo run -p <包名>` 指定要运行的二进制成员。

```console
$ cargo run -p adder
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.00s
     Running `target/debug/adder`
Hello, world! 10 plus one is 11!
```

### 依赖外部包

一份根级 `Cargo.lock` 让各成员的外部依赖解到同一版本（版本要求彼此兼容时），从而彼此兼容。

某个成员要 `use` 外部 crate，必须在该成员自己的 `Cargo.toml` 里声明。其他成员已经依赖它并不够。

文件：add_one/Cargo.toml

```toml
[dependencies]
rand = "0.10.1"
```

依赖写进成员清单后，在根目录 `cargo build` 会拉取并编译它。引入但未使用会触发 `unused_imports`。

```console
$ cargo build
    Updating crates.io index
  Downloaded rand v0.10.1
   --snip--
   Compiling rand v0.10.1
   Compiling add_one v0.1.0 (file:///projects/add/add_one)
warning: unused import: `rand`
 --> add_one/src/lib.rs:1:5
  |
1 | use rand;
  |     ^^^^
  |
  = note: `#[warn(unused_imports)]` (part of `#[warn(unused)]`) on by default

warning: `add_one` (lib) generated 1 warning (run `cargo fix --lib -p add_one` to apply 1 suggestion)
   Compiling adder v0.1.0 (file:///projects/add/adder)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.95s
```

未在本成员的 `Cargo.toml` 里声明的 crate，即使 workspace 的 lock 里已经有它，`use` 仍然是 unresolved import。

```console
$ cargo build
  --snip--
   Compiling adder v0.1.0 (file:///projects/add/adder)
error[E0432]: unresolved import `rand`
 --> adder/src/main.rs:2:5
  |
2 | use rand;
  |     ^^^^ no external crate `rand`
```

每个要用它的成员都在自己的清单里声明。版本要求兼容时，Cargo 复用已下载的那一份，不重复下载。

若各成员对同一依赖写出不兼容的版本要求，Cargo 会分别解析，并尽量少引入版本。

```rust
pub fn add_one(x: i32) -> i32 {
    x + 1
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        assert_eq!(3, add_one(2));
    }
}
```

### 在 workspace 里加测试

文件：add_one/src/lib.rs

```console
$ cargo test
   Compiling add_one v0.1.0 (file:///projects/add/add_one)
   Compiling adder v0.1.0 (file:///projects/add/adder)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.20s
     Running unittests src/lib.rs (target/debug/deps/add_one-93c49ee75dc46543)

running 1 test
test tests::it_works ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

     Running unittests src/main.rs (target/debug/deps/adder-3a47283c568d2b6a)

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests add_one

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

在根目录执行 `cargo test`，会跑所有成员的单元测试和文档测试。

```console
$ cargo test -p add_one
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.00s
     Running unittests src/lib.rs (target/debug/deps/add_one-93c49ee75dc46543)

running 1 test
test tests::it_works ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests add_one

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

`cargo test -p <包名>` 只跑该成员。发布也是逐个 crate：`cargo publish -p <包名>`。
