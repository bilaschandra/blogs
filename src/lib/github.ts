const GITHUB_API = "https://api.github.com";
const REPO_OWNER = "bilaschandra";
const REPO_NAME = "blogs";
const BRANCH = "main";

export class GitHubConflictError extends Error {}

function githubHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export function encodeBase64(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}

export function decodeBase64(base64: string): string {
  return Buffer.from(base64, "base64").toString("utf8");
}

export function extensionFromFilename(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

export async function listPostFiles(): Promise<{ name: string; sha: string }[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/content/posts?ref=${BRANCH}`,
    { headers: githubHeaders() }
  );
  if (!res.ok) throw new Error(`GitHub list failed: ${res.status}`);
  const data: Array<{ type: string; name: string; sha: string }> = await res.json();
  return data
    .filter((entry) => entry.type === "file" && entry.name.endsWith(".mdx"))
    .map((entry) => ({ name: entry.name, sha: entry.sha }));
}

export async function getFile(
  path: string
): Promise<{ path: string; sha: string; contentBase64: string } | null> {
  const res = await fetch(
    `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`,
    { headers: githubHeaders() }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub get failed: ${res.status}`);
  const data = await res.json();
  return { path, sha: data.sha, contentBase64: data.content };
}

export async function putFile(
  path: string,
  base64Content: string,
  message: string,
  sha?: string
): Promise<void> {
  const res = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
    method: "PUT",
    headers: { ...githubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: base64Content,
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) {
    if (res.status === 409) throw new GitHubConflictError();
    throw new Error(`GitHub put failed: ${res.status}`);
  }
}

export async function deleteFile(path: string, sha: string, message: string): Promise<void> {
  const res = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
    method: "DELETE",
    headers: { ...githubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch: BRANCH }),
  });
  if (!res.ok) {
    if (res.status === 409) throw new GitHubConflictError();
    throw new Error(`GitHub delete failed: ${res.status}`);
  }
}
