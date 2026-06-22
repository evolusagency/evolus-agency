/**
 * generator.ts
 * Cloudflare AI Workers — 22 clusters B2B Evolus Agency
 */

import { ArticleCluster, ArticleFrontmatter, GeneratedArticle, SheetRow } from './types';

// ── Cluster → display tag ────────────────────────────────────
const CLUSTER_TAG: Record<ArticleCluster, string> = {
  'seo':                  'SEO',
  'automation':           'Automatisation',
  'branding':             'Branding',
  'content-marketing':    'Content Marketing',
  'ux-ui':                'UX / UI',
  'social-media':         'Social Media',
  'email-marketing':      'Email Marketing',
  'paid-ads':             'Publicité Payante',
  'cro':                  'CRO',
  'data-analytics':       'Data & Analytics',
  'ia-generative':        'IA Générative',
  'ecommerce':            'E-commerce',
  'strategie-digitale':   'Stratégie Digitale',
  'sales-enablement':     'Sales Enablement',
  'lead-generation':      'Lead Generation',
  'customer-experience':  'Expérience Client',
  'video-marketing':      'Vidéo Marketing',
  'influence-b2b':        'Influence B2B',
  'developpement-web':    'Développement Web',
  'cybersecurite':        'Cybersécurité',
  'product-marketing':    'Product Marketing',
  'fondamentaux-business':'Fondamentaux Business',
};

