/**
 * scripts/seo-check.mjs
 * Run with: node scripts/seo-check.mjs
 */

import { readdir, readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const BLOG_DIR = resolve(ROOT, "src/content/blog");
const KEYWORDS_FILE = resolve(ROOT, "src/lib/keywords.ts");

const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const WARN = "\x1b[33m⚠\x1b[0m";
const INFO = "\x1b[36mℹ\x1b[0m";

let errors = 0;
let warnings = 0;

function pass(msg) { console.log(`  ${PASS} ${msg}`); }
function fail(msg) { console.log(`  ${FAIL} ${msg}`); errors++; }
function warn(msg) { console.log(`  ${WARN} ${msg}`); warnings++; }
function info(msg) { console.log(`  ${INFO} ${msg}`); }

// Parse keywords.ts by reading slugs with a simple regex — no TypeScript needed
async function parseKeywordsFile() {
  const src = await readFile(KEYWORDS_FILE, "utf8");

  const entries = [];
  // Match each { keyword: "...", slug: "...", priority: N, isPillar: bool } block
  const blockRegex = /\{[^}]*keyword\s*:\s*["']([^"']+)["'][^}]*slug\s*:\s*["']([^"']+)["'][^}]*priority\s*:\s*(\d+)[^}]*isPillar\s*:\s*(true|false)[^}]*\}/gs;

  let match;
  while ((match = blockRegex.exec(src)) !== null) {
    entries.push({
      keyword: match[1],
      slug: match[2],
      priority: parseInt(match[3]),
      isPillar: match[4] === "true",
    });
  }

  // Also extract aliases
  const aliasRegex = /slug\s*:\s*["']([^"']+)["'][^}]*aliases\s*:\s*\[([^\]]+)\]/gs;
  while ((match = aliasRegex.exec(src)) !== null) {
    const slug = match[1];
    const aliasStr = match[2];
    const aliases = [...aliasStr.matchAll(/["']([^"']+)["']/g)].map(m => m[1]);
    const entry = entries.find(e => e.slug === slug);
    if (entry) entry.aliases = aliases;
  }

  return entries;
}

async function getExistingSlugs() {
  const files = await readdir(BLOG_DIR);
  return new Set(
    files
      .filter(f => f.endsWith(".md") || f.endsWith(".mdx"))
      .map(f => f.replace(/\.(md|mdx)$/, ""))
  );
}

async function run() {
  console.log("\n\x1b[1mEvolus Agency — SEO Internal Linking Check\x1b[0m");
  console.log("─".repeat(50));

  // 1. Load real slugs
  console.log("\n[1] Loading blog content files...");
  let existingSlugs;
  try {
    existingSlugs = await getExistingSlugs();
    info(`Found ${existingSlugs.size} blog posts in src/content/blog/`);
  } catch (e) {
    fail(`Could not read ${BLOG_DIR} — run from project root`);
    process.exit(1);
  }

  // 2. Parse keywords
  console.log("\n[2] Parsing keywords.ts...");
  let keywordMap;
  try {
    keywordMap = await parseKeywordsFile();
    info(`Found ${keywordMap.length} keyword entries`);
  } catch (e) {
    fail(`Could not parse ${KEYWORDS_FILE}: ${e.message}`);
    process.exit(1);
  }

  // 3. Check every slug exists as a real file
  console.log("\n[3] Checking keyword slugs against real files...");
  for (const entry of keywordMap) {
    if (existingSlugs.has(entry.slug)) {
      pass(`${entry.slug}`);
    } else {
      fail(`Slug not found: "${entry.slug}" (keyword: "${entry.keyword}")`);
    }
  }

  // 4. Check keyword/alias collisions
  console.log("\n[4] Checking for keyword/alias collisions...");
  const phraseToSlug = new Map();
  let collisionFound = false;
  for (const entry of keywordMap) {
    const phrases = [entry.keyword, ...(entry.aliases ?? [])];
    for (const phrase of phrases) {
      const normalized = phrase.toLowerCase().trim();
      if (phraseToSlug.has(normalized)) {
        const existing = phraseToSlug.get(normalized);
        if (existing !== entry.slug) {
          fail(`Collision: "${phrase}" → "${existing}" AND "${entry.slug}"`);
          collisionFound = true;
        }
      } else {
        phraseToSlug.set(normalized, entry.slug);
      }
    }
  }
  if (!collisionFound) pass("No keyword collisions found");

  // 5. Priority range check
  console.log("\n[5] Checking priority values...");
  let priorityOk = true;
  for (const entry of keywordMap) {
    if (entry.priority < 1 || entry.priority > 10) {
      fail(`"${entry.keyword}" has invalid priority ${entry.priority} (must be 1–10)`);
      priorityOk = false;
    }
  }
  if (priorityOk) pass("All priority values valid");

  // 6. Pillar pages
  console.log("\n[6] Checking pillar pages...");
  const pillars = keywordMap.filter(e => e.isPillar).sort((a, b) => b.priority - a.priority);
  info(`${pillars.length} pillar pages defined`);
  for (const p of pillars) {
    if (existingSlugs.has(p.slug)) {
      pass(`PILLAR [priority ${p.priority + 2}]: ${p.slug}`);
    } else {
      fail(`Pillar slug missing: ${p.slug}`);
    }
  }

  // 7. Unmapped posts
  console.log("\n[7] Checking for unmapped blog posts...");
  const mappedSlugs = new Set(keywordMap.map(e => e.slug));
  let unmapped = false;
  for (const realSlug of existingSlugs) {
    if (!mappedSlugs.has(realSlug)) {
      warn(`Not in keyword map: "${realSlug}" — add to src/lib/keywords.ts`);
      unmapped = true;
    }
  }
  if (!unmapped) pass("All blog posts are mapped");

  // 8. Duplicate slugs
  console.log("\n[8] Checking for duplicate slug entries...");
  const slugCount = new Map();
  for (const entry of keywordMap) {
    slugCount.set(entry.slug, (slugCount.get(entry.slug) ?? 0) + 1);
  }
  let dupFound = false;
  for (const [slug, count] of slugCount) {
    if (count > 1) {
      warn(`Slug appears ${count} times: "${slug}"`);
      dupFound = true;
    }
  }
  if (!dupFound) pass("No duplicate slug entries");

  // Summary
  console.log("\n" + "─".repeat(50));
  if (errors === 0 && warnings === 0) {
    console.log(`\x1b[32m✓ All checks passed. ${keywordMap.length} keywords, ${pillars.length} pillars.\x1b[0m\n`);
  } else {
    if (errors > 0) console.log(`\x1b[31m✗ ${errors} error(s) found.\x1b[0m`);
    if (warnings > 0) console.log(`\x1b[33m⚠ ${warnings} warning(s).\x1b[0m`);
    console.log();
  }

  if (errors > 0) process.exit(1);
}

run().catch(e => {
  console.error("\nUnexpected error:", e);
  process.exit(1);
});
