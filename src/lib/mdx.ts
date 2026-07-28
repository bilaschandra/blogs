import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";

export const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      [rehypePrettyCode, { theme: "github-dark" }] as [
        typeof rehypePrettyCode,
        { theme: string }
      ],
    ],
  },
};
