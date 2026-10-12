---
title: "DeepSeek Harness 交互式架构图"
description: "DeepSeek Harness 的 5 张可交互架构图：组件总览、组合与装配、turn 状态机、一次 step 的时序、工具执行管线。点击节点可查看固定提交上的源码位置。"
publishedAt: 2026-09-29T03:50:00.000Z
reviewedAt: 2026-09-29
category: "Agent 架构调研"
tags: ["ai"]
readingMinutes: 5
parent: "dsh-architecture-analysis"
order: 2
---
这 5 张图是 [DeepSeek Harness 架构设计](/personal-blog/articles/dsh-architecture/) 的配图，用 [archify](https://github.com/tt-a1i/archify) 从类型化的 JSON 描述编译成单文件 HTML，并通过了结构校验和浏览器检查。本页按阅读顺序内嵌全部 5 张图，可以直接在页内操作。源码版本 [`4878cdab`](https://github.com/deepseek-ai/deepseek-harness/tree/4878cdabd87d4041bdaff61d04c966883b9fd07a)（tag `dsh-v0.2.0-rc.1`）。

## 怎么看

- **点击节点**：弹出来源面板，列出对应的源码文件和行号。链接固定在具体提交上，不会随仓库更新而漂移。
- **点击连线**：高亮这条关系；图下方的工具栏可以缩放、追踪路径。
- **阅读顺序**：先看组件总览和组合装配建立整体印象，再看状态机理解 turn 何时继续、何时结束，然后看时序图里一次 step 的先后顺序，最后看工具管线里审批与沙箱的位置。
- 图按桌面宽度设计。页内显示偏窄时，点图右上角的全屏按钮，或用标题下的「新窗口打开」单独查看。

## 组件总览：入口 → 注册表 → AgentLoop → 驱动器

**架构图** · 对应 [DeepSeek Harness 架构设计](/personal-blog/articles/dsh-architecture/) 中「3. 组件视图」一节 · [新窗口打开 ↗](/personal-blog/diagrams/dsh/dsh-components.html)

所有接入面都经 agent 注册表创建或恢复 agent；驱动器围绕会话日志运转，通过四个扩展点挂接重试、压缩、检查点等插件；工具注册表在流结束后调度，沙箱与审批在工具体内部。

<div class="archify-embed" id="dsh-components" data-src="/personal-blog/diagrams/dsh/dsh-components.html" data-title="组件总览：入口 → 注册表 → AgentLoop → 驱动器"><a href="/personal-blog/diagrams/dsh/dsh-components.html">打开交互图 →</a></div>

## 组合与装配：五层补丁 → 行表 → Loader → 服务与预设

**数据流图** · 对应 [DeepSeek Harness 架构设计](/personal-blog/articles/dsh-architecture/) 中「4.2 Profile → Bundle → Patch」一节 · [新窗口打开 ↗](/personal-blog/diagrams/dsh/dsh-composition.html)

bundle、profile、用户、启动参数、遥测关闭五层补丁按序叠加成行表；Loader 逐行挂载插件；HMR 只在 Web / 桌面做行级更新；预设按会话挂载并按代次引用计数。

<div class="archify-embed" id="dsh-composition" data-src="/personal-blog/diagrams/dsh/dsh-composition.html" data-title="组合与装配：五层补丁 → 行表 → Loader → 服务与预设"><a href="/personal-blog/diagrams/dsh/dsh-composition.html">打开交互图 →</a></div>

## turn / step 状态机

**状态图** · 对应 [DeepSeek Harness 架构设计](/personal-blog/articles/dsh-architecture/) 中「5.4 Turn 与 Step 状态机」一节 · [新窗口打开 ↗](/personal-blog/diagrams/dsh/dsh-turn-lifecycle.html)

step 准入 → 请求准备 → 采样 → 执行工具 → 关 step 判定；请求出错扩展点决定重试；turn 即将结束扩展点可追加消息续跑；四种结束方式。

<div class="archify-embed" id="dsh-turn-lifecycle" data-src="/personal-blog/diagrams/dsh/dsh-turn-lifecycle.html" data-title="turn / step 状态机"><a href="/personal-blog/diagrams/dsh/dsh-turn-lifecycle.html">打开交互图 →</a></div>

## 一次 step：先落日志再推导请求，流结束后才调度工具

**时序图** · 对应 [DeepSeek Harness 架构设计](/personal-blog/articles/dsh-architecture/) 中「5.4 Turn 与 Step 状态机」一节 · [新窗口打开 ↗](/personal-blog/diagrams/dsh/dsh-step-sequence.html)

收件箱认领、step 前扩展点、从日志推导并冻结请求、采样只记账、独占屏障与滚动池、按模型顺序提交工具结果。

<div class="archify-embed" id="dsh-step-sequence" data-src="/personal-blog/diagrams/dsh/dsh-step-sequence.html" data-title="一次 step：先落日志再推导请求，流结束后才调度工具"><a href="/personal-blog/diagrams/dsh/dsh-step-sequence.html">打开交互图 →</a></div>

## 工具执行管线：审批只管提权，沙箱在工具体内部

**流程图** · 对应 [DeepSeek Harness 架构设计](/personal-blog/articles/dsh-architecture/) 中「6.1 统一管线」一节 · [新窗口打开 ↗](/personal-blog/diagrams/dsh/dsh-tool-pipeline.html)

登记 → 执行前钩子 → 单调守卫 → 执行包装层 → 工具体 → 执行后与提交；询问转审批服务，模型带 sandbox_permissions 时才申请提权，沙箱后端不可用时绝不静默放行。

<div class="archify-embed" id="dsh-tool-pipeline" data-src="/personal-blog/diagrams/dsh/dsh-tool-pipeline.html" data-title="工具执行管线：审批只管提权，沙箱在工具体内部"><a href="/personal-blog/diagrams/dsh/dsh-tool-pipeline.html">打开交互图 →</a></div>
