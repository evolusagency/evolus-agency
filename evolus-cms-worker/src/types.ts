// ─────────────────────────────────────────────
// Cloudflare Worker environment bindings
// ─────────────────────────────────────────────
export interface Env {
  // AI binding (wrangler.toml [ai])
  AI: Ai;

  // Secrets (set via `wrangler secret put`)
  GITHUB_PAT:             string;
  SHEETS_SPREADSHEET_ID:  string;
  SHEETS_SERVICE_ACCOUNT: string;
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
  BRAVE_SEARCH_API_KEY?: string;
}

// ─────────────────────────────────────────────
// Google Sheets row (columns A–F)
// ─────────────────────────────────────────────
export type ArticleStatus = 'pending' | 'processing' | 'published' | 'error';

export type ArticleCluster =
  | 'seo'
  | 'automation'
  | 'branding'
  | 'content-marketing'
  | 'ux-ui'
  | 'social-media'
  | 'email-marketing'
  | 'paid-ads'
  | 'cro'
  | 'data-analytics'
  | 'ia-generative'
  | 'ecommerce'
  | 'strategie-digitale'
  | 'sales-enablement'
  | 'lead-generation'
  | 'customer-experience'
  | 'video-marketing'
  | 'influence-b2b'
  | 'developpement-web'
  | 'cybersecurite'
  | 'product-marketing'
  | 'fondamentaux-business';

export interface SheetRow {
  rowIndex: number;
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
  filename:    string;
  frontmatter: ArticleFrontmatter;
  body:        string;
  fullContent: string;
}

export interface ArticleFrontmatter {
  title:    string;
  excerpt:  string;
  date:     string;
  tag:      string;
  read:     string;
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
  sha?:      string;
  content?:  string;
  encoding?: string;
}