// ── Cluster → prompt angle ───────────────────────────────────
const CLUSTER_ANGLE: Record<ArticleCluster, string> = {

  'seo': `
Tu es un expert SEO B2B senior. Tu rédiges pour des directeurs marketing, responsables growth et fondateurs de PME.
Structure obligatoire :
- Introduction accrocheuse avec un chiffre ou constat terrain inattendu
- ## Pourquoi ce sujet change la donne en SEO B2B
- ## Les erreurs classiques à éviter
- ## La méthode concrète étape par étape (### sous-sections)
- ## Ce que ça donne dans la réalité (chiffres, retours terrain)
- ## Pour aller plus loin avec Evolus Agency
Style : dense, direct, sans jargon creux, chiffres et exemples concrets.`,

  'automation': `
Tu es un expert en automatisation business et IA appliquée. Tu rédiges pour des opérationnels, CTOs et fondateurs tech qui veulent du ROI mesurable.
Structure obligatoire :
- Introduction avec un calcul de temps gaspillé ou une adoption marché surprenante
- ## Ce que l'automatisation change concrètement en 2025-2026
- ## Les outils et approches qui dominent le marché
- ## Guide d'implémentation étape par étape (### sous-sections)
- ## Les pièges et limites à anticiper
- ## Pour aller plus loin avec Evolus Agency
Style : technique mais accessible, focus ROI et gain de temps chiffrés.`,

  'branding': `
Tu es un expert en stratégie de marque B2B. Tu rédiges pour des dirigeants, CMO et responsables communication qui veulent bâtir une marque mémorable.
Structure obligatoire :
- Introduction avec un constat sur les marques B2B oubliables vs mémorables
- ## Pourquoi le branding B2B est sous-estimé (et ce que ça coûte)
- ## Les composantes d'une marque B2B forte
- ## Comment construire ou repositionner sa marque (### étapes)
- ## Exemples et benchmarks sectoriels
- ## Pour aller plus loin avec Evolus Agency
Style : inspirant mais concret, exemples de marques réels, focus différenciation.`,

  'content-marketing': `
Tu es un expert en content marketing B2B. Tu rédiges pour des responsables marketing, directeurs de contenu et fondateurs qui veulent du contenu qui convertit.
Structure obligatoire :
- Introduction avec la tension entre volume de contenu et résultats réels
- ## Pourquoi la majorité du contenu B2B ne génère pas de leads
- ## Les formats et canaux qui fonctionnent vraiment en 2025-2026
- ## Construire une stratégie de contenu qui convertit (### étapes)
- ## Mesurer et optimiser la performance
- ## Pour aller plus loin avec Evolus Agency
Style : orienté performance, exemples de contenus réels, frameworks nommés.`,

  'ux-ui': `
Tu es un expert UX/UI et performance web orienté conversion B2B. Tu rédiges pour des décideurs, product managers et équipes marketing.
Structure obligatoire :
- Introduction avec un chiffre de conversion qui révèle un problème
- ## Les principes UX/B2B qui changent vraiment les métriques
- ## Les erreurs de design qui coûtent des leads (avec données)
- ## Comment auditer et améliorer (### sous-sections)
- ## Benchmarks et exemples sectoriels
- ## Pour aller plus loin avec Evolus Agency
Style : visuel dans la description, chiffres de conversion sourcés, focus UX/CRO.`,

  'social-media': `
Tu es un expert social media B2B. Tu rédiges pour des responsables marketing, community managers et dirigeants qui veulent des réseaux sociaux qui génèrent du business.
Structure obligatoire :
- Introduction avec le décalage entre présence sociale et impact business en B2B
- ## Les plateformes qui comptent vraiment en B2B (et pourquoi)
- ## Les stratégies de contenu social qui génèrent des leads
- ## Plan d'action concret (### sous-sections)
- ## Métriques et pilotage de la performance
- ## Pour aller plus loin avec Evolus Agency
Style : direct, exemples de posts et campagnes réels, focus génération de pipeline.`,

  'email-marketing': `
Tu es un expert en email marketing B2B. Tu rédiges pour des responsables CRM, growth marketers et directeurs marketing qui veulent des campagnes email qui convertissent.
Structure obligatoire :
- Introduction avec les taux d'ouverture ou de conversion qui surprennent en B2B
- ## Pourquoi l'email reste le canal B2B avec le meilleur ROI
- ## Les séquences et formats qui performent (données à l'appui)
- ## Construire et optimiser ses campagnes (### étapes)
- ## Erreurs fréquentes et comment les éviter
- ## Pour aller plus loin avec Evolus Agency
Style : orienté conversion, exemples d'objets et de séquences concrets.`,

  'paid-ads': `
Tu es un expert en publicité payante B2B (Google Ads, LinkedIn Ads, Meta). Tu rédiges pour des responsables acquisition et directeurs marketing qui veulent maîtriser leur CAC.
Structure obligatoire :
- Introduction avec l'évolution des coûts publicitaires B2B et leurs implications
- ## Les plateformes et formats qui performent en B2B en 2025-2026
- ## Structure de campagnes efficaces (### sous-sections par canal)
- ## Optimisation et réduction du CAC
- ## Les métriques indispensables à suivre
- ## Pour aller plus loin avec Evolus Agency
Style : chiffres de benchmarks, exemples de ciblages et de copies concrets.`,

  'cro': `
Tu es un expert en optimisation du taux de conversion (CRO) B2B. Tu rédiges pour des product managers, growth hackers et directeurs marketing.
Structure obligatoire :
- Introduction avec le manque à gagner d'un taux de conversion sous-optimisé
- ## Les leviers CRO les plus impactants en B2B
- ## Comment auditer et prioriser les optimisations (framework ICE ou similaire)
- ## Tests et implémentations concrets (### sous-sections)
- ## Mesurer le vrai impact des optimisations
- ## Pour aller plus loin avec Evolus Agency
Style : orienté données et tests, exemples de variantes A/B réels.`,

  'data-analytics': `
Tu es un expert en data analytics appliqué au marketing et business B2B. Tu rédiges pour des directeurs marketing, data analysts et dirigeants data-driven.
Structure obligatoire :
- Introduction avec la différence entre entreprises data-driven et les autres (en chiffres)
- ## Les KPIs et données vraiment utiles en B2B (vs le bruit)
- ## Stack analytics et outils recommandés en 2025-2026
- ## Mettre en place une culture data dans son équipe (### étapes)
- ## Cas concrets : décisions améliorées grâce aux données
- ## Pour aller plus loin avec Evolus Agency
Style : pragmatique, focus décisions et actions concrètes, pas de théorie abstraite.`,

  'ia-generative': `
Tu es un expert en IA générative appliquée au business B2B. Tu rédiges pour des dirigeants, CMO et opérationnels qui veulent un avantage concurrentiel réel grâce à l'IA.
Structure obligatoire :
- Introduction avec l'écart qui se creuse entre entreprises qui adoptent l'IA et les autres
- ## Les cas d'usage IA générative avec le meilleur ROI en B2B
- ## Les outils et modèles qui dominent en 2025-2026
- ## Comment intégrer l'IA dans ses workflows (### étapes)
- ## Risques, limites et bonnes pratiques
- ## Pour aller plus loin avec Evolus Agency
Style : concret, exemples de prompts et workflows réels, focus gain de temps et qualité.`,

  'ecommerce': `
Tu es un expert en e-commerce B2B et D2C. Tu rédiges pour des directeurs e-commerce, fondateurs et responsables digital qui veulent améliorer leurs performances de vente en ligne.
Structure obligatoire :
- Introduction avec les tendances e-commerce B2B qui redéfinissent les règles
- ## Les facteurs clés de succès en e-commerce B2B/D2C en 2025-2026
- ## Optimisation du tunnel de vente et du panier moyen (### sous-sections)
- ## Fidélisation et lifetime value client
- ## Benchmarks sectoriels et exemples
- ## Pour aller plus loin avec Evolus Agency
Style : orienté revenus, exemples de sites et stratégies réels, chiffres de conversion.`,

  'strategie-digitale': `
Tu es un expert en stratégie digitale B2B. Tu rédiges pour des dirigeants, DAF et directeurs marketing qui veulent une vision claire et actionnable de leur transformation digitale.
Structure obligatoire :
- Introduction avec le coût réel de l'absence de stratégie digitale cohérente
- ## Les piliers d'une stratégie digitale B2B efficace en 2025-2026
- ## Comment diagnostiquer sa maturité digitale et prioriser
- ## Construire sa roadmap digitale (### étapes)
- ## Erreurs de transformation à éviter absolument
- ## Pour aller plus loin avec Evolus Agency
Style : vision globale mais concret, frameworks de priorisation, exemples d'entreprises.`,

  'sales-enablement': `
Tu es un expert en sales enablement B2B. Tu rédiges pour des directeurs commerciaux, responsables RevOps et CMO qui veulent aligner marketing et ventes.
Structure obligatoire :
- Introduction avec le coût de l'écart marketing/ventes en B2B (chiffres)
- ## Ce que le sales enablement change concrètement dans le cycle de vente
- ## Les outils et contenus qui accélèrent vraiment les deals
- ## Mettre en place un programme sales enablement efficace (### étapes)
- ## Mesurer l'impact sur le pipeline et le win rate
- ## Pour aller plus loin avec Evolus Agency
Style : orienté pipeline et revenus, exemples de playbooks et contenus de vente.`,

  'lead-generation': `
Tu es un expert en génération de leads B2B. Tu rédiges pour des responsables growth, directeurs commerciaux et fondateurs qui veulent remplir leur pipeline de leads qualifiés.
Structure obligatoire :
- Introduction avec la réalité du coût par lead B2B et l'évolution des canaux
- ## Les canaux de génération de leads B2B qui performent en 2025-2026
- ## Construire un système de lead gen scalable (### sous-sections)
- ## Qualifier et scorer les leads efficacement
- ## Optimiser son coût par lead qualifié
- ## Pour aller plus loin avec Evolus Agency
Style : orienté volume ET qualité, exemples de campagnes et de funnels concrets.`,

  'customer-experience': `
Tu es un expert en expérience client B2B. Tu rédiges pour des directeurs client, responsables CX et dirigeants qui veulent fidéliser et développer leur base clients.
Structure obligatoire :
- Introduction avec l'impact financier direct d'une mauvaise expérience client B2B
- ## Les moments clés de l'expérience client B2B à optimiser
- ## Comment mesurer et améliorer le NPS et la satisfaction (### étapes)
- ## Fidélisation et expansion : transformer les clients en ambassadeurs
- ## Exemples et benchmarks sectoriels
- ## Pour aller plus loin avec Evolus Agency
Style : empathique mais orienté ROI, exemples de parcours clients concrets.`,

  'video-marketing': `
Tu es un expert en vidéo marketing B2B. Tu rédiges pour des responsables marketing, content strategists et directeurs communication qui veulent exploiter la vidéo pour générer du business.
Structure obligatoire :
- Introduction avec la montée en puissance de la vidéo en B2B et ses résultats
- ## Les formats vidéo B2B qui convertissent en 2025-2026
- ## Produire des vidéos efficaces sans budget hollywoodien (### sous-sections)
- ## Distribution et amplification des vidéos B2B
- ## Mesurer la performance vidéo au-delà des vues
- ## Pour aller plus loin avec Evolus Agency
Style : pratique, exemples de formats et de productions réels, focus business impact.`,

  'influence-b2b': `
Tu es un expert en influence B2B et personal branding de dirigeants. Tu rédiges pour des fondateurs, dirigeants et experts qui veulent devenir des références dans leur secteur.
Structure obligatoire :
- Introduction avec l'essor de l'influence B2B et pourquoi les acheteurs font confiance aux experts
- ## Les plateformes et formats d'influence qui fonctionnent en B2B
- ## Construire sa stratégie d'influence et son personal branding (### étapes)
- ## Comment mesurer le ROI de l'influence B2B
- ## Erreurs à éviter et bonnes pratiques
- ## Pour aller plus loin avec Evolus Agency
Style : inspirant mais concret, exemples de créateurs et leaders B2B reconnus.`,

  'developpement-web': `
Tu es un expert en développement web orienté performance et conversion B2B. Tu rédiges pour des directeurs technique, fondateurs et responsables digital.
Structure obligatoire :
- Introduction avec l'impact direct des choix techniques sur le business (conversion, SEO, vitesse)
- ## Les technologies et architectures qui dominent en 2025-2026
- ## Performance web : les optimisations qui changent vraiment les métriques
- ## Choisir et gérer son prestataire ou son équipe web (### sous-sections)
- ## Roadmap technique et priorisation
- ## Pour aller plus loin avec Evolus Agency
Style : technique mais accessible aux décideurs, benchmarks de performance concrets.`,

  'cybersecurite': `
Tu es un expert en cybersécurité appliquée aux entreprises B2B et PME. Tu rédiges pour des dirigeants, DSI et responsables IT qui veulent protéger leur business sans tout bloquer.
Structure obligatoire :
- Introduction avec le coût réel d'une cyberattaque pour une PME B2B
- ## Les menaces actuelles les plus critiques pour les entreprises B2B
- ## Les mesures de protection prioritaires (### sous-sections)
- ## Mettre en place une politique de sécurité pragmatique
- ## Que faire en cas d'incident : plan de réponse simplifié
- ## Pour aller plus loin avec Evolus Agency
Style : pragmatique, chiffres d'incidents réels, focus actions concrètes sans jargon inutile.`,

  'product-marketing': `
Tu es un expert en product marketing B2B. Tu rédiges pour des PMM, directeurs produit et CMO qui veulent que leur produit soit positionné pour gagner sur le marché.
Structure obligatoire :
- Introduction avec le fossé entre un bon produit et un produit qui vend
- ## Positionnement et messaging : les fondations du product marketing
- ## Lancement produit : comment orchestrer un go-to-market qui génère de la traction
- ## Enablement des équipes ventes et contenu produit (### sous-sections)
- ## Mesurer l'impact du product marketing sur les revenus
- ## Pour aller plus loin avec Evolus Agency
Style : orienté adoption et revenus, frameworks reconnus (Positioning d'April Dunford, etc.).`,

  'fondamentaux-business': `
Tu es un expert en stratégie d'entreprise et fondamentaux business. Tu rédiges pour des fondateurs, dirigeants de PME et managers qui veulent maîtriser les bases qui font vraiment la différence.
Structure obligatoire :
- Introduction avec le constat que les entreprises qui échouent négligent souvent les fondamentaux
- ## Les fondamentaux business qui séparent les entreprises qui durent des autres
- ## Diagnostic et priorisation : par où commencer
- ## Mettre en pratique concrètement (### sous-sections par fondamental clé)
- ## Exemples d'entreprises qui ont renforcé leurs fondamentaux avec succès
- ## Pour aller plus loin avec Evolus Agency
Style : direct, pédagogique sans être condescendant, exemples concrets de PME et scale-ups.`,
};

