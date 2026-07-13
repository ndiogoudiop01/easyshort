import {
  pgTable, uuid, integer, timestamp, text, boolean, unique, index, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';
import { episodes } from './catalog';
import { ledgerType, unlockMethod } from './enums';

// Solde matérialisé (source de vérité = coin_ledger). "coin" = "badge" côté produit.
export const wallets = pgTable(
  'wallets',
  {
    userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    coinBalance: integer('coin_balance').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('wallet_balance_non_negative', sql`${t.coinBalance} >= 0`)],
);

// Registre append-only : chaque mouvement de badges y est tracé.
export const coinLedger = pgTable(
  'coin_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(),             // +crédit / -débit
    type: ledgerType('type').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    refType: text('ref_type'),                     // 'episode' | 'payment' | 'checkin' | 'ad'
    refId: text('ref_id'),
    idempotencyKey: text('idempotency_key').unique(), // garantit qu'un mouvement n'est appliqué qu'une fois
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ledger_user_created_idx').on(t.userId, t.createdAt)],
);

export const coinPacks = pgTable('coin_packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  coins: integer('coins').notNull(),      // ex: 100, 200
  priceFcfa: integer('price_fcfa').notNull(), // ex: 260, 300
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
});

// Droit d'accès à un épisode (déblocage). Unique => idempotence du déblocage.
export const entitlements = pgTable(
  'entitlements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    episodeId: uuid('episode_id').notNull().references(() => episodes.id, { onDelete: 'cascade' }),
    method: unlockMethod('method').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('entitlements_user_episode_uq').on(t.userId, t.episodeId)],
);
