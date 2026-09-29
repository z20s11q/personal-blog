export const diagramDir = 'diagrams/codex-omp/';

export const diagramGroups = [
  {
    project: 'Codex',
    repo: 'https://github.com/openai/codex/tree/44fe510ce3ee61c8ef623adcbf89b901c73ddd61',
    revision: '44fe510c',
    article: 'codex-architecture',
    items: [
      { file: 'codex-components.html', kind: '架构图', title: '组件总览：从客户端到执行环境', description: '客户端 → 会话协议服务 → Op 分发器 → 任务管理 → Turn 循环 → 采样器；工具运行时 → 编排器 → Guardian / 隔离执行 → 执行环境。' },
      { file: 'codex-turn-lifecycle.html', kind: '状态图', title: 'Turn 循环状态机', description: '并入输入 → 冻结步上下文 → 采样 → 判定继续；turn 中途压缩的两个入口、Stop hook 的三种结果、四种结束方式。' },
      { file: 'codex-sampling-sequence.html', kind: '时序图', title: '一次采样：边流边派发，按派发顺序收割', description: '调用先写历史再派发；并行门的读写锁；插话与邮箱抢占；流结束后按序收割并发出进度事件。' },
      { file: 'codex-tool-orchestrator.html', kind: '流程图', title: '工具编排：审批 → 沙箱 → 执行 → 被拒后升级', description: '审批要求的三种结果、审批来源顺序、首次沙箱选择、五种不升级的情况、升级前免审条件。' },
    ],
  },
  {
    project: 'oh-my-pi',
    repo: 'https://github.com/can1357/oh-my-pi/tree/df731d516c0c722f658312187ae84c6d23e216fb',
    revision: 'df731d51',
    article: 'omp-architecture',
    items: [
      { file: 'omp-components.html', kind: '架构图', title: '组件总览：会话层 → Agent → Agent Loop', description: '运行模式 → 会话工厂 → 会话层 → Agent → Agent Loop → Provider 层；工具、MCP、子 agent、原生加速层。' },
      { file: 'omp-loop-lifecycle.html', kind: '状态图', title: '主循环状态机', description: '内层循环（准备一轮 → 采样 → 按停止原因分支 → 执行工具 → turn 结束）与外层循环（停止前排空）；“不执行工具”的四种情况。' },
      { file: 'omp-steering-sequence.html', kind: '时序图', title: '插话：出队不等于送达', description: '批执行中只看不取、两种中断信号、turn 边界出队、写入记录才算送达、run 结束时未送达的放回队首。' },
    ],
  },
] as const;

export const dshDiagramDir = 'diagrams/dsh/';

export const dshDiagramGroup = {
  project: 'DeepSeek Harness',
  repo: 'https://github.com/deepseek-ai/deepseek-harness/tree/4878cdabd87d4041bdaff61d04c966883b9fd07a',
  revision: '4878cdab',
  article: 'dsh-architecture',
  items: [
    { file: 'dsh-components.html', kind: '架构图', title: '组件总览：入口 → 注册表 → AgentLoop → 驱动器', description: '所有接入面都经 agent 注册表创建或恢复 agent；驱动器围绕会话日志运转，通过四个扩展点挂接重试、压缩、检查点等插件；工具注册表在流结束后调度，沙箱与审批在工具体内部。' },
    { file: 'dsh-composition.html', kind: '数据流图', title: '组合与装配：五层补丁 → 行表 → Loader → 服务与预设', description: 'bundle、profile、用户、启动参数、遥测关闭五层补丁按序叠加成行表；Loader 逐行挂载插件；HMR 只在 Web / 桌面做行级更新；预设按会话挂载并按代次引用计数。' },
    { file: 'dsh-turn-lifecycle.html', kind: '状态图', title: 'turn / step 状态机', description: 'step 准入 → 请求准备 → 采样 → 执行工具 → 关 step 判定；请求出错扩展点决定重试；turn 即将结束扩展点可追加消息续跑；四种结束方式。' },
    { file: 'dsh-step-sequence.html', kind: '时序图', title: '一次 step：先落日志再推导请求，流结束后才调度工具', description: '收件箱认领、step 前扩展点、从日志推导并冻结请求、采样只记账、独占屏障与滚动池、按模型顺序提交工具结果。' },
    { file: 'dsh-tool-pipeline.html', kind: '流程图', title: '工具执行管线：审批只管提权，沙箱在工具体内部', description: '登记 → 执行前钩子 → 单调守卫 → 执行包装层 → 工具体 → 执行后与提交；询问转审批服务，模型带 sandbox_permissions 时才申请提权，沙箱后端不可用时绝不静默放行。' },
  ],
} as const;

type Diagram = { file: string; kind: string; title: string; description: string };

export const findDiagram = (file: string) => diagramGroups.flatMap<Diagram>((group) => [...group.items]).find((item) => item.file === file);

export const findDshDiagram = (file: string) => dshDiagramGroup.items.find((item) => item.file === file);
