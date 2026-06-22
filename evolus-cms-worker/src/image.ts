/**
 * image.ts
 * Generates a blog cover image via Cloudflare Workers AI (Flux),
 * uploads it to R2, and returns the public URL.
 */

import type { Ai, R2Bucket } from '@cloudflare/workers-types';

const IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';

// ─────────────────────────────────────────────────────────────────────────────
// Visual concept registry
// Each entry: scene (narrative), mood (lighting), anchor (hero element)
// ─────────────────────────────────────────────────────────────────────────────
interface VisualConcept {
  scene:  string;
  mood:   string;
  anchor: string;
}

const VISUAL_CONCEPTS: Record<string, VisualConcept> = {
  'rebranding': {
    scene:  'a chrysalis cracking open as a monarch butterfly unfolds its wings, surrounded by scattered brand identity cards and color-swatch sheets mid-transformation',
    mood:   'dawn light, soft golden backlight, sense of emergence and renewal',
    anchor: 'the butterfly at the precise moment of opening its wings',
  },
  'branding': {
    scene:  "a craftsman's hand holding a precision compass over an open brand book, color swatches and typographic specimens arranged like a constellation around it",
    mood:   'warm atelier light, oak desk surface, timeless craftsmanship feel',
    anchor: 'the compass point touching the brand book center',
  },
  'seo': {
    scene:  'a giant illuminated magnifying glass hovering above an aerial city grid, search-result pins rising from the streets at different heights like a skyline of rankings',
    mood:   'cool blue night atmosphere, city lights, neon glow from below',
    anchor: 'the magnifying glass catching a beam of focused light',
  },
  'content-marketing': {
    scene:  'a hardcover book whose pages dissolve into a powerful broadcast signal wave radiating outward, editorial papers and strategy boards on the desk below',
    mood:   'warm editorial studio light, paper textures, intellectual atmosphere',
    anchor: 'the book-to-signal transformation at the spine',
  },
  'email-marketing': {
    scene:  'hundreds of sealed wax-stamped envelopes streaming through a luminous digital corridor, a single one glowing open at the vanishing point',
    mood:   'deep navy tunnel, warm amber glow on the open envelope, motion blur on stream',
    anchor: 'the single glowing open envelope at the focal center',
  },
  'social-media': {
    scene:  'an aerial view of interconnected human hands forming a network, each connection pulsing with a soft light thread, speech-bubble silhouettes floating above',
    mood:   'bright, optimistic, flat-top diffused daylight',
    anchor: 'the central connection node where the most threads converge',
  },
  'automation': {
    scene:  'a perfectly synchronized choreography of translucent mechanical arms and glowing circuit pathways assembling identical objects on a seamless white conveyor',
    mood:   'clean industrial white, electric blue accent lights on circuits, clinical precision',
    anchor: 'the moment three arms converge simultaneously at the assembly point',
  },
  'data-analytics': {
    scene:  "a detective's investigation board pinned with data cards and metric graphs, connecting threads of light forming patterns, a magnifying glass resting on a rising trend",
    mood:   'moody low-key studio light, amber accent, intellectual tension',
    anchor: 'the central intersection point where all light-threads meet',
  },
  'ia-generative': {
    scene:  'a translucent human brain made of interconnected light nodes floating above an open laptop, synaptic pulses traveling the connections in real time',
    mood:   'deep space dark background, electric violet and blue pulses, futuristic calm',
    anchor: 'the densest cluster of synaptic nodes at the brain center',
  },
  'ux-ui': {
    scene:  'a giant translucent smartphone frame suspended in mid-air, wireframe grids and component blueprints floating around it like architectural drawings',
    mood:   'clean studio white, cool blue technical light, precision and clarity',
    anchor: 'the phone frame at the center with a glowing interface grid',
  },
  'paid-ads': {
    scene:  'a targeting reticle locking onto a glowing bullseye surrounded by floating audience silhouettes, currency symbols dissolving into conversion sparks',
    mood:   'dark dramatic background, laser-red targeting light, sharp focus',
    anchor: 'the reticle at the precise moment of locking the target',
  },
  'cro': {
    scene:  'a monumental funnel suspended in mid-air, silhouetted figures entering the wide top and a single illuminated figure emerging confidently at the base',
    mood:   'cinematic wide-angle, dramatic backlighting from below the funnel',
    anchor: 'the single figure emerging at the bottom of the funnel',
  },
  'lead-generation': {
    scene:  'a giant magnet drawing glowing human silhouettes along curved magnetic field lines toward a central illuminated platform',
    mood:   'deep navy background, electric blue magnetic arcs, sense of attraction and pull',
    anchor: 'the magnet apex where the field lines are most concentrated',
  },
  'sales-enablement': {
    scene:  'a winding illuminated road cutting through a dark landscape, milestone markers glowing at each curve, a distant city skyline representing the closed deal',
    mood:   'night road cinematic, warm milestone glows, sense of journey and destination',
    anchor: 'the brightest milestone marker in the middle distance',
  },
  'customer-experience': {
    scene:  'a star-shaped journey map rendered in glowing lines, human figures at each touchpoint radiating warmth, the final touchpoint the brightest of all',
    mood:   'warm amber and white glow, human-centered, optimistic',
    anchor: 'the final glowing touchpoint at the journey end',
  },
  'video-marketing': {
    scene:  'a cinema clapperboard opening to reveal a glowing screen inside, light beams projecting an audience of silhouettes in a dark studio',
    mood:   'cinematic dark studio, projector beam light, creative energy',
    anchor: 'the clapperboard hinge releasing the beam of light',
  },
  'influence-b2b': {
    scene:  'a single illuminated figure standing on an elevated platform, concentric rings of human silhouettes extending outward, each ring slightly dimmer than the last',
    mood:   'dramatic top-down spotlight, crowd in soft ambient light below',
    anchor: 'the central figure catching the full beam of the spotlight',
  },
  'ecommerce': {
    scene:  'an isometric warehouse of glowing product boxes assembling themselves onto a conveyor that feeds directly into a smartphone screen',
    mood:   'clean white isometric render, warm amber product glows, crisp shadows',
    anchor: 'the moment a box crosses from physical space into the phone screen',
  },
  'developpement-web': {
    scene:  'streams of luminous code characters flowing through translucent architectural blueprints that morph into a website wireframe structure',
    mood:   'dark terminal background, matrix-green and electric-blue code streams',
    anchor: 'the wireframe structure materializing from the code streams',
  },
  'cybersecurite': {
    scene:  'a giant glowing padlock suspended over a city grid, shield force fields deflecting incoming red threat vectors from all directions',
    mood:   'dramatic dark blue background, threat vectors in red, shield in electric blue',
    anchor: 'the padlock at the apex with the shield force field at peak intensity',
  },
  'strategie-digitale': {
    scene:  'a glass chess board mid-game viewed from above, one hand hovering a queen piece above a decisive square, long dramatic shadows across the board',
    mood:   'low-key directional side lighting, dark oak surface, tension and calculation',
    anchor: 'the queen piece suspended just before placement',
  },
  'product-marketing': {
    scene:  'a product emerging from a chrysalis-like packaging onto a spotlit pedestal, surrounded by floating customer persona cards orbiting it like satellites',
    mood:   'theatrical product reveal lighting, deep shadow, hero product glow',
    anchor: 'the product on its pedestal catching the full spotlight',
  },
  'fondamentaux-business': {
    scene:  'a monumental balance scale in perfect equilibrium, one pan holding stacked gold ingots, the other a glowing upward trend graph etched in light',
    mood:   'clean white marble environment, directional side light, authority and precision',
    anchor: 'the pivot point of the scale in perfect balance',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Synonym map — French terms and variants → registry keys
// ─────────────────────────────────────────────────────────────────────────────
const SYNONYMS: Record<string, string> = {
  'référencement': 'seo', 'google': 'seo', 'ranking': 'seo', 'serp': 'seo',
  'contenu': 'content-marketing', 'content': 'content-marketing', 'blog': 'content-marketing', 'rédaction': 'content-marketing',
  'emailing': 'email-marketing', 'newsletter': 'email-marketing', 'email': 'email-marketing',
  'réseaux sociaux': 'social-media', 'linkedin': 'social-media', 'instagram': 'social-media', 'tiktok': 'social-media',
  'automatisation': 'automation', 'workflow': 'automation', 'zapier': 'automation', 'make': 'automation',
  'données': 'data-analytics', 'analytics': 'data-analytics', 'kpi': 'data-analytics', 'dashboard': 'data-analytics',
  'ia': 'ia-generative', 'intelligence artificielle': 'ia-generative', 'llm': 'ia-generative', 'gpt': 'ia-generative', 'machine learning': 'ia-generative',
  'ux': 'ux-ui', 'ui': 'ux-ui', 'interface': 'ux-ui', 'design': 'ux-ui', 'wireframe': 'ux-ui',
  'publicité': 'paid-ads', 'ads': 'paid-ads', 'google ads': 'paid-ads', 'meta ads': 'paid-ads',
  'conversion': 'cro', 'taux de conversion': 'cro', 'optimisation': 'cro', 'a/b test': 'cro',
  'marque': 'branding', 'logo': 'branding', 'charte': 'branding', 'identité': 'branding',
  'rebrand': 'rebranding', 'rebranding': 'rebranding', 'repositionnement': 'rebranding',
  'leads': 'lead-generation', 'prospection': 'lead-generation', 'acquisition': 'lead-generation',
  'vente': 'sales-enablement', 'commercial': 'sales-enablement', 'sales': 'sales-enablement',
  'client': 'customer-experience', 'expérience': 'customer-experience', 'crm': 'customer-experience',
  'vidéo': 'video-marketing', 'youtube': 'video-marketing', 'reels': 'video-marketing',
  'influenceur': 'influence-b2b', 'influence': 'influence-b2b', 'thought leader': 'influence-b2b',
  'boutique': 'ecommerce', 'shop': 'ecommerce', 'shopify': 'ecommerce', 'woocommerce': 'ecommerce',
  'développement': 'developpement-web', 'dev': 'developpement-web', 'code': 'developpement-web', 'astro': 'developpement-web',
  'sécurité': 'cybersecurite', 'cyber': 'cybersecurite', 'hack': 'cybersecurite', 'phishing': 'cybersecurite',
  'stratégie': 'strategie-digitale', 'roadmap': 'strategie-digitale', 'planification': 'strategie-digitale',
  'produit': 'product-marketing', 'lancement': 'product-marketing', 'go-to-market': 'product-marketing',
  'fondamentaux': 'fondamentaux-business', 'business': 'fondamentaux-business', 'gestion': 'fondamentaux-business',
};

function matchConcept(title: string, cluster: string): VisualConcept | null {
  const corpus = `${title} ${cluster}`.toLowerCase();

  // 1. Direct cluster key match (most reliable)
  if (VISUAL_CONCEPTS[cluster]) return VISUAL_CONCEPTS[cluster];

  // 2. Synonym scan
  for (const [term, key] of Object.entries(SYNONYMS)) {
    if (corpus.includes(term)) return VISUAL_CONCEPTS[key] ?? null;
  }

  // 3. Partial key match
  for (const key of Object.keys(VISUAL_CONCEPTS)) {
    if (corpus.includes(key)) return VISUAL_CONCEPTS[key];
  }

  return null;
}

function buildImagePrompt(title: string, cluster: string): string {
  const concept = matchConcept(title, cluster);

  const scene  = concept?.scene  ?? `a powerful symbolic tableau representing "${title}", a single dominant metaphorical object surrounded by carefully chosen supporting elements`;
  const mood   = concept?.mood   ?? 'cinematic editorial lighting, professional corporate atmosphere';
  const anchor = concept?.anchor ?? 'the single most symbolically powerful object related to the topic';

  return [
    `Professional editorial header image for a B2B digital marketing blog. Topic: "${title}".`,
    `Scene: ${scene}.`,
    `Hero element: ${anchor} — sharpest and clearest element in the frame, everything else is secondary.`,
    `Lighting and mood: ${mood}.`,
    `Style: premium editorial CGI render or high-end photography. Photorealistic materials, physically accurate shadows, cinematic depth of field. No illustration, no flat design, no cartoon.`,
    `Color palette: deep navy #0A1628 dominant, electric blue #2563EB accent, clean white highlights, warm gold #D4A843 used sparingly. Desaturated midtones.`,
    `Composition: 16:9 landscape. Rule of thirds. Hero at right-third intersection. Left third as negative space for text overlay. Strong leading lines toward the anchor.`,
    `ABSOLUTE PROHIBITIONS — any violation makes the image unusable:`,
    `NO text, letters, words, numbers, digits, or typography anywhere — not on objects, screens, books, signs, clothing, or backgrounds.`,
    `NO logos, watermarks, UI chrome, icons, or captions.`,
    `NO generic stock-photo clichés: no isolated handshakes on white, no floating icons, no random geometric blobs.`,
    `Output: ultra-high resolution, 4K detail, editorial standard suitable for a professional B2B publication.`,
  ].join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export async function generateAndUploadImage(
  ai:            Ai,
  bucket:        R2Bucket,
  publicBaseUrl: string,
  slug:          string,
  cluster:       string,
  title:         string,
): Promise<string | null> {
  try {
    const prompt = buildImagePrompt(title, cluster);

    const response = await (ai as any).run(IMAGE_MODEL, {
      prompt,
      steps: 8, // flux-1-schnell: 8 steps = best quality within the model's range
    }) as { image?: string } | ReadableStream;

    let imageBytes: Uint8Array;

    if (response instanceof ReadableStream) {
      const chunks: Uint8Array[] = [];
      const reader = response.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      imageBytes = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) { imageBytes.set(chunk, offset); offset += chunk.length; }
    } else if (response?.image) {
      const binary = atob(response.image);
      imageBytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    } else {
      console.warn('[Image] Unexpected AI response shape, skipping.');
      return null;
    }

    const key = `${cluster}/${slug}.png`;
    await bucket.put(key, imageBytes, { httpMetadata: { contentType: 'image/png' } });

    const publicUrl = `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
    console.log(`[Image] Uploaded: ${key}`);
    return publicUrl;

  } catch (err) {
    console.warn(`[Image] Generation/upload failed for "${slug}":`, err);
    return null;
  }
}