---
title: "方法"
order: "ch05-03-method-syntax"
chapter: 5
---
方法用 `fn` 声明，可以有参数和返回值。它定义在 struct、enum 或 trait object 上，第一个参数始终是 `self`，即被调用的那个实例。

### 方法语法

**清单 5-13** 在 `impl Rectangle` 中定义 `area`，用 `rect1.area()` 调用

```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!(
        "The area of the rectangle is {} square pixels.",
        rect1.area()
    );
}
```

`impl 类型` 块里的项都关联到该类型。方法第一个参数必须名为 `self`，类型是 `Self`。在 `impl` 块里，`Self` 是该块所针对类型的别名。`&self` 即 `self: &Self`。

接收者有三种：`&self` 共享借用，`&mut self` 独占借用，按值 `self` 拿走所有权。只读用 `&self`。方法里要改实例用 `&mut self`。按值 `self` 较少见，用于把实例消耗掉、变成另一个值，调用后原实例不能再使用。

方法把一个类型上的操作集中到 `impl`。调用写成 `实例.方法(参数)`，签名里也不必重复 `self` 的类型。

方法可以和某个字段同名。

```rust
impl Rectangle {
    fn width(&self) -> bool {
        self.width > 0
    }
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    if rect1.width() {
        println!("The rectangle has a nonzero width; it is {}", rect1.width);
    }
}
```

`rect1.width()` 调用方法，`rect1.width` 读字段。有无括号决定选哪一个。同名方法里仍然可以读同名字段。

同名字段的方法常常只返回字段值，称为 getter。Rust 不自动生成 getter。字段保持私有、方法公开时，对外就是只读。可见性在第 7 章。

### 没有 `->` 运算符

C 和 C++ 里，对象用 `.`，指针要先解引用再用 `->`。`object->something()` 相当于 `(*object).something()`。

Rust 没有 `->`。方法调用会按签名自动加上 `&`、`&mut` 或 `*`。这是少数会自动引用和解引用的地方：接收者类型确定后，编译器知道该方法是读（`&self`）、改（`&mut self`）还是消费（`self`）。

**对照**：C++ 要自己区分 `.` 和 `->`。Rust 对方法接收者自动借用或解引用。

### 带更多参数的方法

**清单 5-14** `can_hold` 再接收另一个矩形的共享借用，判断能否完全放下

```rust
fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };
    let rect2 = Rectangle {
        width: 10,
        height: 40,
    };
    let rect3 = Rectangle {
        width: 60,
        height: 45,
    };

    println!("Can rect1 hold rect2? {}", rect1.can_hold(&rect2));
    println!("Can rect1 hold rect3? {}", rect1.can_hold(&rect3));
}
```

`rect2` 的宽和高都更小，结果为真；`rect3` 更宽，结果为假。

```text
Can rect1 hold rect2? true
Can rect1 hold rect3? false
```

`can_hold` 放在 `impl Rectangle` 里。`rect1.can_hold(&rect2)` 传入共享借用：只读 `rect2`，`main` 仍拥有它。返回 `bool`，比较双方的宽和高。

**清单 5-15** `can_hold(&self, other: &Rectangle)`

```rust
impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }

    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
}
```

`self` 之后的参数和普通函数参数相同，可以有多个。

### 关联函数

`impl` 块里的函数都是关联函数。第一个参数不是 `self` 的关联函数不是方法，调用时不需要实例。`String::from` 就是这种函数。

无 `self` 的关联函数常作构造器，返回新实例。`new` 只是惯例，不是关键字。例如 `square` 用一个边长同时作为宽和高。

文件：src/main.rs

```rust
impl Rectangle {
    fn square(size: u32) -> Self {
        Self {
            width: size,
            height: size,
        }
    }
}
```

返回类型和函数体中的 `Self` 都是 `impl` 后面那个类型，这里是 `Rectangle`。

调用用 `::`：`Rectangle::square(3)`。关联函数和模块路径都用 `::`。模块在第 7 章。

### 多个 `impl` 块

同一个 struct 可以有多个 `impl` 块。

**清单 5-16** 清单 5-15 的两个方法各自放进一个 `impl Rectangle`，效果相同

```rust
impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }
}

impl Rectangle {
    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
}
```

这里拆开没有额外作用，语法上合法。泛型和 trait（第 10 章）会用到多个 `impl`。

## 小结

struct 是带名字字段的领域类型。`impl` 里定义关联函数；方法是带 `self` 的关联函数，描述实例的行为。

另一种自定义类型是 enum。
