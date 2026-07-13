import { eq } from 'drizzle-orm';
import { db } from '../client';
import { wallets, coinLedger } from '../schema/wallet';

type CreditType = 'purchase' | 'bonus_signup' | 'checkin' | 'ad_reward' | 'refund' | 'admin_adjust';

export interface CreditResult {
  status: 'credited' | 'duplicate';
  balance: number;
}

/**
 * Crédite des badges de façon idempotente.
 * Cas d'usage : IPN PayTech (achat de pack), check-in quotidien, pub AdMob, bonus.
 *
 * L'idempotence repose sur `idempotencyKey` (ex: `payment:<paymentId>`,
 * `checkin:<userId>:<YYYY-MM-DD>`, `ad:<ssvTransactionId>`). Un IPN rejoué
 * par PayTech ne crédite donc qu'une seule fois.
 */
export async function creditBadges(params: {
  userId: string;
  amount: number; // > 0
  type: CreditType;
  idempotencyKey: string;
  refType?: string;
  refId?: string;
}): Promise<CreditResult> {
  const { userId, amount, type, idempotencyKey, refType, refId } = params;
  if (amount <= 0) throw new Error('AMOUNT_MUST_BE_POSITIVE');

  return db.transaction(async (tx) => {
    // 1) Déjà appliqué ? -> retourne le solde tel quel
    const dup = await tx
      .select({ balanceAfter: coinLedger.balanceAfter })
      .from(coinLedger)
      .where(eq(coinLedger.idempotencyKey, idempotencyKey))
      .limit(1);
    if (dup.length) return { status: 'duplicate', balance: dup[0].balanceAfter };

    // 2) Garantit + verrouille la ligne wallet
    await tx.insert(wallets).values({ userId, coinBalance: 0 }).onConflictDoNothing();
    const [wallet] = await tx
      .select({ balance: wallets.coinBalance })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .for('update')
      .limit(1);

    const newBalance = wallet.balance + amount;

    // 3) Registre + solde
    await tx.insert(coinLedger).values({
      userId, delta: amount, type, balanceAfter: newBalance, refType, refId, idempotencyKey,
    });
    await tx.update(wallets)
      .set({ coinBalance: newBalance, updatedAt: new Date() })
      .where(eq(wallets.userId, userId));

    return { status: 'credited', balance: newBalance };
  });
}
