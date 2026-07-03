/**
 * generator.ts — v2
 * Cloudflare AI Workers — 22 clusters B2B Evolus Agency
 *
 * ARCHITECTURE: 3-level hybrid prompting
 *   L1 · Cluster  → domain expertise + audience framing
 *   L2 · Intent   → article sub-topic extracted from title
 *   L3 · Outline  → AI-generated structure matched to intent + article type
 */

import { generateAndUploadImage } from './image';
import { fetchSearchContext, formatSearchContext } from './search';
import { ArticleCluster, ArticleFrontmatter, GeneratedArticle, SheetRow } from './types';

// ─────────────────────────────────────────────────────────────
// SECTION 1 · Cluster → display tag (unchanged)
// ─────────────────────────────────────────────────────────────

const CLUSTER_TAG: Record<ArticleCluster, string> = {
  'seo':                   'SEO',
  'automation':            'Automatisation',
  'branding':              'Branding',
  'content-marketing':     'Content Marketing',
  'ux-ui':                 'UX / UI',
  'social-media':          'Social Media',
  'email-marketing':       'Email Marketing',
  'paid-ads':              'Publicité Payante',
  'cro':                   'CRO',
  'data-analytics':        'Data & Analytics',
  'ia-generative':         'IA Générative',
  'ecommerce':             'E-commerce',
  'strategie-digitale':    'Stratégie Digitale',
  'sales-enablement':      'Sales Enablement',
  'lead-generation':       'Lead Generation',
  'customer-experience':   'Expérience Client',
  'video-marketing':       'Vidéo Marketing',
  'influence-b2b':         'Influence B2B',
  'developpement-web':     'Développement Web',
  'cybersecurite':         'Cybersécurité',
  'product-marketing':     'Product Marketing',
  'fondamentaux-business': 'Fondamentaux Business',
};

// ─────────────────────────────────────────────────────────────
// SECTION 2 · L1 — Cluster expertise blocks
//
// PURPOSE: establish the expert persona and audience.
// NOT a content template. No headings. No topic prescriptions.
// One compact paragraph per cluster.
// ─────────────────────────────────────────────────────────────

