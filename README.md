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

- [价格行为资料调研与学习路线](research/price-action-landscape.md)
- [博客框架与信息架构](research/site-direction.md)

交易资料是研究导航，不是交易信号或收益承诺。所有创作者的实际盈利情况在独立核验前均记作“未证实”。
