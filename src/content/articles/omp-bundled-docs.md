---
title: "oh-my-pi 自带文档总结"
description: "oh-my-pi 自带 134 篇专题文档的主题化提炼：恢复与压缩、TTSR、会话树、工具、LLM 层、扩展体系，以及文档与源码不一致之处。"
publishedAt: 2026-09-28T03:25:00.000Z
reviewedAt: 2026-09-28
category: "Agent 架构调研"
tags: ["ai"]
readingMinutes: 32
parent: "omp-architecture"
order: 1
---
> 源码快照：[can1357/oh-my-pi](https://github.com/can1357/oh-my-pi/tree/df731d516c0c722f658312187ae84c6d23e216fb)，HEAD `df731d51`（2026-09-28）。

## 0. 结论先行

- **oh-my-pi 的文档体量远超 Codex**：`docs/` 下 134 篇 Markdown（根目录 82 篇、`tools/` 34 篇、`toolconv/` 12 篇等），约 2.6 MB，另有各 package 的 README 和 `packages/ai/src/{dialect,judgment}/*.md` 提示词模板。它**是按子系统写的“内部实现文档”**，大量篇目直接描述算法、默认值、边界情况，而且常常自曝缺口（“文档如实指出……”）。
- **同样没有全局架构图**。最接近总览的是根 `README.md`（特性清单）和 `packages/agent/README.md`（Agent 内核契约）。子系统之间如何拼成一个 loop，需要自己串起来，本文第 2 节做了这件事。
- **`agentLoop` 本体（`packages/agent/src/agent-loop.ts`）的内部机制基本没有文档**：并发调度（shared/exclusive）、流中推测执行、tool call/result 配对不变式、队列投递记账、软工具要求升级等都只能读源码，见 [oh-my-pi 架构设计](/personal-blog/articles/omp-architecture/)。文档覆盖的是 loop **周围**的一切：事件契约、恢复（重试/压缩）、TTSR、会话树、扩展事件时序。
- 部分文档与源码不一致，见第 13 节。最重要的一条：`packages/agent/README.md` 对 steering“每个工具调用后检查、immediate 模式中止剩余工具”的描述已经过时。

## 1. 文档构成与推荐阅读顺序

| 类别 | 代表文档 | 性质 |
|---|---|---|
| Agent 内核 | `packages/agent/README.md`、`packages/ai/README.md`、`packages/catalog/README.md` | 包级契约：消息流水线、事件、工具契约、流事件 |
| 嵌入面 | `sdk.md`、`rpc.md` | 进程内与 stdio NDJSON 两种宿主接口 |
| 会话 | `session.md`、`session-tree-plan.md`、`tree.md`、`session-operations-*.md` | JSONL 格式、树语义、操作矩阵 |
| 上下文与恢复 | `compaction.md`、`non-compaction-retry-policy.md`、`handoff-generation-pipeline.md`、`ttsr-injection-lifecycle.md` | 压缩、重试、交接、流中规则 |
| 提示词工程 | `context-files.md`、`system-prompt-customization.md`、`rulebook-matching-pipeline.md`、`memory.md` | 上下文来源、分块、缓存断点 |
| 多代理 | `task-agent-discovery.md`、`tools/task.md`、`advisor-watchdog.md`、`agent-hub.md`、`vibe-mode.md`、`collab.md` | 子代理、旁路审查、实时协作 |
| 工具 | `tools/*.md`（34 篇）、`bash-tool-runtime.md`、`python-repl.md` | 每个工具的合约与实现细节 |
| LLM 层 | `provider-streaming-internals.md`、`provider-compat-reference.md`、`provider-endpoint-constraints.md`、`provider-quirks.md`（349 KB）、`toolconv/*.md`、`ERRATA-GPT5-HARMONY.md` | 统一流、兼容性、文本工具方言 |
| 扩展 | `extensions.md`、`hooks.md`、`custom-tools.md`、`skills.md`、`mcp-*.md`、`marketplace.md` | 扩展 API、事件目录、加载顺序 |
| 原生层与 TUI | `natives-*.md`、`native-crates.md`、`tui-core-renderer.md`、`tui-runtime-internals.md` | Rust N-API、差分渲染 |
| 参考 | `settings.md`（120 KB）、`environment-variables.md`（110 KB）、`cli-reference.md`、`AGENTS.md` | 全量设置与开发规范 |

### 推荐阅读顺序（以理解 agent loop 为目标）

1. `packages/agent/README.md`：消息流水线、事件序列、steering/follow-up、低层 `agentLoop` API。读的时候记住第 13 节的差异。
2. `sdk.md` 与 `rpc.md`：`agent_end.isTerminal`、`yielded`、`prompt_result` 与 `session_settled` 的区别，这是 loop 对外的“完成语义”。
3. `extensions.md` + `skills/authoring-hooks.md`：事件目录就是 loop 的挂载点地图（本文 2.3 节整理成了时序）。
4. `non-compaction-retry-policy.md` → `compaction.md`：`agent_end` 之后与 turn 中途的恢复分派。
5. `ttsr-injection-lifecycle.md`：loop 级的“中止—注入—重试”机制。
6. `session.md` + `session-tree-plan.md`：状态如何持久化、如何从树重建上下文。
7. `provider-streaming-internals.md`：从 SSE 到 `AssistantMessageEvent` 再到 `message_*` 的链路与取消分层。
8. 然后再读 `agent-loop.ts` 源码（见 [oh-my-pi 架构设计](/personal-blog/articles/omp-architecture/)）。

---

## 2. 核心心智模型

### 2.1 三层结构与两级消息投影

文档确立的分层是 `AgentSession`（coding-agent 包，负责持久化、重试、压缩、TTSR、advisor 等策略）→ `Agent`（agent 包，有状态，负责队列与事件订阅）→ `agentLoop`（无状态的异步事件流）。下层是 `pi-ai`（统一的多 provider 流式客户端）。

消息在进入模型前经过两级投影：

```text
AgentMessage[] ──transformContext()──▶ AgentMessage[] ──convertToLlm()──▶ Message[] ──▶ LLM
               （可选：剪枝、注入）               （必需：过滤 UI 消息、转换自定义类型）
```

LLM 只认识 `user`、`assistant`、`toolResult` 三种角色。`compactionSummary`、`branchSummary`、`custom`、`bashExecution` 等自定义角色（通过 `CustomAgentMessages` 声明合并扩展）一直留在内部状态里，只在 `convertToLlm` 时渲染成 user/developer 消息。这样内部状态可以很丰富，而 LLM 协议保持干净。

### 2.2 turn、事件与“完成”的三种含义

- **一个 turn = 一次 LLM 调用 + 它引出的所有工具执行**。事件嵌套为 `agent_start › turn_start › message_* / tool_execution_* › turn_end › … › agent_end`；`message_update` 只针对 assistant 消息。
- **工具失败直接 throw**，由 loop 转成 `isError: true` 的 toolResult。遥测里工具状态分为 `ok|error|skipped|blocked|timeout|aborted`：`beforeToolCall` 拦截记为 `blocked`，中断跳过记为 `skipped`，可以区分“模型写错了”和“被策略挡住了”。
- **`agent_end` 不等于结束**，文档区分了三层：
  - `agent_end.yielded`：`false` 表示 Agent 还在做自己的事（重试、压缩后续跑、停止时的提醒），这种 `agent_end` 不完成任何 prompt。
  - `agent_end.isTerminal`：`false` 表示维护或异步投递还会恢复会话。
  - RPC 层的 `prompt_result`（本次 prompt 已 yield）与 `session_settled`（没有任何东西还能唤醒会话：无排队消息、无后台 bash/task、无待投递内容）。拆开这两个信号是为了解决“后台任务回灌结果时宿主过早回收沙箱”。

### 2.3 扩展事件时序（loop 的挂载点地图）

根据 `extensions.md` 和 `skills/authoring-hooks.md` 整理：

```text
用户输入
 ├─ input                          可转换或接管输入
 ├─ [内置命令 → extension 命令 → TS/MCP prompt 命令 → 文件 slash 命令 → prompt 模板]
 ├─ before_agent_start             在“出队”时触发而非入队时；可改 system prompt；base 变化最多重试 3 次
 ├─ agent_start
 │   └─ 每个 turn：
 │       ├─ turn_start
 │       ├─ context                每次 LLM 调用前链式改写 messages
 │       ├─ before_provider_request 可替换 provider payload
 │       ├─ message_start / update* / end
 │       ├─ after_provider_response
 │       ├─ 每个工具调用：
 │       │   ├─ tool_call          参数准备阶段；可 block、改 input、加 additionalContext；抛错即阻断（fail-closed）
 │       │   ├─ tool_approval_requested / resolved
 │       │   ├─ tool_execution_start / update* / end
 │       │   └─ tool_result        中间件链，可改 content/details/isError
 │       └─ turn_end
 ├─ session_stop                   仅主会话；advisory continue 最多 8 次；等后台 job 空闲后才触发
 └─ agent_end                      纯通知
```

几个值得注意的契约：`tool_call` 改写后的 input 会重新校验，并被并发调度、审批门和持久化统一看到；`additionalContext` 只在工具真正成功后才投递，被拦截或失败时丢弃，防止策略文本与实际结果不一致；多个 handler 冲突时各事件的合并规则不同（`tool_call` 的 input 最后一个生效、首个 block 短路；`context` 链式；`session_before_*` 任一 cancel 短路）。

### 2.4 steering、follow-up 与 aside

- `steer(msg)`：在运行中注入消息，打断式。
- `followUp(msg)`：在 Agent 本该停止时再开一轮。
- `sendCustomMessage({deliverAs: "aside"})`：在下一个 step 边界投递，**不打断**当前工具批次；会话空闲时直接开始新 turn。
- 两个队列都有 `one-at-a-time`（默认）和 `all` 两种出队方式。
- `interruptMode` 取 `immediate`（默认）或 `wait`。它的真实语义见第 13 节。

---

## 3. 恢复：重试与压缩

### 3.1 分派顺序

重试和压缩都由 `AgentSession` 处理。`agent_end` 之后先判断 `TurnRecovery.isRetryableError`，一旦发起重试，本 turn 就跳过压缩检查；上下文溢出被排除在重试之外，交给压缩。**turn 中途**另有一条压缩路径（3.3 节第 5 条）。

### 3.2 非压缩类重试（`non-compaction-retry-policy.md`）

- **可重试**：`stopReason === "error"`、不是溢出，且属于分类器拒答、过期的 Responses 回放、或归一化分类为可重试的错误（429/5xx、过载、网络、超时、usage limit）。
- **能否重放看已流出的内容，而不是看错误类型**：已流出可见文本、图片、工具调用或 server-tool 块就不重放；只含 thinking 或空白的部分输出可以丢弃后重试。
- **保留并续跑**：中断的 turn 如果所有工具调用都已有结果，或者是已解决的流停滞、HTTP/2 RST，就保留失败序列直接续跑，避免重复执行已完成的副作用。
- **退避**：`min(500ms × 2^(n−1), 8000ms) × (75–100% 抖动)`，默认最多 10 次；读取 `retry-after` 等 header；延迟超过 `maxDelayMs` 且无法换凭据或换模型时立即失败。
- **usage limit**：先轮换凭据；否则等“provider 提示时间”与“下一个兄弟凭据解封时间”中较早者。
- **模型 fallback**：`retry.fallbackChains`，fallback 模型拿到全新的重试预算，默认冷却到期后回切。
- 成功后，持久化的错误 entry 标上 `retryRecovery`，界面显示为灰色注记，重建上下文时排除。

### 3.3 压缩（`compaction.md`）

**6 种触发**：

1. 手动 `/compact`。
2. 溢出恢复：先尝试**上下文升级**（换到更大窗口的模型），不行再压缩；**跳过 handoff**（handoff 会复用已溢出的输入）。
3. 不完整输出恢复（`stopReason === "length"`）：允许 handoff。
4. 一次成功 turn 后的阈值维护。
5. **turn 中途阈值维护**：在工具循环的下一次请求发出前检查（`compaction.midTurnEnabled`，默认开；子代理强制开，因为一个任务就是一个 turn）。源码实现是 loop 的 `onTurnEnd` 钩子，见 [oh-my-pi 架构设计](/personal-blog/articles/omp-architecture/) 的 4.4 与 8.3 节。
6. 空闲维护（默认关）。

**方法链** `compaction.methodOrder` 默认 `["remote", "snapcompact", "handoff", "shake", "soft"]`，某个方法不可用或失败就推进到下一个：

| 方法 | 做法 | 亮点 |
|---|---|---|
| remote | OpenAI Responses 原生流式压缩（V2）/ `/responses/compact`（V1）/ Anthropic 服务端压缩 / 自定义端点 | Anthropic 通道复用 live 请求命中 prompt 缓存 |
| snapcompact | 把被丢弃的历史**用像素字体打印到 PNG 帧**，按模型选字形和帧尺寸 | 本地确定性、不需要网络，利用视觉模型按图像计费；可用于溢出恢复 |
| handoff | 旁路请求生成交接文档，作为 compaction entry 提交 | 交接指令放在尾部 user 消息，缓存前缀只在最后一条分叉 |
| shake | 把大工具结果和大代码块替换成可恢复的 `artifact://` 引用 | 回收量不够时推进，避免空跑 |
| soft | 常规 LLM 摘要 | — |

**其他关键规则**：

- **推测压缩**（默认开）：上下文进入 `[threshold − lead, threshold)` 区间就在后台基于分支快照提前生成摘要；真正越过阈值时立即提交，快照之后的 turn 原样接在后面。前缀变化即作废。
- **切点硬规则：永远不在 `toolResult` 处切**。切点不在 user turn 起点时属于“分裂 turn”，分别生成历史摘要和 turn 前缀摘要再合并。
- **预剪枝**：保护最近 40k 的工具输出 token，只在总节省 ≥ 20k 时才剪；工具可标记结果 `useless`，这类结果只在原位清空、从不删除，工具调用配对和原生回放因此保持完整。
- **文件操作追踪**：摘要末尾附 `<files>` 树，标注每个文件是 Read/Write/RW。
- **显示与上下文分离**：界面只插一条 `── 📷 compacted ──` 分隔线，只有 LLM 上下文在边界处重置。
- 默认值：`keepRecentTokens=20000`；`reserveTokens` 下限 16384 且至少为窗口的 15%。

---

## 4. TTSR：流中规则注入（`ttsr-injection-lifecycle.md`）

TTSR 是 Time Traveling Stream Rules。规则平时不占上下文；模型输出流一旦命中条件，就中止当前流、注入规则、从同一位置重试。这是 oh-my-pi 最有特色的 loop 级机制。

1. **三种条件**：`condition`（正则，在流中对增量同步匹配）、`astCondition`（ast-grep，**在被 await 的 `beforeToolCall` 中对最终参数检查**，命中则在副作用发生前拦截）、`question`（judge 模型事后判定，永不中断）。
2. **scope**：默认是 assistant 文本加全部工具参数，不含 thinking；可写 `tool:edit(*.ts)` 这类按工具和路径的范围。多文件补丁按文件拆成 `{path, digest}` 分别检查，Markdown 片段不会误触发 TS 规则。
3. **中断路径**：命中 → 立即 `agent.abort()`（命中工具时只中止该调用，兄弟调用收到 `TTSR interrupt on another tool call`）→ 异步发 `ttsr_triggered`（不等待）→ 50ms 后校验 retry token、generation、abort 状态 → 丢弃部分输出 → 追加隐藏的 `<system-interrupt reason="rule_violation">` 并持久化 → `agent.continue()`。
4. **不中断的命中**：工具来源的在 `afterToolCall` 时把 `<system-reminder>` 前置到工具结果；文本来源的在消息结束后用 `followUp` 延后投递。
5. **重复策略**：`once`（默认）或 `after-gap`（间隔按完成的 turn 数计算，默认 10）。已注入规则持久化在会话树里，恢复后按分支路径还原，压缩后仍然有效。

设计要点：“立即 abort、异步通知、延迟重试并多重校验”的顺序保证扩展回调永远不会阻塞中断，过期的重试也不会误触发。

---

## 5. 会话：append-only 树（`session.md`、`session-tree-plan.md`）

- **物理格式**：JSONL。文件开头是**固定 256 字节的 `title` 槽**（重命名只需原地覆盖这一段，再追加一条审计 entry），之后是 header，再之后是 entry 序列。
- **树语义**：每个 entry 有 `id` 和 `parentId`；每次 append 挂在当前 `leafId` 下并成为新 leaf。分支、回退、摘要都只是移动指针或追加标记，历史从不修改。
- **`buildSessionContext`**：从 leaf 沿 `parentId` 走到根（遇重复 id 即停，防环）→ 沿路径推导模型、thinking、service tier、mode、已注入的 TTSR 规则 → 按后出现的 `reset_boundary`（`/clear` 写入）或最近一次 compaction 选择输出边界 → 移除悬空的工具调用、丢弃不安全的 aborted/error 回合。
- **写入**：新会话懒创建（出现第一条 assistant 消息才落盘）；不 `fsync`（只防软件崩溃）；`session_exit` 写入后立即同步 flush，恢复时发现尾部未终结就补一条 `stopReason: "aborted"` 的合成消息。
- **体积控制**：超过 50 万字符的字符串截断（签名块、加密块必须按字节保留）；图片 base64 外置为内容寻址 blob。
- **`/tree` 选中 user 消息时 leaf 回退到它的父节点并把原文回填编辑器**，“改写并重跑某条 prompt”自然形成新分支。
- 操作分层清晰：`/fresh` 切断 provider 流状态、`/clear` 切断模型上下文、`/new` 切断会话身份、`/delete` 删除磁盘数据。

---

## 6. 上下文工程：一切围绕缓存前缀

文档反复出现同一个设计约束：**保住 prompt 缓存前缀的字节稳定**。

- **system prompt 分块**：静态块在前，所有依赖 cwd 的内容（工作站信息、`<repo-rules>`、`<dir-context>`、`<workspace-tree>`）集中在尾部的 `<project-context>`；Anthropic 缓存断点落在它之前。不同目录或 worktree 的会话因此共享静态前缀。
- **上下文文件**：从约 15 种来源（`.omp`、`.claude`、`.codex`、`.gemini`、`.cursor`……）发现 `AGENTS.md`/`CLAUDE.md` 等，按优先级数值去重，每个目录深度保留一个；支持 `@` 导入（最多 5 跳，防环）。更深目录中未加载的 AGENTS.md 只列路径作为指针。
- **规则统一为 `Rule` 结构**，按字段组合自动分到三个桶：TTSR（事件驱动）、always-apply（常驻注入）、rulebook（只列描述，模型按需 `read rule://<name>`）。
- **skills 渐进披露**：prompt 里只放 name + description，正文让模型 `read skill://<name>`。
- 其他为缓存让路的设计：`learn` 记下的经验**下一个会话**才注入；用户新标记的子代理模型通过隐藏的 delta 通知送达，不改 task 工具描述；压缩请求用 `toolChoice: "none"` 保持 tools 前缀不变；handoff 与 `/btw` 侧问题复用主会话缓存前缀。

---

## 7. 多代理

- **task 子代理**：批量形态 `{context, tasks[]}`；每个任务有独立的 `solutionSpace` 字段，它是“自动思考档位”分类器**唯一**的输入（按问题开放程度而非工作量选档）。子会话不继承对话历史，审批强制为 yolo（父代理的 task 审批就是授权边界）；必须调用隐藏的 `yield` 工具收尾，最多提醒 3 次后强制 `toolChoice = yield`。
- **生命周期**：完成后 idle 保活，7 分钟后 park（释放会话、保留引用），`write agent://<id>` 可唤醒复用上下文。
- **隔离**：通过 Rust PAL 选择 APFS/btrfs/zfs/reflink/overlayfs/ProjFS/复制等后端，合并用 patch 或 branch + cherry-pick。递归深度默认上限 2。
- **Advisor（旁路审查）**：独立的 `Agent` 和 `ToolSession`，只读主代理 transcript 的增量，通过 `advise` 工具注入建议，分 `nit`（aside）、`concern`（条件允许时 steer）、`blocker`（即使主代理已给出终局回答也触发新 turn）三级。投递由一个状态机决定（loop 是否在流式输出、主代理是否已给出终局回答、用户是否主动中断），再加上去重/升级放行/每次更新预算的 emission guard 和 `immuneTurns=3`，防止审查模型刷屏或在用户按 Esc 后把 Agent 拉起来。
- **Vibe 模式**：顶层会话变成“导演”，只保留 read、todo 和 5 个 worker 控制工具。
- **Collab**：端到端加密的实时会话共享，密钥只在 URL fragment 里，relay 看不到内容。

---

## 8. 工具体系亮点

- **hashline 编辑（默认模式）**：`read`/`grep` 为每个文件输出 `[PATH#TAG]` 头（TAG 是整个文件内容派生的 4 位十六进制快照标签）和 `LINE:TEXT` 行；编辑时引用 TAG 和**原始快照行号**，模型不需要计算偏移。**只能编辑 read/grep 实际展示过的行**，把可见范围变成编辑权限边界。标签过期时只在快照链能证明唯一结果时才恢复。另有 `apply_patch`/`patch`/`replace`/`sloppy` 模式。
- **auto-repair**（默认关）：编辑让文件无法解析时，找出“回退后能恢复解析的最小 hunk 集合”作为修复区域，交给小模型修，并显式拒绝“修复就是回退”的候选；参数来自回放统计。
- **bash**：默认执行引擎是内嵌的 brush shell，coreutils 在进程内实现；`scheme://` 路径在每个 I/O 操作时解析，外部程序看不到虚拟路径。并发调用时退化为一次性 shell 而不共享会话，避免 abort 误伤。
- **OutputSink**：内存只保留 20 KB 头 + 50 KB 尾，溢出时把原始流镜像写到 artifact，结果附 `artifact://<id>`。
- **eval**：持久 Python/JS cell，可在代码里调用 `tool.*`、`agent()`、`workpool()`；用 `@tool` 定义的 kernel 函数能交给子代理调用；等待子代理时暂停 cell 超时预算。
- **两阶段改写**：`ast_edit` 先预览，经 `write xd://resolve` 才应用，应用前重跑比对计数防过期；定稿通道复用 `write`，不额外增加工具。
- **checkpoint/rewind**：rewind 在 `turn_end` 才生效，用会话树分支 + 摘要“遗忘”探索过程，原始记录仍在 JSONL 里可审计。

---

## 9. LLM 层

- **loop 只认一种流**：所有 provider 归一成 `AssistantMessageEvent`（`start`、`text_*`/`thinking_*`/`toolcall_*` 的 start/delta/end、终态 `done` 或 `error`）。增量 tool-call JSON 仅在新增 ≥ 256 字节时才重新解析，避免 O(n²)。
- **首事件与 idle watchdog**，`trackLocalWork()` 让本地耗时不被误判为上游卡死。**从不在 chunk 中途续传**，只做有界重试；**出现可见副作用后不再重试**。
- **文本工具方言（owned dialect）**：模型或 endpoint 不支持原生 tools 时，omp 剥离 `tools` 字段、注入 `# Tools <tools>…</tools>` 模板、把历史里的工具调用重编码为该模型训练时见过的文本格式（GLM、Hermes、Qwen3、Kimi、DeepSeek、Harmony、Gemini、Gemma 等 12 种），再用 scanner 从流里解析回标准 `toolcall_*` 事件，对 loop 透明。`StreamMarkupHealing` 复用这些 scanner 修复原生模式下模型“漏出”的文本工具标记。
- **GPT-5 Harmony 泄漏勘误**：GPT-5 在工具参数内部对 Harmony 控制 token 做了 logit mask，模型会输出 `to=functions.X` 这类“影子文本”。缓解：回放时转义 `<|...|>`、需要辅助信号才判定泄漏、最多重试 2 次、对 edit/eval 做“截断 + `*** Abort`”定点恢复。
- **compat 标志代替 provider 分支**：catalog 构建期预构建 `whenThinking` 变体，请求期只做指针切换；strict schema 失败按 `provider:baseUrl:modelId` 记忆。模型策略只能写在 KDL 规则里，TS 中禁止按模型 id 做字符串匹配（`AGENTS.md`）。
- **模型是角色而非 ID**：`default`/`smol`/`slow`/`plan`/`task`/`advisor`/`tiny` 等，有别名与回退链。

---

## 10. 扩展体系

以 **extension** 为统一内核：hook 是它的遗留子集；custom tool 和 MCP tool 都被桥接成 extension 工具（因此都经过 `tool_call`/`tool_result` 拦截）；skills、slash commands、rules 是基于 **capability provider** 的文件型资源，共用“按优先级加载、按 name 去重、被遮蔽项标记 `_shadowed`”的骨架。

- **extension 无沙箱**，与主进程同权限；为此提供托管定时器兜住回调异常，并在 `session_shutdown` 自动清理。加载期调用 action 直接抛错，杜绝初始化顺序 bug。
- **MCP**：250ms 快启门 + `DeferredMCPTool`，慢 server 不阻塞启动，就绪后热绑定；重连指数退避，30 秒内超过 5 次熔断；`#epoch` 防止迟到的重连复活旧连接。stdio `request()` 故意不 await `stdin.write()`，否则管道写满时超时和 abort 传不回来。
- **插件安装**会对 extension 做“试初始化”，失败则回滚 `package.json`、`bun.lock` 和旧包快照。

---

## 11. 原生层与 TUI

- **Rust N-API**：判定标准是“能消除已证实的 CPU、阻塞 I/O 或平台集成成本，且边界保持面向数据”才移植；有反例（`sanitizeText` 移回 JS）。版本号不编译进 addon，而是构建后写入一个固定的 64 字节槽位，发版不用重编译，loader 仍能区分“需要重启”与“需要重装”。
- **跨 FFI 协作式取消**：`CancelToken` 把 JS 的 `AbortSignal` 与超时桥接进 Rust 遍历器和 PTY 循环（最多 16ms 检查一次），shell 取消向基线快照之后产生的后代进程发终止波次，2 秒宽限后强杀。
- **TUI 双通道**：渲染器不推断哪些行已定稿，由应用提供 `{history, viewport}`：history 是带单调 id 的只追加 batch，写一次后 ack；viewport 逐行 diff 只输出变化行。所有写入在同步输出帧内完成、写入时关闭自动换行，从根上消除闪烁和 scrollback 污染。

---

## 12. 安全与审批

- **三层输入**：工具声明的 tier（`read`/`write`/`exec`，未声明按 exec）、工具自身 policy、用户策略 `tools.approval.<tool>`。
- **模式**：`always-ask`、`write`、`yolo`（**默认**）。子代理以 yolo 无头运行。
- **bash 危险模式**（`rm -rf /`、fork bomb、下载后执行等）强制提示；`bash.patterns` 的 deny 在 yolo 下也生效。文档明确：**pattern 不是隔离**，`eval` 里启动的 shell 不受 `bash.patterns` 约束。
- **secret 混淆**（默认关）：发往 provider 的文本替换为 HMAC 占位符，工具参数执行前还原，回放前再混淆。

与 Codex 相比，oh-my-pi 没有 OS 级沙箱，安全模型是“审批 + 模式匹配 + 混淆”，默认信任度更高。

---

## 13. 文档与源码不一致之处

| 主题 | 文档说法 | 源码实际 |
|---|---|---|
| steering 时机与 `interruptMode` | `packages/agent/README.md` 与 `agent.ts:142` 注释：`immediate` 下“每个工具调用后检查”；`rpc.md`：`immediate` 下待处理 steering 可以中止本 turn 剩余的工具调用 | `types.ts:171-177` 与 `agent-loop.ts:3067-3070`：`immediate` 截断**可中断的等待**，并对其他运行中的工具发出协作式 `steeringSignal`（工具可以响应，比如自动转后台）；`wait` 让非可中断工具不受打扰，但可中断的等待仍被截断。不可中断的工具不会被跳过，steering 在批次边界注入 |
| 工具并发 | agent README 未提及 | loop 有 shared/exclusive 调度（见 [oh-my-pi 架构设计](/personal-blog/articles/omp-architecture/) 的 4.7 节） |
| 包名 | agent README：`@oh-my-pi/pi-agent` | `packages/agent/package.json` 与根 README 包表都是 `@oh-my-pi/pi-agent-core` |
| TTSR 全称 | `skills/authoring-hooks.md` 注释为 “too-short response” | 正式定义是 Time Traveling Stream Rules（`ttsr-injection-lifecycle.md`） |
| computer 前台接管 | `tools/computer.md`：`delivery: "background" \| "foreground"` | `computer-use.md`：`{ takeover: true }`，两篇互相矛盾 |
| checkpoint | 工具摘要写 “git-based checkpoint” | 实现不调用 git，只处理会话树（`tools/checkpoint.md` 自己也指出了这一点） |
| 编辑模式 | `tools/edit.md` 列 4 种 | `edit/settings.ts` 的 `EDIT_MODES` 还有 `sloppy`，共 5 种 |

## 14. 文档没覆盖、必须读源码的部分

以下都在 `packages/agent/src/agent-loop.ts`，详见 [oh-my-pi 架构设计](/personal-blog/articles/omp-architecture/)：

- `runLoopBody` 的外层/内层循环结构和续跑条件。
- 工具调度的 shared/exclusive promise 链，以及 interruptible 与非 interruptible 两种中止信号。
- 流式期间的推测执行（默认关，只针对只读工具，最多 2 个在途）。
- tool call/result 配对不变式在 7 条路径上的维护，合成结果带 `__synthetic` 标记。
- steering/aside 队列的投递记账（未真正投递的消息会被恢复）。
- `SoftToolRequirement` 的升级上限（3 次）、`pause_turn` 续跑上限（8 次）、Harmony 泄漏重试时温度 +0.05。
- `onTurnEnd` 钩子与 `AgentSession` 如何在 turn 中途原地替换消息数组完成压缩。

## 15. 原始文档

| 文件 | 内容 |
|---|---|
| [docs/](https://github.com/can1357/oh-my-pi/tree/df731d516c0c722f658312187ae84c6d23e216fb/docs) | 原始文档（134 篇） |
| [packages/agent/README.md](https://github.com/can1357/oh-my-pi/blob/df731d516c0c722f658312187ae84c6d23e216fb/packages/agent/README.md) | Agent 内核契约 |
