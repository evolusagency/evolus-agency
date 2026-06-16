/**
 * github.ts
 * Push a Markdown file to GitHub using the REST API.
 * Uses a Fine-Grained Personal Access Token (PAT) scoped to:
 *   - Repository: your blog repo
 *   - Permissions: Contents → Read & Write
 *
 * HOW TO CREATE THE PAT:
 *   GitHub → Settings → Developer Settings → Personal Access Tokens
 *   → Fine-grained tokens → Generate new token
 *   → Repository access: only the blog repo
 *   → Permissions: Contents = Read & Write
 *   → wrangler secret put GITHUB_PAT
 */

import { GeneratedArticle, GitHubFileResponse } from './types';

const GITHUB_API = 'https://api.github.com';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function githubHeaders(pat: string): Record<string, string> {
  return {
    Authorization:  `Bearer ${pat}`,
    Accept:         'application/vnd.github+json',
    'User-Agent':   'evolus-cms-worker/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/**
 * Checks if the file already exists in the repo.
 * Returns the current SHA if it does (required for updates).
 */
async function getFileSha(
  pat:    string,
  owner:  string,
  repo:   string,
  branch: string,
  path:   string,
): Promise<string | null> {
  const url  = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const resp = await fetch(url, { headers: githubHeaders(pat) });

  if (resp.status === 404) return null;
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`GitHub GET file error (${resp.status}): ${err}`);
  }

  const data = await resp.json() as GitHubFileResponse;
  return data.sha ?? null;
}

// ────────────────────────────────────────────────────────────
// Main: push one article file to GitHub
// ────────────────────────────────────────────────────────────

export interface PushOptions {
  pat:        string;
  owner:      string;
  repo:       string;
  branch:     string;
  basePath:   string; // e.g. "src/content/blog"
  article:    GeneratedArticle;
  dryRun:     boolean;
}

export interface PushResult {
  filePath: string;
  action:   'created' | 'updated' | 'dry-run';
  commitSha?: string;
}

export async function pushArticle(opts: PushOptions): Promise<PushResult> {
  const { pat, owner, repo, branch, basePath, article, dryRun } = opts;
  const filePath = `${basePath}/${article.filename}`;

  if (dryRun) {
    console.log(`[DRY-RUN] Would push: ${filePath}`);
    console.log(`[DRY-RUN] Content preview (first 200 chars):\n${article.fullContent.slice(0, 200)}`);
    return { filePath, action: 'dry-run' };
  }

  // Check if the file already exists (get SHA for update)
  const existingSha = await getFileSha(pat, owner, repo, branch, filePath);
  const action      = existingSha ? 'updated' : 'created';

  // Encode content as Base64 (GitHub API requirement)
  const contentBase64 = btoa(unescape(encodeURIComponent(article.fullContent)));

  const commitMessage = existingSha
    ? `content: update ${article.slug} [cms-worker]`
    : `content: add ${article.slug} [cms-worker]`;

  const body: Record<string, unknown> = {
    message: commitMessage,
    content: contentBase64,
    branch:  branch,
  };

  // Include SHA if updating an existing file
  if (existingSha) {
    body.sha = existingSha;
  }

  const url  = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`;
  const resp = await fetch(url, {
    method:  'PUT',
    headers: {
      ...githubHeaders(pat),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`GitHub PUT error (${resp.status}) for ${filePath}: ${err}`);
  }

  const data = await resp.json() as { commit?: { sha?: string } };
  const commitSha = data.commit?.sha;

  console.log(`[GitHub] ${action}: ${filePath} — commit ${commitSha}`);
  return { filePath, action, commitSha };
}

// ────────────────────────────────────────────────────────────
// Trigger Cloudflare Pages deploy hook
// ────────────────────────────────────────────────────────────

export async function triggerPagesDeploy(hookUrl: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(`[DRY-RUN] Would POST deploy hook: ${hookUrl}`);
    return;
  }

  const resp = await fetch(hookUrl, { method: 'POST' });

  if (!resp.ok) {
    const err = await resp.text();
    // Non-fatal: log but don't throw. Pages will pick up the commit anyway.
    console.warn(`[Pages] Deploy hook failed (${resp.status}): ${err}`);
    return;
  }

  console.log('[Pages] Deploy hook triggered successfully.');
}
