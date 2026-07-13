import { and, eq } from 'drizzle-orm';
import { db, payments, coinPacks, plans, subscriptions, creditBadges } from '@easyshort/db';
import type { PaytechIpn } from './types';
import { parseCustomField } from './ipn';

export type SettleResult =
  | { status: 'settled'; paymentId: string }
  | { status: 'already_settled'; paymentId: string }
  | { status: 'canceled'; paymentId: string }
  | { status: 'amount_mismatch'; paymentId: string }
  | { status: 'ignored' };

function mapMethod(pm?: string): 'wave' | 'orange_money' | 'card' {
  const s = (pm ?? '').toLowerCase();
  if (s.includes('wave')) return 'wave';
  if (s.includes('orange')) return 'orange_money';
  return 'card';
}

function addPeriod(from: Date, period: 'week' | 'month' | 'year'): Date {
  const d = new Date(from);
  if (period === 'week') d.setDate(d.getDate() + 7);
  else if (period === 'month') d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

/**
 * Règle un IPN PayTech DÉJÀ vérifié (signature validée en amont).
 *
 * Améliorations vs le pattern initial (qui se contentait de logguer) :
 *  - Règlement adossé à la DB : garde `payment.status` => IPN rejoué = no-op (idempotent).
 *  - Validation du montant `item_price` contre le montant stocké (anti-falsification).
 *  - Crédit de badges idempotent via `creditBadges(idempotencyKey = payment:<id>)`.
 *  - Gère coin_pack ET subscription (extension d'abonnement).
 */
export async function settleIpn(ipn: PaytechIpn): Promise<SettleResult> {
  const custom = parseCustomField<{ paymentId?: string }>(ipn.custom_field);
  const paymentId = ipn.ref_command || custom?.paymentId;
  if (!paymentId) return { status: 'ignored' };

  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment) return { status: 'ignored' };

  // Idempotence : déjà réglé ?
  if (payment.status === 'success') return { status: 'already_settled', paymentId };

  if (ipn.type_event === 'sale_canceled') {
    await db.update(payments).set({ status: 'canceled', rawIpn: ipn }).where(eq(payments.id, paymentId));
    return { status: 'canceled', paymentId };
  }
  if (ipn.type_event !== 'sale_complete') return { status: 'ignored' };

  // Validation du montant (anti-falsification)
  const ipnAmount = Math.round(Number(ipn.item_price));
  if (!Number.isFinite(ipnAmount) || ipnAmount !== payment.amountFcfa) {
    await db.update(payments).set({ status: 'failed', rawIpn: ipn }).where(eq(payments.id, paymentId));
    return { status: 'amount_mismatch', paymentId };
  }

  // Marque le paiement réussi
  await db.update(payments).set({
    status: 'success',
    method: mapMethod(ipn.payment_method),
    providerRef: ipn.token ?? payment.providerRef,
    rawIpn: ipn,
    settledAt: new Date(),
  }).where(eq(payments.id, paymentId));

  // Livraison
  if (payment.purpose === 'coin_pack' && payment.targetId) {
    const [pack] = await db.select().from(coinPacks).where(eq(coinPacks.id, payment.targetId)).limit(1);
    if (pack) {
      await creditBadges({
        userId: payment.userId,
        amount: pack.coins,
        type: 'purchase',
        idempotencyKey: `payment:${paymentId}`,
        refType: 'payment',
        refId: paymentId,
      });
    }
  } else if (payment.purpose === 'subscription' && payment.targetId) {
    const [plan] = await db.select().from(plans).where(eq(plans.id, payment.targetId)).limit(1);
    if (plan) {
      const [existing] = await db.select().from(subscriptions)
        .where(and(eq(subscriptions.userId, payment.userId), eq(subscriptions.planId, plan.id)))
        .limit(1);
      const now = new Date();
      if (existing && existing.currentPeriodEnd > now && existing.status === 'active') {
        // prolonge l'abonnement en cours
        await db.update(subscriptions)
          .set({ currentPeriodEnd: addPeriod(existing.currentPeriodEnd, plan.period), status: 'active' })
          .where(eq(subscriptions.id, existing.id));
      } else {
        await db.insert(subscriptions).values({
          userId: payment.userId,
          planId: plan.id,
          status: 'active',
          startedAt: now,
          currentPeriodEnd: addPeriod(now, plan.period),
          providerRef: ipn.token,
        });
      }
    }
  }

  return { status: 'settled', paymentId };
}
