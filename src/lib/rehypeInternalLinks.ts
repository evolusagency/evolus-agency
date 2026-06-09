/**
 * rehypeInternalLinks — Astro rehype plugin
 *
 * Operates directly on the HAST (HTML Abstract Syntax Tree) that Astro
 * produces from Markdown — no extra serialization/parsing round-trip needed.
 *
 * Usage in astro.config.mjs:
 *   import rehypeInternalLinks from './src/lib/rehypeInternalLinks.ts';
 *   markdown: { rehypePlugins: [rehypeInternalLinks] }
 */

import { visit } from "unist-util-visit";
import type { Root, Element, Text, RootContent } from "hast";
import { getAllKeywordsSorted, getKeywordsForPage } from "./keywords.ts";
import { buildCandidates, MAX_LINKS_PER_PAGE } from "./internalLinks.ts";
import type { LinkCandidate } from "./internalLinks.ts";

const BLOCK_ELEMENTS = new Set(["p", "li", "blockquote", "dd"]);

export default function rehypeInternalLinks() {
  return function (tree: Root, file: any) {
    // Derive slug from vFile path: "src/content/blog/my-post.md" → "my-post"
    // Astro's glob loader uses the filename (without extension) as the entry id.
    // file.history[0] is the absolute path set by vfile when Astro processes MD.
    const filePath: string = file?.history?.[0] ?? file?.path ?? "";
    const currentSlug: string = filePath
      .replace(/\\/g, "/")          // normalize Windows backslashes
      .split("/")
      .pop()                         // grab filename
      ?.replace(/\.(md|mdx)$/, "")  // strip extension
      ?? "";

    const entries = currentSlug
      ? getKeywordsForPage(currentSlug)
      : getAllKeywordsSorted();

    const candidates = buildCandidates(entries);

    // Track linking state across the whole document
    const usedSlugs = new Set<string>();
    let totalInjected = 0;

    visit(tree, "element", (node: Element) => {
      if (totalInjected >= MAX_LINKS_PER_PAGE) return;
      if (!BLOCK_ELEMENTS.has(node.tagName)) return;

      for (const candidate of candidates) {
        if (totalInjected >= MAX_LINKS_PER_PAGE) break;
        if (usedSlugs.has(candidate.slug)) continue;

        const injected = injectIntoChildren(node.children, candidate);
        if (injected) {
          usedSlugs.add(candidate.slug);
          totalInjected++;
        }
      }
    });
  };
}

/**
 * Walk HAST children looking for a text node that matches the candidate.
 * On first match, splits the text node and wraps the match in an <a> element.
 * Returns true if a link was injected.
 */
function injectIntoChildren(
  children: RootContent[],
  candidate: LinkCandidate,
): boolean {
  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    // Never inject inside existing <a> tags
    if (child.type === "element" && (child as Element).tagName === "a") continue;

    // Never inject inside code blocks
    if (
      child.type === "element" &&
      ((child as Element).tagName === "code" || (child as Element).tagName === "pre")
    ) continue;

    // Recurse into inline elements (strong, em, etc.)
    if (child.type === "element" && (child as Element).children?.length) {
      const found = injectIntoChildren(
        (child as Element).children as RootContent[],
        candidate,
      );
      if (found) return true;
    }

    // Text node — attempt match
    if (child.type === "text") {
      const text = (child as Text).value;
      candidate.pattern.lastIndex = 0;
      const match = candidate.pattern.exec(text);
      if (!match) continue;

      const before = text.slice(0, match.index);
      const matched = match[0];
      const after = text.slice(match.index + matched.length);

      const newNodes: RootContent[] = [];
      if (before) newNodes.push({ type: "text", value: before });
      newNodes.push({
        type: "element",
        tagName: "a",
        properties: {
          href: `/blog/${candidate.slug}`,
          className: ["internal-link"],
        },
        children: [{ type: "text", value: matched }],
      } as Element);
      if (after) newNodes.push({ type: "text", value: after });

      children.splice(i, 1, ...newNodes);
      return true;
    }
  }
  return false;
}