const CLUSTER_EXPERTISE: Record<ArticleCluster, string> = {
  'seo': `Expert SEO B2B depuis 12 ans, tu as audité plus de 200 sites industriels et SaaS. Tu maîtrises la recherche sémantique, le maillage interne, le crawl budget, les Core Web Vitals et la stratégie de contenu pillar-cluster. Ton audience : directeurs marketing, responsables growth, fondateurs de PME qui veulent des leads organiques mesurables, pas du trafic vide.`,

  'automation': `Expert en automatisation business et IA appliquée, tu as conçu des workflows pour des équipes allant de 5 à 500 personnes. Tu maîtrises Make (ex-Integromat), Zapier, n8n, les agents IA, l'orchestration de données et la mesure du ROI. Ton audience : opérationnels, CTOs, fondateurs qui veulent réduire le temps perdu et scaler sans recruter.`,

  'branding': `Expert en stratégie de marque B2B, tu as repositionné des marques dans des secteurs aussi différents que l'industrie, le SaaS et les services professionnels. Tu maîtrises le brand positioning, l'identité verbale, l'architecture de marque et la différenciation compétitive. Ton audience : dirigeants, CMO, responsables communication qui veulent une marque que leurs prospects reconnaissent et préfèrent.`,

  'content-marketing': `Expert en content marketing B2B, tu as piloté des stratégies de contenu qui ont généré des millions d'euros de pipeline. Tu maîtrises l'éditorial planning, le SEO éditorial, les formats qui convertissent (case studies, guides, webinaires) et la mesure de l'attribution. Ton audience : responsables marketing, directeurs de contenu, fondateurs qui veulent du contenu qui remplit le pipeline, pas juste les analytics.`,

  'ux-ui': `Expert UX/UI orienté conversion B2B, tu as mené des centaines d'audits et tests A/B sur des sites et applications SaaS, industriels et e-commerce B2B. Tu maîtrises l'architecture de l'information, les heuristiques de Nielsen, les tests utilisateurs, les heatmaps et le CRO. Ton audience : product managers, growth hackers, directeurs marketing qui veulent que chaque visite compte.`,

  'social-media': `Expert social media B2B, tu as géré des comptes LinkedIn, X (Twitter) et YouTube pour des entreprises qui ont transformé leur présence en pipeline commercial. Tu maîtrises l'algorithme LinkedIn, les formats de contenu organique et payant, le social selling et la mesure de l'attribution sociale. Ton audience : responsables marketing, dirigeants, commercial managers qui veulent des résultats business, pas des likes.`,

  'email-marketing': `Expert en email marketing B2B, tu as conçu des séquences de nurturing, de prospection et d'onboarding qui ont généré des taux d'ouverture à 50%+ et des taux de clic à 10%+. Tu maîtrises la délivrabilité, la segmentation comportementale, le copywriting d'email et l'automatisation. Ton audience : responsables CRM, growth marketers, directeurs marketing qui veulent des campagnes email qui rapportent.`,

  'paid-ads': `Expert en publicité payante B2B (Google Ads, LinkedIn Ads, Meta), tu as géré des budgets de 10K€ à 500K€/mois pour des entreprises B2B et SaaS. Tu maîtrises la structure de campagnes, le ciblage par intention et par audience, le copywriting d'annonce et l'optimisation du CAC. Ton audience : responsables acquisition, directeurs marketing qui veulent maîtriser leur coût d'acquisition.`,

  'cro': `Expert CRO (Conversion Rate Optimization) B2B, tu as conduit plus de 300 tests A/B et identifié des quick wins qui ont multiplié par 2 à 5 le taux de conversion de landing pages, formulaires et tunnels. Tu maîtrises les frameworks ICE et PIE, le test de copie, l'analyse de friction et la priorisation data-driven. Ton audience : product managers, growth hackers, directeurs marketing qui veulent convertir plus sans dépenser plus.`,

  'data-analytics': `Expert en data analytics marketing B2B, tu as mis en place des stacks analytics complets (GA4, Mixpanel, Amplitude, Looker) et des modèles d'attribution multi-touch pour des entreprises SaaS et industrielles. Tu maîtrises la définition des KPIs, le data storytelling et la data governance. Ton audience : directeurs marketing, data analysts, dirigeants qui veulent prendre des décisions basées sur des faits, pas des intuitions.`,

  'ia-generative': `Expert IA générative appliquée au business B2B, tu as intégré ChatGPT, Claude, Midjourney et des workflows LLM dans les opérations marketing, commerciales et produit de dizaines d'entreprises. Tu maîtrises le prompt engineering, les agents IA, le RAG et la gouvernance IA. Ton audience : dirigeants, CMO, opérationnels qui veulent un avantage compétitif réel, pas juste experimenter.`,

  'ecommerce': `Expert e-commerce B2B et D2C, tu as optimisé des tunnels de vente pour des marchands de 1M€ à 100M€ de CA. Tu maîtrises l'UX e-commerce, la réduction du panier abandonné, l'upsell/cross-sell, le merchandising digital et la fidélisation. Ton audience : directeurs e-commerce, fondateurs, responsables digital qui veulent plus de revenus par visiteur.`,

  'strategie-digitale': `Expert en stratégie digitale B2B, tu as accompagné la transformation digitale de PME et ETI dans des secteurs aussi variés que l'industrie, les services et le retail B2B. Tu maîtrises le diagnostic de maturité digitale, la priorisation des investissements, la gouvernance de projet et la gestion du changement. Ton audience : dirigeants, DAF, directeurs marketing qui veulent une feuille de route digitale réaliste et rentable.`,

  'sales-enablement': `Expert en sales enablement B2B, tu as construit des programmes d'enablement qui ont réduit le cycle de vente de 30% et augmenté le win rate de 20%+ dans des équipes commerciales de 5 à 200 personnes. Tu maîtrises les playbooks, les contenus d'aide à la vente, les CRM, le coaching commercial et l'alignement marketing-ventes. Ton audience : directeurs commerciaux, responsables RevOps, CMO qui veulent fermer plus de deals, plus vite.`,

  'lead-generation': `Expert en génération de leads B2B, tu as conçu des systèmes de lead gen qui alimentent en continu le pipeline de PME et scale-ups. Tu maîtrises l'inbound (SEO, contenu, lead magnets), l'outbound (cold email, LinkedIn, ABM), le scoring et la qualification. Ton audience : responsables growth, directeurs commerciaux, fondateurs qui veulent un pipeline prédictible, pas une montagne russe.`,

  'customer-experience': `Expert en expérience client B2B, tu as conçu des parcours client qui ont transformé des taux de churn à 20% en NPS à 60+ dans des entreprises SaaS et services professionnels. Tu maîtrises le customer journey mapping, le NPS et CSAT, l'onboarding, le customer success et la gestion des moments critiques. Ton audience : directeurs client, responsables CX, dirigeants qui veulent des clients qui restent et recommandent.`,

  'video-marketing': `Expert en vidéo marketing B2B, tu as produit et distribué des vidéos (explainers, témoignages, webinaires, shorts) qui ont généré des leads qualifiés pour des entreprises tech et industrielles. Tu maîtrises la production lean, le scripting, la distribution multicanal et la mesure de l'impact vidéo sur le pipeline. Ton audience : responsables marketing, content strategists, directeurs communication qui veulent exploiter la vidéo sans y passer tout leur budget.`,

  'influence-b2b': `Expert en influence B2B et personal branding de dirigeants, tu as accompagné des fondateurs et experts à devenir des références LinkedIn avec des audiences de 10K à 100K+ abonnés engagés qui génèrent du business. Tu maîtrises le positionnement d'expert, la stratégie de contenu thought leadership, les collaborations et la mesure du ROI influence. Ton audience : fondateurs, dirigeants, experts qui veulent que leur expertise travaille pour eux, même quand ils dorment.`,

  'developpement-web': `Expert en développement web orienté performance et conversion B2B, tu as livré des sites et applications qui combinent excellence technique (Core Web Vitals, accessibilité, sécurité) et résultats business (trafic, conversion, rétention). Tu maîtrises les architectures modernes (Next.js, headless CMS, edge), la performance frontend et le choix des prestataires. Ton audience : directeurs technique, fondateurs, responsables digital qui veulent un site qui est un actif, pas un coût.`,

  'cybersecurite': `Expert en cybersécurité appliquée aux PME et ETI B2B, tu as accompagné des dizaines d'entreprises après des incidents (ransomware, phishing, fuite de données) et les as aidées à bâtir une posture de sécurité pragmatique. Tu maîtrises la gestion des risques, les frameworks ISO 27001 et NIST, la sensibilisation des équipes et la réponse aux incidents. Ton audience : dirigeants, DSI, responsables IT qui veulent protéger leur business sans bloquer la productivité.`,

  'product-marketing': `Expert en product marketing B2B, tu as piloté des lancements produit qui ont généré des millions d'euros de revenu en première année et repositionné des produits qui stagnaient. Tu maîtrises le positioning (méthode April Dunford), le messaging, les ICP, les GTM strategies et l'enablement des équipes ventes. Ton audience : PMM, directeurs produit, CMO qui veulent que leur produit soit compris, préféré et acheté.`,

  'fondamentaux-business': `Expert en stratégie d'entreprise et fondamentaux business, tu as accompagné des fondateurs et dirigeants de PME dans la construction de modèles économiques solides, la priorisation stratégique et la croissance rentable. Tu maîtrises la finance d'entreprise, le pricing, les KPIs business, la gestion opérationnelle et la prise de décision sous incertitude. Ton audience : fondateurs, dirigeants de PME, managers qui veulent des bases solides avant d'accélérer.`,
};

