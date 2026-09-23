---
title: "泛型、trait 与生命周期"
order: "ch10-00-generics"
chapter: 10
---
泛型是具体类型的占位符，让代码在编译运行前不需要知道实际类型。

函数参数可以接收未知的值来复用；泛型同理，接收未知的类型。前面已经用过：`Option<T>`、`Vec<T>`、`HashMap<K, V>`、`Result<T, E>`。

本章先回顾「提取函数消除重复」，再用同样手法把「只差参数类型」的两个函数合成泛型函数；然后讲结构体和枚举里的泛型、用 trait 约束泛型、生命周期。

## 提取函数消除重复

泛型是「用占位符代表多个类型」。先看不用泛型的去重：把具体值换成参数。

清单 10-1 找列表中最大值：

**清单 10-1** 在数字列表中找最大值。

```rust
fn main() {
    let number_list = vec![34, 50, 25, 100, 65];

    let mut largest = &number_list[0];

    for number in &number_list {
        if number > largest {
            largest = number;
        }
    }

    println!("The largest number is {largest}");
}
```

把首个元素存进 `largest`，遍历，比 `largest` 大的就替换。结束后 `largest` 就是最大值 100。

现在要在两个列表里找最大值，复制代码：

**清单 10-2** 在两个列表中找最大值的重复代码。

```rust
fn main() {
    let number_list = vec![34, 50, 25, 100, 65];

    let mut largest = &number_list[0];

    for number in &number_list {
        if number > largest {
            largest = number;
        }
    }

    println!("The largest number is {largest}");

    let number_list = vec![102, 34, 6000, 89, 54, 2, 43, 8];

    let mut largest = &number_list[0];

    for number in &number_list {
        if number > largest {
            largest = number;
        }
    }

    println!("The largest number is {largest}");
}
```

能跑，但重复代码难维护，改一处要改多处。

提取成函数，参数收列表：

**清单 10-3** 提取 `largest` 函数。

```rust
fn largest(list: &[i32]) -> &i32 {
    let mut largest = &list[0];

    for item in list {
        if item > largest {
            largest = item;
        }
    }

    largest
}

fn main() {
    let number_list = vec![34, 50, 25, 100, 65];

    let result = largest(&number_list);
    println!("The largest number is {result}");

    let number_list = vec![102, 34, 6000, 89, 54, 2, 43, 8];

    let result = largest(&number_list);
    println!("The largest number is {result}");
}
```

`list: &[i32]` 代表任意 `i32` 切片。调用时传入的值决定实际运行的数据。

步骤总结：

1. 找出重复代码。
2. 提取进函数体，在签名里写清输入和返回值。
3. 两处重复处改为调用函数。

同样的步骤也适用于泛型：函数体操作抽象的 `list`，泛型让代码操作抽象的类型。

接着看：一个找 `i32` 列表最大值，一个找 `char` 列表最大值，怎么消除重复。**对照**：Java 用 `List<T>` + 边界通配符、Go 1.18+ 用类型参数、C++ 用模板，Rust 泛型在编译期单态化，没有装箱开销，也没有类型擦除。
