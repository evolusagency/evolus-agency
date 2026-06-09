/**
 * scripts/seo-check.ts
 * Run with: node --import tsx/esm scripts/seo-check.ts
 * Or add to package.json scripts: "seo-check": "node --import tsx/esm scripts/seo-check.ts"
 */

import { readdir } from "fs/promises";
import { resolve } from "path";
import { keywordMap, getPillarPages } from "../src/lib/keywords.ts";

const BLOG_DIR = resolve(process.cwd(), "src/content/blog");
const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const WARN = "\x1b[33m⚠\x1b[0m";
const INFO = "\x1b[36mℹ\x1b[0m";

let errors = 0;
let warnings = 0;

function pass(msg: string) { console.log(`  ${PASS} ${msg}`); }
function fail(msg: string) { console.log(`  ${FAIL} ${msg}`); errors++; }
function warn(msg: string) { console.log(`  ${WARN} ${msg}`); warnings++; }
function info(msg: string) { console.log(`  ${INFO} ${msg}`); }

async function getExistingSlugs(): Promise<Set<string>> {
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

  console.log("\n[1] Loading blog content files...");
  let existingSlugs: Set<string>;
  try {
    existingSlugs = await getExistingSlugs();
    info(`Found ${existingSlugs.size} blog posts in src/content/blog/`);
  } catch (e) {
    fail(`Could not read ${BLOG_DIR} — are you running from the project root?`);
    process.exit(1);
  }

  console.log("\n[2] Checking keyword slugs against real files...");
  for (const entry of keywordMap) {
    if (existingSlugs.has(entry.slug)) {
      pass(`${entry.slug}`);
    } else {
      fail(`Slug not found: "${entry.slug}" (keyword: "${entry.keyword}")`);
    }
  }

  console.log("\n[3] Checking for keyword/alias collisions...");
  const phraseToSlug = new Map<string, string>();
  let collisionFound = false;
  for (const entry of keywordMap) {
    const phrases = [entry.keyword, ...(entry.aliases ?? [])];
    for (const phrase of phrases) {
      const normalized = phrase.toLowerCase().trim();
      if (phraseToSlug.has(normalized)) {
        const existingSlug = phraseToSlug.get(normalized)!;
        if (existingSlug !== entry.slug) {
          fail(`Collision: "${phrase}" maps to both "${existingSlug}" and "${entry.slug}"`);
          collisionFound = true;
        }
      } else {
        phraseToSlug.set(normalized, entry.slug);
      }
    }
  }
  if (!collisionFound) pass("No keyword collisions found");

  console.log("\n[4] Checking priority values (expected 1–10)...");
  let priorityOk = true;
  for (const entry of keywordMap) {
    if (entry.priority < 1 || entry.priority > 10) {
      fail(`"${entry.keyword}" has invalid priority ${entry.priority}`);
      priorityOk = false;
    }
  }
  if (priorityOk) pass("All priority values valid");

  console.log("\n[5] Checking pillar pages...");
  const pillars = getPillarPages();
  info(`${pillars.length} pillar pages defined`);
  for (const p of pillars) {
    if (existingSlugs.has(p.slug)) {
      pass(`PILLAR [priority ${p.priority + 2}]: ${p.slug}`);
    } else {
      fail(`Pillar slug missing: ${p.slug}`);
    }
  }

  console.log("\n[6] Checking for unmapped blog posts...");
  const mappedSlugs = new Set(keywordMap.map(e => e.slug));
  let unmapped = false;
  for (const realSlug of existingSlugs) {
    if (!mappedSlugs.has(realSlug)) {
      warn(`Not in keyword map: "${realSlug}" — add to src/lib/keywords.ts`);
      unmapped = true;
    }
  }
  if (!unmapped) pass("All blog posts are mapped");

  console.log("\n[7] Checking for duplicate slug entries...");
  const slugCount = new Map<string, number>();
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