// ─────────────────────────────────────────────────────────────
// SECTION 3 · L2 — Article type detection
//
// PURPOSE: classify the article so the outline generator can
// pick the right scaffold. Detection runs in the main prompt —
// the model infers type from title + description.
// ─────────────────────────────────────────────────────────────

type ArticleType =
  | 'guide'
  | 'tutorial'
  | 'checklist'
  | 'framework'
  | 'comparison'
  | 'case-study'
  | 'strategy'
  | 'audit'
  | 'playbook'
  | 'deep-dive';

/**
 * Infers the article type from title keywords.
 * This is a fast client-side heuristic — the LLM will refine intent
 * at generation time. This primarily drives structural hints.
 */
function detectArticleType(title: string, excerpt: string): ArticleType {
  const text = `${title} ${excerpt}`.toLowerCase();

  if (/checklist|liste de|vérification|points à|to-do|à faire/.test(text)) return 'checklist';
  if (/audit|diagnostic|évaluer|mesurer votre|analyser votre/.test(text)) return 'audit';
  if (/vs\.?|versus|comparaison|différence entre|quel outil|quelle plateforme/.test(text)) return 'comparison';
  if (/étude de cas|cas client|comment [a-z]+ a|résultats de|témoignage/.test(text)) return 'case-study';
  if (/framework|modèle|méthode|matrice|approche structurée/.test(text)) return 'framework';
  if (/playbook|programme|plan d.action|roadmap|feuille de route/.test(text)) return 'playbook';
  if (/comment faire|étape par étape|guide pratique|mise en place|implémenter|configurer/.test(text)) return 'tutorial';
  if (/stratégie|approche|vision|piloter|construire sa/.test(text)) return 'strategy';
  if (/comprendre|tout savoir|qu.est-ce que|définition|introduction à|panorama/.test(text)) return 'guide';

  return 'deep-dive'; // default: in-depth article on a specific topic
}

