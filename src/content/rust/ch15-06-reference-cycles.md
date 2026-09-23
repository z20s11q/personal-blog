---
title: "循环引用会泄漏内存"
order: "ch15-06-reference-cycles"
chapter: 15
---
Rust 不保证杜绝内存泄漏；泄漏本身仍算内存安全。`Rc<T>` 加 `RefCell<T>` 可以让两边互相指向，强计数永远到不了 0，值永不 drop。

### 制造循环引用

**清单 15-25** `Cons` 的尾部是 `RefCell<Rc<List>>`，以便事后改指向；`tail` 取出这个尾部。

```rust
use crate::List::{Cons, Nil};
use std::cell::RefCell;
use std::rc::Rc;

#[derive(Debug)]
enum List {
    Cons(i32, RefCell<Rc<List>>),
    Nil,
}

impl List {
    fn tail(&self) -> Option<&RefCell<Rc<List>>> {
        match self {
            Cons(_, item) => Some(item),
            Nil => None,
        }
    }
}
```

尾部用 `RefCell<Rc<List>>`，改的是指向哪一节，不是改里面的 `i32`。

**清单 15-26** 让 `a` 和 `b` 互相指向，形成环。

```rust
fn main() {
    let a = Rc::new(Cons(5, RefCell::new(Rc::new(Nil))));

    println!("a initial rc count = {}", Rc::strong_count(&a));
    println!("a next item = {:?}", a.tail());

    let b = Rc::new(Cons(10, RefCell::new(Rc::clone(&a))));

    println!("a rc count after b creation = {}", Rc::strong_count(&a));
    println!("b initial rc count = {}", Rc::strong_count(&b));
    println!("b next item = {:?}", b.tail());

    if let Some(link) = a.tail() {
        *link.borrow_mut() = Rc::clone(&b);
    }

    println!("b rc count after changing a = {}", Rc::strong_count(&b));
    println!("a rc count after changing a = {}", Rc::strong_count(&a));

    // Uncomment the next line to see that we have a cycle;
    // it will overflow the stack.
    // println!("a next item = {:?}", a.tail());
}
```

`b` 通过 `Rc::clone` 指向 `a`。再对 `a` 的尾部 `borrow_mut`，把 `Nil` 换成 `b`。顺着这个环打印会一直展开到栈溢出。

```console
$ cargo run
   Compiling cons-list v0.1.0 (file:///projects/cons-list)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.53s
     Running `target/debug/cons-list`
a initial rc count = 1
a next item = Some(RefCell { value: Nil })
a rc count after b creation = 2
b initial rc count = 1
b next item = Some(RefCell { value: Cons(5, RefCell { value: Nil }) })
b rc count after changing a = 2
a rc count after changing a = 2
```

成环后两边强计数都是 2。`main` 结束时各自只减到 1，堆上的列表不会被释放。

这种环编译器抓不到，是逻辑错误。`RefCell` 里套 `Rc`（内部可变加引用计数）时要自己保证不成环。

也可以把边分成所有权边和非所有权边：只有强引用决定能否 drop。

### 用 `Weak<T>` 打破循环引用

`Rc::clone` 增加 `strong_count`，强计数为 0 才清理。`Rc::downgrade` 得到 `Weak<T>`，只增加 `weak_count`，不阻止释放。环里只要有弱引用，强计数归零时环就会断开。

`Weak<T>` 指向的值可能已经 drop。使用前调用 `upgrade`，得到 `Option<Rc<T>>`：还在是 `Some`，已释放是 `None`。

**对照**：`Weak<T>` 对应 C++ `weak_ptr`。它不增加共享所有权，`upgrade` 相当于 `lock()`，失败就没有悬空指针。

#### 树：节点拥有子节点

子节点用 `Rc<Node>` 共享所有权，外面包 `RefCell`，以便事后增删。

文件：src/main.rs

```rust
use std::cell::RefCell;
use std::rc::Rc;

#[derive(Debug)]
struct Node {
    value: i32,
    children: RefCell<Vec<Rc<Node>>>,
}
```

节点拥有子节点，并用 `Rc` 把所有权分给外部变量，才能直接访问每个节点。`children` 的类型是 `RefCell<Vec<Rc<Node>>>`。

**清单 15-27** `branch` 的子节点里放一份 `leaf` 的 `Rc` 克隆。

