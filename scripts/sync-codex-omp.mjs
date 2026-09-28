import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { diagramDir, diagramGroups, findDiagram } from '../src/data/diagrams.ts';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/sync-codex-omp.mjs <codex-omp-architecture-directory>');

const base = '/personal-blog/';
const repoOf = (project) => diagramGroups.find((group) => group.project === project).repo;
const codexRepo = repoOf('Codex');
const ompRepo = repoOf('oh-my-pi');
const articleUrl = (slug) => `${base}articles/${slug}/`;

const articles = [
  {
    file: '00-调研索引与资料清单.md',
    slug: 'codex-omp-research-index',
    label: '00 资料索引',
    description: '近两个月网上关于 Codex 与 oh-my-pi 的解析文章、改写项目、同类架构分析框架与可视化工具，以及调研结论。',
  },
  {
    file: '01-Codex-自带文档总结.md',
    slug: 'codex-bundled-docs',
    label: '01 Codex 自带文档总结',
    description: '把 Codex 仓库的 crate README 与官方在线文档按主题合并：协议状态模型、安全体系、hooks、上下文、多 agent，以及文档没覆盖、必须读源码的部分。',
  },
  {
    file: '02-oh-my-pi-自带文档总结.md',
    slug: 'omp-bundled-docs',
    label: '02 oh-my-pi 自带文档总结',
    description: 'oh-my-pi 自带 134 篇专题文档的主题化提炼：恢复与压缩、TTSR、会话树、工具、LLM 层、扩展体系，以及文档与源码不一致之处。',
  },
  {
    file: '03-Codex-架构与AgentLoop.md',
    slug: 'codex-architecture',
    label: '03 Codex 架构设计',
    description: '语言无关地拆解 Codex：四层 Agent Loop、并行工具与编排、审批与沙箱升级、上下文管理、编排与扩展，附源码位置映射和交互式架构图。',
    callouts: [
      ['3. 组件视图', 'codex-components.html'],
      ['4. D1', 'codex-turn-lifecycle.html'],
      ['流事件处理', 'codex-sampling-sequence.html'],
      ['6. D5', 'codex-tool-orchestrator.html'],
    ],
  },
  {
    file: '04-oh-my-pi-架构与AgentLoop.md',
    slug: 'omp-architecture',
    label: '04 oh-my-pi 架构设计',
    description: '按同一骨架拆解 oh-my-pi：三层 Agent Loop、Agent 状态与插话队列、LLM 集成、工具调度、只追加会话树与原生层，附源码位置映射和交互式架构图。',
    callouts: [
      ['3. 组件视图', 'omp-components.html'],
      ['4. D1', 'omp-loop-lifecycle.html'],
      ['5. Agent', 'omp-steering-sequence.html'],
    ],
  },
  {
    file: '05-两者对比与可借鉴点.md',
    slug: 'codex-vs-omp',
    label: '05 两者对比与可借鉴点',
    description: '只比较设计语义：两套 harness 的 loop 骨架、关键问题的不同解法、各自值得借鉴的设计，以及自己实现 coding agent loop 时的取舍。',
  },
  {
    slug: 'codex-omp-diagrams',
    label: '06 交互式架构图导览',
    title: 'Codex 与 oh-my-pi 交互式架构图导览',
    description: '7 张可交互的架构图：两者的组件总览、Agent Loop 状态机、采样与插话时序、工具编排流程。点击节点可查看固定提交上的源码位置。',
    generate: () => diagramGuide(),
  },
];

const seriesSection = [
  '## 系列文章',
  '',
  '| 篇目 | 内容 |',
  '|---|---|',
  ...articles.map((article) => `| [${article.label}](${articleUrl(article.slug)}) | ${article.description} |`),
  '',
].join('\n');

/** Heading text each diagram is attached to, filled while converting 03 and 04. */
const calloutHeadings = new Map();

