import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import { codeFilename } from './src/plugins/code-filename.mjs';

export default defineConfig({
  site: 'https://z20s11q.github.io',
  base: '/personal-blog',
  markdown: {
    processor: satteri({ mdastPlugins: [codeFilename] }),
  },
  integrations: [
    expressiveCode({
      themes: ['github-light', 'github-dark'],
      themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
      useDarkModeMediaQuery: false,
      styleOverrides: {
        borderRadius: '6px',
        borderColor: 'var(--line)',
        codeFontFamily: 'var(--font-mono)',
        codeFontSize: '14px',
        codeLineHeight: '1.65',
        uiFontFamily: 'var(--font-sans)',
        uiFontSize: '13px',
        frames: {
          shadowColor: 'transparent',
          frameBoxShadowCssValue: 'none',
          editorActiveTabIndicatorTopColor: 'var(--accent)',
        },
      },
    }),
    sitemap(),
  ],
});
