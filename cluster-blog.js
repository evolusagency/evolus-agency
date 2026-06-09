#!/usr/bin/env node

/**
 * cluster-blog.js — Astro Content Collections
 * Lance : node cluster-blog.js depuis la racine du projet
 */

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const BLOG_DIR = path.join(__dirname, "src", "content", "blog");

// Clusters avec mots-clés pondérés — correspond au z.enum() Astro
const CLUSTERS = [
  {
    name: "seo",
    keywords: [
      ["seo", 5], ["référencement", 5], ["serp", 5], ["backlink", 5],
      ["indexation", 5], ["crawl", 5], ["sitemap", 4], ["rank", 4],
      ["trafic organique", 4], ["mot-clé", 3], ["mots-clés", 3],
      ["position google", 3], ["google search", 3], ["requête", 2],
    ],
  },
  {
    name: "marketing",
    keywords: [
      ["copywriting", 5], ["social selling", 5], ["linkedin", 4],
      ["storytelling", 4], ["persona", 4], ["editorial", 4],
      ["pilier de contenu", 4], ["inbound", 3], ["outbound", 3],
      ["brand", 3], ["marque", 3], ["stratégie de contenu", 3],
      ["génération de leads", 3], ["acquisition", 2], ["prospect", 2],
      ["contenu", 1], ["rédaction", 1],
    ],
  },
  {
    name: "automation",
    keywords: [
      ["automation", 5], ["automatisation", 5], ["nurturing", 5],
      ["workflow", 5], ["drip", 5], ["séquence", 4], ["séquençage", 4],
      ["hubspot", 4], ["salesforce", 4], ["crm", 4], ["trigger", 4],
      ["scénario", 3], ["email automation", 3], ["prospection automatisée", 3],
      ["onboarding", 2], ["email", 1],
    ],
  },
  {
    name: "web-design",
    keywords: [
      ["refonte", 5], ["ux design", 5], ["ui design", 5], ["maquette", 5],
      ["wireframe", 5], ["a/b test", 4], ["cro", 4], ["taux de conversion", 4],
      ["expérience utilisateur", 4], ["parcours utilisateur", 4],
      ["interface", 3], ["design", 3], ["friction", 3],
      ["page de vente", 2], ["tarif", 2], ["pricing", 2],
    ],
  },
];

const FALLBACK_CLUSTER = "marketing";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function log(emoji, msg) { console.log(`${emoji}  ${msg}`); }

function parseMd(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (m) return { frontmatter: m[1], body: m[2] };
  return { frontmatter: "", body: content };
}

function buildMd(frontmatter, body) {
  return frontmatter ? `---\n${frontmatter}\n---\n${body}` : body;
}

function setFrontmatterField(frontmatter, key, value) {
  const re = new RegExp(`^${key}:.*$`, "m");
  return re.test(frontmatter)
    ? frontmatter.replace(re, `${key}: ${value}`)
    : frontmatter + `\n${key}: ${value}`;
}

function detectCluster(filename, content) {
  const haystack = (filename + " " + content).toLowerCase();
  let best = { name: FALLBACK_CLUSTER, score: 0 };
  const scores = {};

  for (const cluster of CLUSTERS) {
    let score = 0;
    for (const entry of cluster.keywords) {
      const [kw, weight = 1] = Array.isArray(entry) ? entry : [entry, 1];
      const re = new RegExp(kw.replace(/[-/]/g, "[-/]"), "gi");
      const hits = haystack.match(re);
      score += (hits ? hits.length : 0) * weight;
    }
    scores[cluster.name] = score;
    if (score > best.score) best = { name: cluster.name, score };
  }

  return { cluster: best.name, scores };
}

function extractTitle(frontmatter, body, filename) {
  const fm = frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  if (fm) return fm[1].trim();
  const h1 = body.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return filename.replace(/-/g, " ").replace(/\.md$/, "");
}

function getAllMdFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getAllMdFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "_index.md")
      results.push(full);
  }
  return results;
}

// ─── ÉTAPES ──────────────────────────────────────────────────────────────────

