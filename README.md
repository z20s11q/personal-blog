# z20s11q 的个人博客

个人博客，当前收录价格行为研究和 Rust 编程学习资料，后续可以继续加入其他主题。采用 Astro 构建，并通过 GitHub Pages 发布。

网站：[z20s11q.github.io/personal-blog](https://z20s11q.github.io/personal-blog/)

## 本地开发

需要 Node.js 22 或更新版本。

```bash
npm ci
npm run dev
npm run check
npm run build
```

报告文章位于 `src/content/articles/`。Rust 章节位于 `src/content/rust/`，由 `D:\Work\rust-learn\brief` 的 Markdown 源文件导入，并在 `/rust/` 连续展示；单节网址仍可直接访问。原始项目保留在原目录与独立仓库。如需同步本地更新，运行 `node scripts/sync-rust.mjs D:\Work\rust-learn\brief`。在 `main` 分支推送后，`.github/workflows/deploy.yml` 自动构建并发布网站。

Codex / oh-my-pi 架构调研系列（9 篇文章，分成导引、Codex、oh-my-pi 三个合集）和交互式架构图由 `D:\Work\hy\research\codex-omp-architecture` 导入：运行 `node scripts/sync-codex-omp.mjs D:\Work\hy\research\codex-omp-architecture`，脚本把 Markdown 转成 `src/content/articles/` 下的文章（本机路径换成固定提交的 GitHub 链接，文档间引用换成文章链接），把 archify 生成的 HTML 复制到 `public/diagrams/codex-omp/`，图的源数据（archify JSON IR）归档到 `research/codex-omp-architecture/diagram-specs/`。图的标题和说明在 `src/data/diagrams.ts` 中维护，两篇“交互式架构图”文章由脚本根据它生成；合集归属和顺序写在脚本的 `articles` 配置里。文章中语言标记为 `mermaid` 的代码块由 `src/plugins/mermaid-block.mjs` 转换，在浏览器端按需加载 mermaid 渲染。

文章的 `tags` 字段使用领域代号，如 `finance`、`development`、`ai`；显示名称和说明在 `src/data/domains.ts` 中维护。网站不设顶部导航：所有页面左侧都是分类导航（`src/components/SiteSidebar.astro`），各领域默认折叠，展开后列出该领域的文章，合集可以再展开一层；当前文章所在的分类和合集会自动展开，导航区域单独滚动。首页和分类页右侧是统一列表（`src/components/EntryIndex.astro`），文章页的本篇目录在正文右侧。条目来自 `src/data/entries.ts`，包括全部文章以及 Rust 笔记、价格行为资料索引两个独立页面。左侧只显示当前有内容的领域，并自动生成对应分类页。

文章可以组成合集：在 frontmatter 里写 `parent: 父文章 id` 和 `order: 序号`，列表中子文章缩进显示在父文章下面，文章页顶部显示合集目录。合集只有两级，父文章自己不能再有 `parent`，构建时会检查。按领域筛选时，父文章或任一子文章带有该领域标签，合集就会显示，但只列出带该标签的子文章。

- [价格行为资料调研与学习路线](research/price-action-landscape.md)
- [博客框架与信息架构](research/site-direction.md)

交易资料是研究导航，不是交易信号或收益承诺。所有创作者的实际盈利情况在独立核验前均记作“未证实”。
