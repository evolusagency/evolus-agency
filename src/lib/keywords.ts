/**
 * SEO Brain — Keyword → Slug mapping system
 * Synced with real files in src/content/blog/
 *
 * priority: 1–10 (higher = more likely to be injected as a link)
 * isPillar: true = high-authority page that receives more inbound links
 */

export interface KeywordEntry {
  keyword: string;
  slug: string;
  priority: number;
  isPillar: boolean;
  aliases?: string[];
}

export const keywordMap: KeywordEntry[] = [

  // ─── PILLAR PAGES ────────────────────────────────────────────────

  {
    keyword: "stratégie seo b2b",
    slug: "stratégie-seo-b2b-comment-dominer-google-et-générer-des-leads-qualifiés-en-2026",
    priority: 10,
    isPillar: true,
    aliases: ["seo b2b", "dominer google b2b", "référencement b2b", "leads qualifiés seo"],
  },
  {
    keyword: "taux de conversion b2b",
    slug: "multiplier-taux-conversion-b2b-90-jours",
    priority: 9,
    isPillar: true,
    aliases: ["conversion b2b", "multiplier conversions", "optimisation conversion b2b", "CRO b2b"],
  },
  {
    keyword: "tunnel de prospection b2b",
    slug: "tunnels-prospection-b2b-efficaces",
    priority: 9,
    isPillar: true,
    aliases: ["prospection b2b", "tunnel de vente b2b", "pipeline commercial b2b", "entonnoir prospection"],
  },

  // ─── STANDARD POSTS ──────────────────────────────────────────────

  {
    keyword: "marketing automation b2b",
    slug: "marketing-automation-b2b-sequences-nurturing",
    priority: 8,
    isPillar: false,
    aliases: ["automation b2b", "séquences nurturing", "nurturing b2b", "email automation b2b"],
  },
  {
    keyword: "onboarding client b2b",
    slug: "onboarding-client-b2b-retention",
    priority: 7,
    isPillar: false,
    aliases: ["rétention client b2b", "fidélisation b2b", "onboarding b2b"],
  },
  {
    keyword: "perte de trafic site b2b",
    slug: "perte-trafic-site-b2b-visiteurs-qualifies",
    priority: 6,
    isPillar: false,
    aliases: ["visiteurs qualifiés b2b", "trafic b2b", "baisse trafic site b2b"],
  },
  {
    keyword: "présentation tarifs b2b",
    slug: "presentation-tarifs-b2b-valeur",
    priority: 6,
    isPillar: false,
    aliases: ["tarifs b2b", "pricing b2b", "valeur b2b", "présenter ses prix b2b"],
  },
  {
    keyword: "refonte site b2b",
    slug: "refonte-site-b2b-8-questions",
    priority: 6,
    isPillar: false,
    aliases: ["redesign site b2b", "site web b2b", "refaire son site b2b"],
  },
  {
    keyword: "blog b2b génération leads",
    slug: "seo-b2b-blog-generation-leads",
    priority: 7,
    isPillar: false,
    aliases: ["blog seo b2b", "génération leads b2b", "contenu seo b2b", "blog leads b2b"],
  },
  {
    keyword: "social selling linkedin b2b",
    slug: "social-selling-b2b-strategie-linkedin-ia",
    priority: 7,
    isPillar: false,
    aliases: ["linkedin b2b ia", "intelligence artificielle linkedin", "stratégie linkedin b2b", "social selling ia"],
  },
  {
    keyword: "stratégie contenu linkedin b2b",
    slug: "strategie-contenu-linkedin-b2b-organic",
    priority: 7,
    isPillar: false,
    aliases: ["contenu linkedin b2b", "linkedin organique b2b", "content linkedin b2b"],
  },
  {
    keyword: "copywriting b2b",
    slug: "copywriting-b2b-techniques-conversion",
    priority: 7,
    isPillar: false,
    aliases: ["rédaction b2b", "copywriting conversion b2b", "textes de vente b2b"],
  },

];

export function getPillarPages(): KeywordEntry[] {
  return keywordMap
    .filter(e => e.isPillar)
    .sort((a, b) => b.priority - a.priority);
}

export function getAllKeywordsSorted(): KeywordEntry[] {
  return [...keywordMap].sort((a, b) => b.priority - a.priority);
}

export function getKeywordsForPage(currentSlug: string): KeywordEntry[] {
  return getAllKeywordsSorted().filter(e => e.slug !== currentSlug);
}
