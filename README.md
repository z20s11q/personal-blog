# stock-learn

一个以原始资料、可复核案例和交易记录为核心的价格行为学习网站。采用 Astro 构建，并通过 GitHub Pages 发布；后续可加入订单流专题。

网站：[z20s11q.github.io/stock-learn](https://z20s11q.github.io/stock-learn/)

## 本地开发

需要 Node.js 22 或更新版本。

```bash
npm ci
npm run dev
npm run check
npm run build
```

报告文章位于 `src/content/articles/`。在 `main` 分支推送后，`.github/workflows/deploy.yml` 自动构建并发布站点。

- [价格行为资料调研与学习路线](research/price-action-landscape.md)
- [博客框架与信息架构](research/site-direction.md)

这些资料是研究导航，不是交易信号或收益承诺。所有创作者的实际盈利情况在独立核验前均记作“未证实”。
