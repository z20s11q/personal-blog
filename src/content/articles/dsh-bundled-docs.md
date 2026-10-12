---
title: "DeepSeek Harness 自带文档总结"
description: "把 DeepSeek Harness 仓库自带的官方文档按主题合并成一张地图，并列出文档与源码不一致之处。"
publishedAt: 2026-09-29T03:45:00.000Z
reviewedAt: 2026-10-12
category: "Agent 架构调研"
tags: ["ai"]
readingMinutes: 63
parent: "dsh-architecture-analysis"
order: 3
---
> 源码快照：deepseek-ai/deepseek-harness，tag `dsh-v0.2.1-alpha.2`，commit `d7432673`（2026-10-09）。文档行号以该快照为准，`文件:行号` 中的行号是物理行号（仓库规定"一段一物理行"，所以一行常是一整段）。
> 范围：根目录 `README / SAFETY / AGENTS / CONTRIBUTING`、`docs/` 顶层 20 余篇、`docs/subsystems/` 67 篇、`docs/cordis-*` 教程与 API、`docs/cookbook/`、`docs/user/`、`docs/postmortem/`、`docs/persistence-changes/`、`docs/upgrade-guide/`，以及 `packages/README`、`packages/AGENTS.md`、`packages/experimental/README`。本文按主题而不是按文件组织，并用源码抽查了文档中的关键说法。

## 0. 结论先行

- **dsh 的文档是三个样本里最全的。** `docs/` 下约 692 个文件，中英双语同权配对，有总架构、子系统逐页说明、生成的事件 / 配置 / 工具 / 持久化 / CLI 帮助目录、Cordis 教程、扩展 cookbook、事故复盘、持久化格式演进记录和逐版本的升级指南。Codex 没有全局架构文档，oh-my-pi 只有专题文档，dsh 两者都有。仓库没有 CHANGELOG，对外可感知的破坏性变更都写进 `docs/upgrade-guide/`（第 1 节）。
- **文档是"地图"，不是"实现说明"。** 仓库的文档标准要求"一事一处"、只写当前状态、不写实现进度（`docs/AGENTS.md:15-47,66`），`architecture.md` 限制在 2400 词以内（`docs/AGENTS.md:58`）。所以 agent loop 的内部控制流、压缩算法、沙箱后端、hooks 桥接都只给出契约，细节要读源码，见 [DeepSeek Harness 架构设计](/personal-blog/articles/dsh-architecture/)。
- **类型块与源码机械等价，语义说明会漂移。** 子系统页的类型块由 `verify-type-equiv` 校验与源码字面一致（`docs/subsystems/README.zh.md:76`），但源码注释本身写错时文档会一起带偏；本次抽查发现的不一致集中在计数、默认值和事件列表上，汇总在第 12 节。
- **有两处默认行为文档写了，但位置分散，容易漏看**：默认组合的实际权限是 `workspace-write + ask`（不是插件 schema 的 `read-only`）；默认会把会话日志连续后缀随请求上传到 DeepSeek 端点（第 9 节）。

## 1. 文档构成与推荐阅读顺序

| 类别 | 位置 | 性质 |
|---|---|---|
| 仓库规则 | 根 `AGENTS.md`（181 行）、`packages/AGENTS.md`、`packages/experimental/AGENTS.md`、`docs/AGENTS.md` | 事实上的"宪法"：布局、编码与架构约定、包规则、实验包隔离、文档标准 |
| 总架构 | `docs/architecture.zh.md`、`agent-lifecycle.zh.md`、`tool-execution-pipeline.zh.md`、`cordis-primer.zh.md`、`glossary.zh.md` | 系统怎么拼起来、一次 turn 怎么走、工具管线顺序、术语 |
| 能力清单 | `docs/capability-seams.zh.md`（694 行）、`event-producer-consumer.zh.md` | 每个 `ctx.*` 服务的定义 / 提供 / 消费方；每个事件的分发模式与监听方 |
| 生成目录 | `persistence-catalog`（8883 行）、`experimental-persistence-catalog`、`config-catalog`（4702 行）、`tool-catalog`、`module-graph`、`cli-help` | 查表用：持久事件与类型指纹、实验包的 `plugin:*` 记录、插件 `Config` 默认值、工具 schema、包依赖图、`dsh --help` 输出 |
| 子系统页 | `docs/subsystems/*.zh.md`（67 篇） | 每个子系统的类型、服务方法、事件，末尾是生成的 Cordis API 小节 |
| 框架 | `docs/cordis-tutorial/`、`docs/cordis-api/` | Cordis 心智模型与 API |
| 扩展手册 | `docs/cookbook/` | 加工具、LLM 适配器、包、Remote API、设置卡片、会话格式版本 |
| 用户文档 | `docs/user/`（19 篇） | 8 篇 Web UI 指南（含公网部署）+ 10 篇插件开发；CLI 细节在 `apps/cli/README*` |
| 事故复盘 | `docs/postmortem/`（4 篇） | 每篇对应一条现行约束 |
| 持久化演进 | `docs/persistence-changes/`、`session-format-status.zh.md` | 格式版本 V0–V4、兼容规则、逐根 digest 确认链、定稿检查点 |
| 升级指南 | `docs/upgrade-guide/`（26 篇） | 代替 release notes，见下文 |
| 实验包 | `packages/experimental/README.zh.md` | 实验 / 可选 / 官方三种状态的定义，以及实验包清单（hooks、webhook、session inspector、worktree 等） |
| 其他 | `api-gateway`、`deepseek-llm-api-wire-extensions`、`defensive-patterns`、`testing`、`development`、`rescope` | 网关、DeepSeek 专有请求字段、防御规则、测试分层、构建 |

**升级指南的组织方式**（`.agents/skills/dsh-create-upgrade-guide/SKILL.md`）：路径是 `docs/upgrade-guide/v<版本>/<条目>/guide.md`，`<版本>` 取编写时根 `package.json` 的版本，也就是升级的起点版本，指南说明从这个版本升到下一个发布要做什么。每个条目目录只有 `guide.md`、`guide.zh.md`、`guide.i18n.yaml` 三个文件，没有总索引；正文只有"变更"和"迁移"两节，不超过 500 词。当前版本的目录一直维护到版本号提升，之后冻结；破坏性变更被回滚时删除对应指南。根 `AGENTS.md:11` 要求每个对外可感知的破坏性变更立即写一篇。现有三个版本的目录：`v0.1.7-rc.2/`（2 篇，事后补写）、`v0.2.0-rc.2/`（5 篇）、`v0.2.1-alpha.1/`（19 篇）。

### 推荐阅读顺序（以理解 agent loop 为目标）

