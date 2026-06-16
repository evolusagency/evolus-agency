# Evolus CMS Worker — Guide de mise en place

## Arborescence finale

```
evolus-cms-worker/
├── src/
│   ├── index.ts       ← Worker principal (orchestrateur)
│   ├── types.ts       ← Interfaces TypeScript
│   ├── sheets.ts      ← Lecture/écriture Google Sheets
│   ├── generator.ts   ← Génération contenu via Cloudflare AI
│   └── github.ts      ← Push GitHub + déclenchement Pages
├── wrangler.toml      ← Config Cloudflare Workers
├── tsconfig.json
├── package.json
└── SETUP.md
```

---

## Étape 1 — Prérequis

```bash
npm install -g wrangler
wrangler login
```

---

## Étape 2 — Google Sheets

### 2a. Structure de la Sheet

Crée une Google Sheet avec cette structure exacte (ligne 1 = en-têtes) :

| A: status | B: cluster | C: keyword | D: title | E: slug | F: excerpt |
|-----------|-----------|-----------|---------|---------|-----------|
| pending | seo | seo b2b | Stratégie SEO B2B | strategie-seo-b2b | Guide SEO B2B |

Valeurs autorisées pour **status** : `pending`, `processing`, `published`, `error`
Valeurs autorisées pour **cluster** : `seo`, `marketing`, `automation`, `web-design`

### 2b. Service Account GCP

1. [Google Cloud Console](https://console.cloud.google.com) → IAM & Admin → Service Accounts
2. Créer un compte de service (ex: `cms-worker@ton-projet.iam.gserviceaccount.com`)
3. Clés → Ajouter une clé → JSON → télécharger
4. **Partager ta Google Sheet** avec l'email du service account (rôle : Éditeur)
5. Activer l'API Google Sheets dans le projet GCP

### 2c. Secrets Wrangler

```bash
# ID de la Sheet (dans l'URL : /spreadsheets/d/<ID>/edit)
wrangler secret put SHEETS_SPREADSHEET_ID

# Contenu complet du fichier JSON de clé de service (sur une seule ligne)
wrangler secret put SHEETS_SERVICE_ACCOUNT
```

---

## Étape 3 — GitHub Fine-Grained PAT

1. GitHub → Settings → Developer Settings → Personal access tokens → Fine-grained tokens
2. **Repository access** : uniquement ton repo blog
3. **Permissions** :
   - Contents → Read and Write
   - Metadata → Read-only (obligatoire)
4. Copier le token généré

```bash
wrangler secret put GITHUB_PAT
```

---

## Étape 4 — Cloudflare Pages deploy hook

1. Cloudflare Dashboard → Pages → ton projet → Settings → Builds & deployments
2. Deploy hooks → Add deploy hook
3. Nom : `cms-worker` | Branch : `main`
4. Copier l'URL générée (format : `https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...`)

```bash
wrangler secret put CF_PAGES_HOOK_URL
```

---

## Étape 5 — wrangler.toml

Édite `wrangler.toml` et renseigne :

```toml
[vars]
GITHUB_OWNER = "ton-username-github"
GITHUB_REPO  = "nom-de-ton-repo"
```

---

## Étape 6 — Installation et test

```bash
npm install

# Test en dry-run (aucun push GitHub, aucun deploy)
wrangler dev --env staging
# Dans un autre terminal :
curl "http://localhost:8787/run?secret=<16 derniers chars de ton GITHUB_PAT>"

# Vérifier les logs
wrangler tail --env staging
```

---

## Étape 7 — Déploiement production

```bash
# Déploie le Worker avec les Cron Triggers (08:00 et 18:00 UTC)
wrangler deploy --env production

# Vérifier que les crons sont bien enregistrés
wrangler cron list
```

---

## Commandes utiles

```bash
# Logs en temps réel
wrangler tail

# Forcer une exécution manuelle en production
curl "https://evolus-cms-worker.<ton-subdomain>.workers.dev/run?secret=<16 derniers chars PAT>"

# Health check
curl "https://evolus-cms-worker.<ton-subdomain>.workers.dev/health"

# Redéployer après modification
wrangler deploy --env production
```

---

## Variables d'environnement complètes

| Variable | Type | Description |
|----------|------|-------------|
| `GITHUB_PAT` | Secret | Fine-Grained PAT GitHub |
| `SHEETS_SPREADSHEET_ID` | Secret | ID de la Google Sheet |
| `SHEETS_SERVICE_ACCOUNT` | Secret | JSON du Service Account GCP (stringifié) |
| `CF_PAGES_HOOK_URL` | Secret | URL du deploy hook Cloudflare Pages |
| `BATCH_SIZE` | Var | Nombre d'articles par run (défaut: 3) |
| `GITHUB_OWNER` | Var | Username ou organisation GitHub |
| `GITHUB_REPO` | Var | Nom du repo |
| `GITHUB_BRANCH` | Var | Branche cible (défaut: main) |
| `CONTENT_BASE_PATH` | Var | Chemin des articles (défaut: src/content/blog) |
| `SITE_LANG` | Var | Langue du site (défaut: fr) |
| `AUTHOR` | Var | Auteur par défaut (défaut: Evolus Agency) |
| `DRY_RUN` | Var | Si "true", aucun push ni deploy |

---

## Ajouter un article dans la queue

Ajouter simplement une ligne dans Google Sheets :

```
pending | seo | stratégie seo locale | SEO Local pour PME | seo-local-pme | Dominer le SEO local en 2026
```

Le Worker le détecte au prochain Cron (08:00 ou 18:00 UTC) et publie automatiquement.

---

## Extensions futures prévues

L'architecture est prête pour :

- `image: z.string().optional()` — génération automatique de prompt d'image (colonne G dans Sheets)
- `pillar: true` — articles piliers avec maillage interne automatique
- FAQ Schema JSON-LD — ajout dans `generator.ts` via prompt secondaire
- Meta description IA — champ séparé du `excerpt`
- Publication programmée — colonne `publish_date` + filtre dans `sheets.ts`
