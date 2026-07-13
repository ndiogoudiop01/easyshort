import { NextRequest, NextResponse } from 'next/server';
import { verifyIpnSignature, settleIpn, type PaytechIpn } from '@easyshort/core';

// PayTech appelle cette URL (configurée dans le dashboard marchand). Pas de vue : JSON only.
export async function POST(req: NextRequest) {
  // PayTech peut poster en form-urlencoded ou en JSON selon la config.
  let ipn: PaytechIpn;
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    ipn = (await req.json()) as PaytechIpn;
  } else {
    const form = await req.formData();
    ipn = Object.fromEntries(form.entries()) as unknown as PaytechIpn;
  }

  // 1) Vérification de signature (officielle, à temps constant)
  const ok = verifyIpnSignature(ipn, {
    apiKey: process.env.PAYTECH_API_KEY!,
    apiSecret: process.env.PAYTECH_API_SECRET!,
  });
  if (!ok) {
    console.warn('paytech/ipn: signature invalide');
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
  }

  // 2) Règlement idempotent (crédite les badges / active l'abonnement)
  try {
    const result = await settleIpn(ipn);
    return NextResponse.json({ received: true, ...result });
  } catch (e) {
    console.error('paytech/ipn settle:', e);
    // 500 => PayTech relancera l'IPN (le règlement reste idempotent).
    return NextResponse.json({ error: 'Erreur traitement IPN' }, { status: 500 });
  }
}