const diagramGuide = () => {
  const link = (slug) => {
    const article = articles.find((candidate) => candidate.slug === slug);
    return `[${article.label}](${articleUrl(slug)})`;
  };
  const lines = [
    `这 7 张图是 ${link('codex-architecture')} 和 ${link('omp-architecture')} 的配图，用 [archify](https://github.com/tt-a1i/archify) 从类型化的 JSON 描述编译成单文件 HTML，并通过了结构校验和浏览器检查。每张图都是独立页面，下面的链接直接打开原图。`,
    '',
    '## 怎么看',
    '',
    '- **点击节点**：查看对应的源码文件和行号。链接固定在具体提交上，不会随仓库更新而漂移。',
    '- **点击连线**：高亮这条关系；右下角可以缩放、追踪路径。',
    '- **阅读顺序**：先看组件总览建立整体印象，再看状态机理解循环何时继续、何时结束，最后看时序图里的边界细节。',
    '- 图按桌面宽度设计，手机上需要横向拖动。',
    '',
  ];
  for (const group of diagramGroups) {
    lines.push(`## ${group.project}`, '', `源码版本 [\`${group.revision}\`](${group.repo})，文字说明见 ${link(group.article)}。`, '');
    for (const item of group.items) {
      const heading = calloutHeadings.get(item.file);
      if (!heading) throw new Error(`No article section links to ${item.file}`);
      lines.push(
        `### ${item.title}`,
        '',
        `**${item.kind}** · [打开交互图 →](${base}${diagramDir}${item.file}) · 对应文章中「${heading}」一节`,
        '',
        item.description,
        '',
      );
    }
  }
  return lines.join('\n');
};

const edits = {
  '00-调研索引与资料清单.md': [
    ['> 本地源码快照：', '> 源码快照：'],
    [`](${codexRepo}) — openai/codex，`, `](${codexRepo})，`],
    [`](${ompRepo}) — can1357/oh-my-pi，`, `](${ompRepo})，`],
    [/## 本目录文件\n[\s\S]*?\n---\n/, `${seriesSection}\n---\n`],
    ['更接近你要的东西', '更有参考价值'],
    ['第 1 篇（工程分层）今天发布', '第 1 篇（工程分层）于 2026-09-28 发布'],
    ['今天刚发第 1 篇', '2026-09-28 刚发第 1 篇'],
    [/本目录/g, '本系列'],
  ],
  '01-Codex-自带文档总结.md': [
    ['| 性质 | 本地副本 |', '| 性质 | 调研时的本地副本 |'],
    [/\n## 12\. 本地文件索引[\s\S]*$/, '\n'],
  ],
  '02-oh-my-pi-自带文档总结.md': [
    ['## 15. 本地文件索引', '## 15. 原始文档'],
    ['`d:\\Work\\hy\\oh-my-pi\\docs\\`', `[docs/](${ompRepo}/docs)`],
    ['`d:\\Work\\hy\\oh-my-pi\\packages\\agent\\README.md`', `[packages/agent/README.md](${ompRepo.replace('/tree/', '/blob/')}/packages/agent/README.md)`],
  ],
};

const applyEdit = (text, [from, to], name) => {
  const matched = typeof from === 'string' ? text.includes(from) : from.test(text);
  if (!matched) throw new Error(`${name}: expected text not found: ${from}`);
  if (from instanceof RegExp) from.lastIndex = 0;
  return typeof from === 'string' ? text.replaceAll(from, to) : text.replace(from, to);
};

/** Maps each line outside fenced code blocks; fences are passed through untouched. */
const mapProseLines = (text, fn) => {
  let fenced = false;
  return text.split('\n').map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return line; }
    return fenced ? line : fn(line);
  }).join('\n');
};

