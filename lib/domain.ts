import { z } from 'zod';
export const motherInput = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone: z
      .string()
      .regex(/^\+?[0-9 ()-]{7,20}$/)
      .or(z.literal(''))
      .default(''),
    preferredLanguage: z.enum(['en', 'tw', 'ee', 'dag']).default('en'),
    careStage: z.enum(['ANTENATAL', 'POSTNATAL']),
    adultConfirmed: z.literal(true),
    registrationConsent: z.literal(true),
    smsConsent: z.boolean().default(false),
    whatsappConsent: z.boolean().default(false),
    estimatedDueDate: z.string().date().optional().or(z.literal('')),
  })
  .strict();
export const appointmentInput = z
  .object({
    motherId: z.string().uuid(),
    scheduledAt: z.string().datetime(),
    kind: z.enum(['ANTENATAL', 'POSTNATAL', 'FOLLOW_UP']),
  })
  .strict();
export const referralInput = z
  .object({
    motherId: z.string().uuid(),
    receivingFacility: z.string().trim().min(3).max(120),
    reasonCode: z.enum([
      'CONTINUITY_OF_CARE',
      'SCHEDULED_REVIEW',
      'FACILITY_TRANSFER',
      'REQUESTED_SUPPORT',
    ]),
    urgency: z.enum(['ROUTINE', 'CLINICIAN_SELECTED']).default('ROUTINE'),
  })
  .strict();
export const transitions: Record<string, readonly string[]> = {
  CREATED: ['ACCEPTED', 'UNABLE_TO_CONTACT'],
  ACCEPTED: ['ATTENDED', 'UNABLE_TO_CONTACT'],
  ATTENDED: ['CLOSED'],
  UNABLE_TO_CONTACT: ['ACCEPTED'],
  CLOSED: [],
};
export function canTransition(from: string, to: string) {
  return transitions[from]?.includes(to) ?? false;
}
export function isOverdue(date: Date | string, status: string, now = new Date()) {
  return status === 'PENDING' && new Date(date) < now;
}
export function hasConsent(
  consents: { purpose: string; channel: string; withdrawnAt: Date | string | null }[],
  channel: string,
) {
  return (
    consents.some((c) => c.purpose === 'REGISTRATION' && !c.withdrawnAt) &&
    consents.some((c) => c.purpose === 'REMINDERS' && c.channel === channel && !c.withdrawnAt)
  );
}
export function metric(numerator: number, denominator: number, suppress = false) {
  return {
    numerator: suppress && numerator < 10 ? null : numerator,
    denominator: suppress && denominator < 10 ? null : denominator,
    percent:
      denominator && (!suppress || (numerator >= 10 && denominator >= 10))
        ? Math.round((numerator / denominator) * 100)
        : null,
    suppressed: suppress && (numerator < 10 || denominator < 10),
  };
}
export const demoSafety =
  'Synthetic demonstration only. NurturePath coordinates follow-up; it does not provide medical advice or emergency services.';