1. `docs/architecture.zh.md`：一页纸讲清插件树、组合层、核心包、三个事件域和一次 turn 的十个步骤。
2. `docs/cordis-primer.zh.md` + `docs/glossary.zh.md`：五个 Cordis 概念、分发模式、作用域与 turn / step / Round 的定义。
3. `docs/agent-lifecycle.zh.md` + `docs/tool-execution-pipeline.zh.md`：两张时序 / 流程图，loop 的外部契约基本都在这里。
4. `docs/subsystems/core.zh.md`、`session.zh.md`、`tools.zh.md`、`approval.zh.md`、`sandbox.zh.md`：Agent 句柄、收件箱、日志与 surface、工具注册表、审批与沙箱的精确契约。
5. `docs/deepseek-llm-api-wire-extensions.zh.md` + `SAFETY.zh.md`：数据外发与安全边界。
6. `docs/capability-seams.zh.md` 末尾的服务表（595–692 行）和 `event-producer-consumer.zh.md`：需要查"谁提供、谁监听"时用。
7. `docs/cookbook/extension-cookbook.zh.md`：把"想扩展什么"映射到服务与事件。

**注意**：`capability-seams`、`event-producer-consumer` 的生成区和个别行在中文版里仍是英文；`module-graph` 是 1770 行的纯 Mermaid，只适合用工具解析。

---

## 2. 核心心智模型：一切皆插件

### 2.1 无特权内核

- 模型适配器、工具注册表、会话日志、agent loop 本身都是插件，都能从配置替换；扩展方式是"把插件挂到其他插件旁边"，注册都是副作用，插件卸载即撤销（`docs/architecture.zh.md:9-11`）。
- 核心包与服务键（`docs/architecture.zh.md:57-65`）：`core/session` → `ctx.sessions`（只追加日志）、`core/system-prompt` → `ctx.systemPrompt`、`core/tools` → `ctx.tools`、`core/agent` → `ctx.agents`（Agent 接口、注册表、`agent/*` 事件）、`core/agent-loop` → `ctx.agentLoop`（默认驱动器）、`core/scope`（作用域原语，库而非服务）、`llm/llm` → `ctx.llm`。
- **接口与驱动分离**：`agent-loop` 是公开 `Agent` 契约的唯一具体实现，扩展插件只依赖 `agent` 包的事件和服务，从不直接依赖 `agent-loop`，所以循环本身可以被换掉（`docs/subsystems/core.zh.md:20`；`docs/capability-seams.zh.md:662`）。
- **capability seam** = 服务定义 / 服务提供 / 消费三种角色；只有一个角色不算 seam，只在角色需要独立演进时才拆包（`AGENTS.md:136`；`docs/glossary.zh.md:9`）。服务定义是 Cordis `Service`，"绝不是 TypeScript `interface`"。

### 2.2 Cordis 的五个概念

`docs/cordis-primer.zh.md:9-13` 给出的五点，是读懂 dsh 其余文档的前提：

1. 插件是函数（可带 `inject` 与 `apply(ctx)`）或 `Service` 子类；
2. 上下文是服务容器，服务占据稳定的 `ctx.<key>`，按 key 查找而不是 import 实现；
3. `inject` 声明依赖，依赖就绪才启动，加载顺序由依赖表达；
4. 类型化事件通过声明合并注册，按 `emit / waterfall / parallel / serial / bail` 分发；
5. 注册是可逆副作用，经 `ctx.effect()` / `ctx.on()` 安装，重载与拆除时撤销。

分发模式是事件公开契约的一部分：只有 `parallel`、`serial` 会 await，`waterfall`、`serial`、`bail` 有返回值（`docs/cordis-primer.zh.md:21-27`）。**waterfall 就是环绕中间件**：监听器收到 `(...args, next)`，不调 `next()` 即短路；仓库规则要求非决策性监听器必须调 `next()`（`docs/cordis-primer.zh.md:35,39`；`AGENTS.md:133`）。每个事件用 `@mode` JSDoc 标注，生成目录与派发点交叉校验。

### 2.3 三个事件域

选事件域是"大多数改动的第一个决定"（`docs/architecture.zh.md:71-75`）：

| 域 | 例子 | 用途 |
|---|---|---|
| 会话事件 | `turn/*`、`step/*`、`user/message`、`assistant/message`、`tool/*` | 持久事实，写进日志 |
| Agent 事件 | `agent/pre-step`、`agent/request`、`agent/request-error`、`agent/turn-stopping`、`agent/assistant-stream` | 观察或拦截进行中的工作，不持久 |
| 能力事件 | `tools/*`、`fs/*`、`llm/stream`、`telemetry/*` | 给 seam 挂策略和适配器 |

SDK 用户要可回放的 transcript 应消费 `session/event`；`agent/*` 只是实时协调接口（`docs/agent-lifecycle.zh.md:91`）。

### 2.4 作用域

贡献要么是全局的，要么属于恰好一个作用域（`docs/glossary.zh.md:13-21`）。只有两层、扁平结构；**作用域注册不向下继承给子 agent**；`agent.ctx` 上的注册同时决定可见性和生命周期；同名作用域贡献遮蔽全局贡献；`tools.restrict` 过滤掉的工具"与不存在的工具无法区分"——不出现在提示词里，执行时也返回未知工具。

---

## 3. 组合：Profile → Bundle → Patch

- 运行中的 `dsh` 是一棵插件树，由启动时按序叠加的层组成（`docs/architecture.zh.md:15`）。
- **profile**：Harness home（默认 `~/.dsh`）中的具名组装，列出叠放的组合包，存放树外插件，保存用户层 `cordis.patch.yml`。随发行版交付 `web`、`headless`、`sdk`、`sdk-minimal`、`acp` 五个模板（`docs/architecture.zh.md:17`）。
- **bundle（组合包）**：带 `dsh.bundle.patch` 的 npm 包，插入的内容始终可被上层 patch（`docs/architecture.zh.md:19-21`）。`dsh-base` 是 web / headless / sdk / acp 共享的第一层（模型适配器、工具、持久化、沙箱与审批策略、设置、凭据、遥测），各应用再加一层；`dsh-sdk-minimal` 例外，自带完整配置树（`docs/architecture.zh.md:23`）。
- **叠加顺序**：空条目列表 → profile 列出的各组合包（按序）→ profile 的 `cordis.patch.yml` → home 级 `cordis.patch.yml` → `--patch` overlay。一条 patch 按 id 定位条目并**替换整个 config**，或插入新条目（`docs/architecture.zh.md:25`）。源码里在最后还会叠一层遥测关闭补丁（设置 `DSH_TELEMETRY_DISABLED` 且组合里有遥测行时，`packages/boot/app-boot/src/profile-context.ts:52-55,63-74`），架构文档的顺序里没有这一层，CLI 参考只提到这个开关（`apps/cli/reference/README.zh.md:141`）。
- **可选组合包**：安装自带 11 个默认关闭的可选组合包（会话搜索、Ralph、持久终端、会话标题、Agent Teams、语音输入、推理翻译、自动评审、开发者工具、worktree 等），由用户在插件管理器的官方分组里显式启用（`packages/boot/app-boot/src/profile.ts:223-235`；`packages/experimental/README.zh.md:12`）。Codex 和 Claude Code subagent 是按需安装的官方组合包（`packages/boot/app-boot/src/official-bundle-packages.ts:4-7`；`docs/subsystems/boot.zh.md:13`）。安装与组合相互独立：装了插件包不等于挂载它，要先选中组合包（`docs/upgrade-guide/v0.2.1-alpha.1/experimental-package-composition/guide.zh.md:14`）。"实验性""可选""官方"是三个独立属性，都不代表成熟度（`packages/experimental/README.zh.md:26-28`）。
- `dsh --profile web --dump-config` 打印实际配置树（`docs/architecture.zh.md:31-37`）。受支持的 Node 应用只能通过具名 profile 启动，`verify-application-entrypoints` 拒绝任何绕过 `dsh` 的入口（`docs/architecture.zh.md:43-45`）。
- **热重载**：YAML 决定是否启用；base 启用"只监视配置"的 HMR，headless / SDK / ACP 禁用（`docs/architecture.zh.md:27`）。修改组合包成员后必须重启，普通 patch 编辑可以热重载（`apps/cli/reference/README.zh.md:99`）。每个注册表都有 HMR 安全测试（`docs/testing.zh.md:9`）。
- **agent preset**：让某个会话拥有不同的能力集合，其中的服务行需要 `isolate` realm；`ctx.agentPresets` 立即挂载 YAML 声明的预设，并保留被替换的版本直到最后一个使用者释放（`docs/architecture.zh.md:150`；`docs/capability-seams.zh.md:655`）。可选组合包插入的是 Host 全局行，包括 minimal 在内的所有预设都能看到其中的工具（`docs/upgrade-guide/v0.2.1-alpha.1/native-subagent-bundle-tools/guide.zh.md:12`）。
- **配置原则**：部署相关的可调项必须是校验过的 `Config` 字段，`DEFAULT_*` 常量不算可配置；默认值在 `resolve()` 步骤显式给出；配置错误尽早大声失败（`AGENTS.md:138-140`）。`!!js` 表达式只允许用于插件 `config` 和条目的 `disabled`，按环境选择插件要用 overlay（`docs/cordis-primer.zh.md:45`）。