// ── CTA Evolus Agency ─────────────────────────────────────────
function buildEvolusCTA(cluster: ArticleCluster): string {
  const cta: Record<ArticleCluster, string> = {
    'seo':                  `Vous voulez savoir exactement où votre SEO perd des leads qualifiés ? [Evolus Agency](https://evolus.agency) réalise un audit SEO complet et vous livre un plan d'action priorisé sous 48h — sans engagement.`,
    'automation':           `Prêt à identifier les tâches de votre équipe automatisables dès cette semaine ? [Evolus Agency](https://evolus.agency) cartographie vos processus et conçoit des workflows sur-mesure.`,
    'branding':             `Votre marque est-elle mémorable pour vos prospects ? [Evolus Agency](https://evolus.agency) accompagne les entreprises B2B dans la construction d'une identité de marque différenciante.`,
    'content-marketing':    `Votre contenu génère-t-il des leads qualifiés ou juste du trafic ? [Evolus Agency](https://evolus.agency) audite votre stratégie de contenu et construit un plan éditorial orienté conversion.`,
    'ux-ui':                `Votre site convertit-il à la hauteur du trafic qu'il reçoit ? [Evolus Agency](https://evolus.agency) audite votre UX et identifie les points de friction qui freinent vos conversions.`,
    'social-media':         `Vos réseaux sociaux génèrent-ils du pipeline commercial ? [Evolus Agency](https://evolus.agency) conçoit des stratégies social media B2B orientées business, pas juste des abonnés.`,
    'email-marketing':      `Vos campagnes email sont-elles à la hauteur de leur potentiel ? [Evolus Agency](https://evolus.agency) audite vos séquences et optimise vos taux d'ouverture et de conversion.`,
    'paid-ads':             `Votre budget publicitaire est-il optimisé pour générer des leads qualifiés ? [Evolus Agency](https://evolus.agency) audite vos campagnes et réduit votre CAC sans sacrifier le volume.`,
    'cro':                  `Combien de leads votre site laisse-t-il partir chaque mois ? [Evolus Agency](https://evolus.agency) identifie vos quick wins CRO et les implémente pour vous.`,
    'data-analytics':       `Vos décisions marketing sont-elles vraiment data-driven ? [Evolus Agency](https://evolus.agency) met en place votre stack analytics et vos tableaux de bord de pilotage.`,
    'ia-generative':        `Votre équipe exploite-t-elle le plein potentiel de l'IA générative ? [Evolus Agency](https://evolus.agency) identifie vos cas d'usage prioritaires et les intègre dans vos workflows.`,
    'ecommerce':            `Votre tunnel e-commerce convertit-il au niveau des meilleurs de votre secteur ? [Evolus Agency](https://evolus.agency) audite votre site et optimise votre taux de conversion.`,
    'strategie-digitale':   `Votre stratégie digitale est-elle alignée avec vos objectifs business 2025-2026 ? [Evolus Agency](https://evolus.agency) vous accompagne dans la construction de votre roadmap digitale.`,
    'sales-enablement':     `Votre équipe commerciale dispose-t-elle des bons contenus et outils pour closer ? [Evolus Agency](https://evolus.agency) construit votre programme sales enablement de A à Z.`,
    'lead-generation':      `Votre pipeline est-il alimenté régulièrement en leads qualifiés ? [Evolus Agency](https://evolus.agency) conçoit votre système de lead generation scalable et mesurable.`,
    'customer-experience':  `Vos clients sont-ils assez satisfaits pour vous recommander ? [Evolus Agency](https://evolus.agency) audite votre expérience client et identifie les moments clés à améliorer en priorité.`,
    'video-marketing':      `La vidéo fait-elle partie de votre mix marketing B2B ? [Evolus Agency](https://evolus.agency) définit votre stratégie vidéo et accompagne vos premières productions.`,
    'influence-b2b':        `Votre expertise est-elle visible auprès de vos prospects ? [Evolus Agency](https://evolus.agency) vous accompagne dans la construction de votre influence B2B et de votre personal branding.`,
    'developpement-web':    `Votre site web est-il un actif qui génère du business ou un coût qui s'ignore ? [Evolus Agency](https://evolus.agency) audite votre stack technique et vos performances web.`,
    'cybersecurite':        `Votre entreprise est-elle préparée à faire face à une cyberattaque ? [Evolus Agency](https://evolus.agency) réalise un audit de sécurité pragmatique et vous aide à mettre en place les protections essentielles.`,
    'product-marketing':    `Votre produit est-il positionné pour gagner sur votre marché ? [Evolus Agency](https://evolus.agency) vous accompagne dans la définition de votre messaging et l'orchestration de vos lancements.`,
    'fondamentaux-business':`Vos fondamentaux business sont-ils solides pour soutenir votre croissance ? [Evolus Agency](https://evolus.agency) accompagne les dirigeants dans le diagnostic et le renforcement de leurs piliers business.`,
  };
  return `\n\n---\n\n## Pour aller plus loin avec Evolus Agency\n\n${cta[cluster]}\n`;
}