// ─────────────────────────────────────────────────────────────
// SECTION 4 · Article type → structural scaffold hint
//
// PURPOSE: give the LLM a concrete structural contract per type.
// These are *hints*, not rigid templates. The LLM adapts them
// to the specific topic intent extracted from the title.
// ─────────────────────────────────────────────────────────────

const ARTICLE_TYPE_SCAFFOLD: Record<ArticleType, string> = {
  'guide': `
TYPE : Guide complet
STRUCTURE ATTENDUE :
- Accroche avec un chiffre ou constat contre-intuitif spécifique au sujet
- Explication claire du sujet et de pourquoi il compte maintenant
- Les fondations conceptuelles (2-3 points clés avec exemples concrets)
- Application pratique étape par étape (### numérotées)
- Erreurs courantes et comment les éviter
- Synthèse actionnable avec prochaines étapes
FORMAT : Prose dense + listes numérotées + 1 tableau récapitulatif si pertinent`,

  'tutorial': `
TYPE : Tutoriel step-by-step
STRUCTURE ATTENDUE :
- Contexte : quand et pourquoi utiliser cette approche (1 paragraphe)
- Prérequis et ce dont tu as besoin avant de commencer
- Étapes numérotées (### Étape 1, ### Étape 2…) avec actions précises
- Exemples concrets à chaque étape (captures d'écran décrites, exemples réels)
- Pièges fréquents par étape
- Résultat attendu et comment valider
FORMAT : Structure séquentielle stricte, checklists par étape, exemples de code ou de config si pertinent`,

  'checklist': `
TYPE : Checklist opérationnelle
STRUCTURE ATTENDUE :
- Introduction : ce que cette checklist permet d'éviter/accomplir
- Contexte d'utilisation (quand l'appliquer)
- Sections thématiques avec items checkables (### par phase ou domaine)
- Pour chaque item : action précise + critère de validation + temps estimé
- Score d'évaluation ou grille de maturité
- Prochaines étapes selon le score
FORMAT : Structure à base de listes d'actions vérifiables, tableaux de scoring si pertinent`,

  'framework': `
TYPE : Framework / Méthode
STRUCTURE ATTENDUE :
- Problème que le framework résout (avec coût concret du problème)
- Présentation du framework avec nom + acronyme si pertinent
- Chaque composante détaillée (### par composante) avec : définition, application, exemple réel
- Tableau de synthèse du framework
- Comment implémenter le framework en 4-6 semaines
- Variantes et adaptations selon le contexte
FORMAT : Structure modulaire claire, tableau du framework obligatoire, exemples B2B réels`,

  'comparison': `
TYPE : Comparaison / Analyse comparative
STRUCTURE ATTENDUE :
- Contexte : pourquoi cette comparaison est utile maintenant
- Critères de comparaison définis explicitement (5-8 critères avec pondération)
- Analyse de chaque option sur chaque critère (### par option ou tableau)
- Tableau comparatif synthétique obligatoire
- Recommandations contextuelles (quel choix selon quelle situation)
- Conclusion : comment décider pour son propre cas
FORMAT : Tableau comparatif obligatoire, analyse structurée par critères, recommandations segmentées`,

  'case-study': `
TYPE : Étude de cas / Retour d'expérience
STRUCTURE ATTENDUE :
- Contexte et situation de départ (problème, entreprise type, stakes)
- Diagnostic initial (ce qui ne fonctionnait pas + pourquoi)
- Approche et décisions prises (### par phase de l'intervention)
- Résultats chiffrés et timeline
- Enseignements transférables (ce qui marche dans d'autres contextes)
- Comment appliquer ces leçons à son propre cas
FORMAT : Narration structurée, chiffres de résultats, leçons extrapolables`,

  'strategy': `
TYPE : Stratégie / Vision
STRUCTURE ATTENDUE :
- Constat marché et contexte 2025-2026 (chiffres + tendances)
- Les 3-5 piliers de la stratégie (### par pilier) avec justification
- Framework de priorisation pour choisir par où commencer
- Roadmap de mise en œuvre (horizon 3-6-12 mois)
- Indicateurs de succès et jalons
- Erreurs stratégiques à éviter absolument
FORMAT : Vision macro + déclinaison opérationnelle, tableaux de priorisation`,

  'audit': `
TYPE : Audit / Diagnostic
STRUCTURE ATTENDUE :
- Pourquoi auditer maintenant (coût de ne pas savoir)
- Périmètre de l'audit et ce qu'il couvre
- Grille d'audit par dimension (### par dimension) avec critères évaluables
- Méthode de scoring et interprétation
- Les 5 signaux d'alerte les plus fréquents + comment les corriger
- Plan d'action post-audit : priorisation et quick wins
FORMAT : Grilles évaluables, tableaux de scoring, plan d'action structuré`,

  'playbook': `
TYPE : Playbook / Programme opérationnel
STRUCTURE ATTENDUE :
- Objectif du playbook et résultats attendus
- Prérequis et organisation nécessaire
- Phases du programme (### Phase 1, ### Phase 2…) avec : objectifs, actions, livrables, responsables
- Templates et outils recommandés par phase
- Métriques de suivi et points de contrôle
- Erreurs d'implémentation fréquentes
FORMAT : Structure opérationnelle claire, responsabilités explicites, KPIs par phase`,

  'deep-dive': `
TYPE : Deep-dive / Analyse experte
STRUCTURE ATTENDUE :
- Accroche avec le paradoxe ou insight contre-intuitif au cœur du sujet
- État de l'art et nuances que la plupart ignorent
- Analyse en profondeur des mécaniques clés (### par angle d'analyse)
- Données, recherches et exemples de terrain
- Implications pratiques pour les professionnels B2B
- Perspective d'expert : ce qui va changer dans les 12-18 mois
FORMAT : Analyse dense et nuancée, chiffres sourcés, points de vue tranchés`,
};