---

## 4. Agent 生命周期与执行循环

### 4.1 定义

- **step（步骤）** = 一次模型请求 + 它引发的工具执行；**turn（轮次）** = 零个或多个步骤，在领取首条输入前打开，在不再欠任何工作时关闭（`docs/architecture.zh.md:85`；`docs/glossary.zh.md:37-38`）。
- **Round** 是承载一个轮次的外层策略迭代（Goal Round、Ralph 尝试），计数器归策略所有（`docs/glossary.zh.md:39`）。

### 4.2 一次 turn 的十个步骤

`docs/architecture.zh.md:87-108` 与 `docs/agent-lifecycle.zh.md:10-83`（Mermaid 时序图）合起来：

1. `turn/start` → 领取待处理的 next-step 输入与一条排队消息；
2. 组装提示词片段与工具 schema（`system-prompt/assemble`）；
3. `agent/pre-step` waterfall：`reject`，或 `enter(messages, startsRequestSeries?)`；首批被拒或改写为空 → 关闭**不含步骤**的轮次；
4. `step/start` → `agent/request` waterfall → `prepareCall()` 解析实际路由；这两处取消时，系统提示词和用户消息都不提交（`docs/architecture.zh.md:114`）；
5. 同步准入：按已准备调用的能力协调 `system/message`，追加 `user/message` 并协调保留的运行时上下文，按需记录 `request/header` / `request/context`；
6. 从日志派生并冻结模型历史 → `llm/stream` waterfall 流式请求 → `agent/assistant-stream` 实时帧；
7. 成功写 `assistant/message`，失败写 `assistant/attempt`；
8. `tool/call*` → `tools/pre-execute` → `tools/execute` → `tools/post-execute` → `tool/result*`；
9. `step/end`；工具还欠一次请求，或有新的 next-step 输入 → 领取 → 下一个步骤；
10. 自然停止且 next-step 收件箱为空 → `agent/turn-stopping`（serial）→ `turn/end`。

### 4.3 Agent 句柄与收件箱

- 句柄方法（`docs/subsystems/core.zh.md:59-145`）：`send(message, target, wakeup)` 统一投递；`followup`（next-turn + 唤醒，独占一个轮次）、`steer`（最近的步骤边界；空闲时启动轮次）、`inject`（下次 pre-step 注入上下文，不唤醒）是固定别名。`cancel(cause, {keepInbox})` 默认清空排队与插话，"第一个原因胜出"。`whenIdle()` 表示整个 agent 静止，不代表某条消息已结算。`runMaintenance(task)` 在真正空闲时运行轮次之外的维护任务（手动压缩就走这里）。
- **收件箱是两条持久待处理列表**：`next-turn` 与 `next-step`，操作记为持久事件 `agent/inbox/spliced`；AgentLoop 的 `inbox` 投影让没有活跃 Agent 时也能读待处理输入（`docs/subsystems/core.zh.md:217-279`；`docs/architecture.zh.md:112`）。被拒步骤中已认领的消息"就此结束"，不会再作为 `user/message` 发出（`docs/subsystems/core.zh.md:872-887`）。
- `AgentStatus` 只有 `idle | running`；dispose 不是第三种状态（`docs/subsystems/core.zh.md:149-157`）。防御规则明确：不能把 `agent/status` 或 `whenIdle()` 当作某次 `followup()` 的结果（`docs/defensive-patterns.zh.md:17`）。

### 4.4 四个扩展点

| 扩展点 | 模式 | 时机与语义 | 默认监听方 |
|---|---|---|---|
| `agent/pre-step` | waterfall | 请求推导前唯一的链；可改写已认领批次或拒绝 | 15 个：压缩、计划模式、hooks、时间上下文、skill、重复调用提醒、goal round、claude-code-mods 等 |
| `agent/request` | waterfall | 组装与 `step/start` 之后、提交用户批次之前；只能换调用配置，不能改消息 | agent、webhook |
| `agent/request-error` | waterfall | 失败尝试已记录、轮次关闭前；返回 `{kind:'retry'}` 即接管恢复 | compaction-basic、compaction-image-offload、llm-retry |
| `agent/turn-stopping` | serial | 本可结束且 next-step 为空时；反对者用 `agent.steer()` 让机器再跑一步 | hooks-claude-code、hooks-codex、workspace-changes |

出处：`docs/subsystems/core.zh.md:322-344,963-1068`；`docs/event-producer-consumer.zh.md:22-26`。"turn 即将结束"的结果**由数据决定，监听器顺序不影响结果**；反方向（提前结束工具循环）靠工具结果带 `concludesTurn`。

### 4.5 停止、重试、中断

