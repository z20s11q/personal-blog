---
title: "用线程同时跑代码"
order: "ch16-01-threads"
chapter: 16
---
线程是进程里同时运行的独立部分。没有跨线程的执行顺序保证，因此会有数据竞争（访问顺序不一致）、死锁（互相等待），以及难复现的时序 bug。

`std::thread` 是 1:1：一个语言线程对应一个操作系统线程。别的调度模型在 crate 里。async 是另一条并发路径。

### 用 `spawn` 创建线程

`thread::spawn` 接受一个闭包，在新线程里执行。

**清单 16-1** 主线程和子线程各自循环打印。

**对照**：`thread::spawn` 接近 Java 线程和 C++ `std::thread`，不是 Go 那种可抢占的轻量 goroutine。Python 线程受 GIL 限制，CPU 密集任务通常不能靠它并行。

```rust
use std::thread;
use std::time::Duration;

fn main() {
    thread::spawn(|| {
        for i in 1..10 {
            println!("hi number {i} from the spawned thread!");
            thread::sleep(Duration::from_millis(1));
        }
    });

    for i in 1..5 {
        println!("hi number {i} from the main thread!");
        thread::sleep(Duration::from_millis(1));
    }
}
```

主线程结束时，还没跑完的子线程会被直接关掉。打印顺序由操作系统调度，不保证。

```text
hi number 1 from the main thread!
hi number 1 from the spawned thread!
hi number 2 from the main thread!
hi number 2 from the spawned thread!
hi number 3 from the main thread!
hi number 3 from the spawned thread!
hi number 4 from the main thread!
hi number 4 from the spawned thread!
hi number 5 from the spawned thread!
```

`thread::sleep` 只是停一段时间，不保证两个线程交替。主线程先结束时，子线程可能只打印到一半。

```rust
use std::thread;
use std::time::Duration;

fn main() {
    let handle = thread::spawn(|| {
        for i in 1..10 {
            println!("hi number {i} from the spawned thread!");
            thread::sleep(Duration::from_millis(1));
        }
    });

    for i in 1..5 {
        println!("hi number {i} from the main thread!");
        thread::sleep(Duration::from_millis(1));
    }

    handle.join().unwrap();
}
```

### 等所有线程结束

`thread::spawn` 返回 `JoinHandle<T>`。对其调用 `join` 会阻塞当前线程，直到对应线程结束。

**清单 16-2** 保存 `JoinHandle`，在主线程循环之后 `join`。

```text
hi number 1 from the main thread!
hi number 2 from the main thread!
hi number 1 from the spawned thread!
hi number 3 from the main thread!
hi number 2 from the spawned thread!
hi number 4 from the main thread!
hi number 3 from the spawned thread!
hi number 4 from the spawned thread!
hi number 5 from the spawned thread!
hi number 6 from the spawned thread!
hi number 7 from the spawned thread!
hi number 8 from the spawned thread!
hi number 9 from the spawned thread!
```

`join` 放在主线程循环之后：两边可以交错，主线程会等到子线程结束才退出。

把 `join` 挪到主线程循环之前，主线程会先阻塞，输出不再交错。

```rust
use std::thread;
use std::time::Duration;

fn main() {
    let handle = thread::spawn(|| {
        for i in 1..10 {
            println!("hi number {i} from the spawned thread!");
            thread::sleep(Duration::from_millis(1));
        }
    });

    handle.join().unwrap();

    for i in 1..5 {
        println!("hi number {i} from the main thread!");
        thread::sleep(Duration::from_millis(1));
    }
}
```

先 `join` 再跑主线程的循环：子线程全部结束后，主线程才继续。

```text
hi number 1 from the spawned thread!
hi number 2 from the spawned thread!
hi number 3 from the spawned thread!
hi number 4 from the spawned thread!
hi number 5 from the spawned thread!
hi number 6 from the spawned thread!
hi number 7 from the spawned thread!
hi number 8 from the spawned thread!
hi number 9 from the spawned thread!
hi number 1 from the main thread!
hi number 2 from the main thread!
hi number 3 from the main thread!
hi number 4 from the main thread!
```