// ─────────────────────────────────────────────────────────────
// SECTION 5 · CTA blocks (unchanged logic, kept concise)
// ─────────────────────────────────────────────────────────────

function buildEvolusCTA(cluster: ArticleCluster): string {
  const cta: Record<ArticleCluster, string> = {
    'seo':                   `Vous voulez identifier exactement où votre SEO perd des leads ? [Evolus Agency](https://evolus.agency) réalise un audit SEO complet et livre un plan d'action priorisé sous 48h — sans engagement.`,
    'automation':            `Prêt à identifier les tâches automatisables dès cette semaine ? [Evolus Agency](https://evolus.agency) cartographie vos processus et conçoit des workflows sur-mesure avec ROI mesurable.`,
    'branding':              `Votre marque est-elle mémorable pour vos prospects ? [Evolus Agency](https://evolus.agency) accompagne les entreprises B2B dans la construction d'une identité de marque différenciante.`,
    'content-marketing':     `Votre contenu génère-t-il des leads qualifiés ou juste du trafic ? [Evolus Agency](https://evolus.agency) audite votre stratégie de contenu et construit un plan éditorial orienté conversion.`,
    'ux-ui':                 `Votre site convertit-il à la hauteur du trafic qu'il reçoit ? [Evolus Agency](https://evolus.agency) audite votre UX et identifie les points de friction qui freinent vos conversions.`,
    'social-media':          `Vos réseaux sociaux génèrent-ils du pipeline commercial ? [Evolus Agency](https://evolus.agency) conçoit des stratégies social media B2B orientées business, pas juste des abonnés.`,
    'email-marketing':       `Vos campagnes email sont-elles à la hauteur de leur potentiel ? [Evolus Agency](https://evolus.agency) audite vos séquences et optimise vos taux d'ouverture et de conversion.`,
    'paid-ads':              `Votre budget publicitaire génère-t-il des leads qualifiés ? [Evolus Agency](https://evolus.agency) audite vos campagnes et réduit votre CAC sans sacrifier le volume.`,
    'cro':                   `Combien de leads votre site laisse-t-il partir chaque mois ? [Evolus Agency](https://evolus.agency) identifie vos quick wins CRO et les implémente pour vous.`,
    'data-analytics':        `Vos décisions marketing sont-elles vraiment data-driven ? [Evolus Agency](https://evolus.agency) met en place votre stack analytics et vos tableaux de bord de pilotage.`,
    'ia-generative':         `Votre équipe exploite-t-elle le plein potentiel de l'IA générative ? [Evolus Agency](https://evolus.agency) identifie vos cas d'usage prioritaires et les intègre dans vos workflows.`,
    'ecommerce':             `Votre tunnel e-commerce convertit-il au niveau des meilleurs de votre secteur ? [Evolus Agency](https://evolus.agency) audite votre site et optimise votre taux de conversion.`,
    'strategie-digitale':    `Votre stratégie digitale est-elle alignée avec vos objectifs business 2025-2026 ? [Evolus Agency](https://evolus.agency) construit votre roadmap digitale sur-mesure.`,
    'sales-enablement':      `Votre équipe commerciale dispose-t-elle des bons outils pour closer ? [Evolus Agency](https://evolus.agency) construit votre programme sales enablement de A à Z.`,
    'lead-generation':       `Votre pipeline est-il alimenté régulièrement en leads qualifiés ? [Evolus Agency](https://evolus.agency) conçoit votre système de lead generation scalable et mesurable.`,
    'customer-experience':   `Vos clients sont-ils assez satisfaits pour vous recommander ? [Evolus Agency](https://evolus.agency) audite votre expérience client et identifie les moments clés à améliorer en priorité.`,
    'video-marketing':       `La vidéo fait-elle partie de votre mix marketing B2B ? [Evolus Agency](https://evolus.agency) définit votre stratégie vidéo et accompagne vos premières productions.`,
    'influence-b2b':         `Votre expertise est-elle visible auprès de vos prospects ? [Evolus Agency](https://evolus.agency) construit votre stratégie d'influence B2B et de personal branding.`,
    'developpement-web':     `Votre site web génère-t-il du business ou consomme-t-il du budget ? [Evolus Agency](https://evolus.agency) audite votre stack technique et vos performances web.`,
    'cybersecurite':         `Votre entreprise est-elle préparée face à une cyberattaque ? [Evolus Agency](https://evolus.agency) réalise un audit de sécurité pragmatique et déploie les protections essentielles.`,
    'product-marketing':     `Votre produit est-il positionné pour gagner sur votre marché ? [Evolus Agency](https://evolus.agency) accompagne la définition de votre messaging et l'orchestration de vos lancements.`,
    'fondamentaux-business': `Vos fondamentaux business sont-ils solides pour soutenir votre croissance ? [Evolus Agency](https://evolus.agency) accompagne les dirigeants dans le diagnostic et le renforcement de leurs piliers business.`,
  };
  return `\n\n---\n\n## Pour aller plus loin avec Evolus Agency\n\n${cta[cluster]}\n`;
}

