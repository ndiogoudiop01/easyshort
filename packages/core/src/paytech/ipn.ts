import { createHash, timingSafeEqual } from 'node:crypto';
import type { PaytechIpn } from './types';

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Comparaison à temps constant de deux hex de même longueur (anti timing-attack). */
function safeEqualHex(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Vérification OFFICIELLE PayTech (amélioration vs l'ancien hash custom).
 * PayTech envoie `api_key_sha256` et `api_secret_sha256` dans chaque IPN.
 * On les compare à sha256(NOS clés) — impossible à forger sans connaître le secret.
 */
export function verifyIpnSignature(
  ipn: Pick<PaytechIpn, 'api_key_sha256' | 'api_secret_sha256'>,
  cfg: { apiKey: string; apiSecret: string },
): boolean {
  return (
    safeEqualHex(ipn.api_key_sha256, sha256Hex(cfg.apiKey)) &&
    safeEqualHex(ipn.api_secret_sha256, sha256Hex(cfg.apiSecret))
  );
}

export function parseCustomField<T = Record<string, unknown>>(raw?: string): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
