---
title: "DeepSeek Harness（dsh）架构解析：从插件组合到 Agent 执行循环"
description: "基于 v0.1.7-rc.1 源码解析 dsh 的 Cordis 插件架构、Profile 组合、AgentLoop、Session 持久化、应用入口和扩展机制。"
publishedAt: 2026-09-25
reviewedAt: 2026-09-25
category: "架构解析"
tags: ["development", "ai"]
readingMinutes: 12
---

> 本文以 DeepSeek Harness 官方仓库的 `dsh-v0.1.7-rc.1` 为源码基准。dsh 是一套 Agent Harness：负责组合模型、工具、会话、执行环境和应用入口，不是单一的聊天模型封装。

## 一、项目定位

dsh 提供可组装的 Agent 运行环境。它接收用户或程序输入，维护会话状态，构造模型请求，执行模型选择的工具，再把执行结果交还模型，直到本轮结束或触发停止策略。

理解 dsh，先抓住三个概念：

- **Cordis 插件树**：插件通过服务和事件协作，运行时由配置决定实际挂载的插件。
- **Profile 与 Bundle**：把插件组织成不同产品组合，并允许逐层 patch。
- **Session 日志驱动 AgentLoop**：会话事件既保存交互事实，也构成模型历史的权威来源。

官方的[架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/docs/architecture.zh.md)和[模块依赖图](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/docs/module-graph.zh.md)是更详细的参考；本文从源码阅读角度串起它们之间的关系。

## 二、整体结构

从启动入口到一次模型调用，可以把主要组件连成下面这条路径：

```text
用户 / SDK / 自动化调用方
          │
          ▼
      dsh CLI
          │ 选择 profile，叠加 bundle 与 patch
          ▼
   Cordis 插件上下文
          │
          ├── Agent / AgentLoop / Session / Prompt / Tools
          ├── LLM 服务与 Provider Adapter
          ├── Shell、FS、Web、Browser、Subagent 等能力插件
          └── 持久层：Session JSONL、Storage、附件
          ▲
          │ RPC、事件流或直接调用
   Web / Desktop / Headless / SDK / ACP
```

这不是一条固定的类继承链。组件通过 Cordis 服务依赖、类型化事件和可撤销注册协作；某个运行实例有哪些功能，由其 profile 的配置树决定。

### 1. Cordis 插件化

Cordis 提供共享上下文 `ctx`。插件可以提供服务，例如 `ctx.agents`、`ctx.llm`、`ctx.tools`、`ctx.sessions`，也可以监听类型化事件。插件用 `inject` 表达服务依赖，由 Loader 在依赖可用时挂载。

工具、提示词片段、Provider 和事件监听都属于插件副作用。dsh 使用 `ctx.effect()` 与 `ctx.on()` 管理这些注册，并在插件卸载时释放。因此配置重载可以撤销旧插件贡献，再加载新配置。

AgentLoop 是默认 Agent 驱动器，但模型适配器、工具实现、持久化后端和应用表层都是可替换或可组合的插件。新增能力通常挂在服务或事件扩展点上，而不是把所有功能塞进一个“大核心”。

### 2. Profile、Bundle 与 Patch

- **Profile** 是某种运行方式的命名组合，例如 `web`、`headless`、`sdk`、`sdk-minimal` 和 `acp`。
- **Bundle** 是可分发的一层 Cordis 配置条目及其挂载代码。
- **Patch** 按配置行 `id` 替换完整配置或插入条目，用来叠加产品默认值和用户定制。

常见 profile 先复用 `dsh-base`，再叠加应用 bundle；`sdk-minimal` 则是独立的显式组合。代码包提供能力，bundle 选择产品默认启用的能力，profile 和用户 patch 决定最终配置。

源码入口：[dsh-base 配置](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/packages/bundle/base/cordis.patch.yml)、[Web bundle 配置](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/packages/bundle/web-app/cordis.patch.yml)。

## 三、主要模块

仓库采用 pnpm workspace 单仓库：核心插件位于 `packages/`，应用入口位于 `apps/`，Python SDK 位于 `python/`，Vendored Cordis 位于 `vendor/`。

| 模块 | 职责 |
|---|---|
| `core/agent` | Agent API、注册表和运行事件 |
| `core/agent-loop` | Agent 创建与恢复、输入队列、轮次和步骤推进 |
| `core/session` | 追加式 Session 事件日志与模型消息投影 |
| `core/system-prompt` | 提示词片段与工具 schema 组装 |
| `core/tools` | 工具注册、schema、作用域和受控执行流水线 |
| `llm/llm` | LLM 消息与流协议、Provider 注册和请求分发 |
| `session/*` | 持久化、查询、投影、标题等会话扩展 |
| `shell/`、`fs/`、`web/` 等 | 具体执行与信息访问能力 |
| `bundle/` | 可叠加的产品配置层 |
| `apps/` 与 `packages/sdk` | CLI、Web、Desktop 与 SDK 载体 |