- **结束原因** `TurnEndReasonMap`：`completed / aborted / blocked / error / max-tokens / interrupted / forked`；任一步骤以 `max-tokens` 结束，整轮就记 `max-tokens`；`interrupted` 只由崩溃恢复合成，`forked` 只由 fork 种子合成（`docs/subsystems/session.zh.md:700-733`）。取消原因 `user | parent | hook | disposed`。
- **没有步数上限**：文档没有提到，源码里也没有（见 [DeepSeek Harness 架构设计](/personal-blog/articles/dsh-architecture/) 5.5 节）。
- **重试**在仍打开的步骤内进行：每次尝试刷新已注册的运行时事实、重新协调提示词，用户消息只接纳一次，不重复组装和 pre-step（`docs/agent-lifecycle.zh.md:48-53`；`docs/architecture.zh.md:114`）。适配器"一次调用 = 一次提供方尝试"，禁用库自带重试；默认 normal 策略重试 5 次，另有无上限的 `always`；策略由提供方拥有，写在 llm-retry 下会直接报错（`docs/subsystems/llm-streaming.zh.md:303-312`；`docs/config-catalog.zh.md:2100-2108`）。流空闲 5 分钟映射为 `TIMEOUT`（`:304`）。
- **流中途取消**：已交付的文本 / 推理前缀定稿为 `assistant/message { interrupted: true }`，未分派的工具调用不出现（`docs/subsystems/session.zh.md:81-86`）。
- **崩溃恢复**：持久化层不截断、不修复中断轮次，只丢弃撕裂的物理尾部；resume 时由 agent-loop 计算补齐项（缺失的工具错误结果、未闭合的 `step/end`、合成的 `turn/end{interrupted}`），作为普通批次追加后再发布会话（`docs/subsystems/persistence.zh.md:110-114`）。

---

## 5. 工具执行管线

### 5.1 顺序

`docs/tool-execution-pipeline.zh.md:8` 与 `docs/subsystems/tools.zh.md:180-182,396-432`：

```mermaid
flowchart LR
  call["tool/call 落日志"] --> pre["tools/pre-execute<br/>allow · deny · cancel · ask"]
  pre -->|ask| appr["ctx.approval<br/>只有 allowed-once 放行"]
  pre -->|allow| guard["单调守卫<br/>只能拒绝"]
  appr --> guard
  guard --> exec["tools/execute<br/>环绕分派：超时 · 检查点"]
  exec --> body["工具 execute()"]
  body --> proj["projectContent"]
  proj --> post["tools/post-execute<br/>accept · block"]
  post --> fin["finalizeContent → tools/result"]
```

- **`tool/call` 在执行前记录**，UI 用 `presentCall(args)` 渲染待定卡片（`docs/tool-execution-pipeline.zh.md:13-14`）。
- **参数不可改写**：历史、审计、UI 和执行必须看到同一份参数（`docs/subsystems/tools.zh.md:428`）。未知工具返回 `UNKNOWN_TOOL`，调用失败但不终止轮次（`:430`）。
- **单调守卫**只能拒绝或弃权，没有 allow 结果；所有者策略不想被别人重排时注册为守卫（`docs/tool-execution-pipeline.zh.md:16,65`）。
- `tools/execute` 是唯一能替换 `exec.signal` 的视图，注册表会把替换后的信号与调用方信号融合（`docs/subsystems/tools.zh.md:180-182`）。
- post-execute 可 accept（可替换内容）/ block；spill 策略在这里把过大输出落盘（`docs/capability-seams.zh.md:684`）。流水线或结果快照抛异常 → 变成 `isError` 结果。
- 工具附带的 `additionalContexts` 在批次内先进先出，排在已记录的工具结果之后作为 `user/message` 注入（`docs/tool-execution-pipeline.zh.md:28`）。
- 只持久化 `content`、`error`、`meta`，`tool/ptc-dispatch` 存子调用渲染后的内容与错误；执行期的规范值 `value` 不落盘，回放能重现展示但不能重建中间值（`docs/subsystems/tools.zh.md:392`）。

### 5.2 并行

时序图写明："按 executionMode 分类待执行调用；独占屏障 + 有界滚动池；启动前重新分类；pre 有序、execute 并发、post 与 `tool/result` 按模型顺序提交"（`docs/agent-lifecycle.zh.md:57-68`）。只有 `isConcurrencySafe(args)` 返回 `true` 才并行（`docs/subsystems/tools.zh.md:11-103`）。每步并发上限 `maxParallelToolCalls` 默认 10（调度器默认值），设为 1 即串行（`docs/config-catalog.zh.md:102-106,4176-4177`）。

### 5.3 PTC 模式

`ctx.tools` 的 `mode` 只取 `native`（默认）或 `ptc`，需要 `ctx.ptcRuntime` 提供 TypeScript 或 Python 的 SDK 渲染器（`docs/config-catalog.zh.md:4161-4182`）；同一应用里不同 agent preset 可以选不同模式（`docs/upgrade-guide/v0.2.1-alpha.1/tool-presentation-mode/guide.zh.md:14`）。`ptc` 下模型写 `run_code` 程序，在程序里经生成的 SDK 调用可见工具；子调用带父级 token、完整走一遍管线、记 `tool/ptc-dispatch`，拒绝视为有约束力的驳回，不带 `additionalContexts`，子调用并发上限默认 10（`docs/tool-execution-pipeline.zh.md:65`）。`run_code` 自身可以带 `sandbox_permissions` + `justification` 为整段程序申请更宽松的沙箱（`docs/tool-catalog.zh.md:550-561`）。`ptc` 模式下模型直接调用原生工具名返回 `UNKNOWN_TOOL`（`docs/subsystems/tools.zh.md:209-218`）。

---

## 6. 安全与权限

### 6.1 两个独立旋钮 + 预设

- **沙箱模式** `read-only | workspace-write | danger-full-access`，**只管文件效果**，网络与进程可见性不在范围内；`danger-full-access` 直接 spawn 原命令（`docs/subsystems/sandbox.zh.md:11-28`）。
- **审批策略** `ask | never`；`never` 自动拒绝每个询问，面向 CI 和无人值守，在服务内部分发前强制，后插入的应答者也绕不过（`docs/subsystems/approval.zh.md:33-47,86`）。
- **权限预设**把两者捆成具名组合：`workspace-write`（+ ask）与 `danger-full-access`（+ never），`custom`、`auto` 为保留名（`docs/subsystems/permission-presets.zh.md:5-11`）。base 组合另外配置了 `read-only`（+ ask）（`packages/bundle/base/cordis.patch.yml:263-264`）。预设不拥有执行策略；当前值不匹配任何预设时派生为 `custom`。
- **实际交付默认是 `workspace-write + ask`**：插件 schema 默认 `read-only`，但 base 组合改写为 `DSH_PERMISSION_MODE ?? 'workspace-write'`，审批策略同时取 `ask`（`packages/bundle/base/cordis.patch.yml:241,257`）。这点在 `apps/cli/reference/README.zh.md:133` 有说明，`docs/` 下没有。

### 6.2 审批

- `ApprovalOutcome = allowed-once | rejected | cancelled | unavailable`，闭合且 **fail-closed**：没有应答者、应答者抛异常或不合规都产生 `unavailable`（`docs/subsystems/approval.zh.md:21-29`）。**没有"本会话总是允许"**。
- 审批请求**刻意不带工具参数**，只有工具名、调用 id 和理由（`docs/subsystems/approval.zh.md:53-82`）。每次询问与决定记为仅日志的 `approval/asked` / `approval/decided` 审计事件，不进入模型历史。
- 模型可以带 `sandbox_permissions` + `justification` 请求一次性更宽松的重试，必须经 `ctx.approval` 批准（`docs/subsystems/shell.zh.md:145-169`）。