function classifyFiles(allFiles) {
  const classified = {};

  for (const filePath of allFiles) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { frontmatter, body } = parseMd(raw);
    const filename = path.basename(filePath);

    // Toujours recalculer — ignore le category existant
    const { cluster, scores } = detectCluster(filename, raw);
    const sorted = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${v}`)
      .join(" | ");

    const title = extractTitle(frontmatter, body, filename);
    log("🔍", `${filename}`);
    log("   ", `→ ${cluster}  (${sorted})`);
    log("   ", `   "${title}"`);
    console.log();

    if (!classified[cluster]) classified[cluster] = [];
    classified[cluster].push({ file: filename, filePath, frontmatter, body, title, slug: filename });
  }

  return classified;
}

function moveAndPatchFiles(classified) {
  for (const [cluster, articles] of Object.entries(classified)) {
    const destDir = path.join(BLOG_DIR, cluster);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
      log("📁", `Dossier créé : src/content/blog/${cluster}/`);
    }

    for (const article of articles) {
      let { frontmatter, body } = parseMd(fs.readFileSync(article.filePath, "utf-8"));

      // Patch category dans le frontmatter
      frontmatter = setFrontmatterField(frontmatter, "category", cluster);
      fs.writeFileSync(article.filePath, buildMd(frontmatter, body), "utf-8");

      const destPath = path.join(destDir, article.file);
      const alreadyThere = path.resolve(article.filePath) === path.resolve(destPath);

      if (!alreadyThere) {
        if (fs.existsSync(destPath)) {
          log("⚠️ ", `Conflit : ${cluster}/${article.file} (non écrasé)`);
        } else {
          fs.renameSync(article.filePath, destPath);
          log("🚚", `Déplacé : ${article.file}  →  ${cluster}/`);
        }
      } else {
        log("✅", `Déjà en place : ${cluster}/${article.file}`);
      }

      article.filePath    = destPath;
      article.frontmatter = frontmatter;
    }
  }
}

function injectInternalLinks(classified) {
  for (const [cluster, articles] of Object.entries(classified)) {
    if (articles.length < 2) continue;

    for (const article of articles) {
      const links = articles
        .filter((a) => a.file !== article.file)
        .map((s) => `- [${s.title}](../${s.slug})`)
        .join("\n");

      let { frontmatter, body } = parseMd(fs.readFileSync(article.filePath, "utf-8"));
      body = body.replace(/\n\n---\n\n## 📎 Articles liés[\s\S]*$/, "");
      fs.writeFileSync(
        article.filePath,
        buildMd(frontmatter, body + "\n\n---\n\n## 📎 Articles liés\n\n" + links + "\n"),
        "utf-8"
      );
      log("🔗", `Liens injectés : ${cluster}/${article.file}`);
    }
  }
}

function generateIndexes(classified) {
  // Supprime les anciens _index.md dans tous les sous-dossiers
  for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const old = path.join(BLOG_DIR, entry.name, "_index.md");
      if (fs.existsSync(old)) {
        fs.unlinkSync(old);
        log("🗑️ ", `Ancien index supprimé : ${entry.name}/_index.md`);
      }
    }
  }

  // Ne génère PAS de _index.md — ils ne respectent pas le schema Astro
  // À la place : génère un fichier de rapport hors du dossier content/
  const reportPath = path.join(__dirname, "cluster-report.md");
  const lines = [
    `# Rapport des clusters blog`,
    ``,
    `> Généré le ${new Date().toLocaleDateString("fr-FR")}`,
    ``,
  ];

  for (const [cluster, articles] of Object.entries(classified)) {
    const label = cluster.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`## ${label} (${articles.length} article${articles.length > 1 ? "s" : ""})`);
    lines.push(``);
    for (const a of articles) {
      lines.push(`- **[${a.title}](src/content/blog/${cluster}/${a.slug})**`);
    }
    lines.push(``);
  }

  fs.writeFileSync(reportPath, lines.join("\n"), "utf-8");
  log("📋", `Rapport généré : cluster-report.md (hors content/ pour éviter les erreurs Astro)`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("\n🚀  cluster-blog.js — démarrage\n");

  if (!fs.existsSync(BLOG_DIR)) {
    console.error(`❌  Dossier introuvable : ${BLOG_DIR}`);
    console.error(`    Lance le script depuis la racine du projet.`);
    process.exit(1);
  }

  const allFiles = getAllMdFiles(BLOG_DIR);
  if (allFiles.length === 0) {
    log("✅", "Aucun .md trouvé — rien à faire.");
    process.exit(0);
  }

  log("📂", `${allFiles.length} fichier(s) trouvé(s)\n`);

  const classified = classifyFiles(allFiles);

  console.log("─── Déplacement + patch frontmatter ───\n");
  moveAndPatchFiles(classified);

  console.log("\n─── Liens internes ───\n");
  injectInternalLinks(classified);

  console.log("\n─── Rapport clusters ───\n");
  generateIndexes(classified);

  console.log("\n✅  Terminé !\n");
}

main();