const insertCallouts = (text, callouts, name) => {
  let lines = text.split('\n');
  for (const [prefix, file] of callouts) {
    const diagram = findDiagram(file);
    if (!diagram) throw new Error(`${name}: unknown diagram ${file}`);
    const index = lines.findIndex((line) => /^#{2,5} /.test(line) && line.replace(/^#+ /, '').startsWith(prefix));
    if (index < 0) throw new Error(`${name}: heading starting with "${prefix}" not found`);
    calloutHeadings.set(file, lines[index].replace(/^#+ /, ''));
    const callout = `> **交互图**：[${diagram.title}](${base}${diagramDir}${file})（${diagram.kind}，点击节点可查看源码位置）`;
    lines = [...lines.slice(0, index + 1), '', callout, ...lines.slice(index + 1)];
  }
  return lines.join('\n');
};

const convert = (raw, article) => {
  const name = article.file;
  let text = raw.replace(/\r\n/g, '\n');
  const titleMatch = text.match(/^# (.+)\n/);
  if (!titleMatch) throw new Error(`${name}: missing H1 title`);
  const title = titleMatch[1].trim();
  text = text.slice(titleMatch[0].length);

  text = text.split('\n').filter((line) => !line.includes('_drafts/')).join('\n');
  text = text
    .replaceAll('`d:\\Work\\hy\\codex`', `[openai/codex](${codexRepo})`)
    .replaceAll('`d:\\Work\\hy\\oh-my-pi`', `[can1357/oh-my-pi](${ompRepo})`);
  for (const edit of edits[name] ?? []) text = applyEdit(text, edit, name);
  text = text.replace(/`(0[0-5])(?:-[^`\n]+?\.md)?`/g, (_, number) => {
    const target = articles.find((candidate) => candidate.file?.startsWith(`${number}-`));
    return `[${target.label}](${articleUrl(target.slug)})`;
  });

  let hasInnerH1 = false;
  mapProseLines(text, (line) => { if (/^# /.test(line)) hasInnerH1 = true; return line; });
  if (hasInnerH1) {
    text = mapProseLines(text, (line) => (/^#{1,5} /.test(line) ? `#${line}` : line));
  }
  if (article.callouts) text = insertCallouts(text, article.callouts, name);

  for (const leftover of [/[a-z]:\\(work|users)/i, /_drafts/, /`0[0-5]-[^`\n]*\.md`/]) {
    if (leftover.test(text)) throw new Error(`${name}: leftover local reference matching ${leftover}`);
  }

  return { title, text };
};

const seriesNav = (article) => articles
  .map((candidate) => (candidate.slug === article.slug ? `**${candidate.label}**` : `[${candidate.label}](${articleUrl(candidate.slug)})`))
  .join(' · ');

const articleDir = new URL('../src/content/articles/', import.meta.url);
const publishedBase = Date.parse('2026-09-28T12:00:00+08:00');

for (const [index, article] of articles.entries()) {
  const { title, text } = article.generate
    ? { title: article.title, text: article.generate() }
    : convert(await readFile(join(source, article.file), 'utf8'), article);
  const body = `**本系列**：${seriesNav(article)}\n\n${text.trimStart()}`;
  const publishedAt = new Date(publishedBase - index * 10 * 60 * 1000).toISOString();
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(article.description)}`,
    `publishedAt: ${publishedAt}`,
    'reviewedAt: 2026-09-28',
    'category: "Agent 架构调研"',
    'tags: ["ai", "development"]',
    `readingMinutes: ${Math.max(1, Math.round(body.replace(/\]\([^)]*\)/g, ']').length / 500))}`,
    '---',
    '',
  ].join('\n');
  await writeFile(new URL(`${article.slug}.md`, articleDir), frontmatter + body, 'utf8');
}

const archifyDir = join(source, '.archify');
const publicDir = new URL(`../public/${diagramDir}`, import.meta.url);
const specDir = new URL('../research/codex-omp-architecture/diagram-specs/', import.meta.url);
await mkdir(publicDir, { recursive: true });
await mkdir(specDir, { recursive: true });

const runs = await readdir(archifyDir, { withFileTypes: true });
const files = diagramGroups.flatMap((group) => group.items.map((item) => item.file));
for (const file of files) {
  const matches = [];
  for (const run of runs.filter((entry) => entry.isDirectory())) {
    const names = await readdir(join(archifyDir, run.name));
    if (names.includes(file)) matches.push(run.name);
  }
  if (matches.length !== 1) throw new Error(`Expected exactly one archify run containing ${file}, found ${matches.length}`);
  const runDir = join(archifyDir, matches[0]);
  await copyFile(join(runDir, file), new URL(file, publicDir));
  await copyFile(join(runDir, 'candidate.json'), new URL(`${basename(file, '.html')}.json`, specDir));
}

console.log(`Synced ${articles.length} articles and ${files.length} diagrams from ${source}`);
