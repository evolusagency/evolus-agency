/**
 * generator.ts
 * Generates Markdown article content using Cloudflare AI Workers binding.
 * Each cluster (seo, marketing, automation, web-design) has its own
 * prompt strategy to produce relevant, structured B2B content.
 */

import { ArticleCluster, ArticleFrontmatter, GeneratedArticle, SheetRow } from './types';

// ── Cluster → display tag ────────────────────────────────────
const CLUSTER_TAG: Record<ArticleCluster, string> = {
  'seo':        'SEO',
  'marketing':  'Marketing',
  'automation': 'Automatisation',
  'web-design': 'Web Design',
};

// ── Cluster → content angle ──────────────────────────────────
// Each prompt angle targets Evolus Agency's B2B audience.
const CLUSTER_ANGLE: Record<ArticleCluster, string> = {
  'seo': `
Tu es un expert SEO B2B. Tu rédiges pour des directeurs marketing, responsables growth et fondateurs de PME.
Ton objectif : produire un article de blog long format, orienté B2B, 100% actionnable.
Structure obligatoire :
- Introduction avec le problème business concret (3-4 phrases)
- H2 : Pourquoi ce sujet est critique pour les entreprises B2B
- H2 : Les erreurs classiques à éviter
- H2 : La méthode pas-à-pas (avec sous-titres H3)
- H2 : Exemples concrets et cas réels
- Conclusion avec appel à l'action sobre
Ton style : direct, sans jargon inutile, chiffres et données quand possible.`,

  'marketing': `
Tu es un expert marketing digital B2B. Tu rédiges pour des responsables acquisition, CMO et consultants.
Ton objectif : produire un article de blog long format, orienté croissance B2B, basé sur des stratégies prouvées.
Structure obligatoire :
- Introduction avec l'enjeu business (3-4 phrases)
- H2 : Le contexte marché actuel
- H2 : Les leviers les plus efficaces
- H2 : Comment mettre en place la stratégie (étapes H3)
- H2 : Mesurer les résultats (métriques clés)
- Conclusion avec next steps
Ton style : orienté résultats, exemples concrets, formules et frameworks reconnus.`,

  'automation': `
Tu es un expert en automatisation business et IA. Tu rédiges pour des opérationnels, CTOs et fondateurs tech.
Ton objectif : produire un article de blog long format sur l'automatisation, pratique et immédiatement applicable.
Structure obligatoire :
- Introduction avec le problème de productivité concret (3-4 phrases)
- H2 : Ce que l'automatisation change réellement en 2025-2026
- H2 : Les outils et méthodes à connaître
- H2 : Guide d'implémentation étape par étape (H3)
- H2 : Pièges et limites à anticiper
- Conclusion avec feuille de route
Ton style : technique mais accessible, focus ROI et gain de temps.`,

  'web-design': `
Tu es un expert UX/UI et performance web B2B. Tu rédiges pour des décideurs, product managers et équipes marketing.
Ton objectif : produire un article de blog long format sur le design et la performance web, orienté conversion B2B.
Structure obligatoire :
- Introduction avec l'impact business du design (3-4 phrases)
- H2 : Les principes qui font la différence en B2B
- H2 : Les erreurs de design qui coûtent des leads
- H2 : Comment auditer et améliorer son site (étapes H3)
- H2 : Exemples et benchmarks sectoriels
- Conclusion avec recommandations prioritaires
Ton style : visuel dans la description, chiffres de conversion, focus UX/CRO.`,
};

// ────────────────────────────────────────────────────────────
// Estimate reading time from word count
// ────────────────────────────────────────────────────────────
function estimateReadTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min`;
}

// ────────────────────────────────────────────────────────────
// Build ISO date string (YYYY-MM-DD)
// ────────────────────────────────────────────────────────────
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ────────────────────────────────────────────────────────────
// Build the full prompt for the AI
// ────────────────────────────────────────────────────────────
function buildPrompt(row: SheetRow): string {
  const angle = CLUSTER_ANGLE[row.cluster];

  return `${angle}

