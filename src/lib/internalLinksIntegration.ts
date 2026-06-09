/**
 * Astro Integration for Internal Links
 * Processes generated HTML files and injects internal links
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllKeywordsSorted, getKeywordsForPage } from './keywords.ts';
import { buildCandidates, MAX_LINKS_PER_PAGE } from './internalLinks.ts';
import type { AstroIntegration } from 'astro';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Injects internal links into HTML content
 */
function injectLinksIntoHtml(html: string, slug: string): string {
  try {
    const entries = slug ? getKeywordsForPage(slug) : getAllKeywordsSorted();
    const candidates = buildCandidates(entries);
    
    let result = html;
    const usedSlugs = new Set<string>();
    let linksInjected = 0;

    // Extract article content
    const articleMatch = result.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (!articleMatch) {
      console.log(`[internal-links] No article found in ${slug}`);
      return html;
    }

    let articleHtml = articleMatch[1];
    const originalArticleHtml = articleHtml;

    for (const candidate of candidates) {
      if (linksInjected >= MAX_LINKS_PER_PAGE) break;
      if (usedSlugs.has(candidate.slug)) continue;

      candidate.pattern.lastIndex = 0;
      let match;
      let foundMatch = false;

      // Find first occurrence that's not in a link
      while ((match = candidate.pattern.exec(articleHtml)) !== null && !foundMatch) {
        // Check if we're inside an <a> tag
        const beforeText = articleHtml.slice(0, match.index);
        const openTags = (beforeText.match(/<a\s/gi) || []).length;
        const closeTags = (beforeText.match(/<\/a>/gi) || []).length;

        if (openTags === closeTags) {
          // Not inside a link — safe to inject
          const linkHtml = `<a href="/blog/${candidate.slug}" class="internal-link">${match[0]}</a>`;
          articleHtml = 
            articleHtml.slice(0, match.index) + 
            linkHtml + 
            articleHtml.slice(match.index + match[0].length);
          
          console.log(`[internal-links] Injected link to "${candidate.keyword}" in ${slug}`);
          usedSlugs.add(candidate.slug);
          linksInjected++;
          foundMatch = true;
          break; // Move to next candidate after first match
        }
        
        // Continue searching after this position
        candidate.pattern.lastIndex = match.index + 1;
      }
    }

    if (articleHtml !== originalArticleHtml) {
      result = result.replace(articleMatch[1], articleHtml);
      console.log(`[internal-links] Injected ${linksInjected} links into ${slug}`);
    }

    return result;
  } catch (err) {
    console.error(`[internal-links] Error processing ${slug}:`, err);
    return html;
  }
}

export default function internalLinksIntegration(): AstroIntegration {
  return {
    name: 'internal-links',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const distDir = fileURLToPath(dir);
        
        // Process all blog HTML files
        const blogDir = path.join(distDir, 'blog');
        if (!fs.existsSync(blogDir)) {
          console.log('[internal-links] Blog directory not found');
          return;
        }

        let totalProcessed = 0;

        const processDir = (currentPath: string) => {
          try {
            const files = fs.readdirSync(currentPath);
            
            for (const file of files) {
              const filePath = path.join(currentPath, file);
              const stat = fs.statSync(filePath);
              
              if (stat.isDirectory()) {
                processDir(filePath);
              } else if (file === 'index.html') {
                // Extract slug from path
                const relativePath = path.relative(blogDir, filePath);
                const slug = relativePath.replace(/\\index\.html$/, '').replace(/\\/g, '/');
                
                // Skip blog/index.html (the main blog listing)
                if (slug === 'index.html' || slug === '') continue;
                
                // Read and process HTML
                let html = fs.readFileSync(filePath, 'utf-8');
                const originalHtml = html;
                html = injectLinksIntoHtml(html, slug);
                
                if (html !== originalHtml) {
                  fs.writeFileSync(filePath, html, 'utf-8');
                }
                
                totalProcessed++;
              }
            }
          } catch (err) {
            console.error('[internal-links] Error processing directory:', err);
          }
        };

        processDir(blogDir);
        console.log(`[internal-links] Done! Processed ${totalProcessed} blog pages`);
      }
    }
  };
}
