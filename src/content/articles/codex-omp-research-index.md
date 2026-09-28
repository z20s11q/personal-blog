---
title: "Codex / oh-my-pi 架构调研：资料索引"
description: "近两个月网上关于 Codex 与 oh-my-pi 的解析文章、改写项目、同类架构分析框架与可视化工具，以及调研结论。"
publishedAt: 2026-09-28T04:00:00.000Z
reviewedAt: 2026-09-28
category: "Agent 架构调研"
tags: ["ai", "development"]
readingMinutes: 22
---
**本系列**：**00 资料索引** · [01 Codex 自带文档总结](/personal-blog/articles/codex-bundled-docs/) · [02 oh-my-pi 自带文档总结](/personal-blog/articles/omp-bundled-docs/) · [03 Codex 架构设计](/personal-blog/articles/codex-architecture/) · [04 oh-my-pi 架构设计](/personal-blog/articles/omp-architecture/) · [05 两者对比与可借鉴点](/personal-blog/articles/codex-vs-omp/) · [06 交互式架构图导览](/personal-blog/articles/codex-omp-diagrams/)

> 调研日期：2026-09-28。时间窗口：只收录 **2026-07-28 之后**（近两个月）发布或更新的资料；更早的只在末尾“已排除”里列一行，便于溯源。
> 源码快照：
> - [openai/codex](https://github.com/openai/codex/tree/44fe510ce3ee61c8ef623adcbf89b901c73ddd61)，HEAD `44fe510c`（2026-09-28 06:30 UTC）
> - [can1357/oh-my-pi](https://github.com/can1357/oh-my-pi/tree/df731d516c0c722f658312187ae84c6d23e216fb)，HEAD `df731d51`（2026-09-28 10:27 +0200）

## 系列文章

| 篇目 | 内容 |
|---|---|
| [00 资料索引](/personal-blog/articles/codex-omp-research-index/) | 近两个月网上关于 Codex 与 oh-my-pi 的解析文章、改写项目、同类架构分析框架与可视化工具，以及调研结论。 |
| [01 Codex 自带文档总结](/personal-blog/articles/codex-bundled-docs/) | 把 Codex 仓库的 crate README 与官方在线文档按主题合并：协议状态模型、安全体系、hooks、上下文、多 agent，以及文档没覆盖、必须读源码的部分。 |
| [02 oh-my-pi 自带文档总结](/personal-blog/articles/omp-bundled-docs/) | oh-my-pi 自带 134 篇专题文档的主题化提炼：恢复与压缩、TTSR、会话树、工具、LLM 层、扩展体系，以及文档与源码不一致之处。 |
| [03 Codex 架构设计](/personal-blog/articles/codex-architecture/) | 语言无关地拆解 Codex：四层 Agent Loop、并行工具与编排、审批与沙箱升级、上下文管理、编排与扩展，附源码位置映射和交互式架构图。 |
| [04 oh-my-pi 架构设计](/personal-blog/articles/omp-architecture/) | 按同一骨架拆解 oh-my-pi：三层 Agent Loop、Agent 状态与插话队列、LLM 集成、工具调度、只追加会话树与原生层，附源码位置映射和交互式架构图。 |
| [05 两者对比与可借鉴点](/personal-blog/articles/codex-vs-omp/) | 只比较设计语义：两套 harness 的 loop 骨架、关键问题的不同解法、各自值得借鉴的设计，以及自己实现 coding agent loop 时的取舍。 |
| [06 交互式架构图导览](/personal-blog/articles/codex-omp-diagrams/) | 7 张可交互的架构图：两者的组件总览、Agent Loop 状态机、采样与插话时序、工具编排流程。点击节点可查看固定提交上的源码位置。 |

---

## 1. “类 archify”的架构文档 / 可视化文档

**archify 是什么**：[tt-a1i/archify](https://github.com/tt-a1i/archify) 是一个 agent skill（支持 Cursor / Claude Code / Codex CLI / OpenCode），让 agent 从仓库或描述生成**类型化 JSON IR**，再由 Node CLI 编译成可交互的单文件 HTML 架构图（architecture / workflow / sequence / dataflow / lifecycle 五类，带 schema 校验、PNG/SVG 导出）。它 fork 自 Cocoon-AI/architecture-diagram-generator。安装：`npx skills add tt-a1i/archify -g`。

**两个仓库里有没有这类文档**：

| 仓库 | 自带的架构类文档 | 结论 |
|---|---|---|
| Codex | 仓库 `docs/` 只有跳转页（指向 learn.chatgpt.com）；真正的内部设计说明散落在各 crate 的 `README.md`（`app-server/README.md` 31 KB 最重要，另有 `core`、`exec-server`、`network-proxy`、`linux-sandbox`、`memories`、`rollout-trace` 等）。仓库里有 `codex-rs/mermaid` crate，但那是渲染用的，不是架构图 | **没有**成体系的架构总览或可视化文档 |
| oh-my-pi | `docs/` 下 134 篇 md（约 2.6 MB），覆盖 compaction、session 树、TTSR、natives、TUI 渲染器、provider 流式内部等专题，有 `natives-architecture.md`、`blob-artifact-architecture.md`、`fs-scan-cache-architecture.md` 这类局部架构文 | 专题文档非常全，但**没有**全局架构总览，也没有 agent loop 的专门说明 |

**网上的第三方架构 / 可视化文档（非 archify 生成，但同类）**：

| 资料 | 类型 | 说明 |
|---|---|---|
| [DeepWiki: can1357/oh-my-pi · Architecture](https://deepwiki.com/can1357/oh-my-pi/3-architecture) | 自动生成的架构 wiki + 依赖图 | 分层（coding-agent → agent-core → ai → tui/natives），持续随仓库更新 |
| [DeepWiki: openai/codex](https://deepwiki.com/openai/codex) | 自动生成的架构 wiki | 同上，Codex 版 |
| [OpenAgents teardown: Codex agent runtime](https://github.com/OpenAgentsInc/openagents/blob/main/docs/teardowns/2026-07-10-codex-agent-runtime-teardown.md) | 长篇拆解（2026-07-10，略早于窗口，但是目前最系统的一份） | 统计了 125 个 workspace 成员、约 113 万行 Rust，逐项标注 `[source]`/`[inferred]` |
| [motosan-agent-primitives: CODEX_ARCHITECTURE_STUDY.md](https://docs.rs/crate/motosan-agent-primitives/latest/source/docs/CODEX_ARCHITECTURE_STUDY.md) | 对照式架构研究（crate 发布于 2026-05-29 至 06-02，早于窗口） | 聚焦 protocol / turn loop / tools / guardian / multi-agent，附源码行号 |

### 1.1 网上有没有人用 archify 或类似的架构框架解析 agent

（2026-09-28 检索）

**结论**：**没有找到**有人公开发布“用 archify 画出的 Codex、Claude Code、Pi 等 agent 的架构图”。能搜到的 archify 文章都在讲 archify 自身：[knightli 教程](https://knightli.com/en/2026/07/15/archify-skill-install-architecture-diagram-troubleshooting/)（2026-07-15）、[BSWEN 用法](https://docs.bswen.com/blog/2026-08-28-archify-claude-code-cursor-codex-architecture-diagrams/)（2026-08-28）、[MartianLee 拆解 archify](https://martianlee.github.io/posts/2026-09-12-archify-architecture)（2026-09-12，拿它重画了自己博客的图）、[掘金《酷猫带你看开源》第 1 期](https://juejin.cn/post/7679986697706979374)。archify 仓库自带的示例里有通用的“agent 工具调用工作流”和“agent 运行生命周期”图，但不对应任何具体产品；它的 Proof Lab 映射的是 `mco-org/mco`，不是 agent 框架。

但**用系统化的架构分析框架解析 agent** 的工作是有的，而且近两个月出了两篇重要论文。这类工作比“画图”更有参考价值：先定义一套与语言无关的分析维度，再把各家 agent 放进去比较。

**A. 架构分析框架（方法论）**

| 日期 | 资料 | 框架 | 覆盖的 agent | 说明 |
|---|---|---|---|---|
| 2026-09 | [arXiv 2609.00006 — Harness Engineering: Anatomy, Architecture, and Evolution of Coding Agents](https://arxiv.org/abs/2609.00006)（Wavestone AI Lab，83 页） | **七个标准子系统**：D1 Agent Loop、D2 LLM 集成、D3 工具与动作、D4 记忆与上下文、D5 安全与权限、D6 编排、D7 扩展；每个子系统给出最小实现和最大实现 | Claude Code、Codex CLI、Gemini CLI、Mistral Vibe、OpenHands、Aider、Mini-SWE-Agent、Hermes、**Pi**、OpenCode、OpenClaw，外加元 harness Omnigent | 快照钉在 2026-07 的版本，并与 2026-04 版做了 90 天纵向对比；归纳 13 条横向观察、29 个反复出现的设计模式、18 条设计建议和一个 90 行的最小 harness。**刻意不引用行号**，并把“结构性结论”（会长期成立）和“清单性结论”（几周就过时）分开标注。**本系列 03、04 的第一部分就按这七个子系统组织** |
| 2026-09-03 | [Codex Knowledge Base — 从 11 个 agent 的源码解剖看 Codex CLI 架构](https://codex.danielvaughan.com/2026/09/03/harness-engineering-anatomy-eleven-coding-agents-codex-cli-architecture/) | 上一篇论文的 Codex 视角解读 | Codex CLI | 要点：Codex 是语料中最大的系统（约 112 万行，126 个 crate，一个季度里从 62 万行、89 个 crate 几乎翻倍）；安全栈是语料中层次最多的四层结构，其中命令策略用一种确定性脚本语言描述，LLM 审查器位于 OS 沙箱之上 |
| 2026-08 | [arXiv 2608.10934 — Understanding the Architecture of Coding Agents: An Exploratory Study Using a Research Prototype](https://arxiv.org/abs/2608.10934) | 沿用 Rombaut 分类法的三层：控制架构、工具与环境接口、资源管理 | 自研教学原型 Ark，对照 Codex CLI、OpenCode | Ark 本身几乎全部由 Codex 写成。结论：三者控制架构相同（顺序 ReAct、由 LLM 驱动、命令式 while 循环），差异在工具数量、工具发现、隔离、状态表示、压缩和持久记忆 |
| 2026-04（窗口外） | [arXiv 2604.03515 — Inside the Scaffold: A Source-Code Taxonomy of Coding Agent Architectures](https://arxiv.org/abs/2604.03515)（Rombaut） | **3 层 12 维**分类法；提出 5 种可组合的循环原语（ReAct、生成-测试-修复、计划-执行、多次尝试重试、树搜索） | 13 个开源 scaffold（偏研究型：SWE-agent、Agentless、Moatless Tools 等；Ark 论文里 Codex CLI、OpenCode 两列直接取自这套分类） | 13 个里有 11 个组合了多种循环原语；所有结论都附文件路径和行号 |
| 2026-04（窗口外） | [arXiv 2604.14228 — Dive into Claude Code: The Design Space of Today's and Future AI Agent Systems](https://arxiv.org/abs/2604.14228)，[GitHub](https://github.com/VILA-Lab/Dive-into-Claude-Code) | **5 个价值 → 13 条设计原则 → 具体实现**的追溯框架（例如“拒绝优先并升级给人”“上下文是稀缺资源”“只追加的持久状态”） | Claude Code，对照 OpenClaw、Hermes Agent | 与语言无关的“设计问题清单”，每条原则都对应一个每个 agent 都必须回答的设计问题 |

**B. 和 archify 同类的图表 / 知识图谱工具**（都能在 Claude Code、Codex 等 agent 里作为 skill 使用，但**没找到**有人公开发布用它们解析 Codex 或 Pi 的成品）

| 工具 | 做法 |
|---|---|
| [archify](https://github.com/tt-a1i/archify) | agent 写类型化 JSON IR，确定性编译器校验并渲染；五种图：架构、工作流、时序、数据流、生命周期 |
| [likec4-skill](https://github.com/nedeadinside/likec4-skill) | 按 C4 模型写 LikeC4 DSL（上下文、容器、组件、代码、部署、动态视图），交付前跑 CLI 校验 |
| [c4-architecture skill](https://github.com/davila7/claude-code-templates/blob/main/cli-tool/components/skills/creative-design/c4-architecture/README.md)、[arc42-c4 skill](https://github.com/marvinrichter/clarc/blob/main/skills/arc42-c4/SKILL.md) | 用 Mermaid / PlantUML 生成 C4 图；后者把 arc42 的 12 个章节和 C4 各级别对应起来 |
| [Understand-Anything](https://github.com/Egonex-AI/understand-anything) | 多 agent 管线扫描代码库，生成可交互的知识图谱和按依赖排序的导览；支持装进 Codex、Pi 等 |
| [CodeBoarding](https://github.com/CodeBoarding/CodeBoarding) | LSP 静态分析 + LLM，生成可交互的架构图 |
| [DeepWiki](https://deepwiki.com/openai/codex) | 自动生成的架构 wiki（见上表），是目前唯一能直接看到 Codex / oh-my-pi 成品的一类 |
| [claude-code-ultimate-guide 的架构图](https://github.com/FlorianBruniaux/claude-code-ultimate-guide/blob/HEAD/guide/diagrams/04-architecture-internals.md) | 手写 Mermaid：Claude Code 的双层循环、工具分类、system prompt 组装与缓存分区、子 agent 隔离时序（未标注日期） |

---

## 2. 近两个月的 Codex 解析文章 / 视频

| 日期 | 资料 | 要点 |
|---|---|---|
| 2026-09-01 | [HarrisonSec — Three Agent Harnesses, One Loop](https://harrisonsec.com/blog/three-harnesses-one-loop/) | 对比 Claude Code / Codex / Pi 三个 loop。结论：中间的“组装上下文→调模型→执行工具→追加结果→判断是否继续”五步完全收敛，分歧在**边界**：Claude Code 边界在进程内，Codex 边界在 JSON-RPC 协议（app-server），Pi 边界在扩展宿主。另统计了 Pi 与 Codex core 的源码行数（12.1 万对 12.6 万）。注意：文中把 Codex loop 记为 `codex_thread.rs`（983 行），实际上那是线程门面，真正的循环在 `core/src/session/turn.rs::run_turn`（见 03 文档）；它测的 Pi 是上游 earendil-works/pi，不是 oh-my-pi |
| 2026-08-26 | [葡萄城/CSDN — Codex 开源 harness 全面了解](https://grapecity.csdn.net/6a8eab25662f9a54cba0aa57.html) | 中文调研：TS→Rust 的时间线、crate 职责表、`requirements.toml` 组织级约束、CI 用法 |
| 2026-08-24 | [Towards Data Science — Put Your Own Logic Inside the Codex Agentic Loop](https://towardsdatascience.com/put-your-own-logic-inside-the-codex-agentic-loop/) | 讲 hooks 在 loop 中的挂点（SessionStart / PreToolUse / PostToolUse / Stop），用 Stop hook 做结果校验的案例 |
| 2026-08-24 | [Praveen Vijayan — I Rebuilt the Codex CLI Harness on Bun](https://praveenvijayan.substack.com/p/i-rebuilt-the-codex-cli-harness-on) | 见第 3 节。附带发现：release 版 `codex exec` 每次退出要花约 900 ms 刷 OTel 指标，配置 `[otel] metrics_exporter = "none"` 可去掉 |
| 2026-08-01 | [Codex Knowledge Base — Grok Build Goes Open Source](https://codex.danielvaughan.com/2026/08/01/grok-build-open-source-apache-2-codex-cli-architecture-acp-tool-porting-terminal-agent-wars/) | xAI 的 Grok Build（84 万行 Rust）直接移植了 Codex 的 `apply_patch` / `grep_files` / `list_dir` / `read_file`；工具词汇表在各家之间趋同 |
| 2026-09-28 | [技术栈 — Codex 源码导读（系列）](https://jishuzhan.net/article/2104286105840447490) | 中文 10 篇系列，第 1 篇（工程分层）于 2026-09-28 发布。把 codex-rs 分成交互入口、Agent 编排、会话与持久化、模型接入、工具与安全、扩展协作 6 个概念层，外加横切基础设施；后续篇目讲 Turn 生命周期、沙箱、压缩、事件出口、模型网络、Skill/Agent、Agent Loop、工具路由、Session/Thread/Memory。基线 commit `d58d0e5841`（2026-08-31），比本调研的快照（`44fe510c`）早约 4 周，行号可能已漂移 |

**视频**：近两个月内**没有找到** Codex 源码级解析视频。能搜到的是使用教程（B 站“保姆级教程”系列、OpenAI 的 Getting started），以及 2026-05-21 的 [Codex CLI: The Architecture Behind Terminal Agents](https://www.youtube.com/watch?v=lQFmSMYrLYw)（超出窗口）。

## 3. 把 Codex 改写成 TS 或其他语言的项目

先说背景：Codex **本来就是 TS 写的**（2025-04 首发，React + Ink + Node），2025-06 宣布 Rust 重写，现在约 96% 是 Rust。老的 TS 实现还留在仓库 `codex-cli/`（`agent-loop.ts`），已是 legacy；现在的 `codex-cli/` 只是下载 Rust 二进制的 npm 壳，`sdk/typescript` 通过 JSONL / app-server 驱动 Rust 进程。

社区里**没有**完整“把 codex-rs 引擎重写成 TS”的成熟项目。能找到的是以下几类：

| 项目 | 语言 | 做了什么 | 日期 |
|---|---|---|---|
| [Bundex（praveenvijayan/codex，分支 `bundex-rename`）](https://praveenvijayan.substack.com/p/i-rebuilt-the-codex-cli-harness-on) | TS on Bun | 只重写 JS 外壳层（npm launcher、TS SDK、工具链），Rust 引擎不动；新 `BundexClient` 常驻一个 `codex app-server` 进程，10 轮对话快 2.3 倍（收益来自架构，Node 下同样成立） | 2026-08-24 |
| [kcosr/codapter](https://github.com/kcosr/codapter/) | TS | 实现 Codex **app-server JSON-RPC 协议**的适配器，让 Codex Desktop / CLI 等客户端接到其他后端（已实现 Pi 与 Codex 两个后端） | 2026-03-17 至 04-08（120 次提交，之后不再更新） |
| [oines/astral-code](https://github.com/oines/astral-code) | Rust（fork） | 基于 Codex runtime 的 provider 中立 fork，把 provider 认证/协议隔离出来，可接本地模型、Bedrock 等 | 持续维护：2026-07-28 之后 146 次提交，最近一次 2026-09-11（修压缩的多模态 token 估算） |
| [browser-use/terminal（REARCHITECTURE.md）](https://github.com/browser-use/terminal/blob/main/REARCHITECTURE.md) | Rust | “feature-port”了大量 Codex 机制（单个约 4.7 万行的同步 `lib.rs`），文档详细对比了自己与 Codex 的 loop / 并发 / 取消模型 | 仓库 2026-05-06 创建；该文档 2026-05-29 写成、06-02 最后修改；仓库 07-28 之后只有 1 次提交（08-16） |
| Grok Build（xAI） | Rust | 移植了 Codex 的 4 个工具实现（见上表） | 2026-08 开源 |
| [openclaw/openclaw](https://github.com/openclaw/openclaw/commit/432da8b3cbb89c75745f05d155cd92fbb07965fa) | TS | 自家 `agent-core` 的部分机制参照 Codex 实现（例如“中断的 turn 保留上下文”参照 `turn_aborted.rs`） | 2026-07-12（略早于窗口） |
| [artvandelay/codex-agentic-patterns](https://artvandelay.github.io/codex-agentic-patterns/) | Python 教学 | 把 Codex 的并行、审批等模式拆成教程并用 Python 复现 | 2025-10-07 至 2026-04-02（41 次提交） |

注：上表日期取自各仓库的 git 提交历史（2026-09-28 核对）。表里只有 astral-code 在近两个月内仍在活跃开发；其余项目虽然早于窗口，但它们是仅有的几类“改写或移植 Codex”的做法，所以保留在表里。

## 4. 近两个月的 oh-my-pi 资料

| 日期 | 资料 | 要点 |
|---|---|---|
| 2026-09-13 | [Kondasamy — Oh My Pi: The Maximalist Harness That Puts the IDE in the Loop](https://kondasamy.com/blog/2026/omp-coding-agent-architecture-deep-dive/) | 24 分钟长文架构深挖：Pi 极简 vs omp 极繁；hashline、LSP/DAP、Mnemopi 记忆、worker pool |
| 2026-09-04 | [wikivibe — omp 功能完整指南](https://wikivibe.ru/en/rabochee-mesto/oh-my-pi-guide/) | 31 个工具、60+ provider、hashline 在 Grok 4 Fast 上省 61% 输出 token |
| 2026-09-01 | [Composio — Pi vs OMP](https://composio.dev/content/pi-vs-omp) | 同一模型（DeepSeek V4 Flash）30 道难题：Pi 20/30、OMP 17/30，OMP 仍高于 Claude Code 16、Codex 16、OpenCode 14；OMP 更慢更贵 |
| 持续更新 | [DeepWiki: oh-my-pi](https://deepwiki.com/can1357/oh-my-pi) | 自动生成 |
| 持续更新 | [Noah Laratta — Getting the Most Out of Oh My Pi](https://noahlaratta.com/lab/oh-my-pi) | 使用向，含本地 DeepSeek V4 Flash 接入 |

---

## 5. 已排除（超出两个月，仅留作溯源）

OpenAI 官方《Unrolling the Codex agent loop》《Unlocking the Codex harness: how we built the App Server》（2026 年初）；Codex Knowledge Base 2026-03/04 的 codex-rs 架构与 agentic loop 文章；yage.ai 2026-03-14 internals survey；Telegraph《详读Codex的Agent Loop》2026-04-04；Zenn takiko 的 skills 实现分析；lesbass 2026-06-26 omp 报道；devbriefs（基于 legacy TS 版 `agent-loop.ts`）。

以下几项之前标为“日期未核实”，2026-09-28 核实后确认早于窗口，移到这里：

- [xiaonancs/codex-source-analysis](https://github.com/xiaonancs/codex-source-analysis)：2026-05-26 至 05-27，共 9 次提交。中文“Agent 核心循环”章节把 loop 分为会话层 `submission_loop`、任务层 `spawn_task`、回合层 `run_turn`、线程层 `ThreadManager` 四层。
- [NeuroStack — Codex 的 ReAct 式循环](https://chenzeqing.cn/codex-source-reading/codex-react-loop/)：基线 commit `7e71d026` 是 2026-05-05 的提交，文章约写于 2026-05。**原链接现已 404**，只能从搜索引擎摘要里看到内容，讲的是从 `handle_output_item_done` 到 `drain_in_flight`，observation 如何进入下一次采样。
- [HackMD — Codex Architectural Study: Prompt Caching, TurnContext & Multi-Agent Context Propagation](https://hackmd.io/nFworGJTQoWRebXk8NApFA)：文中示例数据的日期是 2026-05-24，约写于 2026-05。讲前缀缓存的分层布局、`prompt_cache_key`，以及子代理 fork 时如何裁剪父历史。

## 6. 调研结论

1. 两个仓库都**没有**现成的全局架构文档或可视化图；Codex 的设计知识在 crate README 与官方在线文档里，oh-my-pi 的在 `docs/` 专题里。本系列 03/04 两篇补的就是这块空白。
2. 近两个月的第三方解析主要集中在“边界”层面（app-server 协议、hooks、harness 对比），**逐函数讲清 `run_turn` / `agentLoop` 执行细节的新文章很少**。窗口内唯一的中文源码系列是技术栈的《Codex 源码导读》（2026-09-28 刚发第 1 篇，基线 2026-08-31）；xiaonancs、NeuroStack 等更早的解读基线在 2026-05，函数行号已漂移（例如 `run_turn` 现在在 `turn.rs:163`，不是 `:131`）。
3. **没有人公开发布过用 archify 解析 Codex 或其他 agent 的架构图**。同类的“架构框架式”解析有，近两个月最重要的是 arXiv 2609.00006 的七子系统解剖（覆盖 Codex CLI 和上游 Pi），以及 arXiv 2608.10934 用 Rombaut 三层分类法对比 Codex CLI 与 OpenCode。本系列 03、04 的第一部分按七子系统组织，可以直接和这篇论文对照。
4. 没有成熟的“Codex 引擎 TS 重写”。社区的共识做法是**保留 Rust 引擎、走 app-server 协议对接**（Bundex、Codapter 都是这个思路）。想要 TS 实现的完整 harness，oh-my-pi / Pi 本身就是现成的参照物。