### 6.3 沙箱

- 后端：Linux bwrap / Landlock、macOS Seatbelt、Windows ACL 受限令牌；SSH 远端另有提供方（`docs/subsystems/sandbox.zh.md:5`）。`SandboxEnforcement` 区分 `full` 与 `partial`（旧 Landlock ABI、Windows ACL 都是部分强制）。
- 策略**逐调用**携带，不固定在提供方上；工作区根取自会话不可变的 cwd（`docs/subsystems/sandbox.zh.md:43-93`）。会话的当前工作目录可以用 `working_directory` 工具切换，但沙箱可写根和项目归属仍绑定原始项目（`docs/subsystems/working-directory.zh.md:11`）。
- 受限模式没有可用后端时报 `SANDBOX_UNAVAILABLE`，"静默的无隔离透传永远不合法"（`docs/subsystems/sandbox.zh.md:156`；`docs/subsystems/shell.zh.md:169`）。被拦截的文件操作以 `[sandbox: file access denied under <mode> mode]` 标记返回，bash 工具描述直接告诉模型"请勿换一种方式重试"（`docs/tool-catalog.zh.md:607`）。
- 包级规则："决策必须在执行该操作的地方强制执行；schema 省略、提示词过滤、facade、监听器顺序都不算强制执行"（`packages/AGENTS.md:14`）。

### 6.4 其他防护与声明

- 子进程环境清洗匹配 `KEY / SECRET / TOKEN / PASSWORD` 的变量；临时与 spill 文件放 0700 私有目录、随机名、`0o600` 独占创建（`docs/defensive-patterns.zh.md:31`）。源码还清洗全部 `DSH_*` 变量，文档没写。
- `SAFETY.zh.md`：实验性开发者预览，未经安全审计；**沙箱、审批与权限控制只能降低风险，不保证隔离**，即使正确执行也保护不了已获准访问的资源（`SAFETY.zh.md:7,13`）。
- 计划模式与沙箱 / 审批正交，只是软性提示段落，不是安全机制（`docs/cookbook/extension-cookbook.zh.md:126`；`docs/subsystems/plan.zh.md`）。

---

## 7. 会话日志与上下文

### 7.1 日志是唯一真源

- `Session` 是类型化 `SessionEvent` 的只追加日志；LLM 历史从日志派生、不单独存储，回放就是重新派生（`docs/subsystems/session.zh.md:5`）。
- **模型可见 ⟺ 已记录**：进入模型请求的任何内容都必须能从日志重建；新增模型可见输入就需要新的会话事件（`AGENTS.md:134`；`docs/architecture.zh.md:128`）。运行时没有比对检查：请求由 `buildRequest` 从 `session.deriveMessages()` 派生（`packages/core/agent-loop/src/agent.ts:616-704`，`:688`），"请求等于日志重建结果"只由测试验证（如 `packages/core/agent-loop/tests/request-reconstruction.spec.ts`）。
- **信封**：`seq`（连续，`= log.length`）、`time`、`data`、`ignorable?`。不认识且没标 `ignorable: true` 的事件，读者**必须拒绝整份日志**（`docs/subsystems/session.zh.md:252-290`；`AGENTS.md:131`）。`AGENTS.md` 同一行还规定：只有现有判别字段无法阻止不安全解读时才提升 `SESSION_FORMAT_VERSION`，同版本变更要求读者行为安全。
- 插件也可以合并扩展**仅日志**事件（`compaction/*`、`hook/*`、`approval/*`、`plan/mode`、`goal/change` 等），它们不进入模型历史；位于两个轮次之间也合法（`docs/subsystems/session.zh.md:11,737-739`）。实验包另有 `plugin:` 命名空间的插件记录，写入时总带 `ignorable: true`，单列在 `experimental-persistence-catalog`（`docs/subsystems/session.zh.md:761`）。

### 7.2 Surface：模型可见的那一层

- `SurfaceEventType` = `system/message | developer/message | user/message | assistant/message | tool/result` 五种（`docs/subsystems/session.zh.md:311-317`）。
- `SurfaceOp = 'append' | {op:'replace', startSeq, endSeq}`：replace 遮蔽一个闭区间，压缩摘要就是一条带 replace 的 `user/message`（`docs/subsystems/session.zh.md:321-340`；`docs/subsystems/compaction.zh.md:11-17`）。
- **系统提示词不在请求头里**，而是 surface 第 0 号节点 `system/message`：首步写入；变化时原地替换，或在 `systemPromptUpdate: 'in-history'` 路由下追加到历史后面，保护已缓存前缀（`docs/subsystems/system-prompt.zh.md:44`；`docs/subsystems/session.zh.md:181-204`）。
- 动态上下文（审批策略、沙箱模式、时间等）物化为**持久 user-role 快照**，只在完整快照变化或被压缩移除时才追加（`docs/subsystems/system-prompt.zh.md:74-106`）。贡献可标 `required: true`，可选运行时上下文被关闭时仍保留；`interpolate: false` 原样保留文本（`:94`）。工作目录就是这样的必需用户上下文，不进系统提示词（`docs/subsystems/working-directory.zh.md:15`）。

### 7.3 压缩

压缩是可选能力，不属于 loop 主干（`docs/subsystems/compaction.zh.md:5`）。压力压缩挂在 `agent/pre-step`，在请求推导前运行，先调可选的工具结果剪枝，再重新测量 token；上下文溢出恢复挂在 `agent/request-error`，只有 surface 真的被替换了才返回 retry（`:101`）。`compaction/start` 当"锁"用，崩溃时表现为有 start 无 end。图片过大有专门的 image offload 路径（`docs/subsystems/llm-streaming.zh.md:247-253`）。**摘要提示词、触发阈值、保留尾部策略文档都没写**。

### 7.4 大输出落盘

`dsh-spill-policy` 在 post-execute 把超过 `maxInlineTokens` 的结果替换为首尾内容 + spill 地址；保存失败则保留原内联结果，不把成功调用变成错误（`docs/subsystems/spill.zh.md:92`）。

---

## 8. 持久化与格式演进

### 8.1 物理层

- `ctx.sessionPersistence` 只暴露 `create / open / stat / list`，返回单会话句柄 `SessionHandle`（`read / append / flush / close`），承担单写者所有权（`docs/subsystems/persistence.zh.md:7-11`）。
- `append` 是 best-effort，**`flush` 是唯一持久性屏障**；`session/event` 进入有界的 write-behind 窗口，loop 不在轮次边界 await flush，逐请求检查点由 `dsh-session-checkpoint-policy` 负责（`docs/subsystems/persistence.zh.md:104-106`；`docs/subsystems/session.zh.md:36-41`）。
- JSONL 后端：逐会话逻辑 JSONL，默认是带校验和的连续 Zstandard frame，逐批 `fsync`，首次新写入前截断撕裂尾部（`docs/subsystems/persistence.zh.md:331`）。默认位置 `~/.dsh/sessions`。会话信息带只看头部得出的 `formatStatus`（`current` / `migration-required`），用来标出需要迁移的旧格式会话（`:315`）。

