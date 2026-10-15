import 'dotenv/config';
import { db } from '../lib/db';
import { ghanaDirectorySources, ghanaDirectoryCheckedAt } from '../lib/ghana-directory-sources';
import { directoryReviewDays } from '../lib/safeher-directory';
try {
  const [{ now: databaseNow }] = await db.$queryRaw<
    { now: Date }[]
  >`SELECT CURRENT_TIMESTAMP AS now`;
  const age = databaseNow.getTime() - +new Date(ghanaDirectoryCheckedAt);
  if (age < 0 || age > directoryReviewDays * 86400000)
    throw new Error('This evidence snapshot needs a new source review before importing.');
  const actor = await db.user.findFirstOrThrow({
    where: {
      email: process.env.SAFEHER_DIRECTORY_ADMIN ?? 'admin@safeher.example',
      role: 'PLATFORM_ADMIN',
      status: 'ACTIVE',
    },
  });
  await db.$transaction(
    async (tx) => {
      const removed = await tx.safeherService.deleteMany({ where: { synthetic: true } });
      if (removed.count)
        await tx.auditEvent.create({
          data: {
            actorId: actor.id,
            organizationId: actor.organizationId,
            entityType: 'SafeHer',
            entityId: 'directory',
            action: 'SYNTHETIC_DIRECTORY_ENTRIES_REMOVED',
          },
        });
      for (const entry of ghanaDirectorySources) {
        const exists = await tx.safeherService.findUnique({ where: { id: entry.id } });
        if (exists) continue; // Preserve subsequent administrator edits and revocations.
        const saved = await tx.safeherService.create({
          data: {
            ...entry,
            verifiedAt: new Date(ghanaDirectoryCheckedAt),
            verifiedBy: actor.id,
            reviewExpiresAt: new Date(
              +new Date(ghanaDirectoryCheckedAt) + directoryReviewDays * 86400000,
            ),
          },
        });
        await tx.safeherServiceReview.create({
          data: {
            serviceId: saved.id,
            actorId: actor.id,
            action: 'OFFICIAL_PUBLICATION_CHECK',
            snapshot: JSON.parse(JSON.stringify(saved)),
          },
        });
        await tx.auditEvent.create({
          data: {
            actorId: actor.id,
            organizationId: actor.organizationId,
            entityType: 'SafeHer',
            entityId: entry.id,
            action: 'OFFICIAL_PUBLICATION_CHECK',
          },
        });
      }
      const narrowed = await tx.safeherService.updateMany({
        where: {
          id: 'safeher-gh-msi',
          serviceCategories: { equals: ['Counselling & mental health'] },
          verificationMethod: 'OFFICIAL_PUBLICATION',
          verifiedAt: new Date(ghanaDirectoryCheckedAt),
        },
        data: { serviceCategories: ['Pregnancy-options counselling'] },
      });
      if (narrowed.count)
        await tx.auditEvent.create({
          data: {
            actorId: actor.id,
            organizationId: actor.organizationId,
            entityType: 'SafeHer',
            entityId: 'safeher-gh-msi',
            action: 'PREGNANCY_COUNSELLING_SCOPE_CORRECTION',
          },
        });
      const row = await tx.safeherContent.findUnique({ where: { slug: 'trusted-support' } });
      if (row) {
        const lesson = row.lesson as { paragraphs?: string[] };
        const old = 'Our demo directory contains synthetic examples, not live services.';
        if (lesson.paragraphs?.some((p) => p.includes(old))) {
          lesson.paragraphs = lesson.paragraphs.map((p) =>
            p.replace(
              old,
              'The directory lists real organisations with public-source checks. Confirm availability and confidentiality directly; SafeHer does not send referrals.',
            ),
          );
          const saved = await tx.safeherContent.update({
            where: { slug: row.slug },
            data: {
              lesson,
              version: { increment: 1 },
              status: 'DRAFT',
              reviewedAt: null,
              reviewedBy: null,
              reviewExpiresAt: null,
            },
          });
          await tx.safeherRevision.create({
            data: {
              slug: saved.slug,
              version: saved.version,
              locale: saved.locale,
              lesson: JSON.parse(JSON.stringify(saved.lesson)),
              status: saved.status,
              reviewScope: saved.reviewScope,
              actorId: actor.id,
              action: 'DIRECTORY_CONTEXT_CORRECTION_DRAFT',
            },
          });
          await tx.auditEvent.create({
            data: {
              actorId: actor.id,
              organizationId: actor.organizationId,
              entityType: 'SafeHer',
              entityId: row.slug,
              action: 'DIRECTORY_CONTEXT_CORRECTION',
            },
          });
        }
      }
    },
    { maxWait: 15000, timeout: 120000 },
  );
  console.log(
    'Real Ghanaian listings imported; synthetic directory entries removed. Existing real records preserved. No organisations contacted or referrals sent.',
  );
} finally {
  await db.$disconnect();
}
