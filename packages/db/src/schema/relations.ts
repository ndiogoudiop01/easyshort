import { relations } from 'drizzle-orm';
import { users, sessions, devices } from './auth';
import { series, episodes, genres, seriesGenres, videoAssets, subtitles } from './catalog';
import { wallets, coinLedger, entitlements } from './wallet';
import { subscriptions, plans, payments } from './billing';
import { watchProgress, favorites } from './engagement';

export const usersRelations = relations(users, ({ one, many }) => ({
  wallet: one(wallets, { fields: [users.id], references: [wallets.userId] }),
  sessions: many(sessions),
  devices: many(devices),
  entitlements: many(entitlements),
  subscriptions: many(subscriptions),
  payments: many(payments),
  ledger: many(coinLedger),
  favorites: many(favorites),
  watchProgress: many(watchProgress),
}));

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const devicesRelations = relations(devices, ({ one }) => ({
  user: one(users, { fields: [devices.userId], references: [users.id] }),
}));

export const seriesRelations = relations(series, ({ many }) => ({
  episodes: many(episodes),
  seriesGenres: many(seriesGenres),
  favorites: many(favorites),
}));

export const genresRelations = relations(genres, ({ many }) => ({
  seriesGenres: many(seriesGenres),
}));

export const seriesGenresRelations = relations(seriesGenres, ({ one }) => ({
  series: one(series, { fields: [seriesGenres.seriesId], references: [series.id] }),
  genre: one(genres, { fields: [seriesGenres.genreId], references: [genres.id] }),
}));

export const episodesRelations = relations(episodes, ({ one, many }) => ({
  series: one(series, { fields: [episodes.seriesId], references: [series.id] }),
  videoAsset: one(videoAssets, { fields: [episodes.videoAssetId], references: [videoAssets.id] }),
  entitlements: many(entitlements),
  subtitles: many(subtitles),
}));

export const videoAssetsRelations = relations(videoAssets, ({ many }) => ({
  episodes: many(episodes),
}));

export const subtitlesRelations = relations(subtitles, ({ one }) => ({
  episode: one(episodes, { fields: [subtitles.episodeId], references: [episodes.id] }),
}));

export const entitlementsRelations = relations(entitlements, ({ one }) => ({
  user: one(users, { fields: [entitlements.userId], references: [users.id] }),
  episode: one(episodes, { fields: [entitlements.episodeId], references: [episodes.id] }),
}));

export const coinLedgerRelations = relations(coinLedger, ({ one }) => ({
  user: one(users, { fields: [coinLedger.userId], references: [users.id] }),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  plan: one(plans, { fields: [subscriptions.planId], references: [plans.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
}));

export const watchProgressRelations = relations(watchProgress, ({ one }) => ({
  user: one(users, { fields: [watchProgress.userId], references: [users.id] }),
  episode: one(episodes, { fields: [watchProgress.episodeId], references: [episodes.id] }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, { fields: [favorites.userId], references: [users.id] }),
  series: one(series, { fields: [favorites.seriesId], references: [series.id] }),
}));
