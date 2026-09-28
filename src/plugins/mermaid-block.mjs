import { defineMdastPlugin } from 'satteri';

const escapeHtml = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** Emits ```mermaid blocks as <pre class="mermaid"> so the article page can render them instead of highlighting. */
export const mermaidBlock = defineMdastPlugin({
  name: 'mermaid-block',
  code(node, ctx) {
    if (node.lang !== 'mermaid') return;
    ctx.replaceNode(node, { type: 'html', value: `<pre class="mermaid">${escapeHtml(node.value)}</pre>` });
  },
});
