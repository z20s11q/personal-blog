import { defineMdastPlugin } from 'satteri';

const FILE_LABEL = /^文件[:：]\s*(\S+)$/;

/** Turns a "文件：path" paragraph directly above a code block into that block's title. */
export const codeFilename = defineMdastPlugin({
  name: 'code-filename',
  code(node, ctx) {
    if (/\btitle=/.test(node.meta ?? '')) return;
    const parent = ctx.parent(node);
    const index = ctx.indexOf(node);
    if (!parent || !index) return;
    const previous = parent.children[index - 1];
    if (previous?.type !== 'paragraph') return;
    if (previous.children.length !== 1 || previous.children[0].type !== 'text') return;
    const match = previous.children[0].value.trim().match(FILE_LABEL);
    if (!match) return;
    ctx.setProperty(node, 'meta', `${node.meta ?? ''} title="${match[1]}"`.trim());
    ctx.removeNode(previous);
  },
});
