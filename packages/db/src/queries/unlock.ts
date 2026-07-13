import { and, eq } from 'drizzle-orm';
import { db } from '../client';
import { entitlements, wallets, coinLedger } from '../schema/wallet';
import { episodes } from '../schema/catalog';

export type UnlockResult =
  | { status: 'already_unlocked' }
  | { status: 'unlocked_free' }
  | { status: 'unlocked_paid'; newBalance: number }
  | { status: 'insufficient_badges'; balance: number; required: number };

/**
 * Débloque un épisode avec des badges.
 * Garanties :
 *  - Transactionnel : lecture du solde + verrou + écritures dans une seule transaction.
 *  - Idempotent : la contrainte unique (user, episode) empêche tout double débit,
 *    même sous double-tap ou requêtes concurrentes.
 *  - Anti-race : SELECT ... FOR UPDATE verrouille la ligne wallet le temps du calcul.
 *  - Jamais de solde négatif (vérif applicative + contrainte CHECK en DB).
 */
export async function unlockEpisode(userId: string, episodeId: string): Promise<UnlockResult> {
  return db.transaction(async (tx) => {
    // 1) Déjà débloqué ? -> no-op idempotent
    const existing = await tx
      .select({ id: entitlements.id })
      .from(entitlements)
      .where(and(eq(entitlements.userId, userId), eq(entitlements.episodeId, episodeId)))
      .limit(1);
    if (existing.length) return { status: 'already_unlocked' };

    // 2) Récupère l'épisode et son coût
    const [ep] = await tx
      .select({ isFree: episodes.isFree, cost: episodes.coinCost })
      .from(episodes)
      .where(eq(episodes.id, episodeId))
      .limit(1);
    if (!ep) throw new Error('EPISODE_NOT_FOUND');

    // 3) Épisode gratuit -> entitlement sans débit
    if (ep.isFree) {
      await tx.insert(entitlements)
        .values({ userId, episodeId, method: 'free' })
        .onConflictDoNothing();
      return { status: 'unlocked_free' };
    }

    // 4) Garantit la ligne wallet puis la verrouille (FOR UPDATE)
    await tx.insert(wallets).values({ userId, coinBalance: 0 }).onConflictDoNothing();
    const [wallet] = await tx
      .select({ balance: wallets.coinBalance })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .for('update')
      .limit(1);

    const balance = wallet.balance;
    if (balance < ep.cost) {
      return { status: 'insufficient_badges', balance, required: ep.cost };
    }
    const newBalance = balance - ep.cost;

    // 5) Entitlement (2e filet d'idempotence via contrainte unique)
    await tx.insert(entitlements)
      .values({ userId, episodeId, method: 'coin' })
      .onConflictDoNothing();

    // 6) Registre (ledger) — clé d'idempotence déterministe
    await tx.insert(coinLedger).values({
      userId,
      delta: -ep.cost,
      type: 'spend',
      balanceAfter: newBalance,
      refType: 'episode',
      refId: episodeId,
      idempotencyKey: `unlock:${userId}:${episodeId}`,
    });

    // 7) Met à jour le solde matérialisé
    await tx.update(wallets)
      .set({ coinBalance: newBalance, updatedAt: new Date() })
      .where(eq(wallets.userId, userId));

    return { status: 'unlocked_paid', newBalance };
  });
}
