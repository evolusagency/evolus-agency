/**
 * sheets.ts
 * Read pending rows and update status in Google Sheets
 */

import { ArticleCluster, ArticleStatus, SheetRow } from './types';

const COL = {
  STATUS:  0, // A
  CLUSTER: 1, // B
  KEYWORD: 2, // C
  TITLE:   3, // D
  SLUG:    4, // E
  EXCERPT: 5, // F
} as const;

const SHEET_NAME = 'Sheet1';

// ← liste complète des 22 clusters
const VALID_CLUSTERS: ArticleCluster[] = [
  'seo',
  'automation',
  'branding',
  'content-marketing',
  'ux-ui',
  'social-media',
  'email-marketing',
  'paid-ads',
  'cro',
  'data-analytics',
  'ia-generative',
  'ecommerce',
  'strategie-digitale',
  'sales-enablement',
  'lead-generation',
  'customer-experience',
  'video-marketing',
  'influence-b2b',
  'developpement-web',
  'cybersecurite',
  'product-marketing',
  'fondamentaux-business',
];

interface ServiceAccountKey {
  client_email: string;
  private_key:  string;
}

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const key: ServiceAccountKey = JSON.parse(serviceAccountJson);

  const now     = Math.floor(Date.now() / 1000);
  const payload = {
    iss:   key.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  };

  const header  = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const body    = btoa(JSON.stringify(payload)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const toSign  = `${header}.${body}`;

  const pemContents = key.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sigBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(toSign));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
    .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');

  const jwt = `${toSign}.${signature}`;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Google OAuth2 token error: ${err}`);
  }

  const data = await resp.json() as { access_token: string };
  return data.access_token;
}

export async function fetchPendingRows(
  spreadsheetId:      string,
  serviceAccountJson: string,
  batchSize:          number,
): Promise<SheetRow[]> {
  const token   = await getAccessToken(serviceAccountJson);
  const range   = `${SHEET_NAME}!A2:F`;
  const url     = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Sheets read error: ${err}`);
  }

  const data   = await resp.json() as { values?: string[][] };
  const values = data.values ?? [];
  const pending: SheetRow[] = [];

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (!row || row.length < 6) continue;

    const status  = row[COL.STATUS]?.trim().toLowerCase() as ArticleStatus;
    const cluster = row[COL.CLUSTER]?.trim().toLowerCase() as ArticleCluster;

    if (status !== 'pending') continue;
    if (!VALID_CLUSTERS.includes(cluster)) {
      console.warn(`Row ${i + 2}: cluster invalide "${cluster}", ignoré. Clusters valides: ${VALID_CLUSTERS.join(', ')}`);
      continue;
    }

    const slug = row[COL.SLUG]?.trim();
    if (!slug) {
      console.warn(`Row ${i + 2}: slug manquant, ignoré.`);
      continue;
    }

    pending.push({
      rowIndex: i + 2,
      status,
      cluster,
      keyword:  row[COL.KEYWORD]?.trim() ?? '',
      title:    row[COL.TITLE]?.trim()   ?? '',
      slug,
      excerpt:  row[COL.EXCERPT]?.trim() ?? '',
    });

    if (pending.length >= batchSize) break;
  }

  return pending;
}

export async function updateRowStatus(
  spreadsheetId:      string,
  serviceAccountJson: string,
  rowIndex:           number,
  status:             ArticleStatus,
): Promise<void> {
  const token = await getAccessToken(serviceAccountJson);
  const range = `${SHEET_NAME}!A${rowIndex}`;
  const url   = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;

  const resp = await fetch(url, {
    method:  'PUT',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[status]] }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Sheets write error (row ${rowIndex}): ${err}`);
  }
}
