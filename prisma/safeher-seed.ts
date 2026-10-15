import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../lib/db';
import { lessons, syntheticServices } from '../lib/safeher';
if (process.env.DEMO_MODE !== 'true')
  throw new Error('SafeHer synthetic seed requires DEMO_MODE=true');
const password = process.env.SAFEHER_DEMO_PASSWORD ?? process.env.DEMO_PASSWORD;
if (!password || password.length < 12 || password.startsWith('replace-'))
  throw new Error('Set SAFEHER_DEMO_PASSWORD to at least 12 characters.');
try {
  // Seed from the destination database clock; workstation clock skew can hide lessons.
  const [{ now: databaseNow }] = await db.$queryRaw<
    { now: Date }[]
  >`SELECT CURRENT_TIMESTAMP AS now`;
  for (const lesson of lessons) {
    // Repair only future-dated synthetic approvals; preserve real reviews and expired content.
    await db.safeherContent.updateMany({
      where: {
        slug: lesson.slug,
        status: 'APPROVED',
        reviewScope: 'DEMO_ONLY',
        reviewedBy: 'synthetic-demo-review',
        reviewedAt: { gt: databaseNow },
      },
      data: { reviewedAt: databaseNow },
    });
    const saved = await db.safeherContent.upsert({
      where: { slug: lesson.slug },
      update: {},
      create: {
        slug: lesson.slug,
        lesson,
        status: 'APPROVED',
        reviewScope: 'DEMO_ONLY',
        reviewedAt: databaseNow,
        reviewedBy: 'synthetic-demo-review',
        reviewExpiresAt: new Date(databaseNow.getTime() + 180 * 86400000),
      },
    });
    await db.safeherRevision.updateMany({
      where: {
        slug: saved.slug,
        version: saved.version,
        action: 'SEED_BASELINE',
        actorId: 'synthetic-demo-review',
        reviewScope: 'DEMO_ONLY',
        reviewedAt: { gt: databaseNow },
      },
      data: { reviewedAt: saved.reviewedAt },
    });
    await db.safeherRevision.upsert({
      where: { slug_version: { slug: saved.slug, version: saved.version } },
      update: {},
      create: {
        slug: saved.slug,
        version: saved.version,
        locale: saved.locale,
        lesson,
        status: saved.status,
        reviewScope: saved.reviewScope,
        reviewedAt: saved.reviewedAt,
        reviewExpiresAt: saved.reviewExpiresAt,
        actorId: saved.reviewedBy ?? 'synthetic-demo-review',
        action: 'SEED_BASELINE',
      },
    });
  }
  for (const service of syntheticServices)
    await db.safeherService.upsert({ where: { id: service.id }, update: {}, create: service });
  const organization = await db.organization.upsert({
    where: { id: 'safeher-demo-org' },
    update: {},
    create: { id: 'safeher-demo-org', name: 'SafeHer synthetic demo' },
  });
  for (const [role, email] of [
    ['PLATFORM_ADMIN', 'admin@safeher.example'],
    ['CONTENT_REVIEWER', 'reviewer@safeher.example'],
    ['SUPPORT_PARTNER', 'partner@safeher.example'],
    ['REGISTERED_USER', 'learner@safeher.example'],
  ] as const)
    await db.user.upsert({
      where: { email },
      update: {},
      create: {
        organizationId: organization.id,
        email,
        name: 'Synthetic ' + role.toLowerCase(),
        role,
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
  console.log('SafeHer demo seed complete. Existing records and passwords preserved.');
} finally {
  await db.$disconnect();
}
