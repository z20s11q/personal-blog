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

type Diagram = { file: string; kind: string; title: string; description: string };

export const findDiagram = (file: string) => diagramGroups.flatMap<Diagram>((group) => [...group.items]).find((item) => item.file === file);