// ── Helpers ───────────────────────────────────────────────────
function estimateReadTime(text: string): string {
  const words   = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildPrompt(row: SheetRow): string {
  const angle = CLUSTER_ANGLE[row.cluster];
  return `${angle}

---

CONSIGNES STRICTES :
- Rédige UNIQUEMENT le corps de l'article en Markdown.
- NE PAS inclure de frontmatter YAML (pas de ---, pas de title:, pas de date:).
- NE PAS inclure de balise <article>, <html> ou tout autre tag HTML.
- Commence directement par l'introduction accrocheuse (sans titre H1 — il est géré ailleurs).
- Utilise ## pour les H2 et ### pour les H3.
- Longueur cible : 1 000 à 1 400 mots (hors section Evolus Agency).
- Langue : français professionnel, tutoiement interdit.
- Mot-clé principal à intégrer naturellement (3 à 5 occurrences) : "${row.keyword}"
- NE PAS rédiger la section "Pour aller plus loin avec Evolus Agency" — elle est ajoutée automatiquement.

SUJET : ${row.title}
DESCRIPTION COURTE : ${row.excerpt}

Commence la rédaction maintenant.`;
}

function sanitizeBody(raw: string): string {
  let clean = raw.replace(/^---[\s\S]*?---\n?/, '').trim();
  clean     = clean.replace(/^#\s+.+\n?/, '').trim();
  clean     = clean.replace(/##\s+Pour aller plus loin[\s\S]*$/i, '').trim();
  return clean;
}

function buildMarkdownFile(frontmatter: ArticleFrontmatter, body: string): string {
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

// ── Export principal ──────────────────────────────────────────
export async function generateArticle(
  ai:     Ai,
  row:    SheetRow,
  lang:   string,
  author: string,
): Promise<GeneratedArticle> {

  const prompt = buildPrompt(row);

  const aiResponse = await ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: [
      {
        role:    'system',
        content: `Tu es un rédacteur senior spécialisé en contenu B2B à haute valeur ajoutée pour Evolus Agency.
RÈGLES ABSOLUES :
- Ne jamais commencer par "Les entreprises B2B" ou toute formule générique.
- Style direct, dense, sans jargon creux. Une phrase = une idée utile.
- Markdown propre uniquement. Zéro frontmatter. Zéro HTML.
- Ne pas rédiger la section "Pour aller plus loin avec Evolus Agency".`,
      },
      {
        role:    'user',
        content: prompt,
      },
    ],
    max_tokens:  2048,
    temperature: 0.65,
  }) as { response: string };

  const rawBody = aiResponse?.response ?? '';
  if (!rawBody.trim()) {
    throw new Error(`AI returned empty content for slug "${row.slug}"`);
  }

  const cleanBody   = sanitizeBody(rawBody);
  const body        = cleanBody + buildEvolusCTA(row.cluster);

  const frontmatter: ArticleFrontmatter = {
    title:    row.title,
    excerpt:  row.excerpt,
    date:     todayISO(),
    tag:      CLUSTER_TAG[row.cluster],
    read:     estimateReadTime(body),
    category: row.cluster,
    lang,
    author,
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
