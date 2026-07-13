import type { PaytechRequestPaymentBody, PaytechRequestPaymentResponse } from './types';

const PAYTECH_BASE = 'https://paytech.sn';

export interface PaytechConfig {
  apiKey: string;
  apiSecret: string;
  env: 'test' | 'prod';
}

export function paytechConfigFromEnv(): PaytechConfig {
  const apiKey = process.env.PAYTECH_API_KEY;
  const apiSecret = process.env.PAYTECH_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error('PAYTECH_API_KEY / PAYTECH_API_SECRET manquants');
  }
  return { apiKey, apiSecret, env: (process.env.PAYTECH_ENV as 'test' | 'prod') ?? 'test' };
}

/** Crée une demande de paiement PayTech et renvoie le token + l'URL de redirection. */
export async function requestPayment(
  cfg: PaytechConfig,
  body: PaytechRequestPaymentBody,
): Promise<{ token: string; redirectUrl: string }> {
  const res = await fetch(`${PAYTECH_BASE}/api/payment/request-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      API_KEY: cfg.apiKey,
      API_SECRET: cfg.apiSecret,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as PaytechRequestPaymentResponse;
  if (!res.ok || data.success !== 1) {
    throw new Error(`PayTech request-payment échec: ${JSON.stringify(data.errors ?? data)}`);
  }

  const redirectUrl = data.redirect_url ?? data.redirectUrl;
  if (!data.token || !redirectUrl) {
    throw new Error('PayTech: token/redirect_url manquant dans la réponse');
  }
  return { token: data.token, redirectUrl };
}
