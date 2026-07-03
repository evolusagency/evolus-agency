// src/data/translations.ts
// ─────────────────────────────────────────────────────────────
// Evolus — i18n data layer
// Supports: fr | en
// Usage: import { translations } from '../data/translations';
// ─────────────────────────────────────────────────────────────

export type Lang = 'fr' | 'en';

export interface Translations {
  meta: {
    title: string;
    description: string;
  };
  nav: {
    services: string;
    process:  string;
    works:    string;
    blog:     string;
    contact:  string;
    cta:      string;
  };
  hero: {
    tag:       string;
    line1:     string;
    line2em:   string;
    line2pre:  string;
    line3:     string;
    desc:      string;
    cta:       string;
    cta2:      string;
    blog:      string;
    stat1n:    string;
    stat1l:    string;
    stat2n:    string;
    stat2l:    string;
    stat3n:    string;
    stat3l:    string;
    // aria-label strings for elements that previously had hardcoded French
    ariaWorks: string;
    ariaStat1: string;
    ariaStat2: string;
    ariaStat3: string;
  };
  services: {
    label:  string;
    title:  string;
    intro:  string;
    items: Array<{
      num:   string;
      name:  string;
      desc:  string;
    }>;
  };
  process: {
    label: string;
    title: string;
    steps: Array<{
      num:  string;
      name: string;
      desc: string;
      week: string;
    }>;
  };
  results: {
    label: string;
    title: string;
    items: Array<{
      value: string;
      label: string;
      desc:  string;
      featured?: boolean;
    }>;
    // additional UI strings used by Results.astro that were previously hardcoded French
    ui: {
      ariaFeatured:     string;
      ariaDelay:        string;
      ariaClients:      string;
      ariaRoi:          string;
      btnCases:         string;
      btnStart:         string;
      btnJoin:          string;
      btnCalc:          string;
      roiInvest:        string;
      roiReturn:        string;
      tickerLabel:      string;
      arcNote:          string;
      btn2Prefix:       string; // countdown prefix, e.g. "J-" / "D-"
      btn2Done:         string;
      btn3Added:        string;
      btn4Calculating:  string;
    };
  };
  // Contact form (Footer.astro) — was referenced via data-i18n but had no
  // matching keys at all, plus a few aria-labels and validation messages
  // that were hardcoded in French directly in the markup/JS.
  form: {
    nameLabel:         string;
    namePlaceholder:   string;
    emailLabel:        string;
    emailPlaceholder:  string;
    msgLabel:          string;
    messagePlaceholder:string;
    submit:            string;
    mention:           string;
    success:           string;
    error:             string;
    ariaForm:          string;
    ariaHome:          string;
    errNameRequired:   string;
    errEmailInvalid:   string;
    errMsgShort:       string;
  };
  testimonials: {
    label: string;
    title: string;
    items: Array<{
      text:    string;
      name:    string;
      company: string;
      initials:string;
    }>;
  };
  cta: {
    label:     string;
    title:     string;
    desc:      string;
    btn:       string;
    mailLabel: string;
    mail:      string;
  };
  footer: {
    copy: string;
    links: Array<{ label: string; href: string }>;
  };
  marquee: string[];
}

