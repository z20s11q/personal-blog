# arch-page：架构分析网页模版

把一个系统的架构分析做成单文件网页，固定三个部分：

| 部分 | 页面锚点 | 内容 |
|---|---|---|
| 总体架构 | `#overview` | Archify 生成的架构图；点方框显示职责、源码和跳转 |
| 详细架构流程 | `#intro` | 组件卡片（职责、要点、关键概念）和连线；按流程分大步；大步说明页列出全部小步，点一条在下方展开它的数据字段（同一时间只展开一条），外层信封与原文折叠 |
| 对象架构 | `#arch` | 同一张架构图；点方框列出其中的对象：属性、方法、关系、边界、源码 |

生成哪些内容、每项写到什么程度，见 [CONTENT.md](CONTENT.md)。最小可运行示例在 [example/](example/)，打开 `example/example.html` 即可看到效果。

## 文件

| 文件 | 作用 |
|---|---|
| `engine.js` | 渲染引擎：`ArchPage.init(config)` 校验内容并渲染三个部分；`ArchPage.util` 给额外章节用 |
| `page.template.html` | 页面骨架与全部样式；文字是 `{{KEY}}` 占位符，图、数据、脚本是 `<!--NAME-->` 插入标记 |
| `build_page.py` | 按 `page.config.json` 合成单文件页面 |
| `check_page.cjs` | 在无头 Chromium 里点遍页面，出现控制台错误（含引擎的 `[arch-page]` 校验错误）时返回 1 |
| `check_src.py` | 检查内容文件里的源码引用 `path:起-止` 在仓库里存在且行号有效 |

## 新建一篇

1. 在文档仓库里建目录，例如 `docs/assets/foo-architecture/`，复制 `engine.js`、`build_page.py`、`page.template.html`、`check_page.cjs`、`check_src.py` 进去，使文档自包含。
2. 写 `overview/candidate.json`，用 Archify 生成总体图（组件的 `id` 就是后面总体说明和对象的键）：

   ```bash
   node <archify>/bin/archify.mjs finalize architecture overview/candidate.json overview/overview.html \
     --quality showcase --repo-root <被分析仓库> --out-dir overview
   ```

   `meta.repository.revision` 要求 40 位提交号，组件 `sources` 的文件必须存在于该提交。
3. 采集流程数据（见 CONTENT.md 第 3.8 节），放进 `data/` 或 `trace/`。
4. 写 `arch.data.js`：组装下面的配置并调用 `ArchPage.init`。
5. 写 `page.config.json`，填全部占位符文字。
6. 构建并检查：

   ```bash
   python3 build_page.py                     # 或 python3 <模版目录>/build_page.py <页面目录>
   python3 check_src.py <被分析仓库> arch.data.js
   PLAYWRIGHT_CORE=<playwright-core 路径> CHROME=<chrome 路径> node check_page.cjs <输出.html> <截图目录>
   ```

## page.config.json

```json
{
  "out": "../../foo-architecture.html",
  "template": "page.template.html",
  "overview": "overview/overview.html",
  "components": "components/components.svg",
  "text": { "TITLE": "…", "EYEBROW": "…", "LEAD": "…", "EVIDENCE": "<span>…</span>",
            "DOC_SCOPE": "…", "DOC_REQUIREMENT": "…", "DOC_GOAL": "…", "DOC_READERS": "…",
            "DOC_SHOWS": "…", "DOC_EXCLUDES": "…", "DOC_BUILD": "…",
            "OVERVIEW_TITLE": "…", "OVERVIEW_PROVENANCE": "…", "OVERVIEW_SUB": "…",
            "PANO_TITLE": "…", "PANO_PROVENANCE": "…", "PANO_LEAD": "…", "ARCH_SUB": "…" },
  "toc": [["#sample", "样例"]],
  "sections": ["sections/sample.html"],
  "data": { "trace-data": { "file": "trace/foo-trace.json", "type": "json", "notice": "数据来源说明" } },
  "scripts": ["engine.js", "arch.data.js", "page.js"]
}
```

`overview` 和 `components` 可以是 Archify 输出的 `.html`，也可以是 `.svg`。`components` 省略时，对象架构复用总体图；给出时，对象架构用这张单独的图，组件的 `graph` 填这张图里的方框 id。

构建时 `text` 里缺任何一个占位符都会报错并列出缺的键。`toc`、`sections` 和 `page.js` 用于三个部分之外的额外章节，按需提供。

## ArchPage.init(config)

```js
ArchPage.init({
  repo: 'https://github.com/org/repo/blob/<40 位提交号>/',   // 源码链接前缀
  overview: {
    intro: { kicker: '怎么读', title, text: ['段落', …] },   // 页面打开时显示的导读；给出 initial 时页面打开即选中该方框
    initial: 'session',
    nodes: { '<Archify 组件 id>': { kicker, title, text, src: ['path:10-20', ['显示文字', 'path:30']], jump: [['#anchor', '文字']],
             pano: [['<流程 id>', '<大步序号 | 全景组件 id | title=步骤标题片段>', '文字（省略时自动生成）']] } },
    notes: [['标题', '说明', '#颜色']],                     // 总体图下方的说明条
  },
  pano: {
    zones: { '<层 id>': ['层名', '#颜色'] },
    nodes: [{ id, at: [行, 起始列, 跨列], zone, name, code, job, fact, terms: ['<概念 id>'] }, { id: 'legend', at: [...], legend: true }],
    terms: { '<概念 id>': ['名称', '定义'] },
    edges: [{ id, from, to, label, how, dash, empty, route: 'left'|'right', lane }],
    stories: [{ id, title, intro, steps: [{ t, text, src, n, e, extra: '<附表 HTML>', data: [...],
                subs: [{ t, n: ['组件 id', …], e: ['<连线 id>', …], text, data: [['标签', { t: 'json'|'jsonl'|'text', v, k: '<数据类型>', note, line: '<jsonl 逐行数据类型>' }]] }] }] }],
    media: { '<媒介>': ['名称', '说明'] },
    kinds: { '<数据类型>': ['<媒介>', '谁 → 谁 · 什么'] },
    peel: { '<数据类型>': [(obj) => ({ k: '内层字段', name: '这一层是什么' })] },
    fieldDoc: { '<字段名>': '含义' },
    dataTag: '录制',                                      // 数据框上的来源标签
    legend: '图例说明', storyIntro: '流程总览页的默认说明',
  },
  components: [{ id, graph: '<Archify 组件 id>', kind, title, object, plain, state: [['属性', '说明']],
                 methods: [{ sig: 'Type.method(a, b) -> Ret', name, in, out, effect }], rel: [['关系', '<对象 id>', '说明']], boundary, src: ['path:1-9'] }],
  componentNotes: [['名词', '一句解释']],                  // 对象图下方的名词条
})
```

- 源码引用写成 `'path:起-止'`，或 `['显示文字', 'path:起-止']`。
- 连线 `id` 省略时为 `from>to`。`route` 让连线从画布左侧或右侧绕行，用于跨过中间几行卡片的旁路，`lane` 区分同侧的多条。
- 大步的 `n`、`e` 可省略，由小步汇总。小步数为 0 的大步是规则步：显示说明、`extra` 附表和 `data` 数据框。
- 文字字段支持反引号代码和 `[文字](#锚点)` 页内链接。

引擎在渲染前校验引用关系，问题写到控制台，`check_page.cjs` 据此判定失败。
