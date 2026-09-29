---
title: "DeepSeek Harness 架构调研：资料索引"
description: "近两个月网上关于 DeepSeek Harness 的架构解析文章、书、视频、改写项目，以及它们的版本基线与可信度。"
publishedAt: 2026-09-29T03:35:00.000Z
reviewedAt: 2026-09-29
category: "Agent 架构调研"
tags: ["ai"]
readingMinutes: 12
parent: "dsh-architecture-analysis"
order: 5
---
> 调研日期：2026-09-29。时间窗口：2026-07-29 ～ 2026-09-29。dsh 于 2026-08-13 首次开源，所以窗口内的资料全部在 8/13 之后。
> 源码快照：deepseek-ai/deepseek-harness，tag `dsh-v0.2.0-rc.1`，commit `4878cdab`（2026-09-28）。
> 可信度标记：**A** 源码级、钉了版本、抽查与源码一致；**B** 源码级但没钉版本，或是准确的文档解读；**C** 新闻、综述、上手向；**D** 有明显事实错误。

本系列各篇的阅读顺序与递进关系见 [学习路线导引](/personal-blog/articles/dsh-architecture-analysis/)。

---

## 1. 官方信息与发版节奏

| 项 | 内容 |
|---|---|
| 仓库 | [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)，MIT，TypeScript + pnpm monorepo，创建于 2026-08-13 |
| 官方发布页 | [DeepSeek Harness Developer Preview](https://deepseek.com/harness/en/)：一切皆插件、四种模式、Trajectory 视图 |
| 文档站 | [deepseek-harness.github.io](https://deepseek-harness.github.io/deepseek-harness/)：Architecture reference、Cordis 入门与 7 章教程、配置目录 |
| 分发 | npm `@deepseek-ai/dsh`；PyPI `deepseek-harness-sdk`（stdio 驱动 + 内置 Node 可执行文件） |
| Cordis 论文 | [arXiv 2608.25512 — A Programming Paradigm for Spatiotemporal Composability](https://arxiv.org/abs/2608.25512)，与 dsh 同日公开 |

**发版节奏**：每周 1 ～ 3 个预发布，alpha 和 rc 双轨，一直没有 stable；仓库没有 CHANGELOG。

| Tag | 日期 | 说明 |
|---|---|---|
| （首发，无 tag） | 08-13 | 仓库 0.1.0-rc.5，npm 0.1.0-rc.6；首发历史被 squash 成一个提交 |
| dsh-v0.1.0-rc.7 / rc.8 | 08-17 / 08-19 | |
| dsh-v0.1.1-rc.1 / rc.2 | 08-21 | |
| dsh-v0.1.2-alpha.1 ～ rc.1 | 08-27 ～ 09-02 | |
| dsh-v0.1.3-alpha.1 / alpha.2 | 09-04 / 09-07 | |
| dsh-v0.1.5-alpha.1 ～ rc.2 | 09-08 ～ 09-10 | 没有 0.1.4 |
| dsh-v0.1.6-alpha.1 / alpha.2 | 09-15 / 09-17 | |
| dsh-v0.1.7-alpha.1 ～ rc.2 | 09-22 ～ 09-24 | 会话格式写入器升到 V4 |
| **dsh-v0.2.0-rc.1** | **09-28** | 本调研快照。修复"工具调度失败导致会话无法继续"；定时任务移到可选 bundle |

## 2. 架构 / 源码分析文章

### 2.1 中文

| 资料 | 日期 | 版本基线 | 要点 | 可信度 |
|---|---|---|---|---|
| [递归客《一切皆插件：DeepSeek Harness 源码之书》](https://github.com/diguike/book-deepseek-harness)（21 章 + mini-dsh） | 8 月中旬起连载 | 0.1.0-rc.6 / `47f94385` | 第 9 章逐函数讲执行循环：收件箱、step 前瀑布、"请求 == 日志推导"断言、请求头快照、工具有序提交、滚动池。附 2,655 行的 mini-dsh 和 65 个测试 | A |
| [ovO《DeepSeek Harness 源码解读》（一）～（四）](https://jishuzhan.net/article/2094302339587559426) | 08-31 | 0.1.0-rc.5 | （四）沿 `agent.ts` 逐函数走：三种输入、零 step 的 turn、同一 step 内重试、turn-stopping 双重检查。预告的工具调度篇没有出现 | A- |
| [两万五千个小时《Agent Loop 是怎么转起来的》](https://jishuzhan.net/article/2088866152330969089) | 08-16 | 首发版 | kick → turn → preStep → step | B+ |
| [starp《Agent Loop 全解析》](https://juejin.cn/post/7674818974897438762) | 08-17 | 读的是 npm 编译产物 | 滚动池、有序提交 | B |
| Loong's Blog《把 Agent 拆成可替换的零件》 | 08-24 | 0.1.1-rc.2 | 能力接缝、loop 的可替换性 | A- |
| [王若风《连 agent loop 自己都是插件》](https://wangruofeng007.com/blog/2026-08/deepseek-harness-plugin-architecture/) | 08-14 | 0.1.0-rc.5 | 五层架构图；Cordis 本地修改；`dsh plugin` 是包管理器转发器 | B+ |
| [鸭哥《深度剖析 DeepSeek 最新的 Harness DSH》](https://yage.ai/share/dsh-deep-analysis-20260813.html) | 08-13 | 首发版 | 与 Codex 写死的 `run_turn()` 对比；"自进化"动机 | B |
| [腾讯科技《DeepSeek 的 Harness，为何是一头黑色鲸鱼？》](https://www.36kr.com/p/3938566998834308) | 08-14 | 首发版 | 行业定位、只追加日志的数据治理风险 | C |

### 2.2 英文

| 资料 | 日期 | 版本基线 | 要点 | 可信度 |
|---|---|---|---|---|
| [MartianLee — Analyzing DeepSeek Harness](https://martianlee.github.io/posts/2026-09-05-deepseek-harness-architecture) | 09-05 | 0.1.3-alpha.1 / `d347e703` | 按行统计补丁；agent 工厂只有一个槽位；给了阅读顺序。**窗口内版本最新的英文源码分析** | A |
| [Open Harness — A Source-Level Deep Dive](https://www.open-harness.net/deepseek-harness-architecture/) | 08-14 | 0.1.0-rc.5 / `47f9438` | 空根配置 + 补丁层；vendor 18 处本地修改；工具管线"先记日志再授权、fail-closed"；指出源码里没有 "Creator" preset；Web 端首发时只有 Origin 围栏（#853） | A |
| [Dwarves Foundation — DeepSeek Harness, dissected](https://memo.d.foundation/deepseek-harness-architecture) | 首发后一天内 | 首发版 | 六个核心服务；与 Claude Code 资产的兼容对照 | B+ |
| [Developers Digest — What 453K Lines of Agent Runtime Actually Say](https://www.developersdigest.tech/blog/deepseek-harness-dsh-first-look) | 08-13 | `47f9438` | 约 45.3 万行、219 个包；请求字节级比对的不变量；离线回放测试；沙箱 fail-closed | A- |
| Youssef Hosni — Inside DeepSeek's 170K+ Stars（Substack） | 08-24 | 约 rc.8 | 五个模式：日志重建不变量、重复工具提醒、代码执行模式等 | B+ |
| [DeepInfra — DeepSeek Harness review](https://deepinfra.com/blog/deepseek-harness-review) | 09-09 | 0.1.1-rc.2 | 6 个子 agent 提供者；接第三方模型 | B |
| [InfoQ — Modular, Unbundled AI Agent Infrastructure](https://www.infoq.com/news/2026/08/deep-seek-harness/) | 08-20 | 0.1 preview | 短新闻 | C |
| dev.to worldlinetech 系列 Part 2 | 09-12 | — | 把服务名写错（`ctx.model` 等） | D |

### 2.3 书、导读仓库、专题站

| 资料 | 版本 | 要点 | 可信度 |
|---|---|---|---|
| [hoco-scy/deepseek-harness-deep-dive](https://github.com/hoco-scy/deepseek-harness-deep-dive) | `47f94385` | 36 章、1,094 条证据记录（每条结论对应文件和行），中英双语 | A |
| [DeepSeek Harness in Depth](https://dsh-in-depth.com/) | 约 8 月底 | 代码级导读：agent loop、CI 与发版、Landlock、SDK、包索引 | A-（无作者、无提交） |
| [deepseekdocs.com「Agent 主循环」](https://deepseekdocs.com/docs/learn/core/agent-loop) | 0.1.5-alpha.1 / `5dda764e` | **找到的版本最新的中文源码导读**；把 step 描述成"一次模型推理或一次工具执行"不准确 | B |
| plwslpld-arch/deepseek-harness-internals | 有 `sources.lock.yml` | 把 dsh 和 Codex、Claude Code、Gemini、pi、OpenCode 放进同一框架横向讲 | A- |
| alchaincyf《从开机到拆开》橙皮书 | v260814 | 系统提示词、启动清单、原始日志，偏观察 | B |
| SheltonLiu-N/nano-cordis | — | 约 1,600 行 TS 重写 Cordis 核心，95 个测试 | B |
| libukai/awesome-deepseek-harness | 持续更新 | 资料索引 | 索引 |

## 3. 视频

B 站网页返回 412，标题、UP 主、日期、时长通过公开 API 核实；**视频内容没有逐个看**，分类依据标题和简介。

| 视频 | UP / 频道 | 日期 | 备注 |
|---|---|---|---|
| DeepSeek Harness 插件机制源码初探（BV1DagF62EQX） | IT周瑜 | 08-14 | 首发次日的源码向视频 |
| DeepSeek DSH 的"一切皆插件"，到底是怎么实现的？（BV17Xbp6MEkT） | blackstone_99 | 09-06 | Context / Service / Event / Effect / Fiber、Agent Loop、Session |
| DeepSeek-Harness 源码学习-第四章 启动流程（BV1ccYe6jEKi 等） | 元婴期架构师 | 09-13 | 长篇源码走读，专讲 Profile → Bundle → 插件树 |
| Cordis 五种事件分发一次讲透（BV12Yhy67EHZ） | 隔岸的灯塔_ | 09-25 | 深读事件分发；瀑布在 step 前、流、工具上的用法 |
| 「技术杂谈 08」DeepSeek Harness 满月（BV12Xe36PEh3） | Koala聊开源 | 09-18 | 播客：设计、风险、路线 |
| DeepSeek Harness Internals（YouTube Qjv8jdh4g38） | AgenticEngineering | 未核实 | AI 配音的架构讲解 |

另有一批时长同为 79:51 的"核心原理与插件化体系设计精析"课程被多个账号搬运引流，不建议作为资料来源。

## 4. 同类架构分析框架

- [arXiv 2609.00006 — Harness Engineering](https://arxiv.org/abs/2609.00006)：七子系统框架（本系列架构设计第一部分的章节骨架）。**没有收录 dsh**，数据截至 2026-07-10，早于 dsh 开源。
- 本博客的 Codex / oh-my-pi 系列用同一框架写成，可以逐节对照。

## 5. Benchmark

- 唯一的分数来源是 [DeepSeek-V4.1-Flash 模型卡](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash)：脚手架对比（DeepSWE v1.1 / Terminal-Bench 2.1）中 **DSH Minimal 72.6 / 90.6**、DSH Standard 70.5 / 85.8，对照 Claude Code 69.8 / 88.0、Codex 65.6 / 84.1、mini-SWE 74.2 / 90.3。
- 没有找到 SWE-bench Verified 成绩，也没有第三方独立复现。

## 6. archify 与 dsh

- archify 有一个官方 dsh 集成 `@tt-a1i/archify-dsh`，用途是**在 dsh 里跑 archify 去画别的仓库**。
- **没有找到**任何公开的、用 archify 画 dsh 自身架构的产物。现有的 dsh 架构图都是手绘或 mermaid，不能随版本更新。本系列的交互式架构图是第一份。

## 7. 改写、移植与衍生

| 项目 | 类型 |
|---|---|
| dshbox/cordis-rs | Cordis 的 Rust 移植 |
| redoop/dsh-rs | 基于 cordis-rs 的 dsh Rust 移植（crates.io 0.2.0） |
| bobleer/deepseek-harness-rust（BitFun） | Rust 重写，不是 Cordis 移植 |
| nano-cordis、mini-dsh、yanhua1010 mini harness | 教学用的精简重写 |
| TinyWhale、Oh-DSH、DeepSeek Orb | fork、发行版、衍生产品 |
| deepseek-harness-action、Ollama `ollama launch dsh` | 集成 |

## 8. 调研结论

1. **逐函数讲执行循环的文章有好几篇，但全部基于 8 月中下旬的早期版本**（0.1.0-rc.5 ～ 0.1.3）。版本最新的是 deepseekdocs（0.1.5-alpha.1）。**0.1.6、0.1.7、0.2.0-rc.1 的变化没有人分析过**，包括定时任务拆成可选 bundle、DeepSeek 认证拆包、工具调度失败的修复。
2. **深水区覆盖很薄**：工具调度器的取消竞态、压缩内部机制、落盘、子 agent 的继承与隔离、预设的代次隔离，只有零星讲解。
3. **安全与数据外发几乎没人系统讲**：沙箱只管文件写、审批只针对提权、默认同步会话日志给 DeepSeek，这些在本系列里第一次集中说明。
4. **没有独立 benchmark**，分数只来自 DeepSeek 自己的模型卡。
5. **没有可验证的架构图**。本系列的 archify 图每个节点都带固定提交上的源码引用。
6. 最值得读的外部资料：递归客的书（中文首选）、Open Harness 的深度拆解、hoco-scy 的证据索引、MartianLee 的分析。