### 8.2 格式版本 V0 → V4

| 版本 | 时间（2026） | 关键变化 |
|---|---|---|
| V0 | 08-10 起 | 宽松期：事件键改名（`compact/*` → `compaction/*`）、字段增删都没升版本 |
| V1 | 约 09-02 | 只存在于一个 PR 的中间树，**没有任何 tag 写 V1** |
| V2 | 09-04 | 删除 `assistant/chunk`，新增 `assistant/attempt`，`assistant/message` 内嵌 stream |
| V3 | 09-08 | 新增 `system/message`，系统提示词移出请求头；`tool/code-dispatch` 改名 `tool/ptc-dispatch` |
| V4 | 09-16 | 工具结果成为一等 `tool` 角色消息；新增 `developer/message`；`turn/end` 新增 `forked`。首个写 V4 的 tag 是 `dsh-v0.1.7-alpha.1`（09-22） |

出处：`docs/persistence-changes/releases/`、`historical-formats/`、`2026-09-16-session-format-v4.zh.md:90-104`；各 tag 的 `SESSION_FORMAT_VERSION`（`packages/core/session/src/types.ts:89`）。

V4 的状态记录在 `docs/session-format-status.zh.md`：定稿记录 `latestFinalizedVersion: 4`，已接受的兼容性基线存为检查点 `persistence-changes/finalized/v4.json`，满足读者兼容规则的 schema 变更可以留在 V4（`:32-35`）；发布记录 `latestReleasedVersion: 4`、`evidenceTag: dsh-v0.2.0-rc.2`（`:45-46`），证据 tag 只需证明该版本已发布，不必是首次携带该格式的发布（`:21`）。V4 之后的变更（可选标题、外部 subagent 目录、用户提问回复、PTC 操作元数据、工作目录归属、标题推理强度等）都以 same-version 记录留在 V4。

几条规则值得记住：

- **已发布代际不可变**：已提交的 generation 路径绝不重命名、替换或删除；升级走相邻迁移链（N → N+1 各一个包），写入打开时在源文件旁发布新代际，源文件字节不变（`AGENTS.md:7`；`docs/cookbook/adding-a-session-format-version.zh.md:40-80`）。
- **alpha / RC 也确立兼容义务**，prerelease 标记不会让用户数据变得可丢弃（`docs/session-format-status.zh.md:24`）。
- 兼容规则：每个结构变更都要确认；旧读者能保留必要含义、安全忽略可选内容，或在执行前拒绝不支持的必要数据时，可以留在同一版本；只有判别信息挡不住不安全解读时才升版本（`docs/persistence-changes/README.zh.md:49`）。规则表把可选新增、必选改可选、新增事件、更高的 `data.version` 列为 same-version；改必选字段、删除或重命名、改 header 或信封要做兼容性评审，header 版本变化才要求 version-bump（`:51-59`）。
- 确认记录从基线 `2026-09-11-initial` 起逐根成链，每条记录绑定精确的生成 schema；验证器拒绝缺失前驱、环和重复后继，已接受记录只能追加后继（`docs/persistence-changes/README.zh.md:11,76-78`）。

---

## 9. LLM 接入与 DeepSeek 专有扩展

- `ctx.llm` 是适配器注册表，实现有 `llm-deepseek`、`llm-pi-ai`（第三方提供方）、`llm-replay`（测试）（`docs/capability-seams.zh.md:612`）。`LlmRuntime.stream()` 只通过终止型 finish 分片暴露失败，不抛异常（`docs/defensive-patterns.zh.md:13`）。
- 凭据：配置只存引用，值由提供方持有，每次请求解析，轮换后下一次请求即生效（`docs/subsystems/credentials.zh.md:5`）。
- **DeepSeek 专有扩展只存在于官方 DeepSeek 路由**，放在 `messages` / 系统提示词 / 工具 schema 之外，不增加模型 token，也不改变模型可见前缀；会发往已解析的 `baseURL`，包括中间网关（`docs/deepseek-llm-api-wire-extensions.zh.md:5-7`）。
  - HTTP 头：`x-deepseek-harness-user-id`（Harness home 的稳定匿名 UUID）、`-session-id`、`-compact`（`:24-29`）。
  - 扩展字段失败不阻断模型请求：某个贡献方准备失败时只省略它的字段，且只记录首次失败；与基础字段冲突才会阻止请求；2xx 后的接受事务失败只记告警，贡献方之后重发（`:37,39`）。
  - `dsh_plugin_packages`（**默认启用**）：每次请求带上存活插件包的 `(name, 可选 version)` 清单，接收方必须接受版本缺失（`:43-72`）。
  - `dsh_session_log`（**默认启用**）：上传权威会话日志的连续后缀，每次不超过 8 MiB，2xx 后追加水位事件推进，**至少一次**交付——可能重复，不会缺口（`:76,113,139-156`）。
  - 暴露范围原文列得很清楚：工作目录、系统提示词、用户与 assistant 内容、失败尝试、工具参数与结果、压缩摘要、反馈等；API key 不在其中（`:160`）。
- 关闭方式散在别处：会话日志上传可以在设置里关（`apps/cli/reference/README.zh.md:139-141`）；遥测默认 `FEEDBACK_ONLY`，`DSH_TELEMETRY_MODE=DISABLED` 关闭（`docs/user/guide/network-proxy.zh.md:70`）。遥测导出地址（`https://dsh-otel-collector.deepseeksvc.com/v1/logs`）和匿名 user id 只在 base 组合配置里能看到（`packages/bundle/base/cordis.patch.yml:200-220`）。

---

## 10. 编排与扩展

### 10.1 编排能力

| 能力 | 要点 | 出处 |
|---|---|---|
| subagent | 统一的 activation API 管理本地会话和外部执行：Spawn / Fork 创建本地子 agent，Codex、Claude Code、ACP、DSH SDK 各提供一次外部执行；`toolFilter` 让工具从子 agent 提示词消失并拒绝执行；`send_message` 只在相邻本地 agent 之间，外部执行拒绝后续消息；`request.cwd` 指定子级初始目录 | `docs/subsystems/subagent.zh.md:5-11,112-118,184,326` |
| Agent Teams | 实验性；新消息直接投递到目标 inbox，mailbox 类型只为回放历史日志保留；任务 DAG，`writeScopes` 只是提示，**不是锁** | `docs/subsystems/agent-team.zh.md:28,56-58` |
| workflow | 模型编写、启动 subagent 的编排脚本，跑在 PTC 进程里；没有整体截止时间 | `docs/subsystems/workflow.zh.md:5,7,95` |
| goal / loop / schedule | 监听 `turn/end` 后 `followup()`；定时器到期后以 `source.kind: 'schedule'` 的 `followup()` 投递；schedule 投递可能重复 | `docs/cookbook/extension-cookbook.zh.md:111-112,131`；`docs/subsystems/schedule.zh.md:438` |
| plan 模式 | 软性提示段落；`exit_plan_mode` 始终注册，进出只改提示不改工具目录 | `docs/subsystems/plan.zh.md:5,33` |
| jobs | 后台任务，owner 的 agent dispose 时取消并等待 | `docs/subsystems/jobs.zh.md:23-67` |
| 工作目录 / worktree | 每个会话有可切换的当前工作目录（`get / ensure / set`），会话头保留原始项目，切换记为 `working-directory/change`；实验性 `create_worktree` 建分支与检出目录后切换过去，随安装提供、默认关闭 | `docs/subsystems/working-directory.zh.md:5-15`；`docs/subsystems/worktrees.zh.md:5` |
| session inspector | 实验性开发者工具组合包，在 Sidebar 以表格展示原始会话日志和 Chat 分组，只读 | `packages/experimental/session-inspector/README.zh.md:12,27` |