`join` 的位置决定两段代码是交错还是一前一后。

### 给线程闭包加上 `move`

传给 `thread::spawn` 的闭包常用 `move`：闭包拿走所用环境值的所有权，从原线程转到新线程。

**清单 16-3** 子线程闭包借用主线程的 `Vec`，不能编译。

```rust
use std::thread;

fn main() {
    let v = vec![1, 2, 3];

    let handle = thread::spawn(|| {
        println!("Here's a vector: {v:?}");
    });

    handle.join().unwrap();
}
```

闭包用到了 `v`，就会捕获它。`thread::spawn` 要求闭包满足 `'static`：编译器不知道子线程活多久，不能证明这次借用一直有效。

```console
$ cargo run
   Compiling threads v0.1.0 (file:///projects/threads)
error[E0373]: closure may outlive the current function, but it borrows `v`, which is owned by the current function
 --> src/main.rs:6:32
  |
6 |     let handle = thread::spawn(|| {
  |                                ^^ may outlive borrowed value `v`
7 |         println!("Here's a vector: {v:?}");
  |                                     - `v` is borrowed here
  |
note: function requires argument type to outlive `'static`
 --> src/main.rs:6:18
  |
6 |       let handle = thread::spawn(|| {
  |  __________________^
7 | |         println!("Here's a vector: {v:?}");
8 | |     });
  | |______^
help: to force the closure to take ownership of `v` (and any other referenced variables), use the `move` keyword
  |
6 |     let handle = thread::spawn(move || {
  |                                ++++

For more information about this error, try `rustc --explain E0373`.
error: could not compile `threads` (bin "threads") due to 1 previous error
```

`println!` 只需要引用，闭包默认借用 `v`。子线程可能在主线程已经 drop `v` 之后才跑，引用会悬空。

**清单 16-4** 主线程 `drop(v)`，子线程的闭包仍想借用 `v`。

```rust
use std::thread;

fn main() {
    let v = vec![1, 2, 3];

    let handle = thread::spawn(|| {
        println!("Here's a vector: {v:?}");
    });

    drop(v); // oh no!

    handle.join().unwrap();
}
```

若允许这种借用，子线程可能还没开始，主线程就已经 `drop(v)`。编译器建议给闭包加上 `move`。

```text
help: to force the closure to take ownership of `v` (and any other referenced variables), use the `move` keyword
  |
6 |     let handle = thread::spawn(move || {
  |                                ++++
```

`move` 强制闭包取得所用值的所有权，不再按使用方式推断成借用。

**清单 16-5** `thread::spawn(move || ...)` 把 `v` 移进子线程。

```rust
use std::thread;

fn main() {
    let v = vec![1, 2, 3];

    let handle = thread::spawn(move || {
        println!("Here's a vector: {v:?}");
    });

    handle.join().unwrap();
}
```

`move` 之后 `v` 归子线程所有，主线程不能再 `drop(v)`。那会变成使用已移动的值，仍然不能编译。

```console
$ cargo run
   Compiling threads v0.1.0 (file:///projects/threads)
error[E0382]: use of moved value: `v`
  --> src/main.rs:10:10
   |
 4 |     let v = vec![1, 2, 3];
   |         - move occurs because `v` has type `Vec<i32>`, which does not implement the `Copy` trait
 5 |
 6 |     let handle = thread::spawn(move || {
   |                                ------- value moved into closure here
 7 |         println!("Here's a vector: {v:?}");
   |                                     - variable moved due to use in closure
...
10 |     drop(v); // oh no!
   |          ^ value used here after move
   |
help: consider cloning the value before moving it into the closure
   |
 6 ~     let value = v.clone();
 7 ~     let handle = thread::spawn(move || {
 8 ~         println!("Here's a vector: {value:?}");
   |

For more information about this error, try `rustc --explain E0382`.
error: could not compile `threads` (bin "threads") due to 1 previous error
```

`move` 覆盖的是“默认尽量借用”，不能违反所有权。移进子线程之后，主线程再碰 `v` 就是 use after move。
