/**
 * index.ts — Evolus CMS Worker
 * ─────────────────────────────────────────────
 * Cron-driven pipeline:
 *   Sheets (pending) → AI generation → GitHub push → Pages deploy → Sheets (published)
 *
 * Schedules (wrangler.toml):
 *   0 8  * * *  → 08:00 UTC daily
 *   0 18 * * *  → 18:00 UTC daily
 *
 * Manual trigger (dev only):
 *   GET /run?secret=<MANUAL_TRIGGER_SECRET>
 */

import { Env, ArticleResult, SheetRow } from './types';
import { fetchPendingRows, updateRowStatus }   from './sheets';
import { generateArticle }                      from './generator';
import { pushArticle, triggerPagesDeploy }      from './github';

export default {
  // ── Cron handler ──────────────────────────────────────────
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runPipeline(env));
  },

  // ── HTTP handler (manual trigger + health check) ──────────
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', dryRun: env.DRY_RUN === 'true' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Manual run — protected by a secret query param
    if (url.pathname === '/run') {
      const secret = url.searchParams.get('secret');
      if (!secret || (env.GITHUB_PAT && secret !== env.GITHUB_PAT.slice(-16))) {
        return new Response('Unauthorized', { status: 401 });
      }
      ctx.waitUntil(runPipeline(env));
      return new Response(JSON.stringify({ status: 'pipeline started' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};

// ────────────────────────────────────────────────────────────
// Core pipeline
// ────────────────────────────────────────────────────────────

async function runPipeline(env: Env): Promise<void> {
  const batchSize = parseInt(env.BATCH_SIZE ?? '3', 10);
  const dryRun    = env.DRY_RUN === 'true';

  console.log(`[CMS] Pipeline started. batch=${batchSize} dryRun=${dryRun}`);

  // ── 1. Fetch pending rows from Sheets ─────────────────────
  let rows: SheetRow[];
  try {
    rows = await fetchPendingRows(
      env.SHEETS_SPREADSHEET_ID,
      env.SHEETS_SERVICE_ACCOUNT,
      batchSize,
    );
  } catch (err) {
    console.error('[CMS] Failed to fetch Sheets:', err);
    return;
  }

  if (rows.length === 0) {
    console.log('[CMS] No pending rows found. Done.');
    return;
  }

  console.log(`[CMS] Found ${rows.length} pending row(s).`);

  const results: ArticleResult[] = [];
  let deployTriggered = false;

  // ── 2. Process each row sequentially ──────────────────────
  for (const row of rows) {
    console.log(`[CMS] Processing: "${row.slug}" (${row.cluster})`);

    // ── 2a. Lock the row (skipped in dry-run) ───────────────
    try {
      if (!dryRun) {
        await updateRowStatus(
          env.SHEETS_SPREADSHEET_ID,
          env.SHEETS_SERVICE_ACCOUNT,
          row.rowIndex,
          'processing',
        );
      }
    } catch (err) {
      console.error(`[CMS] Could not lock row ${row.rowIndex}:`, err);
      results.push({ slug: row.slug, status: 'error', message: String(err) });
      continue;
    }

    try {
      // ── 2b. Generate content via Cloudflare AI ─────────────
      console.log(`[CMS] Generating content for "${row.slug}"…`);
      const article = await generateArticle(
        env.AI,
        row,
        env.SITE_LANG ?? 'fr',
        env.AUTHOR    ?? 'Evolus Agency',
      );
      console.log(`[CMS] Generated ${article.body.split(/\s+/).length} words.`);

      // ── 2c. Push to GitHub ─────────────────────────────────
      console.log(`[CMS] Pushing "${article.filename}" to GitHub…`);
      const pushResult = await pushArticle({
        pat:      env.GITHUB_PAT,
        owner:    env.GITHUB_OWNER,
        repo:     env.GITHUB_REPO,
        branch:   env.GITHUB_BRANCH    ?? 'main',
        basePath: `${env.CONTENT_BASE_PATH ?? 'src/content/blog'}/${row.cluster}`,
        article,
        dryRun,
      });
      console.log(`[CMS] Push result: ${pushResult.action} ${pushResult.filePath}`);

      // ── 2d. Mark as published (skipped in dry-run) ─────────
      if (!dryRun) {
        await updateRowStatus(
          env.SHEETS_SPREADSHEET_ID,
          env.SHEETS_SERVICE_ACCOUNT,
          row.rowIndex,
          'published',
        );
      }

      results.push({
        slug:    row.slug,
        status:  'published',
        message: `${pushResult.action} — ${pushResult.filePath}`,
      });

      deployTriggered = true;

    } catch (err) {
      // ── Error path: mark row as error, continue batch ──────
      console.error(`[CMS] Error processing "${row.slug}":`, err);

      try {
        if (!dryRun) {
          await updateRowStatus(
            env.SHEETS_SPREADSHEET_ID,
            env.SHEETS_SERVICE_ACCOUNT,
            row.rowIndex,
            'error',
          );
        }
      } catch (sheetErr) {
        console.error(`[CMS] Could not update error status for row ${row.rowIndex}:`, sheetErr);
      }

      results.push({ slug: row.slug, status: 'error', message: String(err) });
    }
  }

  // ── 3. Trigger Pages deploy once (after all pushes) ────────
  if (deployTriggered && !dryRun) {
    try {
      await triggerPagesDeploy(env.CF_PAGES_HOOK_URL, dryRun);
    } catch (err) {
      console.error('[CMS] Deploy hook error:', err);
    }
  }

  // ── 4. Summary log ─────────────────────────────────────────
  const published = results.filter(r => r.status === 'published').length;
  const errors    = results.filter(r => r.status === 'error').length;

  console.log(`[CMS] Pipeline done. published=${published} errors=${errors}`);
  for (const r of results) {
    console.log(`  [${r.status.toUpperCase()}] ${r.slug}: ${r.message}`);
  }
}