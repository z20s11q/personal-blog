---
title: "Codex 交互式架构图"
description: "Codex 的 4 张可交互架构图：组件总览、Turn 循环状态机、一次采样的时序、工具编排流程。点击节点可查看固定提交上的源码位置。"
publishedAt: 2026-09-28T03:35:00.000Z
reviewedAt: 2026-09-28
category: "Agent 架构调研"
tags: ["ai"]
readingMinutes: 2
parent: "codex-architecture"
order: 2
---
这 4 张图是 [Codex 架构设计](/personal-blog/articles/codex-architecture/) 的配图，用 [archify](https://github.com/tt-a1i/archify) 从类型化的 JSON 描述编译成单文件 HTML，并通过了结构校验和浏览器检查。每张图都是独立页面，下面的链接直接打开原图。源码版本 [`44fe510c`](https://github.com/openai/codex/tree/44fe510ce3ee61c8ef623adcbf89b901c73ddd61)。

## 怎么看

- **点击节点**：查看对应的源码文件和行号。链接固定在具体提交上，不会随仓库更新而漂移。
- **点击连线**：高亮这条关系；右下角可以缩放、追踪路径。
- **阅读顺序**：按下面的顺序，先看组件总览建立整体印象，再看状态机理解循环何时继续、何时结束，最后看时序图里的边界细节。
- 图按桌面宽度设计，手机上需要横向拖动。

## 组件总览：从客户端到执行环境

**架构图** · [打开交互图 →](/personal-blog/diagrams/codex-omp/codex-components.html) · 对应 [Codex 架构设计](/personal-blog/articles/codex-architecture/) 中「3. 组件视图」一节

客户端 → 会话协议服务 → Op 分发器 → 任务管理 → Turn 循环 → 采样器；工具运行时 → 编排器 → Guardian / 隔离执行 → 执行环境。

## Turn 循环状态机

**状态图** · [打开交互图 →](/personal-blog/diagrams/codex-omp/codex-turn-lifecycle.html) · 对应 [Codex 架构设计](/personal-blog/articles/codex-architecture/) 中「4. D1　Agent Loop：四层循环」一节

并入输入 → 冻结步上下文 → 采样 → 判定继续；turn 中途压缩的两个入口、Stop hook 的三种结果、四种结束方式。

## 一次采样：边流边派发，按派发顺序收割

**时序图** · [打开交互图 →](/personal-blog/diagrams/codex-omp/codex-sampling-sequence.html) · 对应 [Codex 架构设计](/personal-blog/articles/codex-architecture/) 中「流事件处理」一节

调用先写历史再派发；并行门的读写锁；插话与邮箱抢占；流结束后按序收割并发出进度事件。

## 工具编排：审批 → 沙箱 → 执行 → 被拒后升级

**流程图** · [打开交互图 →](/personal-blog/diagrams/codex-omp/codex-tool-orchestrator.html) · 对应 [Codex 架构设计](/personal-blog/articles/codex-architecture/) 中「6. D5　安全与权限」一节

审批要求的三种结果、审批来源顺序、首次沙箱选择、五种不升级的情况、升级前免审条件。
