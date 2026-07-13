import {
  pgTable, uuid, text, integer, boolean, timestamp, jsonb, unique, index, primaryKey,
} from 'drizzle-orm/pg-core';
import { seriesStatus, videoProvider, videoStatus, subtitleKind } from './enums';

export const genres = pgTable('genres', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  nameFr: text('name_fr').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const videoAssets = pgTable('video_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: videoProvider('provider').notNull().default('bunny'),
  externalId: text('external_id'),   // GUID vidéo Bunny Stream
  libraryId: text('library_id'),     // ID de la librairie Bunny
  playbackHls: text('playback_hls'), // base .m3u8 (signée à la lecture)
  status: videoStatus('status').notNull().default('uploading'),
  durationS: integer('duration_s'),
  renditions: jsonb('renditions'),   // ex: [{res:"720p",bitrate:...}]
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const series = pgTable('series', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  synopsis: text('synopsis'),
  coverUrl: text('cover_url'),
  verticalPosterUrl: text('vertical_poster_url'),
  totalEpisodes: integer('total_episodes').notNull().default(0),
  freeEpisodeCount: integer('free_episode_count').notNull().default(15),
  bundlePriceBadges: integer('bundle_price_badges').notNull().default(1000), // série complète
  status: seriesStatus('status').notNull().default('draft'),
  isExclusive: boolean('is_exclusive').notNull().default(false),
  releaseSchedule: text('release_schedule'),
  tags: text('tags').array(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const seriesGenres = pgTable(
  'series_genres',
  {
    seriesId: uuid('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),
    genreId: uuid('genre_id').notNull().references(() => genres.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.seriesId, t.genreId] })],
);

export const episodes = pgTable(
  'episodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    seriesId: uuid('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    title: text('title'),
    durationS: integer('duration_s'),
    videoAssetId: uuid('video_asset_id').references(() => videoAssets.id),
    isFree: boolean('is_free').notNull().default(false),
    coinCost: integer('coin_cost').notNull().default(20), // badges par épisode
    thumbnailUrl: text('thumbnail_url'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('episodes_series_number_uq').on(t.seriesId, t.number),
    index('episodes_series_idx').on(t.seriesId),
  ],
);

export const subtitles = pgTable('subtitles', {
  id: uuid('id').primaryKey().defaultRandom(),
  episodeId: uuid('episode_id').notNull().references(() => episodes.id, { onDelete: 'cascade' }),
  lang: text('lang').notNull().default('fr'),
  url: text('url').notNull(),
  kind: subtitleKind('kind').notNull().default('sub'),
});
