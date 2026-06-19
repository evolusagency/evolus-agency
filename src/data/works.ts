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
  slug: 'plan',   // ← même nom que le dossier
  title: 'Avions. Le guide du débutant.',
  titleEn: 'Airplanes. The beginners guide.',
  description: 'Une implementation de défilement avec des animations fluides.',
  descriptionEn: 'An implementation of  scrolling with smooth animations.',
  tags: ['UI', 'JS', 'Animation', 'CSS', 'GSAP'],
  height: 600,
},
 
  // Add more works below by copying the pattern above.
  // Don't forget to create the matching folder in /public/works/<slug>/index.html


{
  slug: 'homepagehero',   // ← même nom que le dossier
  title: 'Page d’accueil animée',
  titleEn: 'Animated landing page',
  description: 'Une page d’accueil animée avec des effets visuels attrayants.',
  descriptionEn: 'An animated landing page with attractive visual effects.',
  tags: ['UI', 'JS', 'Animation', 'CSS', 'GSAP', 'Scroll Velocity', 'Interactive Systems'],
  height: 600,
},
{
  slug: 'ecom-website',   // ← même nom que le dossier
  title: 'La dernière technologie gsap',
  titleEn: 'latest gsap technology',
  description: 'Un site web utilisant la dernière technologie GSAP.',
  descriptionEn: 'A website using the latest GSAP technology.',
  tags: ['UI', 'JS', 'Animation', 'CSS', 'GSAP'],
  height: 600,
},
{
  slug: 'Product-page',   // ← même nom que le dossier
  title: 'Page de produit animée',
  titleEn: 'Animated Product Page',
  description: 'Une page de produit animée avec des transitions fluides et des effets visuels attrayants.',
  descriptionEn: 'An animated product page with smooth transitions and attractive visual effects.',
  tags: ['UI', 'JS', 'Animation', 'CSS', 'GSAP'],
  height: 600,
},
{
  slug: 'agency-landing-page',   // ← même nom que le dossier
  title: 'Page d’agence animée',
  titleEn: 'Animated agency landing page ',
  description: 'Une page d’agence animée avec des transitions fluides et des effets visuels attrayants.',
  descriptionEn: 'An animated agency landing page with smooth transitions and attractive visual effects.',
  tags: ['UI', 'JS', 'Animation', 'CSS', 'GSAP'],
  height: 600,
},
{
  slug: 'interactive-gradient',  
  title: 'Gradient liquide interactif',
  titleEn: 'Interactive Liquid Gradient',
  description: 'Un gradient liquide interactif avec effets de survol.',
  descriptionEn: 'An interactive liquid gradient with hover effects.',
  tags: ['UI', 'JS', 'Animation', 'CSS', 'GSAP'],
  height: 600,
},
{
  slug: 'cars',
  title: 'Expérience de concession automobile premium',
  titleEn: 'Premium Car Dealership Experience',
  description: 'Showroom automobile premium avec vente et location de véhicules.',
  descriptionEn: 'Premium automotive showroom with vehicle sales and rentals.',
  tags: ['Automotive', 'Landing Page', 'GSAP', 'UI'],
  height: 900,
},
{
  slug: 'tesla',   // ← même nom que le dossier
  title: 'Concept de concession Tesla interactive',
  titleEn: 'Interactive Tesla Dealership Concept',
  description: 'Une scène parallax avec des éléments interactifs.',
  descriptionEn: 'An interactive parallax scene.',
  tags: ['UI', 'JS', 'Animation', 'CSS', 'GSAP', 'Scroll Velocity', 'Interactive Systems'],
  height: 600,
},
{
  slug: 'canada',   // ← même nom que le dossier
  title: 'Éléments interactifs theme Canada',
  titleEn: 'Canada interactive elements',
  description: 'Une scène parallax avec des éléments interactifs sur le thème du Canada.',
  descriptionEn: 'An interactive parallax scene featuring Canadian elements.',
  tags: ['UI', 'JS', 'Animation', 'CSS', 'GSAP', 'Scroll Velocity', 'Interactive Systems'],
  height: 600,
},
{
  slug: 'emoji',   // ← même nom que le dossier
  title: 'Éléments Emoji interactifs',
  titleEn: 'Interactive Emoji elements',
  description: 'Une scène interactive avec des éléments Emoji.',
  descriptionEn: 'An interactive scene featuring Emoji elements.',
  tags: ['UI', 'JS', 'Animation', 'CSS', 'GSAP', 'emoji'],
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

{
  slug: 'infinite-scrolling',   // ← même nom que le dossier
  title: 'Défilement infini',
  titleEn: 'Infinite Scrolling',
  description: 'Une implementation de défilement infini avec des animations fluides.',
  descriptionEn: 'An implementation of infinite scrolling with smooth animations.',
  tags: ['UI', 'JS', 'Animation', 'CSS', 'GSAP'],
  height: 600,
},
{
  slug: 'prestige-montreal',   // ← même nom que le dossier
  title: 'Prestige Montréal',
  titleEn: 'Prestige Montreal',
  description: 'Une scène interactive mettant en valeur les éléments du prestigieux quartier de Montréal.',
  descriptionEn: 'An interactive scene highlighting the elements of Montreal\'s prestigious district.',
  tags: ['UI', 'JS', 'Animation', 'CSS', 'GSAP'],
  height: 600,
},
{
  slug: 'realestate',   // ← même nom que le dossier
  title: 'Real estate Montréal',
  titleEn: 'Real estate Montreal',
  description: 'Un site interactive mettant en valeur les éléments du marché immobilier de Montréal.',
  descriptionEn: 'An interactive site highlighting the elements of Montreal\'s real estate market.',
  tags: ['UI', 'JS', 'Animation', 'CSS', 'GSAP'],
  height: 600,
},
];
