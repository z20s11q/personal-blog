import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { dshDiagramDir, dshDiagramGroup, findDshDiagram } from '../src/data/diagrams.ts';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/sync-dsh.mjs <dsh-architecture-directory>');

const base = '/personal-blog/';
const group = dshDiagramGroup;
const repo = group.repo;
const articleUrl = (slug) => `${base}articles/${slug}/`;

// List order is also processing order: 02 must come before the diagram article that cites its sections.
const articles = [
  {
    file: '04-学习路线导引.md',
    slug: 'dsh-architecture-analysis',
    label: '学习路线导引',
    description: 'DeepSeek Harness（0.2.0-rc.1）架构系列的阅读顺序：先建立组合内核与 Agent Loop 的全局，再看工具、安全、上下文与 LLM，最后对照官方文档并与 Codex、oh-my-pi 横向比较。',
  },
  {
    file: '02-架构与AgentLoop.md',
    slug: 'dsh-architecture',
    label: 'DeepSeek Harness 架构设计',
    parent: 'dsh-architecture-analysis',
    order: 1,
    description: '语言无关地拆解 DeepSeek Harness：组合内核、以日志为真源的 Agent Loop、工具管线、审批与沙箱、上下文与压缩、LLM 集成与数据外发、编排与扩展，附源码位置映射和交互式架构图。',
    callouts: [
      ['3. 组件视图', 'dsh-components.html'],
      ['4.2 Profile', 'dsh-composition.html'],
      ['5.4 Turn', 'dsh-turn-lifecycle.html'],
      ['5.4 Turn', 'dsh-step-sequence.html'],
      ['6.1 统一管线', 'dsh-tool-pipeline.html'],
    ],
  },
  {
    slug: 'dsh-diagrams',
    label: 'DeepSeek Harness 交互式架构图',
    parent: 'dsh-architecture-analysis',
    order: 2,
    diagrams: true,
    description: 'DeepSeek Harness 的 5 张可交互架构图：组件总览、组合与装配、turn 状态机、一次 step 的时序、工具执行管线。点击节点可查看固定提交上的源码位置。',
  },
  {
    file: '01-自带文档总结.md',
    slug: 'dsh-bundled-docs',
    label: 'DeepSeek Harness 自带文档总结',
    parent: 'dsh-architecture-analysis',
    order: 3,
    description: '把 DeepSeek Harness 仓库自带的官方文档按主题合并成一张地图，并列出文档与源码不一致之处。',
  },
  {
    file: '03-与Codex-oh-my-pi对比与可借鉴点.md',
    slug: 'dsh-vs-codex-omp',
    label: 'DeepSeek Harness 与 Codex、oh-my-pi 对比',
    parent: 'dsh-architecture-analysis',
    order: 4,
    description: '三套 harness 在 loop 骨架、输入与插话、工具调度、安全、上下文、LLM、编排与扩展上的对照，以及 dsh 独有、值得借鉴的设计。',
  },
  {
    file: '00-调研索引与资料清单.md',
    slug: 'dsh-research-index',
    label: 'DeepSeek Harness 资料索引',
    parent: 'dsh-architecture-analysis',
    order: 5,
    description: '近两个月网上关于 DeepSeek Harness 的架构解析文章、书、视频、改写项目，以及它们的版本基线与可信度。',
  },
];

const ref = (slug) => {
  const article = articles.find((candidate) => candidate.slug === slug);
  if (!article) throw new Error(`Unknown article ${slug}`);
  return `[${article.label}](${articleUrl(slug)})`;
};
const archRef = ref('dsh-architecture');

/** Heading text each diagram is attached to, filled while converting 02. */
const calloutHeadings = new Map();

const diagramArticle = (article) => {
  const lines = [
    `这 ${group.items.length} 张图是 ${ref(group.article)} 的配图，用 [archify](https://github.com/tt-a1i/archify) 从类型化的 JSON 描述编译成单文件 HTML，并通过了结构校验和浏览器检查。每张图都是独立页面，下面的链接直接打开原图。源码版本 [\`${group.revision}\`](${repo})（tag \`dsh-v0.2.0-rc.1\`）。`,
    '',
    '## 怎么看',
    '',
    '- **点击节点**：查看对应的源码文件和行号。链接固定在具体提交上，不会随仓库更新而漂移。',
    '- **点击连线**：高亮这条关系；右下角可以缩放、追踪路径。',
    '- **阅读顺序**：先看组件总览和组合装配建立整体印象，再看状态机理解 turn 何时继续、何时结束，然后看时序图里一次 step 的先后顺序，最后看工具管线里审批与沙箱的位置。',
    '- 图按桌面宽度设计，手机上需要横向拖动。',
    '',
  ];
  for (const item of group.items) {
    const heading = calloutHeadings.get(item.file);
    if (!heading) throw new Error(`No article section links to ${item.file}`);
    lines.push(
      `## ${item.title}`,
      '',
      `**${item.kind}** · [打开交互图 →](${base}${dshDiagramDir}${item.file}) · 对应 ${ref(group.article)} 中「${heading}」一节`,
      '',
      item.description,
      '',
    );
  }
  return { title: article.label, text: lines.join('\n') };
};

