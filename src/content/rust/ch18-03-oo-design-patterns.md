---
title: "实现面向对象设计模式"
order: "ch18-03-oo-design-patterns"
chapter: 18
---
状态模式（state pattern）：值内部有一组状态，行为随状态变化。状态由状态对象表示。

例：博客文章的 `Post`，状态有草稿、待审、已发布三种。状态对象各自负责自己的行为以及何时转换状态；持有状态的值不知道这些细节。

好处：业务需求变化时，只需改状态对象内部的代码或增加新状态对象，不用改 `Post` 和使用 `Post` 的代码。

流程：

1. 新文章是空草稿。
2. 草稿写完请求审核。
3. 审核通过就发布。
4. 只有已发布的文章才返回内容，避免未通过审核的内容误发布。

其他操作不产生效果（如对草稿调用「通过」保持不变）。

### 传统面向对象写法

**清单 18-11** 目标 API 的使用示例。

```rust
use blog::Post;

fn main() {
    let mut post = Post::new();

    post.add_text("I ate a salad for lunch today");
    assert_eq!("", post.content());
    // ANCHOR_END: here

    post.request_review();
    assert_eq!("", post.content());

    post.approve();
    assert_eq!("I ate a salad for lunch today", post.content());
}
// ANCHOR_END: here
```

只暴露 `Post` 一个类型，内部状态转换自动完成，用户无法误操作（比如没审核就发布）。

#### 定义 `Post`

**清单 18-12** `Post`、`State` trait 与 `Draft`。

```rust
pub struct Post {
    state: Option<Box<dyn State>>,
    content: String,
}

impl Post {
    pub fn new() -> Post {
        Post {
            state: Some(Box::new(Draft {})),
            content: String::new(),
        }
    }
}

trait State {}

struct Draft {}

impl State for Draft {}
```

`state` 字段是 `Option<Box<dyn State>>`（为什么用 `Option` 稍后解释）。初始状态是 `Draft`，且字段私有，所以不可能以其他状态创建文章。

#### 保存正文

**清单 18-13** `add_text`。

```rust
impl Post {
    // --snip--
    pub fn add_text(&mut self, text: &str) {
        self.content.push_str(text);
    }
}
```

`add_text` 与状态无关，不属于状态模式。

#### 草稿状态返回空内容

**清单 18-14** `content` 暂时返回空串。

```rust
impl Post {
    // --snip--
    pub fn content(&self) -> &str {
        ""
    }
}
```

#### 请求审核改变状态

**清单 18-15** `request_review`。

```rust
impl Post {
    // --snip--
    pub fn request_review(&mut self) {
        if let Some(s) = self.state.take() {
            self.state = Some(s.request_review())
        }
    }
}

trait State {
    fn request_review(self: Box<Self>) -> Box<dyn State>;
}

struct Draft {}

impl State for Draft {
    fn request_review(self: Box<Self>) -> Box<dyn State> {
        Box::new(PendingReview {})
    }
}

struct PendingReview {}

impl State for PendingReview {
    fn request_review(self: Box<Self>) -> Box<dyn State> {
        self
    }
}
```

`Post::request_review` 调用当前状态的 `request_review`，后者消费当前状态并返回新状态。

`State::request_review` 的第一个参数是 `self: Box<Self>`，表示只能对 `Box` 调用，并取得所有权，使旧状态失效。

取出旧状态用 `Option::take`：把 `state` 取走并在原位留下 `None`（Rust 不允许结构体字段悬空）。所以字段类型是 `Option<Box<dyn State>>`，不能直接写 `self.state = self.state.request_review();`。

`Draft::request_review` 返回 `Box<PendingReview>`；`PendingReview` 的实现原样返回自身。

`Post::request_review` 与状态无关，规则由各状态自己承担，这正是状态模式的优势。

#### 用 `approve` 改变 `content` 行为

**清单 18-16** `approve`。

```rust
impl Post {
    // --snip--
    pub fn approve(&mut self) {
        if let Some(s) = self.state.take() {
            self.state = Some(s.approve())
        }
    }
}

trait State {
    fn request_review(self: Box<Self>) -> Box<dyn State>;
    fn approve(self: Box<Self>) -> Box<dyn State>;
}

struct Draft {}

impl State for Draft {
    // --snip--
    fn approve(self: Box<Self>) -> Box<dyn State> {
        self
    }
}

struct PendingReview {}

impl State for PendingReview {
    // --snip--
    fn approve(self: Box<Self>) -> Box<dyn State> {
        Box::new(Published {})
    }
}

struct Published {}

impl State for Published {
    fn request_review(self: Box<Self>) -> Box<dyn State> {
        self
    }

    fn approve(self: Box<Self>) -> Box<dyn State> {
        self
    }
}
```

