import {
  pgTable, uuid, integer, boolean, timestamp, date, text, primaryKey, unique,
} from 'drizzle-orm/pg-core';
import { users } from './auth';
import { episodes, series } from './catalog';

export const watchProgress = pgTable(
  'watch_progress',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    episodeId: uuid('episode_id').notNull().references(() => episodes.id, { onDelete: 'cascade' }),
    positionS: integer('position_s').notNull().default(0),
    completed: boolean('completed').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.episodeId] })],
);

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    seriesId: uuid('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.seriesId] })],
);

export const checkins = pgTable(
  'checkins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    coinsAwarded: integer('coins_awarded').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('checkins_user_day_uq').on(t.userId, t.day)], // 1 check-in / jour max
);

export const adRewards = pgTable('ad_rewards', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull().default('admob'),
  coinsAwarded: integer('coins_awarded').notNull(),
  verified: boolean('verified').notNull().default(false),
  ssvTransactionId: text('ssv_transaction_id').unique(), // AdMob Server-Side Verification
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
