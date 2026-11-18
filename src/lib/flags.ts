/**
 * External deliveries and identity services are not configured.
 * These flags are constants so a screen cannot turn them on by accident.
 */
export const flags = {
  emailDelivery: false,
  smsDelivery: false,
  pushNotifications: false,
  phoneIdentity: false,
  oauth: false,
  payments: false,
  webAuthn: true,
} as const;
