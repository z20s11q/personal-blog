---
title: "用迭代器处理一系列元素"
order: "ch13-02-iterators"
chapter: 13
---
迭代器负责逐项推进，并判断序列何时结束。Rust 的迭代器是惰性的（lazy）：创建之后不做任何事，直到调用消费者把它用尽。

**对照** Java `Stream` 同样惰性，要终端操作才执行；Python 生成器也是惰性的，要迭代才产出。C++ 标准算法一般立即执行。Go 没有这套迭代器适配器，`range` 就是当场循环。

**清单 13-10** `Vec::iter` 只创建迭代器，尚未遍历。

```rust
    let v1 = vec![1, 2, 3];

    let v1_iter = v1.iter();
```

`for` 会取得迭代器并逐项消费。循环变量每次绑定下一项。

**清单 13-11** 把已创建的迭代器放进 `for`。

```rust
    let v1 = vec![1, 2, 3];

    let v1_iter = v1.iter();

    for val in v1_iter {
        println!("Got: {val}");
    }
```

同一套“下一项 / 结束”逻辑可以用于不能按下标索引的序列。

### `Iterator` trait 与 `next`

```rust
pub trait Iterator {
    type Item;

    fn next(&mut self) -> Option<Self::Item>;

    // methods with default implementations elided
}
```

`type Item` 是关联类型：实现 `Iterator` 时必须指定元素类型，`next` 返回 `Option<Self::Item>`。`Some` 是下一项，`None` 表示结束。关联类型的细节见第 20 章。

实现者只需写 `next`；可以直接对迭代器调用它。

**清单 13-12** 连续调用 `next`，依次得到 `Some(&1)`、`Some(&2)`、`Some(&3)`、`None`。

```rust
    #[test]
    fn iterator_demonstration() {
        let v1 = vec![1, 2, 3];

        let mut v1_iter = v1.iter();

        assert_eq!(v1_iter.next(), Some(&1));
        assert_eq!(v1_iter.next(), Some(&2));
        assert_eq!(v1_iter.next(), Some(&3));
        assert_eq!(v1_iter.next(), None);
    }
```

`next` 的接收者是 `&mut self`：它改写内部游标，所以迭代器变量必须是 `mut`。每次调用消费一项。`for` 取得迭代器的所有权并在内部做成可变，调用处不必写 `mut`。

三种来源：

- `iter`：产出不可变引用
- `iter_mut`：产出可变引用
- `into_iter`：拿走集合的所有权，产出拥有的值

### 消费迭代器的方法

标准库为 `Iterator` 提供大量默认方法，内部都调用 `next`。

会调用 `next` 并把迭代器用尽的方法是消费者（consuming adapter）。`sum` 取得迭代器所有权，反复 `next` 并累加，返回总和。

**清单 13-13** `sum` 消费迭代器。

```rust
    #[test]
    fn iterator_sum() {
        let v1 = vec![1, 2, 3];

        let v1_iter = v1.iter();

        let total: i32 = v1_iter.sum();

        assert_eq!(total, 6);
    }
```

`sum` 之后不能再使用原来的迭代器。

### 产出另一个迭代器的方法

迭代器适配器不把迭代器用尽，而是返回一个行为不同的新迭代器。`map` 对每个元素套用闭包，返回产出新值的迭代器。适配器本身惰性，此时闭包不会执行。

**清单 13-14** 只调用 `map`、没有消费者。

```rust
    let v1: Vec<i32> = vec![1, 2, 3];

    v1.iter().map(|x| x + 1);
```

警告规则：迭代器惰性，未被使用的 `Map` 什么都不做，闭包不会运行。

```console
$ cargo run
   Compiling iterators v0.1.0 (file:///projects/iterators)
warning: unused `Map` that must be used
 --> src/main.rs:4:5
  |
4 |     v1.iter().map(|x| x + 1);
  |     ^^^^^^^^^^^^^^^^^^^^^^^^
  |
  = note: iterators are lazy and do nothing unless consumed
  = note: `#[warn(unused_must_use)]` (part of `#[warn(unused)]`) on by default
help: use `let _ = ...` to ignore the resulting value
  |
4 |     let _ = v1.iter().map(|x| x + 1);
  |     +++++++

warning: `iterators` (bin "iterators") generated 1 warning
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.47s
     Running `target/debug/iterators`
```

`collect` 是消费者：用尽迭代器，把结果收进集合。目标集合类型需要标注（或能推断）。多个适配器可以链式调用，链的末端要有一个消费者才有结果。

**清单 13-15** `map` 之后 `collect` 成 `Vec`。

```rust
    let v1: Vec<i32> = vec![1, 2, 3];

    let v2: Vec<_> = v1.iter().map(|x| x + 1).collect();

    assert_eq!(v2, vec![2, 3, 4]);
```

`map` 的闭包决定对每个元素做什么，遍历仍由 `Iterator` 提供。

### 捕获环境的闭包

适配器常接收会捕获环境的闭包。`filter` 的闭包拿到元素并返回 `bool`：`true` 保留，`false` 丢弃。

**清单 13-16** `filter` 捕获 `shoe_size`，只保留该尺码。

```rust
#[derive(PartialEq, Debug)]
struct Shoe {
    size: u32,
    style: String,
}

fn shoes_in_size(shoes: Vec<Shoe>, shoe_size: u32) -> Vec<Shoe> {
    shoes.into_iter().filter(|s| s.size == shoe_size).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn filters_by_size() {
        let shoes = vec![
            Shoe {
                size: 10,
                style: String::from("sneaker"),
            },
            Shoe {
                size: 13,
                style: String::from("sandal"),
            },
            Shoe {
                size: 10,
                style: String::from("boot"),
            },
        ];

        let in_my_size = shoes_in_size(shoes, 10);

        assert_eq!(
            in_my_size,
            vec![
                Shoe {
                    size: 10,
                    style: String::from("sneaker")
                },
                Shoe {
                    size: 10,
                    style: String::from("boot")
                },
            ]
        );
    }
}
```

`into_iter` 拿走 `Vec<Shoe>` 的所有权。`filter` 得到只含匹配元素的新迭代器，闭包按不可变引用捕获 `shoe_size`。`collect` 再把结果收成 `Vec` 返回。
