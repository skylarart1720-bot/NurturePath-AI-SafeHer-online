import { describe, expect, it } from 'vitest';
import { canTransition, hasConsent, isOverdue, metric, motherInput } from '../../lib/domain';
import { motherScope, allow, type Actor } from '../../lib/permissions';
import { encryptContact, decryptContact } from '../../lib/encryption';
import { simplifyApprovedContent } from '../../lib/ai';
import { assertOnboardingAllowed } from '../../lib/governance';
const actor: Actor = {
  id: 'worker',
  organizationId: 'org-a',
  clinicId: 'clinic-a',
  role: 'HEALTH_WORKER',
  name: 'Demo',
  email: 'demo@example.test',
};
describe('workflow and privacy boundaries', () => {
  it('requires adulthood and explicit registration consent', () => {
    expect(
      motherInput.safeParse({
        name: 'Demo Ama',
        careStage: 'ANTENATAL',
        adultConfirmed: false,
        registrationConsent: true,
      }).success,
    ).toBe(false);
    expect(
      motherInput.safeParse({
        name: 'Demo Ama',
        careStage: 'ANTENATAL',
        adultConfirmed: true,
        registrationConsent: false,
      }).success,
    ).toBe(false);
  });
  it('scopes workers to organization, clinic and assignment', () => {
    expect(motherScope(actor)).toEqual({
      organizationId: 'org-a',
      clinicId: 'clinic-a',
      assignedWorkerId: 'worker',
      archivedAt: null,
    });
    expect(() => motherScope({ ...actor, role: 'PLATFORM_ADMIN' })).toThrow();
    expect(() => allow(actor, ['AUDITOR'])).toThrow();
  });
  it('treats created referrals as incomplete and requires orderly transitions', () => {
    expect(canTransition('CREATED', 'CLOSED')).toBe(false);
    expect(canTransition('CREATED', 'ACCEPTED')).toBe(true);
    expect(canTransition('ACCEPTED', 'ATTENDED')).toBe(true);
    expect(canTransition('ATTENDED', 'CLOSED')).toBe(true);
    expect(canTransition('CLOSED', 'CREATED')).toBe(false);
  });
  it('only pending past-due contacts are overdue', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    expect(isOverdue('2026-10-10T11:00:00Z', 'PENDING', now)).toBe(true);
    expect(isOverdue(now, 'PENDING', now)).toBe(false);
    expect(isOverdue('2026-10-09', 'COMPLETED', now)).toBe(false);
  });
  it('requires registration and current channel consent', () => {
    const consent = [
      { purpose: 'REGISTRATION', channel: 'IN_PERSON', withdrawnAt: null },
      { purpose: 'REMINDERS', channel: 'SMS', withdrawnAt: null },
    ];
    expect(hasConsent(consent, 'SMS')).toBe(true);
    expect(hasConsent(consent, 'WHATSAPP')).toBe(false);
    expect(hasConsent([{ ...consent[0], withdrawnAt: new Date() }, consent[1]], 'SMS')).toBe(false);
    expect(hasConsent([consent[0], { ...consent[1], withdrawnAt: new Date() }], 'SMS')).toBe(false);
  });
  it('suppresses small cells and undefined denominators', () => {
    expect(metric(4, 15, true)).toEqual({
      numerator: null,
      denominator: 15,
      percent: null,
      suppressed: true,
    });
    expect(metric(10, 20, true).percent).toBe(50);
    expect(metric(0, 0).percent).toBe(null);
  });
  it('encrypts contacts with randomized authenticated ciphertext', () => {
    process.env.CONTACT_ENCRYPTION_KEY = '11'.repeat(32);
    const a = encryptContact('+233000000001');
    const b = encryptContact('+233000000001');
    expect(a).not.toBe(b);
    expect(a).not.toContain('+233');
    expect(decryptContact(a)).toBe('+233000000001');
    const parts = a.split('.');
    parts[2] = Buffer.alloc(16).toString('base64');
    expect(() => decryptContact(parts.join('.'))).toThrow();
  });
  it('drafts only approved, non-personalized English sources', () => {
    expect(() =>
      simplifyApprovedContent(
        { id: 'source', body: 'fixed', approvedAt: null, locale: 'en' },
        'en',
      ),
    ).toThrow();
    expect(() =>
      simplifyApprovedContent(
        { id: 'source', body: 'fixed', approvedAt: new Date(), locale: 'en' },
        'tw',
      ),
    ).toThrow();
    const draft = simplifyApprovedContent(
      {
        id: 'source',
        body: 'approximately one day; contact your healthcare facility',
        approvedAt: new Date(),
        locale: 'en',
      },
      'en',
    );
    expect(draft.body).toBe('about one day; contact your clinic');
    expect(draft.approvalRequired).toBe(true);
    expect(draft.modelVersion).toContain('deterministic');
  });
  it('fails closed for real-patient onboarding', () => {
    const old = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'false';
    expect(() => assertOnboardingAllowed()).toThrow(/Real-patient/);
    process.env.DEMO_MODE = old;
  });
});
