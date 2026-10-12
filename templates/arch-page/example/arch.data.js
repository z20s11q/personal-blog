/* Example content for engine.js: the arch-page template describing itself. */
(() => {
  'use strict'

  const { J } = ArchPage.util
  const REPO = 'https://github.com/z20s11q/personal-blog/blob/02719e10a4d9737d43d28eda2aa8dd6d88649226/'
  const CONFIG = JSON.parse(document.getElementById('example-config').textContent)

  /* ---------- overview captions: one per Archify node id ---------- */

  const NODES = {
    config: { kicker: '输入', title: 'page.config.json', text: '构建清单：输出路径、填进模板的文字、要嵌入的数据文件和按顺序内联的脚本。', src: ['templates/arch-page/example/page.config.json'], pano: [['build', 'config', '详细架构流程：读配置']] },
    template: { kicker: '输入', title: 'page.template.html', text: '页面骨架：全部样式、文档说明表、三个章节和占位符。各篇文档共用这一份。', src: ['templates/arch-page/page.template.html:302-358'], pano: [['build', 'template', '详细架构流程：填文字']] },
    overview: { kicker: '输入', title: 'Archify 总体图', text: 'Archify 从 candidate.json 生成的图，构建时取出其中的 svg，在总体架构和对象架构里各放一份。', src: ['templates/arch-page/build_page.py:49-54'], pano: [['build', 'overview', '详细架构流程：内联总体图']] },
    data: { kicker: '输入', title: '数据文件', text: '抓取结果、录制日志等大块数据，各写成一个 JSON 数据块，由内容脚本按元素 id 读取。', src: ['templates/arch-page/build_page.py:72-85'], pano: [['build', 'data', '详细架构流程：写入数据']] },
    scripts: { kicker: '输入', title: '脚本', text: '按顺序内联：先引擎 engine.js，再本页内容 arch.data.js，最后是本页额外章节的脚本。', src: ['templates/arch-page/example/arch.data.js'], pano: [['build', 'scripts', '详细架构流程：内联脚本']] },
    build: { kicker: '合成', title: 'build_page.py', text: '读清单，依次填文字、内联总体图、写数据块和脚本，输出单文件页面；漏填的占位符直接报错。', src: ['templates/arch-page/build_page.py:88-115'], pano: [['build', 'build', '详细架构流程：构建']] },
    page: { kicker: '输出', title: '单文件页面', text: '样式、图、数据和脚本都在一个 html 里，离线可开。', src: ['templates/arch-page/example/page.config.json'], pano: [['render', 'page', '详细架构流程：打开页面']] },
    engine: { kicker: '浏览器', title: 'ArchPage 引擎', text: '`ArchPage.init(config)` 先校验内容，再渲染总体架构的说明、详细架构流程和对象架构。', src: ['templates/arch-page/engine.js:480-489'], pano: [['render', 'engine', '详细架构流程：渲染']] },
  }

  /* ---------- panorama ---------- */

  const MEDIA = {
    file: ['文件内容', '构建脚本读取的文件原文'],
    html: ['页面片段', '构建写进页面的 html 片段，取自本页渲染后的 DOM'],
    memory: ['内存对象', '浏览器里引擎持有的对象'],
  }
  const KINDS = {
    config: ['file', 'page.config.json 原文'],
    svg: ['html', '内联后的总体图 svg'],
    datablock: ['html', '构建写出的 JSON 数据块'],
    output: ['html', '构建写出的页面'],
    init: ['memory', '内容脚本交给引擎的配置'],
    errors: ['memory', '`ArchPage.validate` 的返回值'],
  }
  const FIELD_DOC = {
    out: '输出路径，相对页面目录', template: '页面骨架', overview: 'Archify 生成的 html', text: '填进模板占位符的文字', data: '要嵌入的数据文件', scripts: '按顺序内联的脚本',
    file: '数据文件路径', type: 'json、jsonl 或 text', placeholders: '模板里的占位符', id: '元素 id', bytes: '字节数', head: '片段开头',
    repo: '源码链接前缀', overviewNodes: '总体图说明的个数', panoNodes: '全景图组件数', stories: '流程数', components: '对象数', errors: '校验发现的问题',
  }
  const ZONES = {
    input: ['构建输入', '#7c3aed'], build: ['构建', '#059669'], output: ['输出', '#2563eb'], runtime: ['浏览器', '#d97706'],
  }
  const TERMS = {
    placeholder: ['占位符 {{KEY}}', '模板里待填的文字位置，值取自 `page.config.json` 的 `text`。构建结束前仍有占位符时报错并列出缺的键。'],
    marker: ['插入标记 <!--NAME-->', '模板里固定的插入点：`OVERVIEW_SVG`、`COMPONENTS_SVG`、`DATA`、`SCRIPTS` 各出现一次，`TOC_EXTRA`、`EXTRA_SECTIONS` 可选。'],
    scoped: ['id 前缀', '同一张 svg 在页面里放两份，`scoped_svg` 给每份的 id 加前缀 ov 或 cp，引用随之改写。'],
    datablock: ['JSON 数据块', '`<script type="application/json">`，json 文件原样写入，text 和 jsonl 写成一个 JSON 字符串；`</` 转义成 `<\\/`。'],
    order: ['脚本顺序', '引擎在前，定义 `window.ArchPage`；内容脚本随后调用 `ArchPage.init`；额外章节的脚本最后，可用 `ArchPage.util`。'],
    validate: ['一致性校验', '引擎检查方框、连线、关键概念、小步、数据类型和对象之间的引用，问题以 `[arch-page]` 开头写到控制台。'],
    digest: ['大步说明页', '每一大步先列出全部小步的说明，点一条在它下方展开数据，同一时间只展开一条。左图线上标出经过它的小步序号；鼠标停在某个小步上时，左图只亮这一小步经过的线。'],
    singlefile: ['单文件', '样式、脚本和数据全部内联在一个 HTML 文件里，可以直接用浏览器打开或作为附件发送。'],
  }
  const PNODES = [
    { id: 'config', at: [1, 1, 4], zone: 'input', name: '构建清单', code: 'page.config.json', job: '列出输出路径、填进模板的文字、数据文件和脚本。', fact: `本页清单有 ${Object.keys(CONFIG.text).length} 段文字、${Object.keys(CONFIG.data).length} 个数据块、${CONFIG.scripts.length} 个脚本`, terms: ['placeholder', 'order'] },
    { id: 'template', at: [1, 5, 4], zone: 'input', name: '页面骨架', code: 'page.template.html', job: '样式、文档说明表和三个章节；文字位置是占位符，图、数据、脚本位置是插入标记。', fact: '各篇文档共用，额外章节经 `sections` 插入', terms: ['placeholder', 'marker'] },
    { id: 'overview', at: [1, 9, 4], zone: 'input', name: 'Archify 总体图', code: 'overview/overview.html', job: 'Archify 从 candidate.json 生成的 html，构建时只取其中的 svg。', fact: '方框的 `data-node-id` 就是总体说明和对象的键', terms: ['scoped'] },
    { id: 'data', at: [2, 1, 4], zone: 'input', name: '数据文件', code: 'data/*.json · *.jsonl', job: '抓取结果、录制日志等大块数据。', fact: '本页嵌入了自己的配置文件', terms: ['datablock'] },
    { id: 'scripts', at: [2, 5, 4], zone: 'input', name: '脚本', code: 'engine.js · arch.data.js · page.js', job: '引擎、本页内容、本页额外章节的脚本。', fact: '内容脚本只描述数据，渲染全部在引擎里', terms: ['order'] },
    { id: 'build', at: [2, 9, 4], zone: 'build', name: '构建脚本', code: 'build_page.py', job: '读清单，填文字，内联总体图，写数据块和脚本，输出单文件页面。', fact: '`python3 build_page.py [页面目录]`', terms: ['marker', 'singlefile'] },
    { id: 'page', at: [3, 1, 4], zone: 'output', name: '单文件页面', code: 'example.html', job: '包含样式、两份总体图、数据块和脚本。', fact: '离线可开', terms: ['singlefile'] },
    { id: 'engine', at: [3, 5, 4], zone: 'runtime', name: 'ArchPage 引擎', code: 'ArchPage.init(config)', job: '校验内容，渲染总体说明、全景图和对象检查器。', fact: '校验问题写到控制台，检查脚本据此判定失败', terms: ['validate', 'digest'] },
    { id: 'legend', at: [3, 9, 4], legend: true },
  ]
  const EDGES = [
    { from: 'config', to: 'build', label: '清单', how: '`main()` 读入并解析 JSON。' },
    { from: 'template', to: 'build', label: '骨架', how: '先按 `text` 填占位符，再按插入标记写入其他内容。' },
    { from: 'overview', to: 'build', label: 'svg', how: '`extract_svg` 取出图，`scoped_svg` 加 id 前缀。' },
    { from: 'data', to: 'build', label: 'JSON 数据块', how: '`data_tag` 校验并转义后写成数据块。' },
    { from: 'scripts', to: 'build', label: '按序内联', how: '每个脚本一个 `<script>`，`</script` 转义。' },
    { from: 'build', to: 'page', label: '写出 html', how: '写到 `out` 指定的路径。' },
    { from: 'page', to: 'engine', label: 'ArchPage.init(config)', how: '内容脚本把配置交给引擎。' },
    { from: 'engine', to: 'page', label: '渲染三个部分', how: '引擎往三个章节的容器里写入内容。' },
  ]

  const svg = document.querySelector('#overview-canvas svg')
  const dataEl = document.getElementById('example-config')
  const placeholders = Object.keys(CONFIG.text)
  const sub = (t, n, text, data) => ({ t, n, e: n.length > 1 ? [`${n[0]}>${n[1]}`] : [], text, data })

  const STORIES = [
    { id: 'build', title: '构建一页', intro: '`python3 build_page.py example` 的四个阶段，数据取自本页的配置和构建结果。', steps: [
      { t: '读清单、填文字', text: '构建脚本读入清单，把 `text` 里的每一段文字填进模板对应的占位符，再核对每个占位符都已填写。', src: ['templates/arch-page/build_page.py:88-97'], subs: [
        sub('读 page.config.json', ['config', 'build'], '清单原文，构建脚本据此决定读哪些文件、写到哪里。', [['清单原文', J(CONFIG, 'config')]]),
        sub(`填 ${placeholders.length} 个占位符`, ['template', 'build'], `模板里的占位符和清单 \`text\` 的键一一对应，本页共 ${placeholders.length} 个。`, [['填写的占位符', J({ placeholders }, 'config')]]),
      ] },
      { t: '内联总体图', text: 'Archify 生成的 html 里只取 svg；同一张图在总体架构和对象架构里各放一份，id 分别加前缀。', src: ['templates/arch-page/build_page.py:49-69'], subs: [
        sub('extract_svg 取出 svg', ['overview', 'build'], `取出的 svg 共 ${svg?.outerHTML.length.toLocaleString() ?? 0} 字符，含 ${svg?.querySelectorAll('[data-node-id]').length ?? 0} 个方框。`, [['svg 开头', { t: 'text', v: svg?.outerHTML.slice(0, 600) ?? '', k: 'svg' }]]),
        sub('scoped_svg 加前缀后插入两份', ['build', 'page'], '总体架构那份的 id 以 `ov-` 开头，对象架构那份以 `cp-` 开头。', [['两份图的 id 示例', J({ overview: svg?.querySelector('[id]')?.id, components: document.querySelector('#architecture-canvas svg [id]')?.id }, 'svg')]]),
      ] },
      { t: '写入数据和脚本', text: '数据文件写成 JSON 数据块，脚本按清单顺序内联。', src: ['templates/arch-page/build_page.py:72-85', 'templates/arch-page/build_page.py:101-103'], subs: [
        sub('data_tag 写数据块', ['data', 'build'], `本页只有一个数据块 \`${dataEl.id}\`，内容是清单本身。`, [['写出的数据块开头', J({ id: dataEl.id, bytes: dataEl.textContent.length, head: dataEl.outerHTML.slice(0, 160) }, 'datablock')]]),
        sub('按顺序内联脚本', ['scripts', 'build'], '引擎在前，内容脚本在后。', [['脚本顺序', J({ scripts: CONFIG.scripts }, 'config')]]),
      ] },
      { t: '输出', text: '全部插入完成后写到 `out` 指定的路径。', src: ['templates/arch-page/build_page.py:113-115'], subs: [
        sub('写出 example.html', ['build', 'page'], `页面共 ${document.documentElement.outerHTML.length.toLocaleString()} 字符（渲染后）。`, [['输出', J({ out: CONFIG.out, bytes: document.documentElement.outerHTML.length }, 'output')]]),
      ] },
    ] },
    { id: 'render', title: '浏览器里渲染', intro: '页面打开后，内容脚本调用 `ArchPage.init`，引擎先校验，再依次渲染三个部分。', steps: [
      { t: '交出配置', text: '内容脚本把总体说明、全景图和对象列表组成一个配置，交给引擎。', src: ['templates/arch-page/engine.js:480-489'], subs: [
        sub('ArchPage.init(config)', ['page', 'engine'], '配置的规模如下，完整结构见模版 README。', [['配置摘要', J({ repo: REPO, overviewNodes: Object.keys(NODES).length, panoNodes: PNODES.length - 1, stories: 2, components: 8 }, 'init')]]),
      ] },
      { t: '一致性校验', text: '引擎检查各部分之间的引用：方框与说明、组件与关键概念、连线与组件、小步与连线、对象与方框。', src: ['templates/arch-page/engine.js:432-478'], subs: [
        sub('validate', ['engine'], '本页的校验结果是空数组 `[]`，控制台的 `[arch-page]` 输出为 0 条。', [['校验结果', J({ errors: [] }, 'errors')]]),
      ] },
      { t: '渲染三个部分', text: '总体说明绑定到 Archify 方框，全景图画卡片和连线，对象检查器绑定到对象架构那份图。', src: ['templates/arch-page/engine.js:127-153', 'templates/arch-page/engine.js:165-383', 'templates/arch-page/engine.js:385-430'], subs: [
        sub('总体架构', ['engine', 'page'], '点方框显示说明、源码和跳转。', [['方框', J({ placeholders: Object.keys(NODES) }, 'init')]]),
        sub('详细架构流程', ['engine', 'page'], '组件卡片带要点和关键概念；大步说明页列出全部小步的说明。', [['组件', J({ placeholders: PNODES.filter((n) => !n.legend).map((n) => n.id) }, 'init')]]),
        sub('对象架构', ['engine', 'page'], '点方框列出其中的对象。', [['对象数', J({ components: 8 }, 'init')]]),
      ] },
    ] },
  ]

  /* ---------- objects: graph must be an Archify node id ---------- */

  const COMPONENTS = [
    { id: 'cfg', graph: 'config', kind: '文件', title: 'page.config.json', object: 'example/page.config.json', plain: '构建清单。', state: [['out', '输出路径'], ['text', '占位符的值'], ['data', '数据文件'], ['scripts', '脚本顺序']], src: ['templates/arch-page/example/page.config.json'] },
    { id: 'tpl', graph: 'template', kind: '文件', title: 'page.template.html', object: 'templates/arch-page/page.template.html', plain: '页面骨架。', state: [['{{KEY}}', '文字占位符'], ['<!--NAME-->', '插入标记']], src: ['templates/arch-page/page.template.html:302-358'] },
    { id: 'svg', graph: 'overview', kind: '图', title: 'overview.html', object: 'Archify 输出', plain: 'Archify 生成的总体图。', src: ['templates/arch-page/example/overview/candidate.json'] },
    { id: 'datatag', graph: 'data', kind: '函数', title: 'data_tag', object: 'build_page.py', plain: '把数据文件写成 JSON 数据块。', methods: [{ sig: 'data_tag(element_id, spec) -> str', name: '写数据块', in: '元素 id 和 `{file, type, notice}`', out: '`<script type="application/json">`', effect: '校验 JSON 或 JSONL，转义 `</` 和 `<!--`' }], src: ['templates/arch-page/build_page.py:72-85'] },
    { id: 'content', graph: 'scripts', kind: '脚本', title: 'arch.data.js', object: 'example/arch.data.js', plain: '本页内容：总体说明、全景图、流程、对象，最后调用 `ArchPage.init`。', rel: [['调用', 'init', '交出配置']], src: ['templates/arch-page/example/arch.data.js'] },
    { id: 'main', graph: 'build', kind: '函数', title: 'main', object: 'build_page.py', plain: '构建入口。', methods: [{ sig: 'main() -> None', name: '构建', in: '页面目录下的 page.config.json', out: '单文件页面', effect: '填文字、内联图、写数据块和脚本' }], rel: [['调用', 'datatag', '写数据块']], src: ['templates/arch-page/build_page.py:88-115'] },
    { id: 'html', graph: 'page', kind: '文件', title: 'example.html', object: 'example/example.html', plain: '构建输出。', src: ['templates/arch-page/example/page.config.json'] },
    { id: 'init', graph: 'engine', kind: '函数', title: 'ArchPage.init', object: 'engine.js', plain: '引擎入口：校验后渲染三个部分。', methods: [{ sig: 'ArchPage.init(config)', name: '初始化', in: '`{repo, overview, pano, components}`', out: '返回 undefined，结果直接写进页面 DOM', effect: '`validate` 后依次调用 `initOverview`、`initPano`、`initInspector`' }], src: ['templates/arch-page/engine.js:480-489'] },
  ]

  ArchPage.init({
    repo: REPO,
    overview: { nodes: NODES, initial: 'build' },
    pano: {
      zones: ZONES, nodes: PNODES, terms: TERMS, edges: EDGES, stories: STORIES,
      media: MEDIA, kinds: KINDS, fieldDoc: FIELD_DOC, dataTag: '本页',
      legend: '实线是数据的流向；线上的字是两边之间传的内容。',
    },
    components: COMPONENTS,
  })
})()