```rust
fn main() {
    let leaf = Rc::new(Node {
        value: 3,
        children: RefCell::new(vec![]),
    });

    let branch = Rc::new(Node {
        value: 5,
        children: RefCell::new(vec![Rc::clone(&leaf)]),
    });
}
```

克隆之后 `leaf` 有两个强所有者：变量 `leaf` 和 `branch.children`。从父能走到子，反向不行。

#### 子节点指向父节点

父应拥有子：父 drop，子也 drop。子不应拥有父。父字段若也是 `Rc<Node>`，会和 `children` 形成强引用环。父字段用 `RefCell<Weak<Node>>`。

文件：src/main.rs

```rust
use std::cell::RefCell;
use std::rc::{Rc, Weak};

#[derive(Debug)]
struct Node {
    value: i32,
    parent: RefCell<Weak<Node>>,
    children: RefCell<Vec<Rc<Node>>>,
}
```

子节点可以提到父节点，但不拥有它。

**清单 15-28** `leaf.parent` 是指向 `branch` 的弱引用。

```rust
fn main() {
    let leaf = Rc::new(Node {
        value: 3,
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(vec![]),
    });

    println!("leaf parent = {:?}", leaf.parent.borrow().upgrade());

    let branch = Rc::new(Node {
        value: 5,
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(vec![Rc::clone(&leaf)]),
    });

    *leaf.parent.borrow_mut() = Rc::downgrade(&branch);

    println!("leaf parent = {:?}", leaf.parent.borrow().upgrade());
}
```

还没有父节点时用 `Weak::new()`。此时 `upgrade` 得到 `None`。

```text
leaf parent = None
```

`Rc::downgrade(&branch)` 得到 `Weak<Node>`，写进 `leaf.parent`。之后 `upgrade` 得到 `Some`。`Debug` 把弱引用印成 `(Weak)`，不会顺着环把栈打爆。

```text
leaf parent = Some(Node { value: 5, parent: RefCell { value: (Weak) },
children: RefCell { value: [Node { value: 3, parent: RefCell { value: (Weak) },
children: RefCell { value: [] } }] } })
```

没有无限输出，说明没有强引用环。

#### 观察 `strong_count` 和 `weak_count`

**清单 15-29** 把 `branch` 放进内部作用域，看创建和 drop 时的强弱计数。

```rust
fn main() {
    let leaf = Rc::new(Node {
        value: 3,
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(vec![]),
    });

    println!(
        "leaf strong = {}, weak = {}",
        Rc::strong_count(&leaf),
        Rc::weak_count(&leaf),
    );

    {
        let branch = Rc::new(Node {
            value: 5,
            parent: RefCell::new(Weak::new()),
            children: RefCell::new(vec![Rc::clone(&leaf)]),
        });

        *leaf.parent.borrow_mut() = Rc::downgrade(&branch);

        println!(
            "branch strong = {}, weak = {}",
            Rc::strong_count(&branch),
            Rc::weak_count(&branch),
        );

        println!(
            "leaf strong = {}, weak = {}",
            Rc::strong_count(&leaf),
            Rc::weak_count(&leaf),
        );
    }

    println!("leaf parent = {:?}", leaf.parent.borrow().upgrade());
    println!(
        "leaf strong = {}, weak = {}",
        Rc::strong_count(&leaf),
        Rc::weak_count(&leaf),
    );
}
```

`leaf` 刚创建：强 1、弱 0。`branch.children` 里克隆了 `leaf` 的 `Rc`，`leaf` 强计数变为 2。`leaf.parent` 对 `branch` 是 `Weak`，所以 `branch` 强 1、弱 1。

内部作用域结束，`branch` 强计数到 0，节点被 drop。弱计数不影响释放，因此不泄漏。之后 `leaf.parent.upgrade()` 再次是 `None`。最后只剩变量 `leaf`：强 1、弱 0。

计数和释放由 `Rc<T>`、`Weak<T>` 的 `Drop` 完成。子到父用 `Weak<T>`，父到子用 `Rc<T>`，两边都能指向对方，又不会形成强引用环。

## 小结

- `Box<T>`：大小已知，指向堆
- `Rc<T>`：堆上数据多所有者，靠强计数；非线程安全
- `RefCell<T>`：内部可变，借用规则在运行时检查
- `Deref` 和 `Drop` 支撑智能指针的用法
- 强引用环会泄漏；非所有权边用 `Weak<T>`
