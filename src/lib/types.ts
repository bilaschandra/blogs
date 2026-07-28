export type PostFrontmatter = {
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
};

export type Post = PostFrontmatter & {
  slug: string;
  content: string;
};

export type Paginated<T> = {
  items: T[];
  currentPage: number;
  totalPages: number;
};
