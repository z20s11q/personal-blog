---
title: "`RefCell<T>` 与内部可变性"
order: "ch15-05-interior-mutability"
chapter: 15
---
内部可变性：已有不可变引用时仍能改数据。结构内部用 `unsafe` 把借用检查推迟到运行时，对外仍是安全 API，外层类型保持不可变。只能在你确信运行时仍遵守借用规则时使用。

### 在运行时检查借用规则

`RefCell<T>` 是单一所有者。和 `Box<T>` 的差别是检查时机：

- 引用和 `Box<T>`：编译期检查，违反则编译失败
- `RefCell<T>`：运行时检查，违反则 panic

编译期检查没有运行时开销，是默认。运行时检查能放行一些编译器证明不了、但实际安全的写法。编译器拿不准就拒绝。

`RefCell<T>` 同样只用于单线程。

选用：

- 多所有者：`Rc<T>`。单一所有者：`Box<T>`、`RefCell<T>`
- `Box<T>`：编译期的不可变或可变借用
- `Rc<T>`：编译期，且只有不可变借用
- `RefCell<T>`：运行时的不可变或可变借用；外层不可变也能改内部

### 使用内部可变性

不可变绑定不能再做可变借用。

```rust
fn main() {
    let x = 5;
    let y = &mut x;
}
```

```console
$ cargo run
   Compiling borrowing v0.1.0 (file:///projects/borrowing)
error[E0596]: cannot borrow `x` as mutable, as it is not declared as mutable
 --> src/main.rs:3:13
  |
3 |     let y = &mut x;
  |             ^^^^^^ cannot borrow as mutable
  |
help: consider changing this to be mutable
  |
2 |     let mut x = 5;
  |         +++

For more information about this error, try `rustc --explain E0596`.
error: could not compile `borrowing` (bin "borrowing") due to 1 previous error
```

有时方法里要改自己，对外仍是 `&self`。`RefCell<T>` 把借用规则挪到运行时，违反则 `panic!`，不是编译错误。借用规则本身没有取消。

#### 测试里的 mock

trait 方法若是 `&self`，实现里就不能改字段，也不该为了测试把签名改成 `&mut self`。把要改的字段放进 `RefCell<T>`。

**清单 15-20** `LimitTracker` 按与上限的比例调用 `Messenger::send`；`send` 的接收者是 `&self`。

```rust
pub trait Messenger {
    fn send(&self, msg: &str);
}

pub struct LimitTracker<'a, T: Messenger> {
    messenger: &'a T,
    value: usize,
    max: usize,
}

impl<'a, T> LimitTracker<'a, T>
where
    T: Messenger,
{
    pub fn new(messenger: &'a T, max: usize) -> LimitTracker<'a, T> {
        LimitTracker {
            messenger,
            value: 0,
            max,
        }
    }

    pub fn set_value(&mut self, value: usize) {
        self.value = value;

        let percentage_of_max = self.value as f64 / self.max as f64;

        if percentage_of_max >= 1.0 {
            self.messenger.send("Error: You are over your quota!");
        } else if percentage_of_max >= 0.9 {
            self.messenger
                .send("Urgent warning: You've used up over 90% of your quota!");
        } else if percentage_of_max >= 0.75 {
            self.messenger
                .send("Warning: You've used up over 75% of your quota!");
        }
    }
}
```

`set_value` 没有返回值可断言，只能让 mock 记下发出去的消息。`send` 是 `&self`，直接 `push` 到 `Vec` 过不了借用检查。

**清单 15-21** 在 `&self` 的 `send` 里修改 `sent_messages`，不能编译。

```rust
#[cfg(test)]
mod tests {
    use super::*;

    struct MockMessenger {
        sent_messages: Vec<String>,
    }

    impl MockMessenger {
        fn new() -> MockMessenger {
            MockMessenger {
                sent_messages: vec![],
            }
        }
    }

    impl Messenger for MockMessenger {
        fn send(&self, message: &str) {
            self.sent_messages.push(String::from(message));
        }
    }

    #[test]
    fn it_sends_an_over_75_percent_warning_message() {
        let mock_messenger = MockMessenger::new();
        let mut limit_tracker = LimitTracker::new(&mock_messenger, 100);

        limit_tracker.set_value(80);

        assert_eq!(mock_messenger.sent_messages.len(), 1);
    }
}
```

不能改 `MockMessenger` 的字段，因为 `send` 拿到的是不可变的 `self`。也不要为测试去改 `Messenger` 的签名。

```console
$ cargo test
   Compiling limit-tracker v0.1.0 (file:///projects/limit-tracker)
error[E0596]: cannot borrow `self.sent_messages` as mutable, as it is behind a `&` reference
  --> src/lib.rs:58:13
   |
58 |             self.sent_messages.push(String::from(message));
   |             ^^^^^^^^^^^^^^^^^^ `self` is a `&` reference, so it cannot be borrowed as mutable
   |
help: consider changing this to be a mutable reference in the `impl` method and the `trait` definition
   |
 2 ~     fn send(&mut self, msg: &str);
 3 | }
...
56 |     impl Messenger for MockMessenger {
57 ~         fn send(&mut self, message: &str) {
   |

For more information about this error, try `rustc --explain E0596`.
error: could not compile `limit-tracker` (lib test) due to 1 previous error
```

