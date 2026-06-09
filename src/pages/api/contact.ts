// src/pages/api/contact.ts
import type { APIRoute } from 'astro';

// ── Types ──────────────────────────────────────────────────────
interface ContactPayload {
  name:    string;
  email:   string;
  message: string;
  _hp?:    string;
}

// ── Rate limiting (en-mémoire, reset au redémarrage) ──────────
const rateMap = new Map<string, { count: number; ts: number }>();
const RATE_LIMIT   = 3;   // max 3 envois
const RATE_WINDOW  = 60 * 60 * 1000; // par heure

function isRateLimited(ip: string): boolean {
  const now   = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.ts > RATE_WINDOW) {
    rateMap.set(ip, { count: 1, ts: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// ── Handler ────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request }) => {
  // 1. Parse body
  let body: ContactPayload;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { name, email, message, _hp } = body;

  // 2. Honeypot
  if (_hp) return json({ ok: true }, 200); // silencieux

  // 3. Validation serveur
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return json({ error: 'Champs manquants' }, 422);
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return json({ error: 'Email invalide' }, 422);
  }
  if (message.trim().length < 10) {
    return json({ error: 'Message trop court' }, 422);
  }

  // 4. Rate limiting par IP
  const ip = request.headers.get('cf-connecting-ip')
          || request.headers.get('x-forwarded-for')?.split(',')[0]
          || 'unknown';
  if (isRateLimited(ip)) {
    return json({ error: 'Trop de tentatives, réessayez dans 1h' }, 429);
  }

  // 5. Envoi via Resend
  const RESEND_KEY = import.meta.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    console.error('[contact] RESEND_API_KEY manquante');
    return json({ error: 'Configuration serveur manquante' }, 500);
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    'Evolus Contact <noreply@evolus.agency>',
        to:      ['contact@evolus.agency'],
        replyTo: email,
        subject: `[Nouveau contact] ${name}`,
        html: `
          <p><strong>Nom :</strong> ${escape(name)}</p>
          <p><strong>Email :</strong> <a href="mailto:${escape(email)}">${escape(email)}</a></p>
          <hr/>
          <p>${escape(message).replace(/\n/g, '<br/>')}</p>
        `,
        text: `Nom: ${name}\nEmail: ${email}\n\n${message}`,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[contact] Resend error', res.status, err);
      return json({ error: 'Erreur d\'envoi' }, 502);
    }

    return json({ ok: true }, 200);

  } catch (err) {
    console.error('[contact] fetch error', err);
    return json({ error: 'Erreur réseau' }, 500);
  }
};

// ── Helpers ────────────────────────────────────────────────────
function json(data: object, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function escape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
