import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/sync-rust.mjs <rust-brief-directory>');

const target = new URL('../src/content/rust/', import.meta.url);
await mkdir(target, { recursive: true });

const names = (await readdir(source))
  .filter((name) => /^(?:ch\d{2}-\d{2}|appendix-\d{2})(?:-[\w-]+)?\.md$/.test(name))
  .sort();

for (const name of names) {
  const raw = await readFile(join(source, name), 'utf8');
  const match = raw.match(/^\s{0,3}#{1,3}\s+(.+)$/m);
  if (!match) throw new Error(`Missing title in ${name}`);
  const title = match[1].trim();
  const slug = basename(name, '.md');
  const chapter = slug.startsWith('ch') ? Number(slug.slice(2, 4)) : null;
  const order = chapter === null ? `z-${slug}` : slug;
  const content = raw
    .replace(/^\s{0,3}#{1,3}\s+.+\r?\n/, '')
    .replace(/```rust,[^\r\n]+/g, '```rust')
    .trimStart();
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `order: ${JSON.stringify(order)}`,
    `chapter: ${chapter === null ? 'null' : chapter}`,
    '---',
    '',
  ].join('\n');
  await writeFile(new URL(`${slug}.md`, target), frontmatter + content, 'utf8');
}

console.log(`Synced ${names.length} Rust sections into src/content/rust/`);