能力通常拆成三种角色：Service Definition 定义调用约定，Provider 提供实现，Consumer 使用服务，常见 Consumer 是面向模型的工具。消费者依赖抽象服务后，就不必绑定本地、远程或沙箱实现。更多内容见[能力关系图](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/docs/capability-seams.zh.md)。

## 四、Agent 一轮如何运行

在 dsh 中，一个 **turn**（轮次）可以包含零个或多个 **step**（步骤）；一个步骤包含一次模型请求，以及该请求引起的工具执行。主要实现位于 [`ReactLoopAgent`](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/packages/core/agent-loop/src/agent.ts) 与 [工具调用处理](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/packages/core/agent-loop/src/tool-calls.ts)。

```text
接收输入并唤醒 Agent
  → 打开 turn，领取输入
  → 组装提示词和可用工具 schema
  → agent/pre-step 接纳、改写或拒绝步骤
  → agent/request 确定 Provider、模型和请求参数
  → LLM 流式返回助手内容及工具调用
  → 记录 assistant message 或失败 attempt
  → tool/call → pre-execute → execute → post-execute
  → 记录 tool/result
  → 有待处理工具结果时继续下一个 step
  → 关闭 turn，发布状态变化
```

运行过程可拆为几个关键阶段：

1. 输入进入 Agent inbox。`followup` 通常安排在下一轮，`steer` 可以在当前轮后续步骤接入，`inject` 注入内容但不单独唤醒驱动器。
2. AgentLoop 打开轮次，领取输入，组装提示词和工具 schema，并触发 `agent/pre-step`。策略插件可以接受、改写或拒绝这次步骤。
3. `agent/request` waterfall 解析或改写 Provider、模型和参数；LLM 服务准备绑定到该路由的调用，再开始流式请求。
4. 流式内容可实时显示给 UI；请求 settle 后，成功消息或失败 attempt 写入 Session。模型历史从已记录的 Session 消息派生。
5. 工具调用先记录 `tool/call`，再通过 `tools/pre-execute`、执行器、`tools/post-execute`，最后记录 `tool/result`。有工具结果需要模型处理时，AgentLoop 继续下一个步骤。
6. 达到完成条件、取消或策略停止后，AgentLoop 结束轮次并发布状态。

Session 日志保存需要恢复或用于构造模型历史的事实；普通 Agent 事件用于观察或干预正在执行的工作。一个关键不变量是：**进入模型请求的内容必须能从 Session 日志重建。**

## 五、工具与能力接入

工具不是简单的函数表。`core/tools` 管理工具定义、模型可见 schema、作用域与受控执行：AgentLoop 将可用 schema 提供给模型；模型返回调用后，运行时校验参数和可见性，分派到注册实现，并通过前置、后置事件提供策略扩展位置。结果再作为 `tool/result` 写入 Session。

Shell、文件系统、Web、终端、浏览器、计算机操作、技能、MCP、子 Agent 和工作流由不同包提供。具体 profile 是否启用某项能力，应检查实际配置树，而不能只看仓库里是否存在该包。

由于文件系统和进程执行使用抽象 Provider，同一类工具可以切换到受限执行或 SSH 远端环境。执行策略需要在服务调用和进程启动处落实，不是只在提示词里提醒模型。

## 六、Session 与持久化

`Session` 是有序、追加式事件日志。AgentLoop 将轮次、步骤、用户消息、助手结果和工具调用/结果写入日志；`deriveMessages()` 等投影据此生成模型历史。实时流可以支持界面增量展示，但 settle 后的事件才是可以持久恢复的事实。

持久化通过独立的 `SessionPersistence` 服务实现，默认组合使用 JSONL 后端。图片等二进制附件存放在独立附件存储中，消息保留引用。Session 格式升级使用相邻版本迁移，并保留已发布的旧 generation。细节见 [Session 子系统](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/docs/subsystems/session.zh.md)和[持久化子系统](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/docs/subsystems/persistence.zh.md)。

AgentLoop 消费抽象 Session API；持久化 Provider 负责物理存储、压缩、迁移和发布。替换存储实现不应改变 Agent 生成模型历史的方式。

## 七、应用载体与 SDK

支持的 Node 应用通过 `dsh` CLI 选择 profile 启动。CLI 解析参数、定位 Harness home、解析 profile 与 patch，再加载对应的 Cordis 配置树。不同载体主要通过叠加的 bundle 和传输方式区分：

