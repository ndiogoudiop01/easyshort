export type PaytechEnv = 'test' | 'prod';

export interface PaytechRequestPaymentBody {
  item_name: string;
  item_price: number;       // FCFA (entier)
  currency: 'XOF';
  ref_command: string;      // notre référence (= payment.id)
  command_name: string;
  env: PaytechEnv;
  ipn_url: string;
  success_url: string;
  cancel_url: string;
  custom_field: string;     // JSON stringifié { paymentId, userId }
  target_payment?: string;  // ex: 'Orange Money, Wave' pour restreindre les moyens
}

export interface PaytechRequestPaymentResponse {
  success: number;          // 1 = OK
  token?: string;
  redirect_url?: string;
  redirectUrl?: string;     // selon versions de l'API
  errors?: string[];
}

export type PaytechEventType = 'sale_complete' | 'sale_canceled';

/** Payload envoyé par PayTech sur l'URL IPN (les valeurs arrivent en chaînes). */
export interface PaytechIpn {
  type_event: PaytechEventType;
  ref_command: string;
  item_name: string;
  item_price: string;
  devise?: string;
  currency?: string;
  command_name?: string;
  token?: string;
  env?: PaytechEnv;
  api_key_sha256: string;    // sha256 de TA clé publique (fourni par PayTech)
  api_secret_sha256: string; // sha256 de TON secret
  payment_method?: string;   // 'Orange Money' | 'Wave' | ...
  client_phone?: string;
  custom_field?: string;
}
