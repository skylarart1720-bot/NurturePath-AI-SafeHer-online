import { db } from './db';
import { lessons, type Lesson } from './safeher-content';
import type { Actor } from './permissions';
import { AppError } from './permissions';
export const demoMode = () => process.env.DEMO_MODE === 'true';
export function authorizeSafeher(actor: Actor, action: 'manage' | 'review' | 'partner') {
  const roles =
    action === 'manage'
      ? ['PLATFORM_ADMIN']
      : action === 'review'
        ? ['PLATFORM_ADMIN', 'CONTENT_REVIEWER']
        : ['PLATFORM_ADMIN', 'SUPPORT_PARTNER'];
  if (!roles.includes(actor.role))
    throw new AppError(403, 'FORBIDDEN', 'This role cannot perform that action.');
}
export async function approvedLessons(): Promise<Lesson[]> {
  const rows = await db.safeherContent.findMany({
    where: {
      status: 'APPROVED',
      locale: 'en',
      reviewedAt: { lte: new Date() },
      reviewExpiresAt: { gt: new Date() },
      ...(demoMode() ? {} : { reviewScope: 'PILOT_REVIEWED' }),
    },
    orderBy: { slug: 'asc' },
  });
  return rows.map((row) => ({
    ...(row.lesson as unknown as Lesson),
    review: {
      version: row.version,
      reviewedAt: row.reviewedAt!.toISOString(),
      expiresAt: row.reviewExpiresAt!.toISOString(),
      scope: row.reviewScope,
    },
  }));
}
export async function metric(event: string) {
  const day = new Date().toISOString().slice(0, 10);
  await db.safeherMetric.upsert({
    where: { day_event_locale: { day, event, locale: 'en' } },
    create: { day, event, locale: 'en' },
    update: { count: { increment: 1 } },
  });
}
export function reportCount(count: number) {
  return count < 10 ? 'Below reporting threshold' : count;
}
export const syntheticServices = [
  'Reproductive healthcare',
  'Counselling & mental health',
  'GBV response',
  'Child protection',
  'Legal assistance',
  'Digital safety',
  'Community support',
  'Accessible information',
].map((category, index) => ({
  id: `safeher-demo-${index}`,
  name: `Example ${category} Centre`,
  description: `Synthetic demonstration of ${category.toLowerCase()} service information. This organization does not exist.`,
  region: index % 2 ? 'Ashanti' : 'Greater Accra',
  category,
  accessMethod: index % 2 ? 'In person' : 'Online',
  eligibility: 'Synthetic example: eligibility would be confirmed by a real provider.',
  hours: null,
  contactUrl: null,
  verificationSource: null,
  verifiedAt: null,
  verifiedBy: null,
  synthetic: true,
  partnerId: null,
  referralInstructions:
    'Demonstration only. No contact or referral can be made to this example. For a real service, confirm contact details independently, ask about confidentiality and eligibility, and choose what you share.',
}));
export { lessons };
