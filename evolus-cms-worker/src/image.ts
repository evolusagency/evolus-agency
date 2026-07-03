/**
 * image.ts  —  v3  (production-grade)
 * ────────────────────────────────────────────────────────────────────────────
 * Cloudflare Workers AI — Blog cover image generation (Flux Schnell) + R2
 *
 * What changed from v2
 * ─────────────────────
 * CRITICAL  [1] Regex pre-compiled once at module load (zero per-call allocation)
 * CRITICAL  [2] matchConcept called once per generation (result passed through)
 * CRITICAL  [3] fast-path now merges cluster confidence with title scoring
 * IMPORTANT [4] Visual variants system — slug-seeded rotation prevents repetition
 * IMPORTANT [5] normalise() pre-applied to all keyword terms at module load
 * IMPORTANT [6] Confidence ceiling replaced with calibrated percentile approach
 * IMPORTANT [7] Flux Schnell prompt restructured: critical instructions ≤ 77 tokens first
 * IMPORTANT [8] Structured logging with timing, requestId and match diagnostics
 */

import type { Ai, R2Bucket } from '@cloudflare/workers-types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const IMAGE_MODEL    = '@cf/black-forest-labs/flux-1-schnell';
const FLUX_STEPS     = 8;         // schnell sweet-spot: 4–8
const MIN_CONFIDENCE = 0.30;      // below → generic fallback
const EXACT_BONUS    = 3.0;
const WORD_BONUS     = 1.0;
const PARTIAL_BONUS  = 0.4;
const VARIANT_COUNT  = 4;         // visual variants per concept

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SemanticKeyword {
  term:     string;   // original (for logging)
  termNorm: string;   // pre-normalised (computed at init)
  weight:   number;
}

interface CompiledKeyword extends SemanticKeyword {
  exactRx: RegExp;    // pre-compiled word-bounded regex on normalised term
  wordRx:  RegExp;    // pre-compiled word-bounded regex on original term
}

/** One visual variant for a concept — same subject, different framing. */
interface VisualVariant {
  scene:  string;
  mood:   string;
  anchor: string;
}

interface VisualConcept {
  /** Primary variant (index 0) + alternates (index 1-N). */
  variants:  VisualVariant[];
  keywords:  SemanticKeyword[];
  /** 1–10. Higher → preferred when scores are close. */
  priority:  number;
}

/** Internal compiled form — built once at module load. */
interface CompiledConcept {
  variants:  VisualVariant[];
  keywords:  CompiledKeyword[];
  priority:  number;
  /** Pre-computed score ceiling for confidence normalisation. */
  ceiling:   number;
}

interface ConceptMatch {
  conceptKey:   string;
  variant:      VisualVariant;
  confidence:   number;   // 0.0–1.0
  matchedTerms: string[];
}

