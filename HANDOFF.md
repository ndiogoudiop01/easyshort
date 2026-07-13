# 🔁 Brief de reprise — easyshort (à lire par Claude Code)

Ce dépôt contient le **socle** d'une plateforme de micro-dramas verticaux (~1 min/épisode),
style GoodShort/DramaBox, pour le marché sénégalais/francophone. Le schéma de données et le
module de paiement sont déjà écrits et **typechecks (tsc --noEmit = 0 erreur)**. Ta mission :
scaffolder le reste et faire tourner le projet.

## Décisions déjà arrêtées (ne pas relitiger)
- **Front web + mobile :** Expo (React Native + **react-native-web** partout, réutilisation max).
- **Backend :** Next.js (Route Handlers) — API/webhooks/crons uniquement, pas de front Next.
- **ORM/DB :** Drizzle + **NeonDB** (driver `neon-serverless` WebSocket pour les transactions).
- **Vidéo :** **Bunny Stream** (transcodage + CDN + URLs signées). Catalogue ~15 séries, ≤90 ép., ép. ≤3 min.
- **Paiement :** **PayTech** (Wave + Orange Money) via **web checkout** (contourne les 30 % des stores).
- **Pubs récompensées :** AdMob (SSV) dès le MVP, pour des badges gratuits.
- **Auth :** OTP téléphone (SMS + fallback WhatsApp).
- **Langue :** français uniquement. **Marché :** Sénégal d'abord.
- **Hébergement :** OVH + Dokploy (à confirmer), Neon serverless pour la DB.

## Monnaie & tarifs (câblés dans le schéma)
- Monnaie = **badges** (`coin_*` dans le schéma). 20 badges / épisode.
- Packs : 100 badges = 260 FCFA · 200 badges = 300 FCFA.
- Série complète = 1000 badges (bundle). VIP hebdo = 2500 FCFA.
- Épisodes gratuits par série : 15 (configurable via `series.free_episode_count`).

## Ce qui est DÉJÀ fait (ne pas réécrire, juste réutiliser)
- **`packages/db`** — schéma Drizzle complet (14 tables : auth, catalogue, wallet/badges,
  billing, engagement), enums, relations, client Neon, et 2 requêtes critiques :
  - `unlockEpisode(userId, episodeId)` — débit de badges **transactionnel + idempotent**
    (contrainte unique entitlement + `SELECT … FOR UPDATE` + CHECK solde ≥ 0).
  - `creditBadges({ idempotencyKey, … })` — crédit **idempotent** (IPN PayTech, check-in, pub, bonus).
- **`packages/core`** — module PayTech :
  - `createCheckout()` — crée la ligne `payments` (montant lu en DB) + initie PayTech → renvoie `redirectUrl`.
  - `verifyIpnSignature()` — vérif **officielle** (api_key_sha256/api_secret_sha256, comparaison à temps constant).
  - `settleIpn()` — règlement idempotent + validation du montant + crédit badges / activation VIP.
- **`apps/api/app/api/paytech/{initiate,ipn}/route.ts`** — wrappers Next **non encore typechecks**
  (Next pas installé dans le sandbox d'origine). À valider une fois `apps/api` scaffoldé.

## À FAIRE (ordre suggéré)
1. **Bootstrap** : `pnpm install` à la racine, créer `.env` (voir `MONOREPO.md`), configurer Neon.
   Puis `pnpm db:generate && pnpm db:migrate` pour créer les tables. Seed : genres, coin_packs
   (100/260, 200/300), plan `vip_week` (2500).
2. **Scaffolder `apps/api`** (Next.js) : installer `next`, valider les 2 route handlers PayTech,
   ajouter l'auth JWT (remplacer le placeholder `x-user-id`), les routes catalogue/épisodes,
   la route de playback (vérif entitlement → URL Bunny signée), et les crons (réconciliation
   paiements pending, expiration VIP).
3. **`packages/core/bunny`** : module Bunny Stream — création de vidéo + upload (bulk des 15 séries),
   webhook `ready`, génération d'URL de lecture **signée à courte durée** après `unlockEpisode`/VIP.
4. **`apps/mobile`** (Expo) : auth OTP, feed vertical (swipe + préchargement épisode suivant),
   player HLS, mur de badges + web checkout (ouvre `redirectUrl`), AdMob rewarded (SSV → `creditBadges`).
5. **`apps/admin`** : CMS séries/épisodes + upload Bunny + tarifs + dashboard funnel.

## Rappels techniques (pièges déjà rencontrés sur d'autres projets)
- **Relational query builder** : toute nouvelle table ET sa `relations()` doivent être réexportées
  depuis `packages/db/src/schema/index.ts` et passées à `drizzle(pool, { schema })`, sinon `db.query.*`
  casse en silence.
- **Transactions** : garder le driver `neon-serverless` (WS) pour tout ce qui touche aux badges
  (`FOR UPDATE`), pas `neon-http`.
- **IPN** : ne JAMAIS créditer sur le retour client ; seul l'IPN vérifié crédite. Idempotence via
  `idempotencyKey = payment:<paymentId>`.

## Kickoff (à me dire dans Claude Code)
« Reprends easyshort : on part du socle `packages/db` + `packages/core` déjà en place. Commence par
le point 1 (bootstrap + migrations + seed), puis enchaîne sur le module Bunny (point 3). »
