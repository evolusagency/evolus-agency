// src/data/works.ts
// Add a new work by adding one object to this array.
// "src" must point to a static HTML file under /public/works/<slug>/index.html
// That file is a self-hosted version of what would've been a CodePen —
// just paste the pen's HTML/CSS/JS into one file (see /public/works/_template/index.html).

export interface WorkItem {
  slug: string;          // unique id, used for the iframe src path
  title: string;         // FR title
  titleEn: string;       // EN title
  description: string;   // FR description
  descriptionEn: string; // EN description
  tags?: string[];       // optional small labels, e.g. ["Animation", "CSS"]
  height?: number;       // iframe height in px, default 600
}

export const works: WorkItem[] = [
  {
  slug: 'explore-further-parallax',   // ← même nom que le dossier
  title: 'parallax scene',
  titleEn: 'parallax scene',
  description: 'Scroll parallax scene',
  descriptionEn: 'An interactive parallax scene',
  tags: ['UI', 'JS'],
  height: 600,
},
  {
    slug: 'hero-animation',
    title: 'Animation de Hero',
    titleEn: 'Hero Animation',
    description: 'Une animation d’entrée fluide pour une section hero, pensée pour capter l’attention dès le chargement.',
    descriptionEn: 'A smooth entrance animation for a hero section, built to capture attention on load.',
    tags: ['Animation', 'CSS'],
    height: 600,
  },
  {
    slug: 'pricing-cards',
    title: 'Cartes de tarification',
    titleEn: 'Pricing Cards',
    description: 'Des cartes de tarification interactives avec effet de survol et mise en avant du plan recommandé.',
    descriptionEn: 'Interactive pricing cards with hover effects and a highlighted recommended plan.',
    tags: ['UI', 'Layout'],
    height: 600,
  },
  // Add more works below by copying the pattern above.
  // Don't forget to create the matching folder in /public/works/<slug>/index.html


{
  slug: 'homepagehero',   // ← même nom que le dossier
  title: 'Formulaire de contact',
  titleEn: 'Contact Form',
  description: 'Un formulaire animé avec validation en temps réel.',
  descriptionEn: 'An animated form with real-time validation.',
  tags: ['UI', 'JS'],
  height: 600,
},
{
  slug: 'interactive-gradient',   // ← même nom que le dossier
  title: 'Gradient liquide interactif',
  titleEn: 'Interactive Liquid Gradient',
  description: 'Un gradient liquide interactif avec effets de survol.',
  descriptionEn: 'An interactive liquid gradient with hover effects.',
  tags: ['UI', 'JS'],
  height: 600,
},
{
  slug: 'cars',
  title: 'Car Dealership',
  titleEn: 'Premium Car Dealership Experience',
  description: 'Interactive luxury car dealership landing page.',
  descriptionEn: 'Premium automotive showroom with vehicle sales and rentals.',
  tags: ['Automotive', 'Landing Page', 'GSAP', 'UI'],
  height: 900,
},
{
  slug: 'tesla',   // ← même nom que le dossier
  title: 'Tesla',
  titleEn: 'Tesla interactive elements',
  description: 'A parallax scene with interactive elements.',
  descriptionEn: 'An interactive parallax scene.',
  tags: ['UI', 'JS'],
  height: 600,
},
{
  slug: 'canada',   // ← même nom que le dossier
  title: 'Canada',
  titleEn: 'Canada interactive elements',
  description: 'A parallax scene with interactive elements.',
  descriptionEn: 'An interactive parallax scene.',
  tags: ['UI', 'JS'],
  height: 600,
},
];