// ─────────────────────────────────────────────────────────────
// SECTION 6 · Core system prompt
//
// Separated from the user prompt. Does NOT describe topic.
// Enforces voice, anti-patterns, formatting contracts.
// ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un rédacteur expert en contenu B2B à haute valeur ajoutée. Tu produis des articles qui ressemblent à ceux d'un praticien senior partageant ce qu'il a appris en faisant — pas en théorisant.

## Règles de voix et de style

INTERDIT absolument :
- Commencer par "Les entreprises B2B…", "Dans le monde du marketing…", "Il est important de…", "La création de contenu est essentielle…", "Les entreprises doivent…"
- Les généralisations vides : "nombreuses entreprises", "beaucoup d'équipes", "souvent", "généralement"
- Le mode injonctif creux : "il faut", "vous devez", "n'oubliez pas de"
- Les introductions qui répètent le titre
- Les transitions d'agence : "Chez Evolus Agency, nous pensons que…" (sauf dans la section CTA)
- Les conclusions qui résument ce qui vient d'être dit sans ajouter d'insight

OBLIGATOIRE :
- Commencer par un fait chiffré, un paradoxe, une observation terrain inattendue — spécifique au sujet réel de l'article
- Chaque H2 apporte une information nouvelle non-déductible du H2 précédent
- Chaque paragraphe contient soit une donnée, soit un exemple nommé, soit une action précise
- Les exemples citent des outils, entreprises, secteurs ou scénarios réels (ex : "une SaaS B2B de 30 personnes dans la logistique" plutôt que "une entreprise")
- Les listes d'items sont des actions ou des critères — jamais des catégories vagues
- Le tutoiement est interdit. Vouvoiement strict.

