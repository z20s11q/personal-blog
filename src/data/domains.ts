export const domains = [
  { slug: 'finance', label: '金融', description: '交易研究、市场资料与方法验证。' },
  { slug: 'development', label: '开发', description: '编程语言、工程实践与学习笔记。' },
  { slug: 'ai', label: 'AI', description: '人工智能工具、原理与实践。' },
] as const;

export const domainLabel = (slug: string) => domains.find((domain) => domain.slug === slug)?.label ?? slug;