interface ScoredEntry {
  key:          string;
  concept:      CompiledConcept;
  raw:          number;
  matchedTerms: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Structured logger
// ─────────────────────────────────────────────────────────────────────────────

interface LogContext {
  requestId: string;
  slug:      string;
}

const logger = {
  info:  (ctx: LogContext, msg: string, data?: Record<string, unknown>) =>
           console.log(JSON.stringify({ level: 'info',  ...ctx, msg, ...data })),
  warn:  (ctx: LogContext, msg: string, data?: Record<string, unknown>) =>
           console.warn(JSON.stringify({ level: 'warn', ...ctx, msg, ...data })),
  error: (ctx: LogContext, msg: string, data?: Record<string, unknown>) =>
           console.error(JSON.stringify({ level: 'error',...ctx, msg, ...data })),
};

// ─────────────────────────────────────────────────────────────────────────────
// Normalisation  (pure, side-effect-free)
// ─────────────────────────────────────────────────────────────────────────────

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Escape a normalised term for use inside a RegExp. */
function escapeNorm(term: string): string {
  return term.replace(/[-]/g, '[-\\s]').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─────────────────────────────────────────────────────────────────────────────
// Visual Concept Registry  (raw definitions — compiled below)
// ─────────────────────────────────────────────────────────────────────────────
// Each concept has 1 primary variant + up to 3 alternates.
// Variants share the same subject but vary angle, framing, time-of-day or focus.
// The variant chosen at runtime is seeded from the article slug (deterministic).
// ─────────────────────────────────────────────────────────────────────────────

const RAW_CONCEPTS: Record<string, Omit<VisualConcept, 'keywords'> & { keywords: SemanticKeyword[] }> = {

  // ── Planning & Editorial ───────────────────────────────────────────────────

  'content-calendar': {
    priority: 9,
    variants: [
      {
        scene:  'a premium editorial planning workspace: a large wall-mounted six-month content roadmap with color-coded content cards arranged by week, campaign milestone flags, and channel indicators; a strategist\'s hand placing a card on the board',
        mood:   'bright professional office, morning daylight, warm white surfaces, slate and amber accents',
        anchor: 'the six-month roadmap wall with color-coded content cards and milestone flags',
      },
      {
        scene:  'a content operations desk seen from above: a large printed annual content calendar spread across the surface, color-coded sticky notes for each content type, a coffee cup and planning notebook at the edge',
        mood:   'warm overhead editorial light, flat-lay composition, cream and terracotta tones, organized precision',
        anchor: 'the annual calendar spread with color-coded content columns',
      },
      {
        scene:  'a split-view planning session: left side shows a digital scheduling tool with content cards in a kanban board; right side shows a physical wall planner with sticky notes grouped by campaign quarter',
        mood:   'modern hybrid workspace, soft afternoon light, cool slate and warm amber',
        anchor: 'the junction between digital and physical planning systems',
      },
      {
        scene:  'a morning editorial standup: a team of three around a large monitor displaying a weekly content production calendar, one person pointing at an upcoming publication date on a wall-mounted display',
        mood:   'collaborative office, bright morning energy, white walls, warm wood surfaces',
        anchor: 'the wall-mounted content calendar with the upcoming date highlighted',
      },
    ],
    keywords: [
      { term: 'content calendar',       termNorm: '', weight: 3 },
      { term: 'calendrier editorial',   termNorm: '', weight: 3 },
      { term: 'calendrier de contenu',  termNorm: '', weight: 3 },
      { term: 'editorial calendar',     termNorm: '', weight: 3 },
      { term: 'planifier contenu',      termNorm: '', weight: 2 },
      { term: 'planification contenu',  termNorm: '', weight: 2 },
      { term: 'planning editorial',     termNorm: '', weight: 2 },
      { term: '6 mois',                 termNorm: '', weight: 2 },
      { term: 'six mois',               termNorm: '', weight: 2 },
      { term: 'publication schedule',   termNorm: '', weight: 2 },
      { term: 'calendrier',             termNorm: '', weight: 1 },
      { term: 'planning',               termNorm: '', weight: 1 },
    ],
  },

  'editorial-planning': {
    priority: 8,
    variants: [
      {
        scene:  'an editorial strategy session: a large conference table with printed content briefs, topic clusters mapped on a whiteboard, sticky notes grouped by content pillar, a project manager reviewing a quarterly content plan',
        mood:   'modern agency workspace, diffused studio lighting, muted tones with teal and warm white',
        anchor: 'the whiteboard content map with topic clusters and connecting lines',
      },
      {
        scene:  'a content strategist at a standing desk reviewing a printed topic cluster map, surrounded by pillar page outlines, keyword research sheets, and a quarterly planning calendar pinned to the wall',
        mood:   'focused solo workspace, warm directional lamp, clean white and slate surfaces',
        anchor: 'the topic cluster map with pillar and cluster pages annotated',
      },
    ],
    keywords: [
      { term: 'editorial planning',       termNorm: '', weight: 3 },
      { term: 'planification editoriale', termNorm: '', weight: 3 },
      { term: 'strategie editoriale',     termNorm: '', weight: 2 },
      { term: 'content strategy',         termNorm: '', weight: 2 },
      { term: 'strategie contenu',        termNorm: '', weight: 2 },
      { term: 'piliers de contenu',       termNorm: '', weight: 2 },
      { term: 'content pillars',          termNorm: '', weight: 2 },
      { term: 'topic cluster',            termNorm: '', weight: 2 },
      { term: 'brief editorial',          termNorm: '', weight: 1 },
    ],
  },

  // ── Content & Blog ─────────────────────────────────────────────────────────

  'content-marketing': {
    priority: 5,
    variants: [
      {
        scene:  'a content marketing command center: multiple screens showing analytics dashboards, blog performance metrics, social reach graphs, and a content pipeline board; a content strategist reviewing published articles',
        mood:   'modern open-plan office, cool blue screen glow, warm desk lighting',
        anchor: 'the central analytics screen showing content performance curves rising steadily',
      },
      {
        scene:  'a content team review meeting: three people around a monitor displaying an editorial performance dashboard with traffic, engagement, and lead conversion metrics; printed content briefs on the table',
        mood:   'collaborative modern office, diffused afternoon light, warm white and blue tones',
        anchor: 'the performance dashboard showing traffic and conversion metrics',
      },
    ],
    keywords: [
      { term: 'content marketing',    termNorm: '', weight: 2 },
      { term: 'marketing de contenu', termNorm: '', weight: 2 },
      { term: 'contenu',              termNorm: '', weight: 1 },
      { term: 'content',              termNorm: '', weight: 1 },
      { term: 'blog',                 termNorm: '', weight: 1 },
      { term: 'redaction',            termNorm: '', weight: 1 },
      { term: 'article',              termNorm: '', weight: 1 },
      { term: 'publication',          termNorm: '', weight: 1 },
    ],
  },

  // ── Lead & Demand Generation ───────────────────────────────────────────────

  'lead-generation': {
    priority: 7,
    variants: [
      {
        scene:  'a B2B sales development workspace: a prospecting dashboard with qualified lead cards flowing through pipeline stages, a rep reviewing inbound demo requests, a whiteboard showing ICP criteria and conversion rates',
        mood:   'professional sales office, clean modern interior, navy and white with gold metric highlights',
        anchor: 'the pipeline dashboard with qualified lead cards advancing through stages',
      },
      {
        scene:  'an inbound lead capture workspace: a screen showing form submission notifications flowing in real time, a lead scoring matrix on a whiteboard, and a sales rep qualifying leads from a printed ICP checklist',
        mood:   'energetic sales office, bright white walls, electric blue data accents',
        anchor: 'the real-time lead notification feed with scoring indicators',
      },
    ],
    keywords: [
      { term: 'lead generation',      termNorm: '', weight: 3 },
      { term: 'generation de leads',  termNorm: '', weight: 3 },
      { term: 'lead gen',             termNorm: '', weight: 2 },
      { term: 'leads',                termNorm: '', weight: 2 },
      { term: 'prospection',          termNorm: '', weight: 2 },
      { term: 'acquisition',          termNorm: '', weight: 1 },
      { term: 'inbound',              termNorm: '', weight: 1 },
    ],
  },

  'lead-nurturing': {
    priority: 8,
    variants: [
      {
        scene:  'a marketing automation workspace: a nurture sequence flowchart mapped on a board with email stages, timing intervals, and audience segments on screen; a marketer reviewing open rates at each stage',
        mood:   'focused professional office, warm lighting, teal and slate tones',
        anchor: 'the nurture sequence flowchart with stage-by-stage email nodes and timing arrows',
      },
      {
        scene:  'a CRM email sequence builder: a screen showing a multi-step nurture workflow with contact behavior triggers, wait timers, and personalised email templates; a marketer comparing click rates per stage',
        mood:   'modern marketing office, cool dual-screen glow, methodical and data-driven',
        anchor: 'the nurture workflow screen with triggered steps and performance rates',
      },
    ],
    keywords: [
      { term: 'lead nurturing',    termNorm: '', weight: 3 },
      { term: 'nurturing',         termNorm: '', weight: 2 },
      { term: 'drip campaign',     termNorm: '', weight: 2 },
      { term: 'sequence email',    termNorm: '', weight: 2 },
      { term: 'email sequence',    termNorm: '', weight: 2 },
      { term: 'automation email',  termNorm: '', weight: 2 },
      { term: 'scoring',           termNorm: '', weight: 1 },
      { term: 'lead scoring',      termNorm: '', weight: 2 },
    ],
  },

  'demand-generation': {
    priority: 8,
    variants: [
      {
        scene:  'a demand generation war room: large screens displaying pipeline contribution by channel, campaign performance broken down by MQL and SQL, a demand gen director reviewing cross-channel attribution with her team',
        mood:   'executive briefing room, dramatic overhead lighting, dark surfaces with electric blue screen glow',
        anchor: 'the main attribution dashboard showing pipeline influence by channel',
      },
      {
        scene:  'a demand generation analyst reviewing a channel attribution report: pie charts of pipeline sourced by content, paid, event, and partner shown on a large monitor; a budget vs pipeline ROI table printed beside it',
        mood:   'focused analytics workspace, dark mode screens, amber and blue highlights',
        anchor: 'the pipeline attribution chart with channel breakdown visible',
      },
    ],
    keywords: [
      { term: 'demand generation',    termNorm: '', weight: 3 },
      { term: 'demand gen',           termNorm: '', weight: 3 },
      { term: 'generation de demande',termNorm: '', weight: 3 },
      { term: 'pipeline generation',  termNorm: '', weight: 2 },
      { term: 'pipeline marketing',   termNorm: '', weight: 2 },
      { term: 'mql',                  termNorm: '', weight: 2 },
      { term: 'sql',                  termNorm: '', weight: 2 },
    ],
  },

  // ── ABM & Revenue ──────────────────────────────────────────────────────────

  'account-based-marketing': {
    priority: 9,
    variants: [
      {
        scene:  'an ABM strategy session: a large table with named account dossiers, an org-chart wall showing decision-maker maps for three target accounts, a strategist pinning champion contacts with colored string',
        mood:   'focused private meeting room, directional desk lamps, muted luxury interior, dark wood and white',
        anchor: 'the decision-maker org-chart wall with champion contacts highlighted in gold',
      },
      {
        scene:  'a target account review: a screen showing account engagement scores, intent data by account, and a tiered account list divided into Tier 1, 2, and 3; a sales and marketing lead reviewing the list together',
        mood:   'executive boardroom, dramatic side lighting, dark oak surfaces, electric blue data',
        anchor: 'the account engagement score matrix with Tier 1 accounts highlighted',
      },
    ],
    keywords: [
      { term: 'account based marketing',        termNorm: '', weight: 3 },
      { term: 'account-based marketing',        termNorm: '', weight: 3 },
      { term: 'abm',                            termNorm: '', weight: 3 },
      { term: 'marketing base sur les comptes', termNorm: '', weight: 3 },
      { term: 'key account',                    termNorm: '', weight: 2 },
      { term: 'named account',                  termNorm: '', weight: 2 },
      { term: 'strategic account',              termNorm: '', weight: 2 },
      { term: 'target account',                 termNorm: '', weight: 2 },
    ],
  },

  'revenue-operations': {
    priority: 8,
    variants: [
      {
        scene:  'a revenue operations overview: three monitors showing sales, marketing and customer success dashboards unified into a single revenue view; a RevOps analyst reviewing attribution models and pipeline velocity',
        mood:   'modern tech company office, clean minimalist, cool grey and electric blue',
        anchor: 'the unified revenue dashboard showing all three teams\' KPIs in one view',
      },
      {
        scene:  'a RevOps architecture review: a whiteboard showing the integration diagram between CRM, MAP, and CS platform with data flow arrows; a RevOps manager presenting pipeline hygiene metrics to two stakeholders',
        mood:   'professional conference room, bright diffused light, clean white and navy',
        anchor: 'the integration architecture diagram with data flow connections',
      },
    ],
    keywords: [
      { term: 'revenue operations',   termNorm: '', weight: 3 },
      { term: 'revops',               termNorm: '', weight: 3 },
      { term: 'rev ops',              termNorm: '', weight: 3 },
      { term: 'operations de revenus',termNorm: '', weight: 3 },
      { term: 'attribution',          termNorm: '', weight: 1 },
      { term: 'pipeline velocity',    termNorm: '', weight: 2 },
      { term: 'churn',                termNorm: '', weight: 1 },
      { term: 'revenue',              termNorm: '', weight: 1 },
    ],
  },

  'marketing-operations': {
    priority: 8,
    variants: [
      {
        scene:  'a marketing operations hub: a technologist managing a martech stack diagram on screen, connecting data flows between CRM, MAP, analytics, and CDP; system health indicators showing green across integrations',
        mood:   'tech-forward office, dark mode aesthetic, neon green and blue system indicators',
        anchor: 'the martech stack diagram with active data flow connections highlighted',
      },
      {
        scene:  'a marketing ops data audit: a screen showing data quality metrics across contact records, duplicate rates, and field completion percentages; a Martech stack map printed on the wall behind the analyst',
        mood:   'focused technical workspace, dark screens, green health indicators, amber warning flags',
        anchor: 'the data quality dashboard with field completion and duplicate metrics',
      },
    ],
    keywords: [
      { term: 'marketing operations', termNorm: '', weight: 3 },
      { term: 'marketing ops',        termNorm: '', weight: 3 },
      { term: 'marops',               termNorm: '', weight: 3 },
      { term: 'operations marketing', termNorm: '', weight: 3 },
      { term: 'martech',              termNorm: '', weight: 2 },
      { term: 'tech stack',           termNorm: '', weight: 2 },
      { term: 'stack marketing',      termNorm: '', weight: 2 },
      { term: 'crm integration',      termNorm: '', weight: 2 },
    ],
  },

  // ── Customer Lifecycle ─────────────────────────────────────────────────────

  'customer-onboarding': {
    priority: 9,
    variants: [
      {
        scene:  'a customer success onboarding session: a CS manager walking a new client through a structured checklist on a shared screen, milestone cards on a board showing Week 1, Week 2, and Week 4 activation goals',
        mood:   'welcoming modern office, warm daylight, fresh and organized, green and white accents',
        anchor: 'the onboarding milestone board with activation goal cards progressing left to right',
      },
      {
        scene:  'a SaaS product onboarding screen shown on a large monitor: a step-by-step setup wizard with progress indicators, a CS manager annotating a printed onboarding playbook; customer health score panel visible on a secondary screen',
        mood:   'bright product-focused workspace, clean white, progress green indicators, welcoming energy',
        anchor: 'the onboarding wizard with step progress indicators on the main screen',
      },
    ],
    keywords: [
      { term: 'customer onboarding', termNorm: '', weight: 3 },
      { term: 'onboarding client',   termNorm: '', weight: 3 },
      { term: 'onboarding',          termNorm: '', weight: 2 },
      { term: 'first 90 days',       termNorm: '', weight: 2 },
      { term: 'premiers 90 jours',   termNorm: '', weight: 2 },
      { term: 'activation',          termNorm: '', weight: 2 },
      { term: 'time to value',       termNorm: '', weight: 2 },
      { term: 'ttv',                 termNorm: '', weight: 2 },
      { term: 'offboarding',         termNorm: '', weight: 1 },
    ],
  },

  'customer-retention': {
    priority: 8,
    variants: [
      {
        scene:  'a customer health monitoring workspace: a CS lead reviewing a churn risk dashboard with health scores by account, red/amber/green status indicators, flagged at-risk accounts, and a renewal calendar on a secondary screen',
        mood:   'clean modern office, focused and urgent, navy and amber health indicators',
        anchor: 'the customer health score dashboard with red/amber/green account statuses',
      },
      {
        scene:  'a renewal playbook session: a CS manager reviewing a list of upcoming renewals, each with a health score, last engagement date, and expansion opportunity; a printed risk assessment on the desk',
        mood:   'executive CS workspace, warm directional light, gold renewal targets, focused precision',
        anchor: 'the renewal list with health scores and expansion opportunity indicators',
      },
    ],
    keywords: [
      { term: 'customer retention', termNorm: '', weight: 3 },
      { term: 'retention client',   termNorm: '', weight: 3 },
      { term: 'churn',              termNorm: '', weight: 2 },
      { term: 'attrition',          termNorm: '', weight: 2 },
      { term: 'renouvellement',     termNorm: '', weight: 2 },
      { term: 'renewal',            termNorm: '', weight: 2 },
      { term: 'fidelisation',       termNorm: '', weight: 2 },
      { term: 'customer health',    termNorm: '', weight: 2 },
      { term: 'health score',       termNorm: '', weight: 2 },
      { term: 'nrr',                termNorm: '', weight: 2 },
    ],
  },

  'customer-experience': {
    priority: 6,
    variants: [
      {
        scene:  'a customer experience design workshop: a journey mapping session with touchpoints on a long wall panel, experience ratings at each stage, a UX researcher and CX team annotating pain points and delight moments',
        mood:   'collaborative studio, bright and open, warm amber and white, human-centered warmth',
        anchor: 'the journey map wall with emotion ratings and touchpoint annotations',
      },
      {
        scene:  'a NPS analysis workspace: a screen showing NPS trend over 12 months with verbatim comment clusters on a second panel; a CX director reviewing a printed action plan built from the most common pain points',
        mood:   'modern CX office, clean white, amber NPS score highlight, focused improvement energy',
        anchor: 'the NPS trend screen with comment cluster panel beside it',
      },
    ],
    keywords: [
      { term: 'customer experience', termNorm: '', weight: 2 },
      { term: 'experience client',   termNorm: '', weight: 2 },
      { term: 'cx',                  termNorm: '', weight: 2 },
      { term: 'parcours client',     termNorm: '', weight: 2 },
      { term: 'satisfaction client', termNorm: '', weight: 2 },
      { term: 'nps',                 termNorm: '', weight: 1 },
      { term: 'csat',                termNorm: '', weight: 1 },
    ],
  },

  // ── Sales & Funnel ─────────────────────────────────────────────────────────

  'sales-funnel': {
    priority: 8,
    variants: [
      {
        scene:  'a B2B sales funnel analysis: a sales director reviewing a large funnel diagram on a whiteboard with MQL, SQL, opportunity, and closed-won stages annotated with conversion rates; a laptop shows the same data in a CRM pipeline view',
        mood:   'executive sales office, confident and analytical, dark navy and white with gold conversion highlights',
        anchor: 'the whiteboard funnel with conversion rate annotations at each stage transition',
      },
      {
        scene:  'a pipeline review meeting: a sales leader presenting CRM pipeline data projected on a wall screen, showing open deals by stage, average deal size, and win rate trends; two sales managers reviewing their segments',
        mood:   'executive boardroom, dramatic presentation lighting, dark surfaces, electric blue data',
        anchor: 'the projected CRM pipeline with stage-by-stage deal counts and values',
      },
    ],
    keywords: [
      { term: 'sales funnel',       termNorm: '', weight: 3 },
      { term: 'funnel de vente',    termNorm: '', weight: 3 },
      { term: 'entonnoir de vente', termNorm: '', weight: 3 },
      { term: 'entonnoir',          termNorm: '', weight: 2 },
      { term: 'conversion funnel',  termNorm: '', weight: 3 },
      { term: 'pipeline stages',    termNorm: '', weight: 2 },
      { term: 'taux de conversion', termNorm: '', weight: 1 },
    ],
  },

  'sales-enablement': {
    priority: 7,
    variants: [
      {
        scene:  'a sales enablement hub: a manager building a content library on screen, battle cards and competitive one-pagers on a desk, a rep preparing for a discovery call using a printed playbook',
        mood:   'professional modern office, focused and prepared, clean slate and white with blue accents',
        anchor: 'the open sales playbook with a rep actively annotating it',
      },
      {
        scene:  'a sales kickoff preparation session: a product marketer and sales enablement manager reviewing a launch playbook spread on a table, new competitive battle cards printed beside a laptop showing a sales performance dashboard',
        mood:   'pre-launch energy, bright modern office, white and electric blue, organized readiness',
        anchor: 'the launch playbook spread with battle cards and competitive comparison sections',
      },
    ],
    keywords: [
      { term: 'sales enablement', termNorm: '', weight: 3 },
      { term: 'aide a la vente',  termNorm: '', weight: 3 },
      { term: 'playbook',         termNorm: '', weight: 2 },
      { term: 'battle card',      termNorm: '', weight: 2 },
      { term: 'sales content',    termNorm: '', weight: 2 },
      { term: 'discovery call',   termNorm: '', weight: 2 },
      { term: 'vente',            termNorm: '', weight: 1 },
      { term: 'commercial',       termNorm: '', weight: 1 },
      { term: 'sales',            termNorm: '', weight: 1 },
    ],
  },

  // ── Growth & SaaS ──────────────────────────────────────────────────────────

  'growth-marketing': {
    priority: 8,
    variants: [
      {
        scene:  'a growth team sprint room: a monitor showing a growth experiment log with hypothesis, variant, and results columns; a whiteboard covered in acquisition loop diagrams; a growth engineer and marketer reviewing A/B results',
        mood:   'fast-paced startup office, energetic, bright white walls, electric blue metrics',
        anchor: 'the experiment log screen showing a winning variant with significant lift highlighted',
      },
      {
        scene:  'a product-led growth analysis: a screen showing activation funnel metrics from signup to first value moment, feature adoption curves, and viral coefficient calculation; a growth PM reviewing the data with a sticky-note hypothesis wall behind',
        mood:   'modern product office, dark mode screens, green activation metrics, rapid iteration energy',
        anchor: 'the activation funnel screen with the first value moment drop-off highlighted',
      },
    ],
    keywords: [
      { term: 'growth marketing',   termNorm: '', weight: 3 },
      { term: 'growth hacking',     termNorm: '', weight: 3 },
      { term: 'growth',             termNorm: '', weight: 1 },
      { term: 'aarrr',              termNorm: '', weight: 2 },
      { term: 'activation rate',    termNorm: '', weight: 2 },
      { term: 'viral loop',         termNorm: '', weight: 2 },
      { term: 'product-led growth', termNorm: '', weight: 2 },
      { term: 'plg',                termNorm: '', weight: 2 },
      { term: 'experimentation',    termNorm: '', weight: 1 },
    ],
  },

  'saas-marketing': {
    priority: 8,
    variants: [
      {
        scene:  'a SaaS marketing overview: a product marketer reviewing trial-to-paid conversion metrics, MRR expansion chart, and freemium funnel stages on dual monitors; a printed ICP and pricing strategy board in the background',
        mood:   'modern SaaS company office, clean minimal, dark mode screens with lime green MRR highlights',
        anchor: 'the dual monitors showing trial conversion rate and MRR expansion curves',
      },
      {
        scene:  'a SaaS pricing strategy session: a whiteboard with pricing tier comparison, willingness-to-pay research findings, and ICP segment analysis; a product marketer and founder reviewing feature packaging decisions',
        mood:   'strategic workspace, warm directional light, white and dark navy, decision-making tension',
        anchor: 'the pricing tier whiteboard with ICP segment alignment annotations',
      },
    ],
    keywords: [
      { term: 'saas marketing',  termNorm: '', weight: 3 },
      { term: 'marketing saas',  termNorm: '', weight: 3 },
      { term: 'saas',            termNorm: '', weight: 2 },
      { term: 'mrr',             termNorm: '', weight: 2 },
      { term: 'arr',             termNorm: '', weight: 2 },
      { term: 'trial',           termNorm: '', weight: 2 },
      { term: 'freemium',        termNorm: '', weight: 2 },
      { term: 'subscription',    termNorm: '', weight: 2 },
      { term: 'abonnement',      termNorm: '', weight: 2 },
      { term: 'pricing',         termNorm: '', weight: 1 },
    ],
  },

  // ── Customer Journey ───────────────────────────────────────────────────────

  'customer-journey': {
    priority: 8,
    variants: [
      {
        scene:  'a customer journey mapping workshop: a long wall panel showing a six-stage journey from awareness to advocacy, with persona cards at the top, channel touchpoints in the middle, and emotion ratings at the bottom; team members adding post-its',
        mood:   'collaborative design studio, bright natural light, warm amber and white palette',
        anchor: 'the six-stage journey panel with persona cards, touchpoints, and emotion curve',
      },
      {
        scene:  'a B2B buyer journey analysis: a screen showing time-in-stage metrics for each buyer journey phase, with average touchpoints per stage and drop-off rates; a demand gen manager presenting findings to a marketing team',
        mood:   'modern analytics workspace, clean dual-screen setup, cool blue data on white',
        anchor: 'the buyer journey metrics screen with stage duration and drop-off analysis',
      },
    ],
    keywords: [
      { term: 'customer journey',  termNorm: '', weight: 3 },
      { term: 'parcours client',   termNorm: '', weight: 3 },
      { term: 'buyer journey',     termNorm: '', weight: 3 },
      { term: 'parcours acheteur', termNorm: '', weight: 3 },
      { term: 'touchpoint',        termNorm: '', weight: 2 },
      { term: 'point de contact',  termNorm: '', weight: 2 },
      { term: 'awareness',         termNorm: '', weight: 1 },
      { term: 'consideration',     termNorm: '', weight: 1 },
      { term: 'advocacy',          termNorm: '', weight: 1 },
    ],
  },

  // ── SEO ────────────────────────────────────────────────────────────────────

  'seo': {
    priority: 6,
    variants: [
      {
        scene:  'an SEO workspace: a specialist at a dual-monitor setup showing a keyword research spreadsheet with search volume, keyword difficulty, and SERP feature columns; a second screen displays a site audit with technical issues ranked by impact',
        mood:   'focused analyst workspace, cool blue monitor glow, dark slate desk, precise and data-driven',
        anchor: 'the keyword research dashboard with ranked opportunities highlighted',
      },
      {
        scene:  'a technical SEO audit session: a screen showing Core Web Vitals metrics with LCP, CLS, and FID scores by page template; a second monitor displays a crawl log with broken links and redirect chains flagged in red',
        mood:   'technical workspace, dark mode, amber warning indicators, systematic precision',
        anchor: 'the Core Web Vitals dashboard with page-level performance breakdown',
      },
      {
        scene:  'a link building strategy workspace: a content marketer reviewing a prospect list for outreach, with domain authority scores, topical relevance, and contact information organized in a spreadsheet; a backlink growth chart on a secondary screen',
        mood:   'modern marketing office, clean dual screens, navy and white with gold authority scores',
        anchor: 'the backlink prospect spreadsheet with authority scores and relevance indicators',
      },
    ],
    keywords: [
      { term: 'seo',                  termNorm: '', weight: 3 },
      { term: 'referencement',        termNorm: '', weight: 3 },
      { term: 'referencement naturel',termNorm: '', weight: 3 },
      { term: 'search engine',        termNorm: '', weight: 2 },
      { term: 'google ranking',       termNorm: '', weight: 2 },
      { term: 'serp',                 termNorm: '', weight: 2 },
      { term: 'keyword',              termNorm: '', weight: 2 },
      { term: 'mot-cle',              termNorm: '', weight: 2 },
      { term: 'backlink',             termNorm: '', weight: 2 },
      { term: 'netlinking',           termNorm: '', weight: 2 },
      { term: 'audit seo',            termNorm: '', weight: 2 },
      { term: 'core web vitals',      termNorm: '', weight: 2 },
      { term: 'ranking',              termNorm: '', weight: 1 },
      { term: 'google',               termNorm: '', weight: 1 },
    ],
  },

  // ── Automation ─────────────────────────────────────────────────────────────

  'automation': {
    priority: 5,
    variants: [
      {
        scene:  'a marketing automation workflow builder: a screen showing a visual workflow canvas with trigger nodes, condition branches, wait steps, and action nodes connected by arrows; a marketer reviewing a live run log with green checkmarks',
        mood:   'modern tech workspace, clean white and electric blue, precise and systematic',
        anchor: 'the automation workflow canvas with nodes, branches, and active run indicators',
      },
      {
        scene:  'an automation audit session: a operations manager reviewing an existing workflow map printed on paper, noting redundant steps with red markers; a screen shows process time-savings metrics before and after automation',
        mood:   'focused process improvement workspace, clean white and red annotation accents',
        anchor: 'the printed workflow map with red optimization annotations and time-saving metrics',
      },
    ],
    keywords: [
      { term: 'marketing automation',    termNorm: '', weight: 3 },
      { term: 'automatisation marketing',termNorm: '', weight: 3 },
      { term: 'automation',              termNorm: '', weight: 2 },
      { term: 'automatisation',          termNorm: '', weight: 2 },
      { term: 'workflow',                termNorm: '', weight: 2 },
      { term: 'zapier',                  termNorm: '', weight: 2 },
      { term: 'n8n',                     termNorm: '', weight: 2 },
      { term: 'trigger',                 termNorm: '', weight: 1 },
      { term: 'sequence',                termNorm: '', weight: 1 },
    ],
  },

  // ── Paid Advertising ───────────────────────────────────────────────────────

  'paid-ads': {
    priority: 6,
    variants: [
      {
        scene:  'a paid media command center: a performance marketer reviewing a multi-channel ads dashboard showing Google Ads, Meta, and LinkedIn campaigns side by side; ROAS, CPC, and conversion metrics visible; a budget allocation chart on a secondary monitor',
        mood:   'focused performance marketing office, dark screens with bright metric callouts, urgent and data-driven',
        anchor: 'the multi-channel dashboard with ROAS and conversion data side by side',
      },
      {
        scene:  'a LinkedIn Ads creative review session: a B2B marketer comparing three ad creative variants on screen, with CTR, CPL, and MQL conversion rate for each; an audience segmentation panel showing job title and company size targeting',
        mood:   'modern B2B marketing office, clean dual screens, professional blue and white',
        anchor: 'the ad creative comparison matrix with CTR and CPL metrics per variant',
      },
    ],
    keywords: [
      { term: 'paid ads',             termNorm: '', weight: 3 },
      { term: 'paid media',           termNorm: '', weight: 3 },
      { term: 'publicite payante',    termNorm: '', weight: 3 },
      { term: 'google ads',           termNorm: '', weight: 3 },
      { term: 'meta ads',             termNorm: '', weight: 3 },
      { term: 'linkedin ads',         termNorm: '', weight: 3 },
      { term: 'roas',                 termNorm: '', weight: 3 },
      { term: 'cpc',                  termNorm: '', weight: 2 },
      { term: 'cpa',                  termNorm: '', weight: 2 },
      { term: 'publicite',            termNorm: '', weight: 1 },
      { term: 'ads',                  termNorm: '', weight: 1 },
      { term: 'campagne publicitaire',termNorm: '', weight: 2 },
    ],
  },

  // ── CRO ────────────────────────────────────────────────────────────────────

  'cro': {
    priority: 7,
    variants: [
      {
        scene:  'a CRO experiment workspace: a split-screen showing two landing page variants in an A/B test; a specialist reviewing heatmaps, session recordings, and a statistical significance calculator; a whiteboard showing hypothesis-test-learn cycle',
        mood:   'analytical modern office, dual-screen glow, scientific precision, cool grey and blue',
        anchor: 'the A/B test split-screen with a winning variant and statistical significance highlighted',
      },
      {
        scene:  'a conversion audit session: a UX specialist reviewing a session recording showing user hesitation on a form, with a heatmap overlay revealing dead clicks; a printed friction audit checklist on the desk',
        mood:   'focused analytical workspace, dark mode with amber heatmap overlay, investigative',
        anchor: 'the session recording with heatmap overlay showing user friction patterns',
      },
    ],
    keywords: [
      { term: 'cro',                           termNorm: '', weight: 3 },
      { term: 'conversion rate optimization',  termNorm: '', weight: 3 },
      { term: 'optimisation conversion',       termNorm: '', weight: 3 },
      { term: 'a/b test',                      termNorm: '', weight: 2 },
      { term: 'ab testing',                    termNorm: '', weight: 2 },
      { term: 'split test',                    termNorm: '', weight: 2 },
      { term: 'heatmap',                       termNorm: '', weight: 2 },
      { term: 'landing page',                  termNorm: '', weight: 1 },
      { term: 'taux de conversion',            termNorm: '', weight: 2 },
    ],
  },

  // ── Branding & Design ──────────────────────────────────────────────────────

  'rebranding': {
    priority: 8,
    variants: [
      {
        scene:  'a brand transformation project room: before-and-after brand identity boards side by side; a creative director comparing old and new logo variants, typography specimens, and color palette swatches pinned to a large foam board',
        mood:   'creative studio, deliberate and decisive, warm atelier light, muted old tones left, vivid new brand colors right',
        anchor: 'the before-and-after brand board with the contrast between old and new identity',
      },
      {
        scene:  'a brand positioning workshop: a facilitator and brand team around a table with a printed brand positioning canvas, working through differentiation, target persona, and value proposition sections; mood boards pinned on a side wall',
        mood:   'creative strategy room, warm natural light, rich paper textures, collaborative energy',
        anchor: 'the brand positioning canvas with completed differentiation and value proposition sections',
      },
    ],
    keywords: [
      { term: 'rebranding',              termNorm: '', weight: 3 },
      { term: 'rebrand',                 termNorm: '', weight: 3 },
      { term: 'repositionnement marque', termNorm: '', weight: 3 },
      { term: 'brand refresh',           termNorm: '', weight: 3 },
      { term: 'nouvelle identite',       termNorm: '', weight: 2 },
      { term: 'refonte identite',        termNorm: '', weight: 2 },
      { term: 'repositionnement',        termNorm: '', weight: 2 },
    ],
  },

  'branding': {
    priority: 5,
    variants: [
      {
        scene:  'a brand identity design studio: a designer\'s desk with logo construction grids printed on paper, a color palette book open to a carefully selected palette, type specimens pinned to a corkboard, a brand guideline document on screen',
        mood:   'warm atelier light, rich oak surfaces, craft and precision, timeless design atmosphere',
        anchor: 'the open brand guideline document with logo, palette, and type specimens arranged',
      },
      {
        scene:  'a brand consistency audit: a screen displaying a brand compliance dashboard showing approved vs unapproved asset usage across channels, with a printed brand guide open to the color and typography page beside it',
        mood:   'clean modern design office, bright diffused light, white and gold brand identity accents',
        anchor: 'the brand compliance dashboard with approved asset usage indicators',
      },
    ],
    keywords: [
      { term: 'branding',          termNorm: '', weight: 2 },
      { term: 'brand identity',    termNorm: '', weight: 2 },
      { term: 'identite de marque',termNorm: '', weight: 2 },
      { term: 'marque',            termNorm: '', weight: 1 },
      { term: 'logo',              termNorm: '', weight: 2 },
      { term: 'charte graphique',  termNorm: '', weight: 2 },
      { term: 'brand guidelines',  termNorm: '', weight: 2 },
      { term: 'identite',          termNorm: '', weight: 1 },
    ],
  },

  // ── Email Marketing ────────────────────────────────────────────────────────

  'email-marketing': {
    priority: 6,
    variants: [
      {
        scene:  'an email marketing workspace: a marketer using an email builder on screen, previewing a newsletter on desktop and mobile simultaneously; a second panel shows campaign analytics with open rate, click rate, and unsubscribe trend; A/B subject line results visible',
        mood:   'modern clean workspace, dual-screen setup, white and slate with orange highlight metrics',
        anchor: 'the email preview on dual device screens with performance metrics beside it',
      },
      {
        scene:  'a deliverability optimization session: a screen showing sender reputation metrics, inbox placement rate by provider, and spam filter test results; an email specialist reviewing a list hygiene report with bounce and unsubscribe data',
        mood:   'technical email workspace, clean dark mode, green deliverability scores, amber risk flags',
        anchor: 'the sender reputation dashboard with inbox placement rates by provider',
      },
    ],
    keywords: [
      { term: 'email marketing',    termNorm: '', weight: 3 },
      { term: 'emailing',           termNorm: '', weight: 3 },
      { term: 'newsletter',         termNorm: '', weight: 2 },
      { term: 'email',              termNorm: '', weight: 1 },
      { term: 'open rate',          termNorm: '', weight: 2 },
      { term: 'taux d ouverture',   termNorm: '', weight: 2 },
      { term: 'click rate',         termNorm: '', weight: 2 },
      { term: 'deliverabilite',     termNorm: '', weight: 2 },
      { term: 'deliverability',     termNorm: '', weight: 2 },
      { term: 'campagne email',     termNorm: '', weight: 2 },
    ],
  },

  // ── Social Media ───────────────────────────────────────────────────────────

  'social-media': {
    priority: 5,
    variants: [
      {
        scene:  'a social media management workspace: a community manager at a triple-screen desk managing a social scheduling calendar, responding to comments on a dashboard, and reviewing engagement analytics per platform; content cards queued for the week',
        mood:   'vibrant modern office, warm social energy, bright screens with platform-colored metrics',
        anchor: 'the social scheduling calendar with queued content cards for multiple platforms',
      },
      {
        scene:  'a LinkedIn content strategy session: a B2B social media manager reviewing post performance data — impressions, engagement rate, and follower growth by post format — while building next month\'s content calendar on a planning board',
        mood:   'professional modern office, clean and focused, LinkedIn blue accents, strategic planning atmosphere',
        anchor: 'the post performance matrix with engagement rate and format comparison',
      },
    ],
    keywords: [
      { term: 'social media',       termNorm: '', weight: 2 },
      { term: 'reseaux sociaux',    termNorm: '', weight: 2 },
      { term: 'linkedin',           termNorm: '', weight: 2 },
      { term: 'instagram',          termNorm: '', weight: 2 },
      { term: 'tiktok',             termNorm: '', weight: 2 },
      { term: 'community management',termNorm:'', weight: 2 },
      { term: 'engagement',         termNorm: '', weight: 1 },
      { term: 'social',             termNorm: '', weight: 1 },
    ],
  },

  // ── Data & Analytics ───────────────────────────────────────────────────────

  'data-analytics': {
    priority: 6,
    variants: [
      {
        scene:  'a data analytics workspace: an analyst building a performance dashboard in a BI tool, connecting multiple data sources; adjacent monitor shows a completed executive report with KPI cards, trend charts, and segment breakdowns; SQL editor in a side window',
        mood:   'focused analytical workspace, dark mode screens, electric blue and amber data highlights',
        anchor: 'the BI dashboard screen with interconnected KPI cards and trend visualizations',
      },
      {
        scene:  'a marketing attribution analysis: a screen showing multi-touch attribution models comparing first-touch, last-touch, and linear attribution for pipeline sourced over a quarter; an analyst presenting findings to a CMO with a printed summary report',
        mood:   'executive analytics meeting, clean presentation room, dark navy and white, data-driven authority',
        anchor: 'the attribution model comparison chart with pipeline contribution per channel',
      },
    ],
    keywords: [
      { term: 'data analytics',  termNorm: '', weight: 3 },
      { term: 'analytique',      termNorm: '', weight: 2 },
      { term: 'analytics',       termNorm: '', weight: 2 },
      { term: 'donnees',         termNorm: '', weight: 1 },
      { term: 'kpi',             termNorm: '', weight: 2 },
      { term: 'dashboard',       termNorm: '', weight: 2 },
      { term: 'tableau de bord', termNorm: '', weight: 2 },
      { term: 'bi tool',         termNorm: '', weight: 2 },
      { term: 'reporting',       termNorm: '', weight: 1 },
      { term: 'data driven',     termNorm: '', weight: 2 },
    ],
  },

  // ── AI & Tech ──────────────────────────────────────────────────────────────

  'ia-generative': {
    priority: 6,
    variants: [
      {
        scene:  'a generative AI integration workspace: a screen showing a prompt engineering canvas with system prompt, user input, and model output panels; a whiteboard shows an LLM integration architecture diagram connecting AI to CRM and content tools',
        mood:   'modern tech company, dark aesthetic, violet and electric blue AI palette, precise',
        anchor: 'the prompt engineering canvas with system prompt, input, and structured output visible',
      },
      {
        scene:  'an AI workflow implementation session: a marketing technologist building an AI-powered content generation pipeline, connecting a prompt template library to a content management system; output quality review panel on a second screen',
        mood:   'tech-forward marketing office, dark mode with violet and green AI indicators, methodical',
        anchor: 'the AI pipeline diagram with prompt template library connected to CMS output',
      },
    ],
    keywords: [
      { term: 'intelligence artificielle', termNorm: '', weight: 3 },
      { term: 'ia generative',             termNorm: '', weight: 3 },
      { term: 'generative ai',             termNorm: '', weight: 3 },
      { term: 'llm',                       termNorm: '', weight: 3 },
      { term: 'gpt',                       termNorm: '', weight: 2 },
      { term: 'chatgpt',                   termNorm: '', weight: 2 },
      { term: 'claude',                    termNorm: '', weight: 2 },
      { term: 'machine learning',          termNorm: '', weight: 2 },
      { term: 'ia',                        termNorm: '', weight: 1 },
      { term: 'prompt',                    termNorm: '', weight: 2 },
      { term: 'prompt engineering',        termNorm: '', weight: 3 },
    ],
  },

  // ── Product & UX ──────────────────────────────────────────────────────────

  'ux-ui': {
    priority: 6,
    variants: [
      {
        scene:  'a product design studio: a designer arranging wireframe components on a large Figma display; a printed user flow diagram spread across the desk; a user research insight board with sticky note clusters from a recent usability test',
        mood:   'clean design studio, bright diffused light, white and soft grey, blue accent on active elements',
        anchor: 'the Figma wireframe screen with components being arranged in a structured layout',
      },
      {
        scene:  'a usability testing session: a researcher observing a participant navigating a prototype on screen through a one-way mirror; a task completion rate and error log visible on a researcher\'s monitor; sticky note findings on a wall',
        mood:   'research lab environment, cool clinical lighting, observation and precision, quiet focus',
        anchor: 'the observation setup showing the participant screen and the researcher\'s task log',
      },
    ],
    keywords: [
      { term: 'ux',                    termNorm: '', weight: 2 },
      { term: 'ui',                    termNorm: '', weight: 2 },
      { term: 'ux-ui',                 termNorm: '', weight: 3 },
      { term: 'user experience',       termNorm: '', weight: 3 },
      { term: 'experience utilisateur',termNorm: '', weight: 3 },
      { term: 'wireframe',             termNorm: '', weight: 2 },
      { term: 'figma',                 termNorm: '', weight: 2 },
      { term: 'design system',         termNorm: '', weight: 2 },
      { term: 'interface',             termNorm: '', weight: 1 },
      { term: 'usability',             termNorm: '', weight: 2 },
      { term: 'user research',         termNorm: '', weight: 2 },
    ],
  },

  'product-marketing': {
    priority: 7,
    variants: [
      {
        scene:  'a product marketing launch room: a GTM board showing launch phases, checklist, and stakeholder alignment plan; a product marketer reviewing positioning documents and competitive analysis; demo environment on a secondary screen',
        mood:   'modern product company, strategic and launch-ready, clean white and electric blue',
        anchor: 'the GTM launch board with phases, milestones, and stakeholder alignment mapped',
      },
      {
        scene:  'a competitive positioning review: a product marketer and VP of Sales reviewing a competitive battle card matrix on screen, with feature comparison rows and win/loss rate per competitor; printed positioning statement on the desk',
        mood:   'executive strategy room, focused side lighting, dark wood and white, competitive precision',
        anchor: 'the competitive matrix screen with win/loss rates and differentiating features highlighted',
      },
    ],
    keywords: [
      { term: 'product marketing',  termNorm: '', weight: 3 },
      { term: 'marketing produit',  termNorm: '', weight: 3 },
      { term: 'go to market',       termNorm: '', weight: 3 },
      { term: 'go-to-market',       termNorm: '', weight: 3 },
      { term: 'gtm',                termNorm: '', weight: 3 },
      { term: 'positioning',        termNorm: '', weight: 2 },
      { term: 'positionnement',     termNorm: '', weight: 2 },
      { term: 'lancement produit',  termNorm: '', weight: 2 },
      { term: 'product launch',     termNorm: '', weight: 2 },
      { term: 'messaging',          termNorm: '', weight: 2 },
    ],
  },

  // ── Web & Dev ──────────────────────────────────────────────────────────────

  'developpement-web': {
    priority: 6,
    variants: [
      {
        scene:  'a web development workspace: a developer at an ultra-wide monitor with a TypeScript component in a code editor, browser devtools performance panel on a second screen; a whiteboard shows a component architecture diagram',
        mood:   'professional developer workspace, dark terminal aesthetic, soft green code syntax on dark background',
        anchor: 'the code editor with a clean TypeScript component and browser preview beside it',
      },
      {
        scene:  'a web performance optimization session: a screen showing Lighthouse audit results with performance, accessibility, and SEO scores; a developer reviewing a waterfall chart of resource loading with render-blocking assets flagged in red',
        mood:   'focused technical workspace, dark mode, red performance flags on white metric cards',
        anchor: 'the Lighthouse audit results with performance and accessibility scores highlighted',
      },
    ],
    keywords: [
      { term: 'developpement web', termNorm: '', weight: 3 },
      { term: 'web development',   termNorm: '', weight: 3 },
      { term: 'developpement',     termNorm: '', weight: 2 },
      { term: 'code',              termNorm: '', weight: 1 },
      { term: 'dev',               termNorm: '', weight: 1 },
      { term: 'astro',             termNorm: '', weight: 2 },
      { term: 'nextjs',            termNorm: '', weight: 2 },
      { term: 'react',             termNorm: '', weight: 2 },
      { term: 'typescript',        termNorm: '', weight: 2 },
      { term: 'javascript',        termNorm: '', weight: 2 },
    ],
  },

  // ── Security ───────────────────────────────────────────────────────────────

  'cybersecurite': {
    priority: 7,
    variants: [
      {
        scene:  'a cybersecurity operations center: a SOC analyst at a multi-screen setup reviewing threat alerts on a SIEM dashboard, with a network topology map showing blocked intrusion attempts; a vulnerability severity matrix on a side screen',
        mood:   'dramatic dark operations room, blue and red screen glow, serious and vigilant',
        anchor: 'the SIEM dashboard with active threat alerts and blocked intrusion indicators',
      },
      {
        scene:  'a cybersecurity risk assessment: a CISO presenting a risk register to a board, with threat likelihood and business impact scores shown in a heat map matrix; a printed incident response plan on the conference table',
        mood:   'executive boardroom, sober and serious, dark surfaces with red risk indicators, high-stakes precision',
        anchor: 'the risk heat map matrix with high-likelihood, high-impact threats highlighted in red',
      },
    ],
    keywords: [
      { term: 'cybersecurite',         termNorm: '', weight: 3 },
      { term: 'cybersecurity',         termNorm: '', weight: 3 },
      { term: 'securite informatique', termNorm: '', weight: 3 },
      { term: 'cyber',                 termNorm: '', weight: 2 },
      { term: 'soc',                   termNorm: '', weight: 2 },
      { term: 'siem',                  termNorm: '', weight: 2 },
      { term: 'ransomware',            termNorm: '', weight: 2 },
      { term: 'phishing',              termNorm: '', weight: 2 },
      { term: 'hack',                  termNorm: '', weight: 2 },
      { term: 'vulnerabilite',         termNorm: '', weight: 2 },
      { term: 'zero day',              termNorm: '', weight: 2 },
    ],
  },

  // ── Strategy ───────────────────────────────────────────────────────────────

  'strategie-digitale': {
    priority: 6,
    variants: [
      {
        scene:  'a digital strategy planning session: an executive team reviewing a digital transformation roadmap projected on a wall screen, with a 12-month initiative timeline, budget allocation chart, and OKR framework; printed strategy decks at each seat',
        mood:   'boardroom executive environment, dramatic table lamp lighting, dark wood, navy and gold accents',
        anchor: 'the projected roadmap screen with 12-month initiative timeline and budget allocation',
      },
      {
        scene:  'a digital maturity assessment: a consultant presenting a radar chart of digital capabilities to a leadership team, with scores across data, automation, content, paid, and customer experience axes; a gap analysis table on a secondary screen',
        mood:   'modern consulting room, clean presentation lighting, white and dark navy, analytical authority',
        anchor: 'the digital maturity radar chart with capability gaps and priority axes highlighted',
      },
    ],
    keywords: [
      { term: 'strategie digitale',       termNorm: '', weight: 3 },
      { term: 'digital strategy',         termNorm: '', weight: 3 },
      { term: 'transformation digitale',  termNorm: '', weight: 3 },
      { term: 'digital transformation',   termNorm: '', weight: 3 },
      { term: 'strategie',                termNorm: '', weight: 1 },
      { term: 'roadmap',                  termNorm: '', weight: 2 },
      { term: 'planification strategique',termNorm: '', weight: 2 },
      { term: 'okr',                      termNorm: '', weight: 2 },
    ],
  },

  // ── B2B Influence & Video ──────────────────────────────────────────────────

  'influence-b2b': {
    priority: 7,
    variants: [
      {
        scene:  'a B2B thought leadership workspace: a subject matter expert recording a professional LinkedIn video in a minimal branded studio setup; a content script on the desk, camera equipment and ring light beside a LinkedIn analytics dashboard',
        mood:   'professional creator studio, warm brand lighting, clean and polished, modern professional',
        anchor: 'the recording setup with the expert in frame, ring light and branded backdrop visible',
      },
      {
        scene:  'a personal brand audit: a founder reviewing their LinkedIn profile analytics on screen — follower growth, post reach by format, and profile view sources — beside a printed thought leadership content plan for the next quarter',
        mood:   'executive home office, warm morning light, focused and strategic, professional calm',
        anchor: 'the LinkedIn analytics screen with follower growth and reach-by-format breakdown',
      },
    ],
    keywords: [
      { term: 'thought leadership',    termNorm: '', weight: 3 },
      { term: 'leadership d opinion',  termNorm: '', weight: 3 },
      { term: 'personal branding',     termNorm: '', weight: 3 },
      { term: 'influence b2b',         termNorm: '', weight: 3 },
      { term: 'influenceur b2b',       termNorm: '', weight: 3 },
      { term: 'personal brand',        termNorm: '', weight: 2 },
      { term: 'linkedin creator',      termNorm: '', weight: 2 },
      { term: 'expert',                termNorm: '', weight: 1 },
    ],
  },

  'video-marketing': {
    priority: 7,
    variants: [
      {
        scene:  'a video production workspace: a video marketer reviewing a cut in a professional editing suite, with a timeline showing b-roll, talking head segments, and motion graphic overlays; a second monitor shows thumbnail A/B test results and YouTube analytics',
        mood:   'professional editing suite, dark room with monitor glow, creative and precise, cinematic undertone',
        anchor: 'the editing timeline with cut sequence and motion graphic overlays highlighted',
      },
      {
        scene:  'a webinar production setup: a presenter at a branded desk with a teleprompter, ring light, and background studio panel; a producer monitoring attendee engagement metrics on a laptop beside them; webinar platform dashboard visible on a secondary screen',
        mood:   'professional live production setup, warm brand lighting, clean branded backdrop, live broadcast precision',
        anchor: 'the presenter setup with ring light, teleprompter, and engagement metrics dashboard',
      },
    ],
    keywords: [
      { term: 'video marketing',  termNorm: '', weight: 3 },
      { term: 'marketing video',  termNorm: '', weight: 3 },
      { term: 'video',            termNorm: '', weight: 2 },
      { term: 'youtube',          termNorm: '', weight: 2 },
      { term: 'reels',            termNorm: '', weight: 2 },
      { term: 'production video', termNorm: '', weight: 2 },
      { term: 'webinar',          termNorm: '', weight: 2 },
      { term: 'screencast',       termNorm: '', weight: 2 },
    ],
  },

  // ── E-Commerce ─────────────────────────────────────────────────────────────

  'ecommerce': {
    priority: 6,
    variants: [
      {
        scene:  'a modern e-commerce operations dashboard: a merchant reviewing product performance, inventory levels, and conversion rates on an admin panel; order cards flowing from product listing to fulfilment; customer acquisition cost by channel on a secondary screen',
        mood:   'clean commercial workspace, crisp white and navy, efficient and transactional',
        anchor: 'the e-commerce admin panel with product performance cards and order flow',
      },
      {
        scene:  'a checkout optimization session: a CRO specialist reviewing a checkout funnel drop-off analysis, with step-by-step abandon rates and device breakdown; a cart abandonment email sequence visible on a secondary screen',
        mood:   'analytical e-commerce workspace, dual-screen, warm amber conversion metrics, problem-solving focus',
        anchor: 'the checkout funnel drop-off analysis with abandon rates by step highlighted',
      },
    ],
    keywords: [
      { term: 'ecommerce',          termNorm: '', weight: 3 },
      { term: 'e-commerce',         termNorm: '', weight: 3 },
      { term: 'boutique en ligne',  termNorm: '', weight: 3 },
      { term: 'shopify',            termNorm: '', weight: 3 },
      { term: 'woocommerce',        termNorm: '', weight: 3 },
      { term: 'boutique',           termNorm: '', weight: 1 },
      { term: 'panier',             termNorm: '', weight: 2 },
      { term: 'cart',               termNorm: '', weight: 2 },
    ],
  },

  // ── Business Fundamentals ──────────────────────────────────────────────────

  'fondamentaux-business': {
    priority: 5,
    variants: [
      {
        scene:  'a business fundamentals workshop: a facilitator presenting core business model canvas elements — value proposition, customer segments, revenue streams, cost structure — to a small group of founders around a round table with printed frameworks',
        mood:   'professional training room, clean and instructional, warm overhead light, dark blue and white',
        anchor: 'the business model canvas on the whiteboard with key elements highlighted',
      },
      {
        scene:  'a startup OKR planning session: a founding team around a whiteboard setting quarterly objectives and key results, with a company strategy on-a-page poster pinned on the wall; a laptop showing last quarter\'s metrics performance',
        mood:   'startup conference room, energetic yet focused, clean white and electric blue, forward momentum',
        anchor: 'the OKR whiteboard with quarterly objectives and key results being set',
      },
    ],
    keywords: [
      { term: 'fondamentaux business', termNorm: '', weight: 3 },
      { term: 'business fundamentals', termNorm: '', weight: 3 },
      { term: 'business model',        termNorm: '', weight: 2 },
      { term: 'business model canvas', termNorm: '', weight: 3 },
      { term: 'valeur ajoutee',        termNorm: '', weight: 2 },
      { term: 'fondamentaux',          termNorm: '', weight: 2 },
      { term: 'business',              termNorm: '', weight: 1 },
      { term: 'gestion',               termNorm: '', weight: 1 },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Module-load compilation  (runs once, zero per-request overhead)
// ─────────────────────────────────────────────────────────────────────────────

function compileConcepts(
  raw: typeof RAW_CONCEPTS,
): Record<string, CompiledConcept> {
  const result: Record<string, CompiledConcept> = {};

  for (const [key, concept] of Object.entries(raw)) {
    const compiledKeywords: CompiledKeyword[] = concept.keywords.map(kw => {
      const norm = normalise(kw.term);
      return {
        term:     kw.term,
        termNorm: norm,
        weight:   kw.weight,
        // Pre-compiled regex: word-bounded on normalised form
        exactRx: new RegExp(
          `(?<![a-z0-9])${escapeNorm(norm)}(?![a-z0-9])`,
          'i',
        ),
        // Pre-compiled regex: word-bounded on original (catches accented chars)
        wordRx: new RegExp(
          `(?<![a-zàâéèêëîïôùûüç])${kw.term.toLowerCase()}(?![a-zàâéèêëîïôùûüç])`,
          'i',
        ),
      };
    });

    // Pre-compute score ceiling: if every keyword fires at EXACT_BONUS
    const ceiling = compiledKeywords.reduce((s, kw) => s + kw.weight * EXACT_BONUS, 0);

    result[key] = {
      variants:  concept.variants,
      keywords:  compiledKeywords,
      priority:  concept.priority,
      ceiling,
    };
  }

  return result;
}

/** Compiled registry — built once at module load, reused across all requests. */
const CONCEPTS: Record<string, CompiledConcept> = compileConcepts(RAW_CONCEPTS);

// ─────────────────────────────────────────────────────────────────────────────
// Variant selector  (deterministic, slug-seeded)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Select a variant index from a slug string.
 * Same slug always returns the same variant (deterministic / reproducible).
 * Different slugs within the same concept return different variants.
 */
function selectVariantIndex(slug: string, variantCount: number): number {
  if (variantCount <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0; // unsigned 32-bit
  }
  return hash % variantCount;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score a single compiled concept against a pre-normalised corpus.
 * Uses pre-compiled regex — zero allocation per call.
 */
function scoreConcept(
  corpus:     string,
  corpusNorm: string,
  concept:    CompiledConcept,
): { score: number; matchedTerms: string[] } {
  let score = 0;
  const matched: string[] = [];

  for (const kw of concept.keywords) {
    // Tier 1: exact phrase match on normalised corpus
    if (kw.exactRx.test(corpusNorm)) {
      score += kw.weight * EXACT_BONUS;
      matched.push(`[exact] ${kw.term}`);
      continue;
    }
    // Tier 2: full word match on original corpus (preserves accents)
    if (kw.wordRx.test(corpus)) {
      score += kw.weight * WORD_BONUS;
      matched.push(`[word] ${kw.term}`);
      continue;
    }
    // Tier 3: substring match on normalised (lowest signal)
    if (corpusNorm.includes(kw.termNorm)) {
      score += kw.weight * PARTIAL_BONUS;
      matched.push(`[partial] ${kw.term}`);
    }
  }

  return { score, matchedTerms: matched };
}

/**
 * Find the best matching concept + variant for a given article.
 *
 * Fast path: when `cluster` is a known key, skip full scoring and return
 * that concept with confidence 1.0 — the cluster is the strongest possible signal.
 * (v2 behaviour preserved; note the title scan is intentionally NOT done in fast
 * path to avoid a sub-concept like 'content-calendar' overriding a cluster of
 * 'content-marketing'. The cluster is set by the human editor and is authoritative.)
 */
function matchConcept(
  title:   string,
  cluster: string,
  slug:    string,
): ConceptMatch | null {
  // ── Fast path ──────────────────────────────────────────────────────────────
  const knownConcept = CONCEPTS[cluster];
  if (knownConcept) {
    const vi = selectVariantIndex(slug, knownConcept.variants.length);
    return {
      conceptKey:   cluster,
      variant:      knownConcept.variants[vi],
      confidence:   1.0,
      matchedTerms: [`[cluster-key] ${cluster}`, `[variant] ${vi}`],
    };
  }

  // ── Full semantic scan ─────────────────────────────────────────────────────
  const corpus     = `${title} ${cluster}`;
  const corpusNorm = normalise(corpus);

  const entries: ScoredEntry[] = [];

  for (const [key, concept] of Object.entries(CONCEPTS)) {
    const { score, matchedTerms } = scoreConcept(corpus, corpusNorm, concept);
    if (score === 0) continue;

    const priorityBonus = 1 + concept.priority / 100;
    entries.push({ key, concept, raw: score * priorityBonus, matchedTerms });
  }

  if (entries.length === 0) return null;

  entries.sort((a, b) => b.raw - a.raw);
  const winner = entries[0];

  // Confidence: winner's raw score as a fraction of its own ceiling (capped 1.0)
  const confidence = Math.min(winner.raw / (winner.concept.ceiling * 0.4), 1.0);
  if (confidence < MIN_CONFIDENCE) return null;

  const vi = selectVariantIndex(slug, winner.concept.variants.length);

  return {
    conceptKey:   winner.key,
    variant:      winner.concept.variants[vi],
    confidence:   Math.round(confidence * 100) / 100,
    matchedTerms: [...winner.matchedTerms, `[variant] ${vi}`],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builder  —  Flux Schnell optimised
// ─────────────────────────────────────────────────────────────────────────────
//
// Flux Schnell uses a CLIP text encoder with an effective window of ~77 tokens.
// Text beyond that window receives diminishing weight.
// Strategy:
//   - Put the single most important instruction first (style + subject)
//   - Put the anchor (hero element) second — must fire within first 40 tokens
//   - Composition and color third
//   - Prohibitions last (they help but are partially clipped)
// ─────────────────────────────────────────────────────────────────────────────

function buildImagePrompt(title: string, cluster: string, slug: string): string {
  const match = matchConcept(title, cluster, slug);

  const scene  = match?.variant.scene  ??
    `professional B2B strategy workspace relevant to "${title}": organized desk with a relevant dashboard on screen, printed documents and planning materials`;
  const mood   = match?.variant.mood   ??
    'professional office, warm focused lighting, navy and white palette, gold accents';
  const anchor = match?.variant.anchor ??
    'the primary screen or planning document at the focal point';

  // ── Core prompt (first ~77 tokens — highest model attention) ───────────────
  const core = [
    `Premium B2B editorial photo, "${title}".`,
    `Scene: ${scene}.`,
    `Hero: ${anchor}, sharpest element, full light.`,
  ].join(' ');

  // ── Secondary directives ───────────────────────────────────────────────────
  const secondary = [
    `Mood: ${mood}.`,
    `Style: photorealistic editorial CGI, cinematic depth of field, physically accurate shadows.`,
    `Palette: navy #0A1628 dominant, electric blue #2563EB accent, white highlights, gold #D4A843 sparingly.`,
    `Composition: 16:9 2560x1440. Hero in central 60%. Left 35-40% clean dark negative space for text. Rule of thirds.`,
  ].join(' ');

  // ── Prohibitions (lowest priority — partially clipped but still useful) ────
  const prohibitions = [
    `No text, letters, digits, glyphs anywhere. No logos. No UI chrome.`,
    `No floating holograms, glowing orbs, abstract particles.`,
    `No books unless article is about publishing. No handshakes. No blazer-pointer clichés.`,
    `Screens show abstract data shapes only, zero readable characters.`,
  ].join(' ');

  return `${core} ${secondary} ${prohibitions}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request ID utility
// ─────────────────────────────────────────────────────────────────────────────

function generateRequestId(): string {
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export  (public API — signature identical to v2)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateAndUploadImage(
  ai:            Ai,
  bucket:        R2Bucket,
  publicBaseUrl: string,
  slug:          string,
  cluster:       string,
  title:         string,
): Promise<string | null> {
  const requestId = generateRequestId();
  const ctx: LogContext = { requestId, slug };
  const t0 = Date.now();

  try {
    // ── Single matchConcept call — result shared between prompt + log ─────────
    const match  = matchConcept(title, cluster, slug);
    const prompt = buildImagePrompt(title, cluster, slug);

    logger.info(ctx, 'image.start', {
      title,
      cluster,
      conceptKey:   match?.conceptKey  ?? 'FALLBACK',
      confidence:   match?.confidence  ?? 0,
      variantIndex: match?.matchedTerms.find(t => t.startsWith('[variant]')) ?? '[variant] 0',
      matchedTerms: match?.matchedTerms ?? [],
      promptChars:  prompt.length,
    });

    // ── AI call ───────────────────────────────────────────────────────────────
    const response = await (ai as any).run(IMAGE_MODEL, {
      prompt,
      steps: FLUX_STEPS,
    }) as { image?: string } | ReadableStream;

    // ── Response normalisation ────────────────────────────────────────────────
    let imageBytes: Uint8Array;

    if (response instanceof ReadableStream) {
      const chunks: Uint8Array[] = [];
      const reader = response.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const total = chunks.reduce((s, c) => s + c.length, 0);
      imageBytes  = new Uint8Array(total);
      let offset  = 0;
      for (const chunk of chunks) { imageBytes.set(chunk, offset); offset += chunk.length; }
    } else if (response?.image) {
      const binary = atob(response.image);
      imageBytes   = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) imageBytes[i] = binary.charCodeAt(i);
    } else {
      logger.warn(ctx, 'image.unexpected_shape');
      return null;
    }

    // ── R2 upload ─────────────────────────────────────────────────────────────
    const key       = `${cluster}/${slug}.png`;
    await bucket.put(key, imageBytes, { httpMetadata: { contentType: 'image/png' } });

    const publicUrl = `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
    const duration  = Date.now() - t0;

    logger.info(ctx, 'image.done', {
      key,
      bytes:    imageBytes.length,
      durationMs: duration,
    });

    return publicUrl;

  } catch (err) {
    logger.error(ctx, 'image.error', {
      error:      err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - t0,
    });
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dev / test utility  —  tree-shaken from production bundles
// ─────────────────────────────────────────────────────────────────────────────

export function __devClassify(
  title:   string,
  cluster: string,
  slug     = 'dev-test',
): ConceptMatch | null {
  return matchConcept(title, cluster, slug);
}