---

CONSIGNES STRICTES :
- Rédige UNIQUEMENT le corps de l'article en Markdown.
- NE PAS inclure de frontmatter YAML (pas de ---, pas de title:, pas de date:).
- NE PAS inclure de balise <article>, <html> ou tout autre tag HTML.
- Commence directement par l'introduction (sans titre H1 — il est géré ailleurs).
- Utilise ## pour les H2 et ### pour les H3.
- Longueur cible : 900 à 1400 mots.
- Langue : français professionnel, tutoiement interdit.
- Mot-clé principal à intégrer naturellement : "${row.keyword}"

SUJET : ${row.title}
DESCRIPTION COURTE : ${row.excerpt}

Commence la rédaction maintenant.`;
}

// ────────────────────────────────────────────────────────────
// Sanitize AI output — remove accidental frontmatter / H1
// ────────────────────────────────────────────────────────────
function sanitizeBody(raw: string): string {
  // Remove any leading --- block (accidental frontmatter)
  const withoutFrontmatter = raw.replace(/^---[\s\S]*?---\n?/, '').trim();

  // Remove any leading H1 (the title is already in the frontmatter)
  const withoutH1 = withoutFrontmatter.replace(/^#\s+.+\n?/, '').trim();

  return withoutH1;
}

// ────────────────────────────────────────────────────────────
// Build the .md file content (frontmatter + body)
// ────────────────────────────────────────────────────────────
function buildMarkdownFile(frontmatter: ArticleFrontmatter, body: string): string {
  // Serialize frontmatter to YAML — keep it simple and readable
  const fm = [
    '---',
    `title: "${frontmatter.title.replace(/"/g, '\\"')}"`,
    `excerpt: "${frontmatter.excerpt.replace(/"/g, '\\"')}"`,
    `date: ${frontmatter.date}`,
    `tag: "${frontmatter.tag}"`,
    `read: "${frontmatter.read}"`,
    `category: ${frontmatter.category}`,
    `lang: ${frontmatter.lang}`,
    `author: "${frontmatter.author}"`,
    `featured: ${frontmatter.featured}`,
    `pillar: ${frontmatter.pillar}`,
    `draft: ${frontmatter.draft}`,
    '---',
    '',
  ].join('\n');

  return fm + body;
}

// ────────────────────────────────────────────────────────────
// Main: generate one article
// ────────────────────────────────────────────────────────────
export async function generateArticle(
  ai:     Ai,
  row:    SheetRow,
  lang:   string,
  author: string,
): Promise<GeneratedArticle> {
  const prompt = buildPrompt(row);

  // Call Cloudflare AI Workers binding
  const aiResponse = await ai.run('@cf/meta/llama-3.1-8b-instruct-fast', {
    messages: [
      {
        role:    'system',
        content: 'Tu es un rédacteur expert en content marketing B2B. Tu rédiges uniquement en Markdown propre, sans frontmatter.',
      },
      {
        role:    'user',
        content: prompt,
      },
    ],
    max_tokens:  2048,
    temperature: 0.7,
  }) as { response: string };

  const rawBody = aiResponse?.response ?? '';
  if (!rawBody.trim()) {
    throw new Error(`AI returned empty content for slug "${row.slug}"`);
  }

  const body = sanitizeBody(rawBody);

  const frontmatter: ArticleFrontmatter = {
    title:    row.title,
    excerpt:  row.excerpt,
    date:     todayISO(),
    tag:      CLUSTER_TAG[row.cluster],
    read:     estimateReadTime(body),
    category: row.cluster,
    lang:     lang,
    author:   author,
    featured: false,
    pillar:   false,
    draft:    false,
  };

  const fullContent = buildMarkdownFile(frontmatter, body);

  return {
    slug:        row.slug,
    filename:    `${row.slug}.md`,
    frontmatter,
    body,
    fullContent,
  };
}
