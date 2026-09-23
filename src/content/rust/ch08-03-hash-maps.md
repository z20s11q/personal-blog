---
title: "用哈希映射存键值"
order: "ch08-03-hash-maps"
chapter: 8
---
`HashMap<K, V>` 用哈希函数把键 `K` 映射到值 `V`。按键查找。键的类型必须相同，值的类型必须相同。数据在堆上。

它不在 prelude 里，也没有构造宏。先 `use std::collections::HashMap`，再用 `HashMap::new()` 和 `insert`。

**对照**：对应 Java `HashMap`、Go 的 `map`、Python 的 `dict`、C++ 的 `std::unordered_map`。键和值各自必须同质。插入 `String` 会移动所有权；Java 和 Python 放进去的是引用，原变量还能用。

**清单 8-20** 新建 `HashMap` 并插入两支队伍的分数。

```rust
    use std::collections::HashMap;

    let mut scores = HashMap::new();

    scores.insert(String::from("Blue"), 10);
    scores.insert(String::from("Yellow"), 50);
```

先 `use`。这个 map 的键是 `String`，值是 `i32`。

### 读取值

`get` 返回 `Option<&V>`，没有这个键就是 `None`。`i32` 是 `Copy`，`copied` 把 `Option<&i32>` 变成 `Option<i32>`，`unwrap_or` 在 `None` 时给默认值。

`for (key, value) in &map` 遍历，顺序任意。

**清单 8-21** `get` 读取 Blue 的分数。

```rust
    use std::collections::HashMap;

    let mut scores = HashMap::new();

    scores.insert(String::from("Blue"), 10);
    scores.insert(String::from("Yellow"), 50);

    let team_name = String::from("Blue");
    let score = scores.get(&team_name).copied().unwrap_or(0);
```

Blue 的分数是 10。没有该键时 `get` 得到 `None`。

```rust
    use std::collections::HashMap;

    let mut scores = HashMap::new();

    scores.insert(String::from("Blue"), 10);
    scores.insert(String::from("Yellow"), 50);

    for (key, value) in &scores {
        println!("{key}: {value}");
    }
```

键值对的打印顺序任意。

```text
Yellow: 50
Blue: 10
```

### 哈希映射与所有权

- 实现了 `Copy` 的类型（如 `i32`）按副本进入 map。
- `String` 这种拥有所有权的值会被移动，map 成为所有者。`insert` 之后原变量不能再用。
- 插入引用时不移动。被引用的值至少要活得和 map 一样久（生命周期见第 10 章）。

**清单 8-22** `insert` 之后原来的键和值不能再使用。

```rust
    use std::collections::HashMap;

    let field_name = String::from("Favorite color");
    let field_value = String::from("Blue");

    let mut map = HashMap::new();
    map.insert(field_name, field_value);
    // field_name and field_value are invalid at this point, try using them and
    // see what compiler error you get!
```

`field_name` 和 `field_value` 已经移进 map。插入引用时，引用目标的生命周期至少要覆盖这个 map。

### 更新哈希映射

每个键同时只有一个值。不同的键可以有相同的值。更新有三种：覆盖、键不存在时才插入、按旧值改。

#### 覆盖

同一键再次 `insert`，新值替换旧值。

**清单 8-23** 同一键插入两次。

```rust
    use std::collections::HashMap;

    let mut scores = HashMap::new();

    scores.insert(String::from("Blue"), 10);
    scores.insert(String::from("Blue"), 25);

    println!("{scores:?}");
```

结果是 `{"Blue": 25}`，原来的 `10` 被盖掉。

#### 键不存在时才插入

`entry(key)` 返回 `Entry`。`or_insert(v)`：键已存在就返回该值的 `&mut V`；不存在就插入 `v`，并返回新值的可变引用。比先查再插更配合借用检查。

**清单 8-24** `entry` 配合 `or_insert`。

```rust
    use std::collections::HashMap;

    let mut scores = HashMap::new();
    scores.insert(String::from("Blue"), 10);

    scores.entry(String::from("Yellow")).or_insert(50);
    scores.entry(String::from("Blue")).or_insert(50);

    println!("{scores:?}");
```

Yellow 不存在，插入 50。Blue 已是 10，保持不变。顺序任意，内容是 Yellow 为 50、Blue 为 10。

#### 按旧值更新

`or_insert` 给出 `&mut V`，用 `*` 修改。这个可变引用在本轮循环结束时结束。

**清单 8-25** 用 `entry` 统计词频。

```rust
    use std::collections::HashMap;

    let text = "hello world wonderful world";

    let mut map = HashMap::new();

    for word in text.split_whitespace() {
        let count = map.entry(word).or_insert(0);
        *count += 1;
    }

    println!("{map:?}");
```

打印出 `world` 为 2、`hello` 为 1、`wonderful` 为 1，顺序任意。

`split_whitespace` 按空白切出子切片。`or_insert` 返回 `&mut V`，所以写 `*count += 1`。该可变引用在这一轮 `for` 结束时离开作用域，借用合法。

### 哈希函数

默认哈希是 SipHash，用来抵抗针对哈希表的拒绝服务攻击，不是最快的算法。可以换成别的 hasher：一个实现 `BuildHasher` 的类型（trait 见第 10 章）。crates.io 上有常见算法的实现。

## 小结

`Vec<T>` 是同质变长连续序列，`String` / `&str` 是 UTF-8，`HashMap<K, V>` 是同质键值映射。`String` 键插入时移动所有权；`get` 和 `entry` 都用 `Option` / `Entry` 表达“可能没有”。
