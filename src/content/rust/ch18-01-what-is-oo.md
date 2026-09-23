---
title: "面向对象语言的特征"
order: "ch18-01-what-is-oo"
chapter: 18
---
OOP 常见特征：对象、封装、继承。

### 对象包含数据与行为

《设计模式》（Gang of Four）的定义：对象同时打包数据和操作数据的函数。

按此定义 Rust 是面向对象的：结构体和枚举有数据，`impl` 块提供方法。

### 隐藏实现细节的封装

封装指外部代码不能直接访问对象内部，只能通过公开 API 交互。好处是改内部实现不影响使用者。

第 7 章讲过：`pub` 决定公开什么，默认私有。

`AveragedCollection` 维护列表和平均值（缓存结果）：

**清单 18-1** `AveragedCollection` 结构体。

```rust
pub struct AveragedCollection {
    list: Vec<i32>,
    average: f64,
}
```

结构体公开但字段私有，保证列表变化时平均值同步更新：

**清单 18-2** `add` / `remove` / `average` 方法。

```rust
impl AveragedCollection {
    pub fn add(&mut self, value: i32) {
        self.list.push(value);
        self.update_average();
    }

    pub fn remove(&mut self) -> Option<i32> {
        let result = self.list.pop();
        match result {
            Some(value) => {
                self.update_average();
                Some(value)
            }
            None => None,
        }
    }

    pub fn average(&self) -> f64 {
        self.average
    }

    fn update_average(&mut self) {
        let total: i32 = self.list.iter().sum();
        self.average = total as f64 / self.list.len() as f64;
    }
}
```

`add` 和 `remove` 内部调用私有的 `update_average`。`list` 和 `average` 私有，外部无法绕过更新逻辑。`average` 只读暴露。

将来把 `list` 换成 `HashSet<i32>` 也不用改外部代码，只要公开方法签名不变。

### 继承：类型系统与代码复用

继承让一个对象获得另一个对象的定义中的字段和行为。

Rust 没有继承，不能定义继承父结构体字段和方法实现的结构体。

继承通常有两个用途，在 Rust 里各有替代：

- 代码复用：用 trait 的默认实现（第 10 章 `Summary` 的例子），实现类型自动获得方法，也可以覆盖。
- 多态：让子类型能用在父类型的位置。Rust 用泛型 + trait bound 做「有界参数多态」，或用 trait 对象做运行时多态。

> ### 多态
>
> 对很多人多态等同于继承，其实多态泛指能处理多种类型的代码。Rust 用泛型和 trait bound，这叫有界参数多态。

Rust 不做继承的原因：继承容易共享过多代码（子类被迫继承父类的所有特性），设计灵活性差，还可能调用到对子类无意义的方法；有些语言只支持单继承，限制更大。

Rust 用 trait 对象实现运行时多态。

**对照**：Python / Java / C++ 的继承既有代码复用也有子类型多态；Rust 把两者拆开，复用走 trait 默认方法，多态走 trait 对象或泛型。
