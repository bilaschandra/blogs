export type PostFrontmatter = {
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  coverImage?: string;
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

export type UserRole = "admin" | "author";

export type SessionUser = {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
};
