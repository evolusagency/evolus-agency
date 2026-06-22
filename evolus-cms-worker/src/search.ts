/**
 * search.ts
 * Fetches recent, relevant web context via Brave Search API
 * to ground AI-generated articles in real, current information.
 */

export interface SearchResult {
  title: string;
  description: string;
  url: string;
}

const BRAVE_SEARCH_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';

/**
 * Queries Brave Search and returns a short list of relevant results.
 * Returns an empty array on failure — search context is an enhancement,
 * not a hard dependency, so the pipeline should never break because of it.
 */
export async function fetchSearchContext(
  apiKey: string | undefined,
  query: string,
  count: number = 4,
): Promise<SearchResult[]> {
  if (!apiKey) {
    console.warn('[Search] BRAVE_SEARCH_API_KEY not set, skipping search context.');
    return [];
  }

  try {
    const url = `${BRAVE_SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}&count=${count}&freshness=py`;
    // freshness=py → results from the past year, keeps content current

    const resp = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.warn(`[Search] Brave Search error (${resp.status}): ${err}`);
      return [];
    }

    const data = await resp.json() as {
      web?: { results?: Array<{ title: string; description: string; url: string }> };
    };

    const results = data.web?.results ?? [];
    return results.slice(0, count).map(r => ({
      title: r.title,
      description: r.description,
      url: r.url,
    }));
  } catch (err) {
    console.warn('[Search] Brave Search request failed:', err);
    return [];
  }
}

/**
 * Formats search results into a compact context block for the AI prompt.
 * Strips HTML tags Brave sometimes includes in descriptions (e.g. <strong>).
 */
export function formatSearchContext(results: SearchResult[]): string {
  if (results.length === 0) return '';

  const cleaned = results.map((r, i) => {
    const desc = r.description.replace(/<\/?[^>]+(>|$)/g, '');
    return `${i + 1}. ${r.title} — ${desc}`;
  });

  return `\n\nCONTEXTE WEB RÉCENT (à utiliser pour des faits/chiffres concrets, sans copier le texte) :\n${cleaned.join('\n')}\n`;
}
