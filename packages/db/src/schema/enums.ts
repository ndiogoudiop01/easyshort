import { pgEnum } from 'drizzle-orm/pg-core';

// --- Auth ---
export const userStatus = pgEnum('user_status', ['active', 'banned', 'deleted']);
export const otpPurpose = pgEnum('otp_purpose', ['login', 'verify']);
export const otpChannel = pgEnum('otp_channel', ['sms', 'whatsapp']);
export const devicePlatform = pgEnum('device_platform', ['ios', 'android', 'web']);

// --- Catalogue ---
export const seriesStatus = pgEnum('series_status', ['draft', 'published', 'archived']);
export const videoProvider = pgEnum('video_provider', ['bunny', 'cloudflare', 'mux', 'selfhost']);
export const videoStatus = pgEnum('video_status', ['uploading', 'processing', 'ready', 'errored']);
export const subtitleKind = pgEnum('subtitle_kind', ['sub', 'cc']);

// --- Portefeuille / badges ---
export const ledgerType = pgEnum('ledger_type', [
  'purchase',      // achat de pack (crédit)
  'spend',         // déblocage d'épisode (débit)
  'bonus_signup',  // bonus d'inscription
  'checkin',       // check-in quotidien
  'ad_reward',     // pub récompensée AdMob
  'refund',        // remboursement
  'admin_adjust',  // ajustement manuel
]);
export const unlockMethod = pgEnum('unlock_method', ['free', 'coin', 'vip', 'ad']);

// --- Abonnement / paiement ---
export const planPeriod = pgEnum('plan_period', ['week', 'month', 'year']);
export const subscriptionStatus = pgEnum('subscription_status', ['active', 'expired', 'canceled', 'grace']);
export const paymentProvider = pgEnum('payment_provider', ['paytech']);
export const paymentMethod = pgEnum('payment_method', ['wave', 'orange_money', 'card']);
export const paymentPurpose = pgEnum('payment_purpose', ['coin_pack', 'subscription']);
export const paymentStatus = pgEnum('payment_status', ['pending', 'success', 'failed', 'canceled']);
