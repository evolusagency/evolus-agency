/**
 * Internal Links Engine
 * Scans HTML text nodes for keyword matches and injects <a> tags.
 *
 * Rules:
 * - Max MAX_LINKS_PER_PAGE total injected links per page
 * - Each slug may only be linked once per page (no duplicates)
 * - Each keyword phrase matched at most once (first occurrence wins)
 * - Pillar pages receive a priority boost (+2) making them more likely to be selected
 * - Never injects inside an existing <a> tag
 * - Case-insensitive matching, preserves original casing in rendered text
 */

import type { KeywordEntry } from "./keywords.ts";

export const MAX_LINKS_PER_PAGE = 3;

/** Boost applied to pillar page priority during candidate scoring */
const PILLAR_BOOST = 2;

export interface LinkCandidate {
  keyword: string;
  slug: string;
  priority: number;
  isPillar: boolean;
  /** The regex that will be used to find this keyword in HTML text */
  pattern: RegExp;
}

/**
 * Build sorted link candidates from keyword entries.
 * Pillar pages get a priority boost and bubble to the top.
 * Returns at most MAX_LINKS_PER_PAGE candidates (pre-filtered so the engine
 * doesn't do more work than needed).
 */
export function buildCandidates(entries: KeywordEntry[]): LinkCandidate[] {
  const scored = entries.map(e => ({
    keyword: e.keyword,
    slug: e.slug,
    priority: e.isPillar ? e.priority + PILLAR_BOOST : e.priority,
    isPillar: e.isPillar,
    // Build a single regex that matches the primary keyword OR any alias
    pattern: buildPattern([e.keyword, ...(e.aliases ?? [])]),
  }));

  // Sort by effective priority descending
  scored.sort((a, b) => b.priority - a.priority);

  return scored;
}

/**
 * Builds a case-insensitive word-boundary regex from a list of phrases.
 * Longer phrases first to prevent shorter aliases shadowing them.
 */
function buildPattern(phrases: string[]): RegExp {
  const sorted = [...phrases].sort((a, b) => b.length - a.length);
  const escaped = sorted.map(p =>
    p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  // \b doesn't work well with accented chars — use lookahead/lookbehind for word edges
  const group = escaped.join("|");
  return new RegExp(`(?<![\\w\\u00C0-\\u024F])(?:${group})(?![\\w\\u00C0-\\u024F])`, "gi");
}

/**
 * Injects internal links into a raw HTML string.
 *
 * @param html        - The rendered article HTML
 * @param candidates  - Sorted link candidates (from buildCandidates)
 * @param currentSlug - The slug of the current page (excluded from candidates upstream)
 * @returns           - Modified HTML with ≤ MAX_LINKS_PER_PAGE injected links
 */
export function injectInternalLinks(
  html: string,
  candidates: LinkCandidate[],
): string {
  const usedSlugs = new Set<string>();
  let linksInjected = 0;
  let result = html;

  for (const candidate of candidates) {
    if (linksInjected >= MAX_LINKS_PER_PAGE) break;
    if (usedSlugs.has(candidate.slug)) continue;

    // Only replace the FIRST match of this candidate's pattern
    const newHtml = replaceFirstSafe(result, candidate, usedSlugs, linksInjected);

    if (newHtml !== result) {
      result = newHtml;
      usedSlugs.add(candidate.slug);
      linksInjected++;
    }

    // Reset lastIndex after global regex use
    candidate.pattern.lastIndex = 0;
  }

  return result;
}

/**
 * Replaces the first occurrence of a keyword pattern in HTML text nodes only.
 * Skips matches that are already inside an <a> tag.
 */
function replaceFirstSafe(
  html: string,
  candidate: LinkCandidate,
  usedSlugs: Set<string>,
  currentCount: number,
): string {
  if (currentCount >= MAX_LINKS_PER_PAGE) return html;
  if (usedSlugs.has(candidate.slug)) return html;

  // Split HTML into text segments and tag segments
  // Tags: <...>  |  Text: everything between
  const tagRegex = /(<[^>]+>)/g;
  const parts = html.split(tagRegex);

  let replaced = false;
  let insideAnchor = 0; // depth counter for nested <a> (should be 0 always, but safe)

  const result = parts.map(part => {
    // If it's a tag, track anchor depth and return as-is
    if (part.startsWith("<")) {
      const tagName = part.match(/^<\/?([a-z][a-z0-9]*)/i)?.[1]?.toLowerCase();
      if (tagName === "a") {
        if (part.startsWith("</")) insideAnchor = Math.max(0, insideAnchor - 1);
        else if (!part.endsWith("/>")) insideAnchor++;
      }
      return part;
    }

    // It's a text node — only replace if not inside an anchor and not yet replaced
    if (replaced || insideAnchor > 0) return part;

    candidate.pattern.lastIndex = 0;
    const match = candidate.pattern.exec(part);
    if (!match) return part;

    // Inject the link around the matched text, preserving original casing
    const before = part.slice(0, match.index);
    const matched = match[0];
    const after = part.slice(match.index + matched.length);

    replaced = true;
    return `${before}<a href="/blog/${candidate.slug}" class="internal-link">${matched}</a>${after}`;
  });

  return replaced ? result.join("") : html;
}