## Règles de format Markdown

- Markdown pur uniquement
- Zéro frontmatter YAML
- Zéro balise HTML
- Pas de H1 (géré en dehors)
- H2 (##) pour les sections principales
- H3 (###) pour les sous-sections
- Tableaux Markdown pour les comparaisons, scorings, frameworks
- Listes numérotées pour les étapes séquentielles
- Listes à puces pour les items non-ordonnés
- Gras uniquement pour les termes techniques ou les chiffres clés — pas pour le style
- Longueur cible : 1 100 à 1 500 mots hors section CTA Evolus

## Règles de contenu

- NE PAS rédiger la section "Pour aller plus loin avec Evolus Agency" (ajoutée automatiquement)
- Intégrer naturellement le mot-clé principal 3 à 5 fois
- Si le contexte web fourni contient des chiffres ou données récentes pertinents, les utiliser — sans mentionner les URLs
- Si aucun chiffre web pertinent n'est disponible, utiliser des ordres de grandeur issus de l'expertise du domaine en précisant "selon les benchmarks sectoriels" ou équivalent`;

// ─────────────────────────────────────────────────────────────
// SECTION 7 · buildPrompt() — the redesigned core
//
// This now has 3 distinct layers feeding the LLM:
//   [A] Expert persona (L1 — cluster)
//   [B] Article intent extraction (L2 — title analysis)
//   [C] Structural scaffold (L3 — article type)
//   [D] Search context (web data)
//   [E] Hard constraints (keyword, length, language)
// ─────────────────────────────────────────────────────────────

function buildPrompt(row: SheetRow, searchContext: string): string {
  const articleType = detectArticleType(row.title, row.excerpt);
  const scaffold    = ARTICLE_TYPE_SCAFFOLD[articleType];
  const expertise   = CLUSTER_EXPERTISE[row.cluster];

  return `## [A] TON EXPERTISE ET TON AUDIENCE

${expertise}

---

## [B] ANALYSE DU SUJET RÉEL DE CET ARTICLE

Titre : "${row.title}"
Description : "${row.excerpt}"

Avant de rédiger, identifie mentalement :
1. L'INTENTION PRIMAIRE : quel problème opérationnel précis le lecteur cherche-t-il à résoudre ? (ex : "comment organiser son planning éditorial sur 6 mois sans chaos")
2. L'EXPERTISE REQUISE : quelles compétences spécifiques doit démontrer cet article ? (ex : éditorial planning, gestion de backlog de contenu, templates de calendrier)
3. CE QUE L'ARTICLE NE DOIT PAS FAIRE : quel piège générique faut-il éviter ? (ex : ne pas parler de "pourquoi le contenu est important" ou de "comment choisir ses canaux")

Rédige uniquement en réponse à l'intention primaire identifiée — pas au cluster générique.

---

## [C] TYPE D'ARTICLE ET STRUCTURE ATTENDUE

${scaffold}

Adapte cette structure au sujet précis. Si un élément de la structure ne s'applique pas naturellement au sujet, remplace-le par quelque chose de plus pertinent — l'objectif est la cohérence avec l'intention, pas la conformité au template.

---

## [D] CONTEXTE WEB RÉCENT

${searchContext || "Aucun contexte web disponible — utilise ton expertise de praticien pour les données et chiffres."}

---

## [E] CONTRAINTES DE PRODUCTION

- Langue : français professionnel B2B. Vouvoiement. Zéro tutoiement.
- Mot-clé principal à intégrer naturellement (3 à 5 occurrences sans sur-optimisation) : "${row.keyword}"
- Longueur : 1 100 à 1 500 mots (hors section CTA Evolus)
- Commence directement par l'introduction — sans annoncer le plan, sans titre H1
- NE PAS rédiger la section "Pour aller plus loin avec Evolus Agency"

Commence la rédaction maintenant.`;
}

// ─────────────────────────────────────────────────────────────
// SECTION 8 · Utility functions (unchanged)
// ─────────────────────────────────────────────────────────────

function sanitizeBody(raw: string): string {
  let clean = raw.replace(/^---[\s\S]*?---\n?/, '').trim();
  clean     = clean.replace(/^#\s+.+\n?/, '').trim();
  clean     = clean.replace(/##\s+Pour aller plus loin[\s\S]*$/i, '').trim();
  // Strip any accidental HTML tags the model might produce
  clean     = clean.replace(/<[^>]+>/g, '');
  return clean;
}

function estimateReadTime(text: string): string {
  const words   = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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
    ...(frontmatter.image ? [`image: "${frontmatter.image}"`] : []),
    '---',
    '',
  ].join('\n');
  return fm + body;
}

// ─────────────────────────────────────────────────────────────
// SECTION 9 · generateArticle() — main export
//
// Changes vs v1:
//   · Logs detected article type for observability
//   · Slightly higher temperature (0.72) for less repetitive output
//   · max_tokens bumped to 2800 to accommodate richer articles
//   · Passes SYSTEM_PROMPT as separate system message
// ─────────────────────────────────────────────────────────────

export async function generateArticle(
  ai:            Ai,
  row:           SheetRow,
  lang:          string,
  author:        string,
  braveApiKey?:  string,
  bucket?:       R2Bucket,
  r2PublicUrl?:  string,
): Promise<GeneratedArticle> {

  // L2: detect article type for logging + scaffold selection
  const articleType = detectArticleType(row.title, row.excerpt);
  console.log(`[Generator] slug="${row.slug}" cluster="${row.cluster}" type="${articleType}"`);

  // Fetch search context
  const searchQuery   = `${row.keyword} ${row.title} 2026`;
  const searchResults = await fetchSearchContext(braveApiKey, searchQuery);
  const searchContext = formatSearchContext(searchResults);
  console.log(`[Search] ${searchResults.length} result(s) for "${row.keyword}"`);

  // Build the composite prompt
  const userPrompt = buildPrompt(row, searchContext);

  // Call Cloudflare AI
  const aiResponse = await ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: [
      {
        role:    'system',
        content: SYSTEM_PROMPT,
      },
      {
        role:    'user',
        content: userPrompt,
      },
    ],
    max_tokens:  2800,   // up from 2048 — richer structures need more room
    temperature: 0.72,   // up from 0.65 — reduces repetition across articles
  }) as { response: string };

  const rawBody = aiResponse?.response ?? '';
  if (!rawBody.trim()) {
    throw new Error(`AI returned empty content for slug "${row.slug}"`);
  }

  const cleanBody = sanitizeBody(rawBody);
  const body      = cleanBody + buildEvolusCTA(row.cluster);

  // Optional image generation
  let imageUrl: string | undefined;
  if (bucket && r2PublicUrl) {
    const url = await generateAndUploadImage(
      ai, bucket, r2PublicUrl, row.slug, row.cluster, row.title, CLUSTER_TAG[row.cluster],
    );
    if (url) imageUrl = url;
  }

  // Build frontmatter
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
    image:    imageUrl,
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