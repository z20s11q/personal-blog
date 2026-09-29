---
title: "DeepSeek Harness 交互式架构图"
description: "DeepSeek Harness 的 5 张可交互架构图：组件总览、组合与装配、turn 状态机、一次 step 的时序、工具执行管线。点击节点可查看固定提交上的源码位置。"
publishedAt: 2026-09-29T03:50:00.000Z
reviewedAt: 2026-09-29
category: "Agent 架构调研"
tags: ["ai"]
readingMinutes: 3
parent: "dsh-architecture-analysis"
order: 2
---
这 5 张图是 [DeepSeek Harness 架构设计](/personal-blog/articles/dsh-architecture/) 的配图，用 [archify](https://github.com/tt-a1i/archify) 从类型化的 JSON 描述编译成单文件 HTML，并通过了结构校验和浏览器检查。每张图都是独立页面，下面的链接直接打开原图。源码版本 [`4878cdab`](https://github.com/deepseek-ai/deepseek-harness/tree/4878cdabd87d4041bdaff61d04c966883b9fd07a)（tag `dsh-v0.2.0-rc.1`）。

## 怎么看

- **点击节点**：查看对应的源码文件和行号。链接固定在具体提交上，不会随仓库更新而漂移。
- **点击连线**：高亮这条关系；右下角可以缩放、追踪路径。
- **阅读顺序**：先看组件总览和组合装配建立整体印象，再看状态机理解 turn 何时继续、何时结束，然后看时序图里一次 step 的先后顺序，最后看工具管线里审批与沙箱的位置。
- 图按桌面宽度设计，手机上需要横向拖动。

## 组件总览：入口 → 注册表 → AgentLoop → 驱动器

**架构图** · [打开交互图 →](/personal-blog/diagrams/dsh/dsh-components.html) · 对应 [DeepSeek Harness 架构设计](/personal-blog/articles/dsh-architecture/) 中「3. 组件视图」一节

所有接入面都经 agent 注册表创建或恢复 agent；驱动器围绕会话日志运转，通过四个扩展点挂接重试、压缩、检查点等插件；工具注册表在流结束后调度，沙箱与审批在工具体内部。

## 组合与装配：五层补丁 → 行表 → Loader → 服务与预设

**数据流图** · [打开交互图 →](/personal-blog/diagrams/dsh/dsh-composition.html) · 对应 [DeepSeek Harness 架构设计](/personal-blog/articles/dsh-architecture/) 中「4.2 Profile → Bundle → Patch」一节

bundle、profile、用户、启动参数、遥测关闭五层补丁按序叠加成行表；Loader 逐行挂载插件；HMR 只在 Web / 桌面做行级更新；预设按会话挂载并按代次引用计数。

## turn / step 状态机

**状态图** · [打开交互图 →](/personal-blog/diagrams/dsh/dsh-turn-lifecycle.html) · 对应 [DeepSeek Harness 架构设计](/personal-blog/articles/dsh-architecture/) 中「5.4 Turn 与 Step 状态机」一节

step 准入 → 请求准备 → 采样 → 执行工具 → 关 step 判定；请求出错扩展点决定重试；turn 即将结束扩展点可追加消息续跑；四种结束方式。

## 一次 step：先落日志再推导请求，流结束后才调度工具

**时序图** · [打开交互图 →](/personal-blog/diagrams/dsh/dsh-step-sequence.html) · 对应 [DeepSeek Harness 架构设计](/personal-blog/articles/dsh-architecture/) 中「5.4 Turn 与 Step 状态机」一节

收件箱认领、step 前扩展点、从日志推导并冻结请求、采样只记账、独占屏障与滚动池、按模型顺序提交工具结果。

## 工具执行管线：审批只管提权，沙箱在工具体内部

**流程图** · [打开交互图 →](/personal-blog/diagrams/dsh/dsh-tool-pipeline.html) · 对应 [DeepSeek Harness 架构设计](/personal-blog/articles/dsh-architecture/) 中「6.1 统一管线」一节

登记 → 执行前钩子 → 单调守卫 → 执行包装层 → 工具体 → 执行后与提交；询问转审批服务，模型带 sandbox_permissions 时才申请提权，沙箱后端不可用时绝不静默放行。
