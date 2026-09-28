---
title: "oh-my-pi 交互式架构图"
description: "oh-my-pi 的 3 张可交互架构图：组件总览、主循环状态机、插话时序。点击节点可查看固定提交上的源码位置。"
publishedAt: 2026-09-28T03:20:00.000Z
reviewedAt: 2026-09-28
category: "Agent 架构调研"
tags: ["ai", "development"]
readingMinutes: 1
parent: "omp-architecture"
order: 2
---
这 3 张图是 [oh-my-pi 架构设计](/personal-blog/articles/omp-architecture/) 的配图，用 [archify](https://github.com/tt-a1i/archify) 从类型化的 JSON 描述编译成单文件 HTML，并通过了结构校验和浏览器检查。每张图都是独立页面，下面的链接直接打开原图。源码版本 [`df731d51`](https://github.com/can1357/oh-my-pi/tree/df731d516c0c722f658312187ae84c6d23e216fb)。

## 怎么看

- **点击节点**：查看对应的源码文件和行号。链接固定在具体提交上，不会随仓库更新而漂移。
- **点击连线**：高亮这条关系；右下角可以缩放、追踪路径。
- **阅读顺序**：按下面的顺序，先看组件总览建立整体印象，再看状态机理解循环何时继续、何时结束，最后看时序图里的边界细节。
- 图按桌面宽度设计，手机上需要横向拖动。

## 组件总览：会话层 → Agent → Agent Loop

**架构图** · [打开交互图 →](/personal-blog/diagrams/codex-omp/omp-components.html) · 对应 [oh-my-pi 架构设计](/personal-blog/articles/omp-architecture/) 中「3. 组件视图」一节

运行模式 → 会话工厂 → 会话层 → Agent → Agent Loop → Provider 层；工具、MCP、子 agent、原生加速层。

## 主循环状态机

**状态图** · [打开交互图 →](/personal-blog/diagrams/codex-omp/omp-loop-lifecycle.html) · 对应 [oh-my-pi 架构设计](/personal-blog/articles/omp-architecture/) 中「4. D1　Agent Loop：三层结构」一节

内层循环（准备一轮 → 采样 → 按停止原因分支 → 执行工具 → turn 结束）与外层循环（停止前排空）；“不执行工具”的四种情况。

## 插话：出队不等于送达

**时序图** · [打开交互图 →](/personal-blog/diagrams/codex-omp/omp-steering-sequence.html) · 对应 [oh-my-pi 架构设计](/personal-blog/articles/omp-architecture/) 中「5. Agent：状态与队列」一节

批执行中只看不取、两种中断信号、turn 边界出队、写入记录才算送达、run 结束时未送达的放回队首。
