// src/pages/api/contact.ts
import type { APIRoute } from 'astro';

interface ContactPayload {
  name:    string;
  email:   string;
  message: string;
  _hp?:    string;
}

const rateMap = new Map<string, { count: number; ts: number }>();
const RATE_LIMIT  = 3;
const RATE_WINDOW = 60 * 60 * 1000;

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

export const POST: APIRoute = async ({ request }) => {
  const RESEND_KEY = import.meta.env.RESEND_API_KEY;
  console.log('[debug] clé lue:', RESEND_KEY ? 'OK' : 'undefined');

  if (!RESEND_KEY) {
    console.error('[contact] RESEND_API_KEY manquante');
    return json({ error: 'Configuration serveur manquante' }, 500);
  }

  let body: ContactPayload;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { name, email, message, _hp } = body;

  if (_hp) return json({ ok: true }, 200);

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

  const ip = request.headers.get('cf-connecting-ip')
          || request.headers.get('x-forwarded-for')?.split(',')[0]
          || 'unknown';
  if (isRateLimited(ip)) {
    return json({ error: 'Trop de tentatives, réessayez dans 1h' }, 429);
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
      return json({ error: "Erreur d'envoi" }, 502);
    }

    return json({ ok: true }, 200);

  } catch (err) {
    console.error('[contact] fetch error', err);
    return json({ error: 'Erreur réseau' }, 500);
  }
};

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