import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, payments, coinPacks, plans } from '@easyshort/db';
import { requestPayment, type PaytechConfig } from '../paytech/client';

export interface CheckoutUrls {
  ipnUrl: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutParams {
  userId: string;
  purpose: 'coin_pack' | 'subscription';
  targetId: string;            // coinPacks.id ou plans.id
  urls: CheckoutUrls;
  restrictToLocal?: boolean;   // limite à Orange Money + Wave
}

export interface CheckoutResult {
  paymentId: string;
  token: string;
  redirectUrl: string;
  amountFcfa: number;
}

/**
 * Crée une ligne `payments` (pending) puis initie le paiement PayTech.
 * Le montant vient TOUJOURS de la DB (pack/plan) — jamais du client.
 */
export async function createCheckout(
  cfg: PaytechConfig,
  params: CreateCheckoutParams,
): Promise<CheckoutResult> {
  const { userId, purpose, targetId, urls, restrictToLocal } = params;

  let amountFcfa: number;
  let itemName: string;

  if (purpose === 'coin_pack') {
    const [pack] = await db.select().from(coinPacks).where(eq(coinPacks.id, targetId)).limit(1);
    if (!pack || !pack.isActive) throw new Error('PACK_INTROUVABLE');
    amountFcfa = pack.priceFcfa;
    itemName = `${pack.coins} badges`;
  } else {
    const [plan] = await db.select().from(plans).where(eq(plans.id, targetId)).limit(1);
    if (!plan || !plan.isActive) throw new Error('PLAN_INTROUVABLE');
    amountFcfa = plan.priceFcfa;
    itemName = `Abonnement ${plan.name}`;
  }

  const paymentId = randomUUID();
  await db.insert(payments).values({
    id: paymentId,
    userId,
    provider: 'paytech',
    amountFcfa,
    purpose,
    targetId,
    status: 'pending',
    idempotencyKey: paymentId, // 1 checkout = 1 clé
  });

  const { token, redirectUrl } = await requestPayment(cfg, {
    item_name: itemName,
    item_price: amountFcfa,
    currency: 'XOF',
    ref_command: paymentId,
    command_name: itemName,
    env: cfg.env,
    ipn_url: urls.ipnUrl,
    success_url: urls.successUrl,
    cancel_url: urls.cancelUrl,
    custom_field: JSON.stringify({ paymentId, userId }),
    ...(restrictToLocal ? { target_payment: 'Orange Money, Wave' } : {}),
  });

  await db.update(payments).set({ providerRef: token }).where(eq(payments.id, paymentId));

  return { paymentId, token, redirectUrl, amountFcfa };
}