`sent_messages` 改成 `RefCell<Vec<String>>` 后，`&self` 方法里可以 `borrow_mut`。

**清单 15-22** 外层按不可变使用，内部通过 `RefCell<T>` 修改。

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;

    struct MockMessenger {
        sent_messages: RefCell<Vec<String>>,
    }

    impl MockMessenger {
        fn new() -> MockMessenger {
            MockMessenger {
                sent_messages: RefCell::new(vec![]),
            }
        }
    }

    impl Messenger for MockMessenger {
        fn send(&self, message: &str) {
            self.sent_messages.borrow_mut().push(String::from(message));
        }
    }

    #[test]
    fn it_sends_an_over_75_percent_warning_message() {
        // --snip--

        assert_eq!(mock_messenger.sent_messages.borrow().len(), 1);
    }
}
```

`borrow_mut` 拿到内部 `Vec` 的可变引用再 `push`。读的时候用 `borrow`。

#### 运行时记录借用

`borrow` 返回 `Ref<T>`，`borrow_mut` 返回 `RefMut<T>`，两者都实现 `Deref`，可以当引用用。`RefCell` 统计当前有多少个 `Ref` / `RefMut`：任意多个不可变借用，或一个可变借用，不能同时。离开作用域时计数减一。违反则运行时 panic。

**清单 15-23** 同一作用域里两次 `borrow_mut`。

```rust
    impl Messenger for MockMessenger {
        fn send(&self, message: &str) {
            let mut one_borrow = self.sent_messages.borrow_mut();
            let mut two_borrow = self.sent_messages.borrow_mut();

            one_borrow.push(String::from(message));
            two_borrow.push(String::from(message));
        }
    }
```

两个 `RefMut` 同时活着，就违反了“同一时刻只有一个可变借用”。这段代码能编译，测试运行时失败。

```console
$ cargo test
   Compiling limit-tracker v0.1.0 (file:///projects/limit-tracker)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.91s
     Running unittests src/lib.rs (target/debug/deps/limit_tracker-e599811fa246dbde)

running 1 test
test tests::it_sends_an_over_75_percent_warning_message ... FAILED

failures:

---- tests::it_sends_an_over_75_percent_warning_message stdout ----

thread 'tests::it_sends_an_over_75_percent_warning_message' (6028024) panicked at src/lib.rs:60:53:
RefCell already borrowed
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace


failures:
    tests::it_sends_an_over_75_percent_warning_message

test result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

error: test failed, to rerun pass `--lib`
```

panic 信息是 `RefCell already borrowed`（`BorrowMutError`）。错误会晚到运行时才出现，计数也有少量开销。

**对照**：Java 对象默认可变，字段在“不可变引用”上也能改。`RefCell` 不是去掉借用规则，只是把检查从编译期改到运行时。

### 多个所有者加上可变数据

`Rc<T>` 多所有者但只读。`Rc<RefCell<T>>` 才能多所有者并且改内部。

**清单 15-24** 用 `Rc<RefCell<i32>>` 做可修改的共享列表。

```rust
#[derive(Debug)]
enum List {
    Cons(Rc<RefCell<i32>>, Rc<List>),
    Nil,
}

use crate::List::{Cons, Nil};
use std::cell::RefCell;
use std::rc::Rc;

fn main() {
    let value = Rc::new(RefCell::new(5));

    let a = Rc::new(Cons(Rc::clone(&value), Rc::new(Nil)));

    let b = Cons(Rc::new(RefCell::new(3)), Rc::clone(&a));
    let c = Cons(Rc::new(RefCell::new(4)), Rc::clone(&a));

    *value.borrow_mut() += 10;

    println!("a after = {a:?}");
    println!("b after = {b:?}");
    println!("c after = {c:?}");
}
```

`Rc::clone` 让 `value` 和列表 `a` 共享同一个 `RefCell<i32>`，再让 `b`、`c` 共享 `a`。`borrow_mut` 经自动解引用作用到内部的 `RefCell`，改一处，三份列表都看到新值。

```console
$ cargo run
   Compiling cons-list v0.1.0 (file:///projects/cons-list)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.63s
     Running `target/debug/cons-list`
a after = Cons(RefCell { value: 15 }, Nil)
b after = Cons(RefCell { value: 3 }, Cons(RefCell { value: 15 }, Nil))
c after = Cons(RefCell { value: 4 }, Cons(RefCell { value: 15 }, Nil))
```

外层可以保持不可变，改数据走 `RefCell` 的方法。运行时借用检查用来避免数据竞争。`RefCell<T>` 不能跨线程；线程安全的对应物是 `Mutex<T>`。
