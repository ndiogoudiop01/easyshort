# Monorepo — Plateforme Micro-Dramas

Turborepo + pnpm. Tout le code TypeScript, partage maximal entre mobile et web (React Native Web).

## Structure

```
drama-monorepo/
├─ apps/
│  ├─ mobile/        # Expo (React Native) → iOS + Android + Web (react-native-web)
│  ├─ api/           # Next.js (Route Handlers) : API, webhooks PayTech/Bunny, crons
│  └─ admin/         # Next.js : backoffice / CMS
├─ packages/
│  ├─ db/            # ✅ Schéma Drizzle + client Neon + requêtes métier (FOURNI)
│  ├─ core/          # Logique métier partagée (pricing badges, entitlements, PayTech)
│  ├─ ui/            # Design system partagé (obsidian/or, composants RN + RN Web)
│  └─ config/        # eslint, tsconfig, tailwind, env (zod)
├─ turbo.json
├─ pnpm-workspace.yaml
└─ package.json
```

> **D1 (React Native Web partout)** : `apps/mobile` est une app Expo qui build aussi le web
> via `react-native-web` (`expo start --web` / export statique). Pas de front Next.js dédié.
> `apps/api` reste du Next.js **uniquement pour le backend** (API + webhooks + crons).

## Fichiers racine

### pnpm-workspace.yaml
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### package.json (racine)
```json
{
  "name": "drama-monorepo",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "db:generate": "pnpm --filter @easyshort/db db:generate",
    "db:migrate": "pnpm --filter @easyshort/db db:migrate",
    "db:studio": "pnpm --filter @easyshort/db db:studio"
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.6.0"
  }
}
```

### turbo.json
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "db:generate": { "cache": false },
    "db:migrate": { "cache": false }
  }
}
```

## Variables d'environnement clés (`.env`)
```
DATABASE_URL=postgres://...neon...           # NeonDB (pooled)
BUNNY_STREAM_LIBRARY_ID=...
BUNNY_STREAM_API_KEY=...
BUNNY_STREAM_TOKEN_KEY=...                    # signature des URLs de lecture
PAYTECH_API_KEY=...
PAYTECH_API_SECRET=...
PAYTECH_IPN_SECRET=...                        # vérification HMAC de l'IPN
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
OTP_SMS_PROVIDER_KEY=...
WHATSAPP_TOKEN=...                            # fallback OTP
ADMOB_SSV_KEYS_URL=https://gstatic.com/admob/reward/verifier-keys.json
```

## Ce qui est livré ici
Le package **`packages/db`** est complet et compilable : schéma (toutes les tables + enums +
relations), client Neon (driver serverless WS, transactions interactives), et les deux
requêtes métier critiques :
- `unlockEpisode()` — débit de badges **transactionnel + idempotent** (verrou `FOR UPDATE`).
- `creditBadges()` — crédit **idempotent** (achat PayTech, check-in, pub AdMob, bonus).
