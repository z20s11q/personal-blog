---
title: "共享状态并发"
order: "ch16-03-shared-state"
chapter: 16
---
channel 把值送走后，发送方不应再使用，接近单一所有权。共享内存是多所有权：多个线程同时访问同一块数据。

### 用互斥锁控制访问

`Mutex<T>`（mutual exclusion）保证同一时刻只有一个线程能访问内部数据。使用前必须拿到锁；用完必须解锁。

类型系统管住这两步：不 `lock` 就拿不到内部值；守卫离开作用域时自动解锁。

#### `Mutex<T>` 的 API

**清单 16-12** 单线程里 `lock`、改内部的 `i32`、离开内部作用域后解锁。

**对照**：接近 Java 的 `synchronized`：进临界区前拿锁，出来释放。Rust 的解锁绑在守卫的 `Drop` 上。

```rust
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(5);

    {
        let mut num = m.lock().unwrap();
        *num = 6;
    }

    println!("m = {m:?}");
}
```

`Mutex::new` 创建。`lock` 阻塞到拿到锁。持有锁的线程若 panic，锁会中毒，别人再 `lock` 得到 `Err`；示例在这时 `unwrap`，当前线程也 panic。

`lock` 返回 `LockResult<MutexGuard<T>>`。`MutexGuard` 实现 `Deref`，当作内部数据的可变引用用；`Drop` 时自动解锁。值的类型是 `Mutex<i32>` 不是 `i32`，不调用 `lock` 就碰不到里面。

```rust
use std::sync::Mutex;
use std::thread;

fn main() {
    let counter = Mutex::new(0);
    let mut handles = vec![];

    for _ in 0..10 {
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();

            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap());
}
```

#### 在多个线程间共享 `Mutex<T>`

`MutexGuard` 离开闭包就解锁，别的线程才能再锁。

**清单 16-13** 十个线程各自把计数加一。闭包是 `move`，同一个 `Mutex` 不能移进每一个线程。

```console
$ cargo run
   Compiling shared-state v0.1.0 (file:///projects/shared-state)
error[E0382]: borrow of moved value: `counter`
  --> src/main.rs:21:29
   |
 5 |     let counter = Mutex::new(0);
   |         ------- move occurs because `counter` has type `std::sync::Mutex<i32>`, which does not implement the `Copy` trait
...
 8 |     for _ in 0..10 {
   |     -------------- inside of this loop
 9 |         let handle = thread::spawn(move || {
   |                                    ------- value moved into closure here, in previous iteration of loop
...
21 |     println!("Result: {}", *counter.lock().unwrap());
   |                             ^^^^^^^ value borrowed here after move

For more information about this error, try `rustc --explain E0382`.
error: could not compile `shared-state` (bin "shared-state") due to 1 previous error
```

`Mutex<i32>` 不是 `Copy`。`move` 进第一次循环的闭包后，所有权已经走了，后面的线程和主线程都不能再使用它。

```rust
use std::rc::Rc;
use std::sync::Mutex;
use std::thread;

fn main() {
    let counter = Rc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Rc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();

            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap());
}
```

```console
$ cargo run
   Compiling shared-state v0.1.0 (file:///projects/shared-state)
error[E0277]: `Rc<std::sync::Mutex<i32>>` cannot be sent between threads safely
  --> src/main.rs:11:36
   |
11 |           let handle = thread::spawn(move || {
   |                        ------------- ^------
   |                        |             |
   |  ______________________|_____________within this `{closure@src/main.rs:11:36: 11:43}`
   | |                      |
   | |                      required by a bound introduced by this call
12 | |             let mut num = counter.lock().unwrap();
13 | |
14 | |             *num += 1;
15 | |         });
   | |_________^ `Rc<std::sync::Mutex<i32>>` cannot be sent between threads safely
   |
   = help: within `{closure@src/main.rs:11:36: 11:43}`, the trait `Send` is not implemented for `Rc<std::sync::Mutex<i32>>`
note: required because it's used within this closure
  --> src/main.rs:11:36
   |
11 |         let handle = thread::spawn(move || {
   |                                    ^^^^^^^
note: required by a bound in `spawn`
  --> /rustc/88d9e12ae178fab0fb5cc050a94da85685d449ea/library/std/src/thread/functions.rs:125:0

For more information about this error, try `rustc --explain E0277`.
error: could not compile `shared-state` (bin "shared-state") due to 1 previous error
```

`Rc<Mutex<i32>>` 没有实现 `Send`，不能送到另一个线程。`Rc` 加减计数不是原子的，并发 `clone` / `drop` 会把计数改错，导致泄漏或提前释放。

#### 原子引用计数 `Arc<T>`

`Arc<T>` 的 API 与 `Rc<T>` 相同，计数用原子操作，可以跨线程。原子有成本，单线程仍用 `Rc<T>`。

**清单 16-15** `Arc<Mutex<i32>>`：`Arc::clone` 之后 `move` 进各线程，`lock` 后再改。

**对照**：`Arc<T>` 才接近能跨线程用的 C++ `shared_ptr`。`Rc<T>` 没有原子计数，不能当 `shared_ptr` 用。

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();

            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap());
}
```

```text
Result: 10
```

`Mutex<T>` 也是内部可变：外层绑定可以是不可变的，`lock` 之后仍能改内部。跨线程用 `Arc<Mutex<T>>`，对应单线程的 `Rc<RefCell<T>>`。

简单整数的原子加减可以直接用 `std::sync::atomic`，不必套 `Mutex<T>`。

`Mutex` 防不住死锁：两个线程各持一把锁，再等对方。这是逻辑错误，编译器不报。

**对照**：和 Java `synchronized` 嵌套、C++ 多把 `std::mutex` 的加锁顺序问题一样。`MutexGuard` 只保证离开作用域会解锁。