const edits = {
  '00-调研索引与资料清单.md': [
    ['> 本地源码快照：', '> 源码快照：'],
    [/## 本系列文件\n[\s\S]*?\n---\n/, `本系列各篇的阅读顺序与递进关系见 ${ref('dsh-architecture-analysis')}。\n\n---\n`],
  ],
  '02-架构与AgentLoop.md': [
    ['见 `01-自带文档总结.md`。', `见 ${ref('dsh-bundled-docs')}。`],
    ['结构与 Codex、oh-my-pi 两篇架构文档相同', `结构与 [Codex 架构设计](${articleUrl('codex-architecture')})、[oh-my-pi 架构设计](${articleUrl('omp-architecture')}) 相同`],
  ],
  '03-与Codex-oh-my-pi对比与可借鉴点.md': [
    ['本目录 `02-架构与AgentLoop.md`，以及 Codex、oh-my-pi 系列的架构文档', `${archRef}，以及 [Codex 架构设计](${articleUrl('codex-architecture')})、[oh-my-pi 架构设计](${articleUrl('omp-architecture')})`],
  ],
  '04-学习路线导引.md': [
    ['如果读过本博客的 Codex / oh-my-pi 系列', `如果读过本博客的 [Codex / oh-my-pi 系列](${articleUrl('codex-omp-guide')})`],
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
  for (const [prefix, file] of [...callouts].reverse()) {
    const diagram = findDshDiagram(file);
    if (!diagram) throw new Error(`${name}: unknown diagram ${file}`);
    const index = lines.findIndex((line) => /^#{2,5} /.test(line) && line.replace(/^#+ /, '').startsWith(prefix));
    if (index < 0) throw new Error(`${name}: heading starting with "${prefix}" not found`);
    calloutHeadings.set(file, lines[index].replace(/^#+ /, ''));
    const callout = `> **交互图**：[${diagram.title}](${base}${dshDiagramDir}${file})（${diagram.kind}，点击节点可查看源码位置）`;
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

  for (const edit of edits[name] ?? []) text = applyEdit(text, edit, name);
  text = text.replace(/`(0[0-4])(?:-[^`\n]+?\.md)?`/g, (_, number) => {
    const target = articles.find((candidate) => candidate.file?.startsWith(`${number}-`));
    return `[${target.label}](${articleUrl(target.slug)})`;
  });

  let hasInnerH1 = false;
  mapProseLines(text, (line) => { if (/^# /.test(line)) hasInnerH1 = true; return line; });
  if (hasInnerH1) {
    text = mapProseLines(text, (line) => (/^#{1,5} /.test(line) ? `#${line}` : line));
  }
  if (article.callouts) text = insertCallouts(text, article.callouts, name);

  const leftovers = [
    /[a-z]:\\(work|users)/i,
    /_drafts|本目录|\.archify|diagrams\.html/,
    /`0[0-4]-[^`\n]*\.md`/,
    /(?<![\d-])0[0-4](、|\/)0[0-4](?!\d)|(见|文档) ?0[0-4](?!\d)/,
  ];
  for (const leftover of leftovers) {
    if (leftover.test(text)) throw new Error(`${name}: leftover local reference matching ${leftover}`);
  }
  return { title, text };
};

const articleDir = new URL('../src/content/articles/', import.meta.url);
const publishedBase = Date.parse('2026-09-29T12:00:00+08:00');

for (const [index, article] of articles.entries()) {
  const { title, text } = article.diagrams
    ? diagramArticle(article)
    : convert(await readFile(join(source, article.file), 'utf8'), article);
  const body = `${text.trimStart()}`;
  const publishedAt = new Date(publishedBase - index * 5 * 60 * 1000).toISOString();
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(article.description)}`,
    `publishedAt: ${publishedAt}`,
    'reviewedAt: 2026-09-29',
    'category: "Agent 架构调研"',
    'tags: ["ai", "development"]',
    `readingMinutes: ${Math.max(1, Math.round(body.replace(/\]\([^)]*\)/g, ']').length / 500))}`,
    ...(article.parent ? [`parent: ${JSON.stringify(article.parent)}`, `order: ${article.order}`] : []),
    '---',
    '',
  ].join('\n');
  await writeFile(new URL(`${article.slug}.md`, articleDir), frontmatter + body, 'utf8');
}

const archifyDir = join(source, '.archify');
const publicDir = new URL(`../public/${dshDiagramDir}`, import.meta.url);
const specDir = new URL('../research/dsh-architecture/diagram-specs/', import.meta.url);
await mkdir(publicDir, { recursive: true });
await mkdir(specDir, { recursive: true });

const runs = await readdir(archifyDir, { withFileTypes: true });
const files = group.items.map((item) => item.file);
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
