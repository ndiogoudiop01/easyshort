import { NextRequest, NextResponse } from 'next/server';
import { createCheckout, paytechConfigFromEnv } from '@easyshort/core';
// import { requireUserId } from '@/lib/auth'; // ⇐ ton middleware d'auth réel

export async function POST(req: NextRequest) {
  try {
    // TODO: remplacer par ton auth (JWT). Placeholder :
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { purpose, targetId, restrictToLocal } = (await req.json()) as {
      purpose: 'coin_pack' | 'subscription';
      targetId: string;
      restrictToLocal?: boolean;
    };

    const apiBase = process.env.NEXT_PUBLIC_API_URL!;
    const webBase = process.env.NEXT_PUBLIC_WEB_URL!;

    const result = await createCheckout(paytechConfigFromEnv(), {
      userId,
      purpose,
      targetId,
      restrictToLocal,
      urls: {
        ipnUrl: `${apiBase}/api/paytech/ipn`,
        successUrl: `${webBase}/paiement/succes`,
        cancelUrl: `${webBase}/paiement/annule`,
      },
    });

    // Le client ouvre result.redirectUrl (web checkout) pour payer via Wave / Orange Money.
    return NextResponse.json(result);
  } catch (e) {
    console.error('paytech/initiate:', e);
    return NextResponse.json({ error: 'Erreur initiation paiement' }, { status: 500 });
  }
}
