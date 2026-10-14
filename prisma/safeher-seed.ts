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
  for (const lesson of lessons) {
    const saved = await db.safeherContent.upsert({
      where: { slug: lesson.slug },
      update: {},
      create: {
        slug: lesson.slug,
        lesson,
        status: 'APPROVED',
        reviewScope: 'DEMO_ONLY',
        reviewedAt: new Date(),
        reviewedBy: 'synthetic-demo-review',
        reviewExpiresAt: new Date(Date.now() + 180 * 86400000),
      },
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