export const translations: Record<Lang, Translations> = {
  fr: {
    meta: {
      title:       'Evolus Agency — Sites web sur-mesure, Content & SEO',
      description: 'Evolus Agency crée des sites web sur-mesure, du contenu qui convertit et des stratégies de croissance pour tripler vos leads en 90 jours.',
    },
    nav: {
      services: 'Services',
      process:  'Process',
      works:    'Réalisations',
      blog:     'Blog',
      contact:  'Contact',
      cta:      'Démarrer →',
    },
    hero: {
      tag:      'Evolus Agency',
      line1:    'On crée',
      line2pre: 'votre',
      line2em:  'présence',
      line3:    'digitale.',
      desc:     'Sites web sur-mesure, contenu qui convertit, et stratégies de croissance.',
      cta:      'Lancer mon projet',
      cta2:     'Voir nos projets',
      blog:     'Voir le blog',
      stat1n:   '120+',
      stat1l:   'Sites livrés',
      stat2n:   '3x',
      stat2l:   'ROI moyen',
      stat3n:   '98%',
      stat3l:   'Satisfaction',
      ariaWorks: 'Voir nos projets',
      ariaStat1: '120 sites livrés',
      ariaStat2: 'ROI moyen 3x',
      ariaStat3: '98% satisfaction',
    },
    services: {
      label: "Ce qu'on fait",
      title: 'Trois leviers.<br>Un seul objectif.',
      intro: 'On construit des machines à croissance, pas juste des sites web.',
      items: [
        { num: '01', name: 'Création web',      desc: 'Sites vitrines, e-commerce et landing pages pensés pour convertir.' },
        { num: '02', name: 'Refonte & scaling', desc: 'Votre site sous-performe ? On diagnostique, restructure et optimise.' },
        { num: '03', name: 'Content & leads',   desc: 'Articles SEO, copywriting et tunnels de vente qui convertissent.' },
      ],
    },
    process: {
      label: 'Comment ça marche',
      title: 'Un process clair,<br>des résultats mesurables.',
      steps: [
        { num: '01', name: 'Audit & stratégie',    desc: 'Analyse de votre marché et feuille de route sur-mesure.',   week: 'Semaine 1' },
        { num: '02', name: 'Design & UX',          desc: 'Maquettes haute-fidélité, UX pensée pour la conversion.',   week: 'Sem. 2–3'  },
        { num: '03', name: 'Développement',        desc: 'Code propre, performances max, CMS simple.',                week: 'Sem. 3–5'  },
        { num: '04', name: 'Contenu & SEO',        desc: "Textes optimisés, structure qui plaît à Google.",            week: 'Continu'   },
        { num: '05', name: 'Lancement & croissance',desc: 'Go-live, KPIs, itérations. On scale ensemble.',            week: 'Ongoing'   },
      ],
    },
    results: {
      label: 'Nos chiffres',
      title: 'Des résultats<br>qui parlent.',
      items: [
        { value: '+340%', label: 'de trafic organique moyen', desc: 'Le trafic triple en 6 mois en moyenne.', featured: true },
        { value: '21j',   label: 'Délai moyen',               desc: 'Rapidité sans compromis.' },
        { value: '120+',  label: 'Clients',                   desc: 'De la startup à la PME.' },
        { value: '3x',    label: 'ROI moyen',                 desc: 'Chaque euro en génère 3.' },
      ],
      ui: {
        ariaFeatured:    '+340% trafic organique',
        ariaDelay:       'Délai moyen 21 jours',
        ariaClients:     '120 clients accompagnés',
        ariaRoi:         'ROI moyen 3x',
        btnCases:        'Voir les cas clients',
        btnStart:        'Démarrer mon projet',
        btnJoin:         'Rejoindre la liste',
        btnCalc:         'Calculer mon ROI',
        roiInvest:       'Invest.',
        roiReturn:       'Retour',
        tickerLabel:     'client actuel',
        arcNote:         'vs 45j marché',
        btn2Prefix:      'J-',
        btn2Done:        'Projet lancé !',
        btn3Added:       'Ajouté !',
        btn4Calculating: 'Calcul...',
      },
    },
    form: {
      nameLabel:          'Nom',
      namePlaceholder:    'Votre nom',
      emailLabel:         'Email',
      emailPlaceholder:   'vous@exemple.com',
      msgLabel:           'Message',
      messagePlaceholder: 'Parlez-nous de votre projet...',
      submit:             'Envoyer le message',
      mention:            'Réponse sous 24h · Zéro spam',
      success:            'Message envoyé ! On revient vers vous sous 24h.',
      error:              'Une erreur est survenue. Réessayez ou écrivez-nous directement.',
      ariaForm:           'Formulaire de contact',
      ariaHome:           'Evolus — Accueil',
      errNameRequired:    'Votre nom est requis.',
      errEmailInvalid:    'Email invalide.',
      errMsgShort:        'Message trop court (min. 10 caractères).',
    },
    testimonials: {
      label: 'Ils nous font confiance',
      title: 'Ce que disent<br>nos clients.',
      items: [
        { text: 'Evolus a transformé notre site en outil de vente. En 3 mois, nos devis ont doublé.', name: 'Karim M.',    company: 'CEO, ArchiDesign Studio', initials: 'KM' },
        { text: "Le contenu génère des leads depuis 6 mois sans qu'on lève le petit doigt.",          name: 'Sara B.',     company: 'Directrice, FinConsult',  initials: 'SB' },
        { text: '+280% de trafic en 4 mois. Ils ont compris notre secteur mieux que personne.',       name: 'Youssef A.', company: 'Fondateur, Medic360',     initials: 'YA' },
      ],
    },
    cta: {
      label:     "Passons à l'action",
      title:     'Votre site mérite<br>mieux qu\'hier.',
      desc:      'Discutons de votre projet. Audit gratuit, stratégie claire, résultats mesurables.',
      btn:       'Prendre contact',
      mailLabel: 'Ou écrivez-nous :',
      mail:      'contact@evolus.agency',
    },
    footer: {
      copy:  '© 2025 Evolus Agency',
      links: [
        { label: 'Services', href: '#services' },
        { label: 'Blog',     href: '/blog' },
        { label: 'Contact',  href: 'mailto:contact@evolus.agency' },
      ],
    },
    marquee: ['Création de sites web','Refonte & optimisation','Content marketing','Génération de leads','SEO & Visibilité','Landing pages','Copywriting','Stratégie digitale'],
  },

  en: {
    meta: {
      title:       'Evolus Agency — Custom Websites, Content & SEO',
      description: 'Evolus Agency builds custom websites, converting content and growth strategies to triple your leads in 90 days.',
    },
    nav: {
      services: 'Services',
      process:  'Process',
      works:    'Our Work',
      blog:     'Blog',
      contact:  'Contact',
      cta:      'Get started →',
    },
    hero: {
      tag:      'Evolus Agency',
      line1:    'We build',
      line2pre: 'your',
      line2em:  'digital',
      line3:    'presence.',
      desc:     'Custom websites, converting content, and growth strategies.',
      cta:      'Start my project',
      cta2:     'See our work',
      blog:     'See the blog',
      stat1n:   '120+',
      stat1l:   'Sites delivered',
      stat2n:   '3x',
      stat2l:   'Avg. ROI',
      stat3n:   '98%',
      stat3l:   'Satisfaction',
      ariaWorks: 'See our work',
      ariaStat1: '120 sites delivered',
      ariaStat2: 'Average ROI 3x',
      ariaStat3: '98% satisfaction',
    },
    services: {
      label: 'What we do',
      title: 'Three levers.<br>One goal.',
      intro: 'We engineer growth machines, not just websites.',
      items: [
        { num: '01', name: 'Website creation',    desc: 'Landing pages and e-commerce built to convert.' },
        { num: '02', name: 'Redesign & scaling',  desc: 'We diagnose, restructure and optimize.' },
        { num: '03', name: 'Content & leads',     desc: 'SEO articles and sales funnels that convert.' },
      ],
    },
    process: {
      label: 'How it works',
      title: 'A clear process,<br>measurable results.',
      steps: [
        { num: '01', name: 'Audit & strategy', desc: 'Market analysis and custom roadmap.',       week: 'Week 1'   },
        { num: '02', name: 'Design & UX',      desc: 'High-fidelity mockups, conversion UX.',    week: 'Wk. 2–3'  },
        { num: '03', name: 'Development',      desc: 'Clean code, max performance, easy CMS.',   week: 'Wk. 3–5'  },
        { num: '04', name: 'Content & SEO',    desc: 'Optimized copy, Google-friendly structure.',week: 'Ongoing'  },
        { num: '05', name: 'Launch & growth',  desc: 'Go-live, KPIs, iterations. We scale together.', week: 'Ongoing' },
      ],
    },
    results: {
      label: 'Our numbers',
      title: 'Results<br>that speak.',
      items: [
        { value: '+340%', label: 'avg. organic traffic', desc: 'Traffic triples in 6 months on average.', featured: true },
        { value: '21d',   label: 'Avg. delivery',        desc: 'Speed without compromise.' },
        { value: '120+',  label: 'Clients',              desc: 'From startup to SME.' },
        { value: '3x',    label: 'Avg. ROI',             desc: 'Every dollar returns three.' },
      ],
      ui: {
        ariaFeatured:    '+340% organic traffic',
        ariaDelay:       'Average delivery time 21 days',
        ariaClients:     '120 clients supported',
        ariaRoi:         'Average ROI 3x',
        btnCases:        'See client cases',
        btnStart:        'Start my project',
        btnJoin:         'Join the waitlist',
        btnCalc:         'Calculate my ROI',
        roiInvest:       'Invest.',
        roiReturn:       'Return',
        tickerLabel:     'current client',
        arcNote:         'vs 45d market avg.',
        btn2Prefix:      'D-',
        btn2Done:        'Project launched!',
        btn3Added:       'Added!',
        btn4Calculating: 'Calculating...',
      },
    },
    form: {
      nameLabel:          'Name',
      namePlaceholder:    'Your name',
      emailLabel:         'Email',
      emailPlaceholder:   'you@example.com',
      msgLabel:           'Message',
      messagePlaceholder: 'Tell us about your project...',
      submit:             'Send message',
      mention:            'Reply within 24h · Zero spam',
      success:            "Message sent! We'll get back to you within 24h.",
      error:              'Something went wrong. Please try again or email us directly.',
      ariaForm:           'Contact form',
      ariaHome:           'Evolus — Home',
      errNameRequired:    'Your name is required.',
      errEmailInvalid:    'Invalid email address.',
      errMsgShort:        'Message too short (min. 10 characters).',
    },
    testimonials: {
      label: 'Trusted by',
      title: "What our clients<br>say.",
      items: [
        { text: 'Evolus turned our site into a sales tool. Quotes doubled in 3 months.', name: 'Karim M.',    company: 'CEO, ArchiDesign Studio', initials: 'KM' },
        { text: 'Content has been generating leads for 6 months without any effort.',     name: 'Sara B.',     company: 'Director, FinConsult',    initials: 'SB' },
        { text: '+280% traffic in 4 months. They understood our sector better than anyone.', name: 'Youssef A.', company: 'Founder, Medic360',    initials: 'YA' },
      ],
    },
    cta: {
      label:     "Let's take action",
      title:     'Your site deserves<br>better.',
      desc:      'Free audit, clear strategy, measurable results.',
      btn:       'Get in touch',
      mailLabel: 'Or email us:',
      mail:      'contact@evolus.agency',
    },
    footer: {
      copy:  '© 2025 Evolus Agency',
      links: [
        { label: 'Services', href: '#services' },
        { label: 'Blog',     href: '/blog' },
        { label: 'Contact',  href: 'mailto:contact@evolus.agency' },
      ],
    },
    marquee: ['Website creation','Redesign & optimization','Content marketing','Lead generation','SEO & Visibility','Landing pages','Copywriting','Digital strategy'],
  },
};

export const frCountries = [
  'fr','be','ch','ca','lu','mc','sn','ci','cm','mg','dz','ma','tn',
  'bf','bj','cd','cg','ga','gn','ml','ne','rw','td','tg',
];