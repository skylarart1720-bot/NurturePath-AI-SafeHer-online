import { db } from './db';
export async function maintainSafeher(now = new Date()) {
  await db.$transaction([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passwordReset.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.safeherEnrollment.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.safeherFeedback.deleteMany({ where: { createdAt: { lt: new Date(+now - 90 * 86400000) } } }),
    db.safeherMetric.deleteMany({
      where: { day: { lt: new Date(+now - 365 * 86400000).toISOString().slice(0, 10) } },
    }),
    db.auditEvent.deleteMany({
      where: { entityType: 'SafeHer', timestamp: { lt: new Date(+now - 365 * 86400000) } },
    }),
  ]);
  return {
    expiredContent: await db.safeherContent.count({
      where: { status: 'APPROVED', reviewExpiresAt: { lte: now } },
    }),
    overdueServices: await db.safeherService.count({
      where: {
        synthetic: false,
        publicationStatus: 'PUBLISHED',
        OR: [{ reviewExpiresAt: null }, { reviewExpiresAt: { lte: now } }],
      },
    }),
  };
}