### 10.2 扩展点速查

cookbook 把 27 项产品功能逐一映射到插件机制（`docs/cookbook/extension-cookbook.zh.md:108-136`），与各篇 adding-a-* 手册合起来，按"想做什么"归纳：

| 想做什么 | 用什么 |
|---|---|
| 加工具 | `ctx.tools.register(defineTool({...}))`；原始 JSON Schema 工具（MCP）直接注册 `ToolDefinition` |
| 权限 / 审批策略 | `tools/pre-execute` 返回 `ask`；不可撤销的拒绝用 `ctx.tools.guard()` |
| 超时、重试、指标 | `tools/execute` 环绕 |
| 结果改写 / 审计 | `tools/post-execute` / `tools/result` |
| 过滤工具、渐进披露 | `ctx.tools.restrict()` |
| 新 LLM 提供方 | `ctx.llm.registerAdapter(routes, adapter)` |
| 改调用配置 | `agent/request` |
| 提示词片段、AGENTS.md、记忆、skill | `ctx.systemPrompt.section()`；按需内容 `agent.inject()` |
| hooks | `agent/pre-step`、`agent/request`、`tools/pre|post-execute`、`agent/turn-stopping`；实验性桥接包 `hooks-claude-code`、`hooks-codex` 不随 CLI 安装，要连同 `dsh-hook-protocol` 用 `dsh plugin add` 装进 profile |
| UI / 外部协议驱动 | 实时听 `agent/assistant-stream`，持久听 `session/event`；输入 `followup()` / `steer()` |
| Host ↔ Client API | `@Remote` 方法 + 生成的 codec |
| 可替换能力 | Service 定义包 + 提供方包 + 消费方包，在 `cordis.yml` 换提供方行 |
| 会话格式新版本 | 判别字段挡不住不安全解读时，才写相邻迁移包 + 提升 `SESSION_FORMAT_VERSION` |

出处：`docs/cookbook/extension-cookbook.zh.md:9-136`、`adding-a-tool.zh.md`、`adding-an-llm-adapter.zh.md`、`adding-a-remote-api.zh.md`、`adding-a-session-format-version.zh.md`。

### 10.3 API 网关

Host 服务方法用 `@Remote` 标记才对 Client 开放；流式方法走多路复用的 `/api/remote.mux` WebSocket；codec 由 Typert 在构建期严格生成，从源码启动时退化为较弱的描述符，Client 拒绝挂载缺少严格 codec 的描述符（`docs/api-gateway.zh.md:9-139`）。会话 lookup 会**自动恢复冷会话**（`:129`）。Web 服务器的监听地址必须是某个本地网卡的具体 IP 字面量，`0.0.0.0` 这类未指定地址在加载时被拒绝；非回环地址默认走明文 HTTP，可选配置 TLS（`docs/subsystems/web-server.zh.md:33-58`）；公网部署另有用户指南（`docs/user/guide/public-deployments.zh.md`）。

---

## 11. 工程纪律：测试、防御规则与事故复盘

- **测试分层**（`docs/testing.zh.md:9-55`）：单元测试 + 每个注册表的 HMR 安全测试；`packages/*/*/src` **按文件 100% 覆盖率**；真实 API e2e（"我们是 DeepSeek，不要吝惜真实 API 测试"）；性能基准；录制会话快照；浏览器快照。只 mock LLM 适配器、网络和时钟。产品可见插件必须有经真实 Loader 启动的组合测试。
- **防御规则**（`docs/defensive-patterns.zh.md`）：正交结果独立上报；异步状态不是同步状态；dispose 必须完全停稳；分发器隔离回调异常；环境变量与可预测路径不暴露给不可信输出。
- **四篇事故复盘**，每篇沉淀一条现行约束：

| 编号 | 事故 | 留下的约束 |
|---|---|---|
| 0001 | ACP 连接即崩溃：多写了 `export default`，Loader 丢掉 `inject`；当时 100% 覆盖率全绿 | 至少一个测试必须走真实 Loader / export 路径 |
| 0002 | `disabled: !!js ...` 恒为 truthy，fs 工具被永久禁用；快照刷新把 `UNKNOWN_TOOL` 当成预期 | 配置表达式的求值位置要可静态校验；快照刷新不是正确性审查 |
| 0003 | agent 改完 GUI 去验收了另一个端口上的替代服务器 | 运行时身份事实（URL、模式）必须对模型可见；验收要从外部观察 |
| 0004 | Landlock 部分强制通知 + 任意非零退出被判成沙箱故障 | 进程归因需要多项独立证据；结构化错误要端到端保留 |

---

## 12. 文档与源码不一致之处

下表合并了本次抽查发现的问题（源码均以 `d7432673` 为准）：