`Draft::approve` 无效（返回自身）；`PendingReview::approve` 返回 `Box<Published>`；`Published` 的 `request_review` 和 `approve` 都返回自身。

**清单 18-17** `content` 委托给当前状态。

```rust
impl Post {
    // --snip--
    pub fn content(&self) -> &str {
        self.state.as_ref().unwrap().content(self)
    }
    // --snip--
}
```

`as_ref` 从 `Option` 借出引用（`Option<&Box<dyn State>>`），不能直接移出 `state`，因为 `self` 是借来的。`unwrap` 不会 panic：方法执行完毕后 `state` 一定是 `Some`（第 9 章「你比编译器知道更多」的场景）。

deref coercion 让 `&Box<dyn State>` 上的调用落到具体类型上。`content` 加入 `State` trait：

**清单 18-18** `State::content`。

```rust
trait State {
    // --snip--
    fn content<'a>(&self, post: &'a Post) -> &'a str {
        ""
    }
}

// --snip--
struct Published {}

impl State for Published {
    // --snip--
    fn content<'a>(&self, post: &'a Post) -> &'a str {
        &post.content
    }
}
```

默认返回空串，`Published` 覆盖它返回 `post.content`。该方法给 `State` 掺入了 `Post` 的职责，界限有点模糊。

方法需要生命周期标注（第 10 章）：返回的引用来自 `post` 参数。

**为什么不用枚举？** 枚举可行，但每个检查枚举值的地方都要写 `match`，比 trait 对象更啰嗦。

#### 评估状态模式

状态模式让 `Post` 的方法不关心具体行为；要了解已发布文章的行为只需看 `Published` 的实现。

不用状态模式的话，`match` 会散落在 `Post` 甚至 `main` 中，得去多处找逻辑。加新状态只需加一个结构体。

缺点：

- 状态之间耦合：在 `PendingReview` 和 `Published` 之间插入 `Scheduled` 要改 `PendingReview`。
- 逻辑重复：`request_review` / `approve` 在 `Post` 上的实现几乎相同。

由于 trait 对象不知道具体 `self` 类型，无法把 `request_review` / `approve` 的默认实现写成返回 `self`（dyn 兼容性限制）。

### 用类型编码状态与行为

换一个思路：把状态编码进类型，让非法状态转换变成编译错误。

**清单 18-19** `Post` 与 `DraftPost`。

```rust
fn main() {
    let mut post = Post::new();

    post.add_text("I ate a salad for lunch today");
    assert_eq!("", post.content());
}
```

```rust
pub struct Post {
    content: String,
}

pub struct DraftPost {
    content: String,
}

impl Post {
    pub fn new() -> DraftPost {
        DraftPost {
            content: String::new(),
        }
    }

    pub fn content(&self) -> &str {
        &self.content
    }
}

impl DraftPost {
    pub fn add_text(&mut self, text: &str) {
        self.content.push_str(text);
    }
}
```

`Post` 代表已发布（有 `content` 方法），`DraftPost` 没有 `content` 方法，所以草稿内容不可能被误显示。

**清单 18-20** `PendingReviewPost` 及转换方法。

```rust
impl DraftPost {
    // --snip--
    pub fn request_review(self) -> PendingReviewPost {
        PendingReviewPost {
            content: self.content,
        }
    }
}

pub struct PendingReviewPost {
    content: String,
}

impl PendingReviewPost {
    pub fn approve(self) -> Post {
        Post {
            content: self.content,
        }
    }
}
```

`request_review` 和 `approve` 都取得 `self` 所有权，消费旧值并返回新类型，旧实例不再存在。类型系统编码了「草稿 -> 待审 -> 已发布」的流程。

**清单 18-21** 相应地改 `main`。

```rust
use blog::Post;

fn main() {
    let mut post = Post::new();

    post.add_text("I ate a salad for lunch today");

    let post = post.request_review();

    let post = post.approve();

    assert_eq!("I ate a salad for lunch today", post.content());
}
```

因为转换返回新值，`main` 里要多次 `let post =` 遮蔽。少了运行时检查，多了编译期保证：不可能显示未发布文章的内容。

## 小结

用 trait 对象可以获得部分面向对象特性，动态分发用少量运行时性能换灵活性。

但 Rust 还有所有权等面向对象语言没有的能力，面向对象模式不一定是最优解。

下一章讲模式匹配。
