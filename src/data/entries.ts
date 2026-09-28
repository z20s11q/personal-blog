import { getCollection } from 'astro:content';
import { domains } from './domains';

export interface Entry {
  href: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  date: Date;
  meta: string;
  /** Articles collected under this one; always empty for child entries, so nesting is at most two levels. */
  children: Entry[];
}

/** Everything the blog lists as a two-level tree: top-level entries newest first, children in collection order. */
export async function getEntries(base: string): Promise<Entry[]> {
  const articles = await getCollection('articles');
  const rustSections = await getCollection('rust');
  const rustChapters = new Set(rustSections.map((section) => section.data.chapter).filter((chapter) => chapter !== null)).size;

  const ids = new Map(articles.map((article) => [article.id, article]));
  for (const article of articles) {
    const { parent } = article.data;
    if (parent === undefined) continue;
    const target = ids.get(parent);
    if (!target) throw new Error(`Article ${article.id}: parent ${parent} does not exist`);
    if (target.data.parent !== undefined) throw new Error(`Article ${article.id}: parent ${parent} is itself a child; collections nest at most two levels`);
  }

  const toEntry = (article: (typeof articles)[number]): Entry => {
    const children = articles
      .filter((child) => child.data.parent === article.id)
      .sort((a, b) => (a.data.order ?? Infinity) - (b.data.order ?? Infinity) || b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf())
      .map(toEntry);
    return {
      href: `${base}articles/${article.id}/`,
      title: article.data.title,
      description: article.data.description,
      tags: article.data.tags,
      category: article.data.category,
      date: article.data.publishedAt,
      meta: `约 ${article.data.readingMinutes} 分钟阅读${children.length > 0 ? ` · 合集共 ${children.length + 1} 篇` : ''}`,
      children,
    };
  };

  const entries: Entry[] = [
    ...articles.filter((article) => article.data.parent === undefined).map(toEntry),
    {
      href: `${base}rust/`,
      title: 'Rust 编程语言（精简版）',
      description: '基于 The Rust Programming Language 整理的中文学习笔记，全部章节在一页连续展开，目录会跟随阅读位置。',
      tags: ['development'],
      category: '学习笔记',
      date: new Date('2026-09-23T12:00:00+08:00'),
      meta: `${rustChapters} 章 · ${rustSections.length} 节`,
      children: [],
    },
    {
      href: `${base}resources/`,
      title: '价格行为资料索引',
      description: '原始教材、中文讲解、案例复盘与市场机制资料，按可核验程度分别标注。',
      tags: ['finance'],
      category: '资料索引',
      date: new Date('2026-09-23T11:00:00+08:00'),
      meta: '原始来源优先',
      children: [],
    },
  ];
  return entries.sort((a, b) => b.date.valueOf() - a.date.valueOf());
}

export const flattenEntries = (entries: Entry[]) => entries.flatMap((entry) => [entry, ...entry.children]);

/** Keeps a collection when its parent or any child has the tag, showing only the children that have it. */
export const filterByTag = (entries: Entry[], tag: string) => entries
  .map((entry) => ({ ...entry, children: entry.children.filter((child) => child.tags.includes(tag)) }))
  .filter((entry) => entry.tags.includes(tag) || entry.children.length > 0);

export function domainCounts(entries: Entry[]) {
  const flat = flattenEntries(entries);
  return domains
    .map((domain) => ({ ...domain, count: flat.filter((entry) => entry.tags.includes(domain.slug)).length }))
    .filter((domain) => domain.count > 0);
}