| # | 文档说法 | 源码 / 其他文档 | 判断 |
|---|---|---|---|
| 1 | 扩展点表说 `agent/turn-stopping` 会"停止轮次"（`docs/architecture.zh.md:158`） | 源码 JSDoc：反对者用 `agent.steer()` 让机器再跑一步 | 措辞相反。它是"可以让轮次继续的检查点"，时序图的写法更准确 |
| 2 | 持久事件列表没有 `developer/message`（`docs/architecture.zh.md:110`）；core 页写"十三种核心事件"（`docs/subsystems/core.zh.md:358`） | 核心 `SessionEventMap` 有 14 个成员，含 `developer/message`（`packages/core/session/src/types.ts:311`） | 遗漏 |
| 3 | surface 事件 JSDoc 只列 4 种（`docs/subsystems/session.zh.md:259-261`） | `SurfaceEventType` 实际 5 种（`types.ts:439-444`）；源码注释本身就漏了（`types.ts:487-488`） | 类型等价检查只比字面，拦不住注释漂移 |
| 4 | 重试"会打开另一个持久、带编号的轮次"（`docs/subsystems/llm-streaming.zh.md:303`） | `llm/retry` 带 `turn + step`，重试在原步骤内进行（`docs/agent-lifecycle.zh.md:53`） | 表述有误：重试留在原步骤内 |
| 5 | 管线图把 sandbox 画在 `tools/pre-execute` 里（`docs/tool-execution-pipeline.zh.md:15`） | 没有任何沙箱包监听 `tools/pre-execute`；隔离发生在 shell 执行器内部，由 `ctx.sandbox` 改写 argv | 位置描述不准 |
| 6 | `tool-catalog` 的 bash / pwsh schema 不含 `sandbox_permissions`（`docs/tool-catalog.zh.md:605,693`） | 源码只在组合里有沙箱执行器时才公开这两个提权字段（`packages/shell/tool-bash/src/index.ts:207-208,389-398`）；同一目录里 `run_code` 的 schema 带这两个字段（`:550-561`） | 目录按无沙箱的默认组合生成，看不到 shell 的提权重试入口 |
| 7 | 沙箱后端列为 bwrap、Landlock、Seatbelt（`packages/README.zh.md:47`） | sandbox 分组 README 和 `docs/subsystems/sandbox.zh.md:5` 都列了 Windows ACL 受限令牌后端 | 包总览少写一个后端 |
| 8 | plan 页说"每个会话事件都位于轮次之内"，所以选择会待生效（`docs/subsystems/plan.zh.md:15`） | 没有开放轮次时 `set()` 立即追加并返回 `committed`（`packages/plan/plan-mode/src/index.ts:425-444`）；同页类型 JSDoc 也这么写（`:66-72`） | 同页前后矛盾，前提是已移除的旧模型 |
| 9 | patch 中插件路径必须是绝对路径（`docs/user/develop/basic/index.zh.md:56`） | 同系列 config 页用相对路径（`config.zh.md:39`）；发布页和 CLI 参考都说相对路径按 patch 文件目录解析（`publish.zh.md:64`；`apps/cli/reference/README.zh.md:55`） | 文档之间矛盾 |
| 10 | 复盘 0002 引用 `Entry._resolveConfig()`（`docs/postmortem/0002-js-expression-disabled-filesystem-tools.zh.md:32`） | 插值在 Loader 的 `internal/config` 监听器里（`vendor/loader/src/config/entry.ts:171`；`vendor/loader/src/index.ts:104`），该方法不存在 | 复盘引用陈旧（复盘本身描述当时状态，合理） |
| 11 | 子系统索引把 settings 描述为"分层解析、owner scope"（`docs/subsystems/README.zh.md:24`） | 页面正文是"投影 volatile Config 字段，配置编辑器通过 Cordis patch 持久化"（`docs/subsystems/settings.zh.md:5`） | 索引与正文不符 |
| 12 | session 页仍引用 `snapshotEvents()`（`docs/subsystems/session.zh.md:622`） | 同页已标 `@deprecated`，"新调用被禁止"（`:551`） | 自相矛盾 |
| 13 | cookbook 包分组列表只列 11 个（`docs/cookbook/adding-a-package.zh.md:25`） | `packages/` 下有 52 个分组 | 过时 |
| 14 | 子进程环境清洗只提 `KEY / SECRET / TOKEN / PASSWORD`（`docs/defensive-patterns.zh.md:31`） | 还清洗全部 `DSH_*` 变量（`packages/subprocess/subprocess/src/index.ts:47-67`） | 文档少写 |
| 15 | 子系统 README 声称覆盖全部子系统（`docs/subsystems/README.zh.md:5`） | hooks 的三个实验包（`hook-protocol`、`hooks-claude-code`、`hooks-codex`）没有子系统页；`llm/retry-started` 是持久事件，只出现在生成的持久化目录里 | 覆盖缺口 |
| 16 | 沙箱策略插件默认 `read-only`（`docs/config-catalog.zh.md:2625`） | base 组合覆盖为 `workspace-write`，另配 `read-only` 预设（`packages/bundle/base/cordis.patch.yml:241,263-264`） | 两层默认值文档没说明（见 6.1 节） |
| 17 | `preset` patch 在目标预设的 `config.plugins` 内应用 patch 操作（`docs/architecture.zh.md:25`） | 源码里没有这种 patch 操作：commit `b173f3e2a2`（2026-10-07）回滚了它并删除 `packages/boot/app-boot/src/profile-patches.ts`；可选组合包插入的是 Host 全局行 | 过时 |
| 18 | 安装 Codex / Claude Code 组合包后"还须在复制出的 Preset 中单独启用对应工具行，新 Agent 才能看到该工具"（`apps/cli/reference/README.zh.md:99`） | 组合包在顶层插入 `tool-subagent-codex` 等全局工具行（`packages/subagent/subagent-codex/cordis.patch.yml`），升级指南写明"包括 minimal 在内的所有预设都可见"（`docs/upgrade-guide/v0.2.1-alpha.1/native-subagent-bundle-tools/guide.zh.md:12`） | 过时 |
| 19 | `fork()` "要求所选前缀结束时没有开放轮次"，API 拒绝结束于开放轮次内的前缀（`docs/subsystems/session.zh.md:683,685`） | 源码 JSDoc 写明开放的尾部会补上合成工具结果和带 `forked` 原因的步骤 / 轮次结束事件（`packages/core/session/src/index.ts:1363-1397`；`fork.ts:10-30`）；同页 `forked` 结束原因的定义也是"关闭 fork 边界处仍开放的轮次"（`:724-729`） | 同页前后矛盾 |
| 20 | 组外发布包和 app 不得在 `dependencies` 中列实验包（`packages/experimental/AGENTS.md:7`） | `apps/cli/package.json` 的 `dependencies` 列了 11 个实验性可选组合包，隔离校验对可选组合包单独放行（`scripts/verify-default-product-isolation.ts:84-102,297`） | 规则没写可选组合包这一例外 |

---

## 13. 文档没覆盖、必须读源码的部分

以下内容文档只给契约或一句话，本系列在 [DeepSeek Harness 架构设计](/personal-blog/articles/dsh-architecture/) 中按源码补齐：

1. **agent-loop 内部**：驱动器状态机、收件箱批次选择、`turn/step` 的实际推进、`interruptedTurnClosers` 算法、请求冻结与复用（`packages/core/agent-loop/src/*`）。
2. **继续与停止的完整判定**，以及"没有步数上限、没有预算"这一事实。
3. **重试的精确语义**：`llm/retry` 与 `llm/retry-started` 如何复用同一步骤。
4. **压缩策略**：阈值、保留尾部、摘要提示词、图片 offload 判定（`packages/compaction/*`）。
5. **沙箱后端实现**：bwrap / Landlock / Seatbelt / Windows ACL 的策略生成与探测（`packages/sandbox/*`）。
6. **hooks 桥接**：与 Claude Code / Codex 钩子协议的映射、阻断语义（`packages/experimental/hook-protocol`、`hooks-claude-code`、`hooks-codex`）。
7. **系统提示词的实际内容**与片段顺序（`packages/core/system-prompt`、`packages/context/*`）。
8. **Loader 内部**：Entry diff、patch 整键覆盖、`isolate` realm（`vendor/loader/src/*`），文档只在 `vendor/README.md` 的变更清单里提到。
9. **各提供方实现**：`subprocess-local`、`jobs-local`、`storage-sqlite`、`session-query-sqlite` 的 FTS 索引等。

文档刻意不写实现状态和 TODO，"已知限制"主要在各包 README 的 `## Known Limitations and Deferred Work` 小节（`docs/AGENTS.md:66`；`packages/AGENTS.md:27`），要评估某个子系统成熟度时先看那里。
