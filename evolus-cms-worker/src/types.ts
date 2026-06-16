// ─────────────────────────────────────────────
// Cloudflare Worker environment bindings
// ─────────────────────────────────────────────
export interface Env {
  // AI binding (wrangler.toml [ai])
  AI: Ai;

  // Secrets (set via `wrangler secret put`)
  GITHUB_PAT:             string;
  SHEETS_SPREADSHEET_ID:  string;
  SHEETS_SERVICE_ACCOUNT: string; // stringified JSON of GCP service account key
  CF_PAGES_HOOK_URL:      string;

  // Vars (wrangler.toml [vars])
  BATCH_SIZE:        string;
  GITHUB_OWNER:      string;
  GITHUB_REPO:       string;
  GITHUB_BRANCH:     string;
  CONTENT_BASE_PATH: string;
  SITE_LANG:         string;
  AUTHOR:            string;
  DRY_RUN:           string;
}

// ─────────────────────────────────────────────
// Google Sheets row (columns A–F)
// ─────────────────────────────────────────────
export type ArticleStatus = 'pending' | 'processing' | 'published' | 'error';

export type ArticleCluster = 'seo' | 'marketing' | 'automation' | 'web-design';

export interface SheetRow {
  rowIndex: number; // 1-based row in the sheet (used for PATCH)
  status:   ArticleStatus;
  cluster:  ArticleCluster;
  keyword:  string;
  title:    string;
  slug:     string;
  excerpt:  string;
}

// ─────────────────────────────────────────────
// Generated article ready to publish
// ─────────────────────────────────────────────
export interface GeneratedArticle {
  slug:        string;
  filename:    string; // e.g. strategie-seo-b2b.md
  frontmatter: ArticleFrontmatter;
  body:        string; // raw Markdown body (no frontmatter)
  fullContent: string; // frontmatter + body (what gets pushed to GitHub)
}

export interface ArticleFrontmatter {
  title:    string;
  excerpt:  string;
  date:     string; // ISO date YYYY-MM-DD
  tag:      string; // derived from cluster
  read:     string; // estimated reading time, e.g. "7 min"
  category: ArticleCluster;
  lang:     string;
  author:   string;
  featured: boolean;
  pillar:   boolean;
  draft:    boolean;
}

// ─────────────────────────────────────────────
// Result per article (for logging)
// ─────────────────────────────────────────────
export interface ArticleResult {
  slug:    string;
  status:  'published' | 'error';
  message: string;
}

// ─────────────────────────────────────────────
// GitHub API — contents endpoint response
// ─────────────────────────────────────────────
export interface GitHubFileResponse {
  sha?: string; // present if file already exists (needed for update)
  content?: string;
  encoding?: string;
}
