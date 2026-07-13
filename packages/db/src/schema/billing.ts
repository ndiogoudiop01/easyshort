import { pgTable, uuid, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './auth';
import {
  planPeriod, subscriptionStatus,
  paymentProvider, paymentMethod, paymentPurpose, paymentStatus,
} from './enums';

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),  // ex: 'vip_week'
  name: text('name').notNull(),
  period: planPeriod('period').notNull(),
  priceFcfa: integer('price_fcfa').notNull(), // ex: 2500
  isActive: boolean('is_active').notNull().default(true),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').notNull().references(() => plans.id),
  status: subscriptionStatus('status').notNull().default('active'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  autoRenew: boolean('auto_renew').notNull().default(true),
  providerRef: text('provider_ref'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: paymentProvider('provider').notNull().default('paytech'),
  method: paymentMethod('method'),                // wave | orange_money | card
  amountFcfa: integer('amount_fcfa').notNull(),
  purpose: paymentPurpose('purpose').notNull(),   // coin_pack | subscription
  targetId: uuid('target_id'),                    // coin_packs.id ou plans.id
  status: paymentStatus('status').notNull().default('pending'),
  providerRef: text('provider_ref'),              // référence PayTech
  idempotencyKey: text('idempotency_key').notNull().unique(),
  rawIpn: jsonb('raw_ipn'),                        // payload IPN brut (audit)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  settledAt: timestamp('settled_at', { withTimezone: true }),
});