| Profile / 载体 | 用途 |
|---|---|
| `web` | 浏览器 GUI，通过 Host 提供 RPC 与事件流 |
| `headless` | 无 Web 服务的一次性命令行任务 |
| `sdk` | 启动 stdio JSON-RPC 服务，供外部进程调用 |
| `sdk-minimal` | 独立的精简 SDK 运行组合 |
| `acp` | 面向自动化的 Agent Client Protocol 服务 |
| Desktop | Electron Host 与 Web Client 组成的桌面应用 |

TypeScript 与 Python SDK 是进程外客户端：它们启动同版本 `dsh --profile sdk`，通过 stdio 上的按行 JSON-RPC 发送请求、接收事件，而不是在各自语言中重复实现 AgentLoop。Python runtime wheel 会打包 dsh 执行时。

## 八、v0.1.7-rc.1 的运行机制与功能

### Profile 启动前的插件版本准入

`app-boot` 在 profile 配置交给 Loader 前，读取插件 manifest 并检查 `@deepseek-ai/dsh` 相关 peer dependency 是否兼容当前运行时。不兼容插件会在挂载前被禁用并报告结构化诊断；无法验证 peer 元数据时也不会静默放行。

Profile 可记录精确到插件名、插件版本和 DSH 运行时版本的风险豁免。CLI 与 Web 插件管理器可以查询、授予或撤销豁免。插件管理流程还会在安装阶段检查版本兼容性。该机制把兼容性判断前移到安装和组合阶段；它不会自动升级插件，版本豁免也不等于授权执行依赖构建脚本。

源码：[兼容性预检](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/packages/boot/app-boot/src/compatibility-preflight.ts)、[版本检查](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/packages/boot/app-boot/src/plugin-compatibility.ts)、[插件管理器](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/packages/boot/plugin-manager/src/index.ts)。

### Web 工具实时状态与 Team 投影

模型仍在生成工具参数时，Web 可以显示 `preparing` 阶段；收到正式 `tool/call` 后转为 `start`，结果落定后进入 `result`。准备态只使用实时流里的调用 ID 和工具名，不会把不完整参数当成可执行调用，也不会增加持久 Session 事件。这是客户端对话投影的扩展，没有改变工具派发时机或 Session 格式。

Agent Teams 将 roster 与任务板接入共享 Session Projection，Web 面板订阅该投影，而不再为团队面板单独维护状态读取路径。Lead Session 中的团队事件仍是持久真源，成员运行状态从 Session 活动派生。

源码：[工具准备行](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/packages/client/ui-tool/src/client/tool/components/PreparingToolRow.tsx)、[工具会话节点](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/packages/client/ui-chat/src/client/conversation-nodes/tool.ts)、[Agent Team 投影](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/packages/experimental/agent-team/src/projection.ts)。

### 远程流和插件管理的可靠性机制

API Gateway 将流取消等待改为绑定到单次进行中的读取；流结束时唤醒待处理读取，避免复用已经完成的取消状态。这改善异步流的停止和清理，不改变公开 Remote 方法或 Agent 请求协议。

插件管理器增加有界 GitHub 连通性检查、镜像恢复、兼容性拒绝和更完整的失败诊断。这些变更加强插件安装与 profile 维护，不改变插件向 Cordis 提供服务的方式。

RC 发布页还列出终端侧栏、会话归档、MCP 资源、Headless JSON 事件流、Office 文件能力和浏览器/计算机操作等功能。它们分布在应用层、工具包和 profile 组合中，是否启用仍应以所选 profile 配置为准。完整列表见[官方 v0.1.7-rc.1 发布说明](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.7-rc.1)。

## 九、源码阅读顺序

1. 阅读[架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/docs/architecture.zh.md)，建立 profile、事件和轮次的全局概念。
2. 阅读 [`apps/cli/src/bin.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/apps/cli/src/bin.ts) 与 `profile-boot.ts`，跟启动入口如何选择 profile。
3. 查看 `dsh-base` 与 Web bundle 的 patch，理解产品配置如何组合。
4. 沿 [`agent-loop/src/agent.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/packages/core/agent-loop/src/agent.ts) 的 `turn()`、`step()` 和 `prepareRequest()` 跟一次模型调用。
5. 阅读 [`agent-loop/src/tool-calls.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/packages/core/agent-loop/src/tool-calls.ts) 与 [`core/tools/src/index.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/packages/core/tools/src/index.ts)，看工具调用与执行分派。
6. 阅读 [`core/session/src/index.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.7-rc.1/packages/core/session/src/index.ts) 与 JSONL persistence 包，理解日志、投影和落盘。
7. 最后挑一个 Provider 或工具包，追踪 Service Definition、Provider 和 Consumer 的依赖。
