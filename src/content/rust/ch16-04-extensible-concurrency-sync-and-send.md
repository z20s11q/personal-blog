---
title: "用 `Send` 和 `Sync` 扩展并发"
order: "ch16-04-extensible-concurrency-sync-and-send"
chapter: 16
---
线程、channel、`Mutex` 都在标准库里，不在语言核心。语言里固定下来的是标记 trait `Send` 和 `Sync`。自己写并发类型也要遵守它们。

### 在线程之间转移所有权

`Send`：这个类型的值可以把所有权转到另一个线程。几乎所有类型都是 `Send`。

`Rc<T>` 不是 `Send`。克隆体若分到两个线程，两边会同时改计数。所以 `Rc` 只给单线程，不为原子计数付钱。类型系统禁止把 `Rc<T>` 送过线程：`Rc<Mutex<i32>>` 未实现 `Send`。换成实现了 `Send` 的 `Arc<T>` 才能编译。

全部由 `Send` 类型组成的类型自动是 `Send`。基本类型大多是 `Send`；裸指针不是。

### 从多个线程访问

`Sync`：可以安全地从多个线程引用该类型。等价说法是 `T: Sync` 当且仅当 `&T: Send`。

全是 `Sync` 成分的类型自动 `Sync`。基本类型是 `Sync`。

`Rc<T>` 同样不是 `Sync`。`RefCell<T>` 和 `Cell<T>` 不是 `Sync`：运行时的借用计数不是线程安全的。`Mutex<T>` 是 `Sync`，可以共享给多个线程。

### 手动实现 `Send` 和 `Sync` 是 `unsafe`

二者是标记 trait，没有方法。由 `Send` / `Sync` 部件组成的类型会自动实现。

手动实现必须写 `unsafe`，自己保证并发不变式。不是由这两类部件拼出来的新并发类型，编译器不会替你证明安全。

## 小结

- 消息传递用 `mpsc` channel：`send` 转移所有权，`recv` 阻塞到有值或通道关闭
- 共享状态用 `Arc<Mutex<T>>`：`lock` 后修改，守卫 drop 时解锁
- `Send`：所有权可跨线程移动；`Sync`：共享引用可跨线程
- `Rc<T>`、`RefCell<T>` 两者都不是；跨线程用 `Arc<T>` 和 `Mutex<T>`

借用检查保证这些用法没有数据竞争，也没有悬空引用。能编译，这类错误就不会留到运行时。
