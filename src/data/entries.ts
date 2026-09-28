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
}

/** Everything the blog lists: articles plus the standalone Rust notes and resource pages, newest first. */
export async function getEntries(base: string): Promise<Entry[]> {
  const articles = await getCollection('articles');
  const rustSections = await getCollection('rust');
  const rustChapters = new Set(rustSections.map((section) => section.data.chapter).filter((chapter) => chapter !== null)).size;

  const entries: Entry[] = [
    ...articles.map((article) => ({
      href: `${base}articles/${article.id}/`,
      title: article.data.title,
      description: article.data.description,
      tags: article.data.tags,
      category: article.data.category,
      date: article.data.publishedAt,
      meta: `约 ${article.data.readingMinutes} 分钟阅读`,
    })),
    {
      href: `${base}rust/`,
      title: 'Rust 编程语言（精简版）',
      description: '基于 The Rust Programming Language 整理的中文学习笔记，全部章节在一页连续展开，目录会跟随阅读位置。',
      tags: ['development'],
      category: '学习笔记',
      date: new Date('2026-09-23T12:00:00+08:00'),
      meta: `${rustChapters} 章 · ${rustSections.length} 节`,
    },
    {
      href: `${base}resources/`,
      title: '价格行为资料索引',
      description: '原始教材、中文讲解、案例复盘与市场机制资料，按可核验程度分别标注。',
      tags: ['finance'],
      category: '资料索引',
      date: new Date('2026-09-23T11:00:00+08:00'),
      meta: '原始来源优先',
    },
  ];
  return entries.sort((a, b) => b.date.valueOf() - a.date.valueOf());
}

export function domainCounts(entries: Entry[]) {
  return domains
    .map((domain) => ({ ...domain, count: entries.filter((entry) => entry.tags.includes(domain.slug)).length }))
    .filter((domain) => domain.count > 0);
}
