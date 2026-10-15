import { z } from 'zod';
import { readJson } from '@/lib/request-body';
import { answerQuestion } from '@/lib/safeher-assistant';
import { configuredAdapter } from '@/lib/safeher-provider';
import { requestRateIdentity } from '@/lib/safeher-rate-identity';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import {
  checkOrigin,
  currentActor,
  requireActor,
  rateLimit,
  sessionCookie,
  hashToken,
} from '@/lib/auth';
import { cookies } from 'next/headers';
import { AppError } from '@/lib/permissions';
import { approvedLessons, authorizeSafeher, metric, reportCount } from '@/lib/safeher';
const lessonSchema = z
  .object({
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(80),
    title: z.string().min(3).max(150),
    category: z.string().max(80),
    summary: z.string().max(300),
    paragraphs: z.array(z.string().min(1).max(2000)).min(1).max(8),
    keywords: z.array(z.string().max(30)).max(30),
    source: z
      .url()
      .refine(
        (url) => ['www.who.int', 'www.unicef.org', 'www.unfpa.org'].includes(new URL(url).hostname),
        'Use an approved source domain',
      ),
    sourceName: z.string().max(160),
    question: z.string().max(300),
    answers: z.array(z.string().max(250)).min(2).max(5),
    correct: z.number().int().min(0).max(4),
    explanation: z.string().max(500),
  })
  .strict()
  .refine((x) => x.correct < x.answers.length);
const serviceSchema = z
  .object({
    name: z.string().min(3).max(150),
    description: z.string().max(1200),
    region: z.string().min(1).max(80),
    category: z.string().min(1).max(80),
    accessMethod: z.enum(['Online', 'In person', 'Telephone']),
    eligibility: z.string().min(1).max(800),
    hours: z.string().max(200).nullable(),
    contactUrl: z
      .url()
      .refine((x) => new URL(x).protocol === 'https:')
      .nullable(),
    verificationSource: z
      .url()
      .refine((x) => new URL(x).protocol === 'https:')
      .nullable(),
    synthetic: z.boolean(),
    contactPhone: z
      .string()
      .regex(/^(?:\+[1-9]\d{6,14}|\d{3,10})$/)
      .nullable()
      .optional(),
    contactEmail: z.email().max(200).nullable().optional(),
    serviceCategories: z.array(z.string().min(1).max(80)).max(8).optional(),
    accessMethods: z
      .array(z.enum(['Online', 'In person', 'Telephone']))
      .max(3)
      .optional(),
    referralInstructions: z.string().min(1).max(1500),
  })
  .strict();
type Context = { params: Promise<{ path: string[] }> };
const response = (data: unknown, status = 200) =>
  Response.json({ data }, { status, headers: { 'Cache-Control': 'no-store' } });
async function audit(
  actor: Awaited<ReturnType<typeof requireActor>>,
  action: string,
  id: string,
  transaction: Pick<typeof db, 'auditEvent'> = db,
) {
  await transaction.auditEvent.create({
    data: {
      actorId: actor.id,
      organizationId: actor.organizationId,
      entityType: 'SafeHer',
      entityId: id,
      action,
    },
  });
}
async function handle(request: Request, context: Context) {
  const path = (await context.params).path.join('/');
  const method = request.method;
  let databaseUnavailable = false;
  let payload: unknown;
  if (method !== 'GET') {
    checkOrigin(request);
    try {
      const { identity, identified } = await requestRateIdentity(request);
      await rateLimit(
        'safeher:' +
          (['ask', 'metrics', 'feedback', 'referrals', 'progress', 'account', 'logout'].includes(
            path,
          )
            ? path
            : 'staff') +
          ':' +
          createHash('sha256').update(identity).digest('hex'),
        identified ? 60 : 600,
      );
    } catch (error) {
      if (path !== 'ask' || error instanceof AppError) throw error;
      databaseUnavailable = true;
    }
  }
  if (method === 'POST') payload = await readJson(request);
  if (path === 'content' && method === 'GET') return response(await approvedLessons());
  if (path === 'directory' && method === 'GET')
    return response(
      await db.safeherService.findMany({
        where: {
          synthetic: false,
          publicationStatus: 'PUBLISHED',
          reviewExpiresAt: { gt: new Date() },
          verifiedAt: { lte: new Date(), gte: new Date(Date.now() - 180 * 86400000) },
          contactUrl: { not: null },
          verificationSource: { not: null },
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          region: true,
          category: true,
          accessMethod: true,
          eligibility: true,
          hours: true,
          contactUrl: true,
          contactPhone: true,
          contactEmail: true,
          serviceCategories: true,
          accessMethods: true,
          verificationMethod: true,
          verificationSource: true,
          verifiedAt: true,
          reviewExpiresAt: true,
          accessibility: true,
          accessibilityConfirmedAt: true,
          publicationStatus: true,
          synthetic: true,
          referralInstructions: true,
        },
      }),
    );
  if (path === 'ask' && method === 'POST') {
    const { question } = z
      .object({ question: z.string().trim().min(2).max(1000), locale: z.literal('en').optional() })
      .strict()
      .parse(payload);
    let corpus: Awaited<ReturnType<typeof approvedLessons>> = [];
    if (!databaseUnavailable)
      try {
        corpus = await approvedLessons();
      } catch {
        /* Return static safety fallback during database outage. */
        databaseUnavailable = true;
      }
    const answer = await answerQuestion(question, corpus, configuredAdapter());
    if (!databaseUnavailable)
      await metric(answer.found ? 'retrieval_success' : 'retrieval_unavailable').catch(() => {});
    return response({
      ...answer,
      mode: 'Source-grounded extractive assistance',
      reviewScope: process.env.DEMO_MODE === 'true' ? 'DEMO_ONLY' : 'PILOT_REVIEWED',
    });
  }
  if (path === 'metrics' && method === 'POST') {
    const { event } = z
      .object({
        event: z.enum([
          'resource_access',
          'module_complete',
          'directory_search',
          'accessibility_feedback',
        ]),
      })
      .strict()
      .parse(payload);
    await metric(event);
    return response({ recorded: true });
  }
  if (path === 'feedback' && method === 'POST') {
    const data = z
      .object({
        category: z.enum(['Accessibility', 'Content clarity', 'Service information', 'Privacy']),
        rating: z.enum(['Helpful', 'Needs improvement']),
      })
      .strict()
      .parse(payload);
    await db.safeherFeedback.create({ data });
    await metric('accessibility_feedback');
    return response({ recorded: true });
  }
  if (path === 'referrals' && method === 'POST')
    throw new AppError(
      403,
      'REFERRALS_DISABLED',
      'Referral transmission is disabled. No partner agreement or safeguarding approval is in place.',
    );
  if (path === 'me' && method === 'GET') {
    const actor = await currentActor();
    return response(
      actor
        ? {
            role: actor.role,
            progress: await db.safeherProgress.findMany({
              where: { userId: actor.id },
              select: { slug: true },
            }),
          }
        : null,
    );
  }
  if (path === 'progress' && method === 'POST') {
    const actor = await requireActor();
    const { slug } = z
      .object({ slug: z.string().max(80) })
      .strict()
      .parse(payload);
    if (!(await approvedLessons()).some((l) => l.slug === slug))
      throw new AppError(404, 'CONTENT', 'Module unavailable.');
    await db.safeherProgress.upsert({
      where: { userId_slug: { userId: actor.id, slug } },
      create: { userId: actor.id, slug },
      update: {},
    });
    return response({ saved: true });
  }
  if (path === 'progress' && method === 'DELETE') {
    const actor = await requireActor();
    await db.$transaction([
      db.safeherDeletion.upsert({
        where: { userId: actor.id },
        create: { userId: actor.id, scope: 'PROGRESS' },
        update: { scope: 'PROGRESS', createdAt: new Date() },
      }),
      db.safeherProgress.deleteMany({ where: { userId: actor.id } }),
    ]);
    return response({ deleted: true });
  }
  if (path === 'account' && method === 'DELETE') {
    const actor = await requireActor();
    if (actor.role !== 'REGISTERED_USER')
      throw new AppError(
        403,
        'PRIVILEGED_ACCOUNT',
        'Staff account removal requires an administrator.',
      );
    await db.$transaction(async (tx) => {
      await tx.safeherDeletion.upsert({
        where: { userId: actor.id },
        create: { userId: actor.id, scope: 'ACCOUNT' },
        update: { scope: 'ACCOUNT', createdAt: new Date() },
      });
      await tx.safeherProgress.deleteMany({ where: { userId: actor.id } });
      await tx.session.deleteMany({ where: { userId: actor.id } });
      await tx.passwordReset.deleteMany({ where: { userId: actor.id } });
      await tx.safeherEnrollment.deleteMany({ where: { userId: actor.id } });
      await tx.user.delete({ where: { id: actor.id } });
    });
    (await cookies()).delete(sessionCookie);
    return response({ deleted: true });
  }
  if (path === 'logout' && method === 'POST') {
    const token = (await cookies()).get(sessionCookie)?.value;
    if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
    (await cookies()).delete(sessionCookie);
    return response({ signedOut: true });
  }
  const actor = await requireActor();
  if (path === 'admin/history' && method === 'GET') {
    authorizeSafeher(actor, 'review');
    const slug = new URL(request.url).searchParams.get('slug');
    if (!slug || slug.length > 80) throw new AppError(400, 'SLUG', 'Select a lesson.');
    return response(
      await db.safeherRevision.findMany({
        where: { slug },
        orderBy: { version: 'desc' },
        take: 100,
      }),
    );
  }
  if (path === 'admin/rollback' && method === 'POST') {
    authorizeSafeher(actor, 'review');
    const data = z
      .object({
        slug: z.string().max(80),
        revision: z.number().int().positive(),
        version: z.number().int().positive(),
      })
      .strict()
      .parse(payload);
    await db.$transaction(async (tx) => {
      const revision = await tx.safeherRevision.findUnique({
        where: { slug_version: { slug: data.slug, version: data.revision } },
      });
      if (!revision) throw new AppError(404, 'REVISION', 'Revision unavailable.');
      lessonSchema.parse(revision.lesson);
      const changed = await tx.safeherContent.updateMany({
        where: { slug: data.slug, version: data.version },
        data: {
          lesson: lessonSchema.parse(revision.lesson),
          status: 'DRAFT',
          reviewedAt: null,
          reviewedBy: null,
          reviewExpiresAt: null,
          version: { increment: 1 },
        },
      });
      if (!changed.count)
        throw new AppError(409, 'CONFLICT', 'Content changed. Reload before restoring.');
      const saved = await tx.safeherContent.findUniqueOrThrow({ where: { slug: data.slug } });
      await tx.safeherRevision.create({
        data: {
          slug: saved.slug,
          version: saved.version,
          locale: saved.locale,
          lesson: lessonSchema.parse(saved.lesson),
          status: 'DRAFT',
          reviewScope: saved.reviewScope,
          actorId: actor.id,
          action: 'RESTORE_DRAFT',
        },
      });
      await audit(actor, 'CONTENT_RESTORE_DRAFT', data.slug, tx);
    });
    return response({ saved: true, requiresReview: true });
  }
  if (path === 'admin/translation' && method === 'POST') {
    authorizeSafeher(actor, 'review');
    const data = z
      .object({
        sourceSlug: z.string().max(80),
        sourceVersion: z.number().int().positive(),
        locale: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
        lesson: lessonSchema,
      })
      .strict()
      .parse(payload);
    if (data.locale === 'en' || data.lesson.slug !== data.sourceSlug)
      throw new AppError(400, 'LOCALE', 'Use a separate locale and the source lesson slug.');
    await db.$transaction(async (tx) => {
      const source = await tx.safeherContent.findUnique({ where: { slug: data.sourceSlug } });
      if (!source || source.version !== data.sourceVersion)
        throw new AppError(409, 'CONFLICT', 'Source content changed.');
      const saved = await tx.safeherTranslation.upsert({
        where: { sourceSlug_locale: { sourceSlug: data.sourceSlug, locale: data.locale } },
        create: data,
        update: {
          ...data,
          version: { increment: 1 },
          status: 'DRAFT',
          reviewedAt: null,
          reviewedBy: null,
          reviewExpiresAt: null,
        },
      });
      await tx.safeherRevision.create({
        data: {
          slug: data.sourceSlug + ':' + data.locale,
          version: saved.version,
          locale: data.locale,
          lesson: data.lesson,
          status: 'DRAFT',
          reviewScope: 'PILOT_REVIEWED',
          actorId: actor.id,
          action: 'TRANSLATION_DRAFT',
        },
      });
      await audit(actor, 'TRANSLATION_DRAFT', saved.id, tx);
    });
    return response({ saved: true });
  }
  if (path === 'admin/translation-review' && method === 'POST') {
    authorizeSafeher(actor, 'review');
    const data = z
      .object({
        id: z.string().max(100),
        version: z.number().int().positive(),
        status: z.enum(['APPROVED', 'DRAFT']),
      })
      .strict()
      .parse(payload);
    if (data.status === 'APPROVED' && process.env.SAFEHER_TRANSLATION_REVIEW_ENABLED !== 'true')
      throw new AppError(
        403,
        'REVIEW_GATE',
        'Qualified language and safeguarding review must be completed first.',
      );
    await db.$transaction(async (tx) => {
      const row = await tx.safeherTranslation.findUnique({ where: { id: data.id } });
      if (!row) throw new AppError(404, 'MISSING', 'Translation unavailable.');
      const source = await tx.safeherContent.findUnique({ where: { slug: row.sourceSlug } });
      if (
        data.status === 'APPROVED' &&
        (!source ||
          source.version !== row.sourceVersion ||
          source.status !== 'APPROVED' ||
          !source.reviewExpiresAt ||
          source.reviewExpiresAt <= new Date() ||
          source.reviewScope !== 'PILOT_REVIEWED')
      )
        throw new AppError(
          409,
          'SOURCE_REVIEW',
          'A current professionally reviewed source version is required.',
        );
      lessonSchema.parse(row.lesson);
      const changed = await tx.safeherTranslation.updateMany({
        where: { id: data.id, version: data.version },
        data: {
          status: data.status,
          version: { increment: 1 },
          reviewedBy: data.status === 'APPROVED' ? actor.id : null,
          reviewedAt: data.status === 'APPROVED' ? new Date() : null,
          reviewExpiresAt: data.status === 'APPROVED' ? source?.reviewExpiresAt : null,
        },
      });
      if (!changed.count) throw new AppError(409, 'CONFLICT', 'Translation changed.');
      const saved = await tx.safeherTranslation.findUniqueOrThrow({ where: { id: data.id } });
      await tx.safeherRevision.create({
        data: {
          slug: row.sourceSlug + ':' + row.locale,
          version: saved.version,
          locale: row.locale,
          lesson: lessonSchema.parse(saved.lesson),
          status: data.status,
          reviewScope: 'PILOT_REVIEWED',
          reviewedAt: saved.reviewedAt,
          reviewExpiresAt: saved.reviewExpiresAt,
          actorId: actor.id,
          action: 'TRANSLATION_' + data.status,
        },
      });
      await audit(actor, 'TRANSLATION_' + data.status, data.id, tx);
    });
    return response({ saved: true });
  }
  if (path === 'admin/service-status' && method === 'POST') {
    authorizeSafeher(actor, 'manage');
    const data = z
      .object({ id: z.string().max(100), status: z.enum(['PUBLISHED', 'WITHDRAWN']) })
      .strict()
      .parse(payload);
    await db.$transaction(async (tx) => {
      const row = await tx.safeherService.update({
        where: { id: data.id },
        data: {
          publicationStatus: data.status,
          verifiedAt: null,
          verifiedBy: null,
          reviewExpiresAt: null,
        },
      });
      await tx.safeherServiceReview.create({
        data: {
          serviceId: row.id,
          actorId: actor.id,
          action: data.status,
          snapshot: JSON.parse(JSON.stringify(row)),
        },
      });
      await audit(actor, 'SERVICE_' + data.status, row.id, tx);
    });
    return response({ saved: true });
  }
  if (path === 'admin/accessibility' && method === 'POST') {
    authorizeSafeher(actor, 'manage');
    const data = z
      .object({
        id: z.string().max(100),
        features: z
          .array(
            z.enum([
              'Step-free access',
              'Sign language support',
              'Accessible toilet',
              'Screen-reader accessible service',
            ]),
          )
          .max(4),
        evidence: z.string().min(10).max(500),
      })
      .strict()
      .parse(payload);
    await db.$transaction(async (tx) => {
      const row = await tx.safeherService.findUniqueOrThrow({ where: { id: data.id } });
      if (row.synthetic)
        throw new AppError(400, 'SYNTHETIC', 'Synthetic accessibility cannot be confirmed.');
      await tx.safeherService.update({
        where: { id: row.id },
        data: {
          accessibility: [...new Set(data.features)],
          accessibilityConfirmedAt: data.features.length ? new Date() : null,
        },
      });
      await tx.safeherServiceReview.create({
        data: {
          serviceId: row.id,
          actorId: actor.id,
          action: 'ACCESSIBILITY_REVIEW',
          snapshot: { features: data.features, evidence: data.evidence },
        },
      });
      await audit(actor, 'ACCESSIBILITY_REVIEW', row.id, tx);
    });
    return response({ saved: true });
  }
  if (path === 'admin' && method === 'GET') {
    if (!['PLATFORM_ADMIN', 'CONTENT_REVIEWER', 'SUPPORT_PARTNER'].includes(actor.role))
      throw new AppError(403, 'FORBIDDEN', 'Administration access is not available for this role.');
    const admin = actor.role === 'PLATFORM_ADMIN';
    const reviewer = admin || actor.role === 'CONTENT_REVIEWER';
    return response({
      role: actor.role,
      content: reviewer ? await db.safeherContent.findMany({ orderBy: { slug: 'asc' } }) : [],
      translations: reviewer ? await db.safeherTranslation.findMany() : [],
      serviceReviews: admin
        ? await db.safeherServiceReview.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
        : [],
      services: admin
        ? await db.safeherService.findMany()
        : actor.role === 'SUPPORT_PARTNER'
          ? await db.safeherService.findMany({ where: { partnerId: actor.id } })
          : [],
      metrics: admin
        ? (await db.safeherMetric.findMany()).map((m) => ({ ...m, count: reportCount(m.count) }))
        : [],
      feedback: admin
        ? (await db.safeherFeedback.groupBy({ by: ['category', 'rating'], _count: true })).map(
            (f) => ({ ...f, _count: reportCount(f._count) }),
          )
        : [],
      audit: admin
        ? await db.auditEvent.findMany({
            where: { entityType: 'SafeHer' },
            select: { action: true, entityId: true, timestamp: true },
            take: 40,
            orderBy: { timestamp: 'desc' },
          })
        : [],
      health: {
        database: 'Connected',
        referrals: 'Transmission disabled',
        assistant: 'Reviewed retrieval; no external model',
      },
    });
  }
  if (path === 'admin/content' && method === 'POST') {
    authorizeSafeher(actor, 'review');
    const lesson = lessonSchema.parse(payload);
    await db.$transaction(async (tx) => {
      const saved = await tx.safeherContent.upsert({
        where: { slug: lesson.slug },
        create: { slug: lesson.slug, lesson },
        update: {
          lesson,
          status: 'DRAFT',
          reviewedAt: null,
          reviewedBy: null,
          reviewExpiresAt: null,
          version: { increment: 1 },
        },
      });
      await tx.safeherRevision.create({
        data: {
          slug: saved.slug,
          version: saved.version,
          locale: saved.locale,
          lesson: lessonSchema.parse(saved.lesson),
          status: saved.status,
          reviewScope: saved.reviewScope,
          actorId: actor.id,
          action: 'DRAFT',
        },
      });
      await tx.auditEvent.create({
        data: {
          actorId: actor.id,
          organizationId: actor.organizationId,
          entityType: 'SafeHer',
          entityId: lesson.slug,
          action: 'CONTENT_DRAFT',
        },
      });
    });
    return response({ saved: true });
  }
  if (path === 'admin/review' && method === 'POST') {
    authorizeSafeher(actor, 'review');
    const data = z
      .object({
        slug: z.string().max(80),
        version: z.number().int(),
        status: z.enum(['APPROVED', 'DRAFT']),
        scope: z.enum(['DEMO_ONLY', 'PILOT_REVIEWED']),
      })
      .strict()
      .parse(payload);
    if (data.scope === 'PILOT_REVIEWED' && process.env.SAFEHER_PILOT_REVIEW_ENABLED !== 'true')
      throw new AppError(
        403,
        'REVIEW_GATE',
        'Pilot publishing requires completed safeguarding and professional content review.',
      );
    const row = await db.safeherContent.findUnique({ where: { slug: data.slug } });
    if (!row) throw new AppError(404, 'MISSING', 'Content not found.');
    lessonSchema.parse(row.lesson);
    await db.$transaction(async (tx) => {
      const result = await tx.safeherContent.updateMany({
        where: { slug: data.slug, version: data.version },
        data: {
          status: data.status,
          reviewScope: data.scope,
          reviewedAt: data.status === 'APPROVED' ? new Date() : null,
          reviewedBy: data.status === 'APPROVED' ? actor.id : null,
          reviewExpiresAt:
            data.status === 'APPROVED' ? new Date(Date.now() + 180 * 86400000) : null,
          version: { increment: 1 },
        },
      });
      if (!result.count)
        throw new AppError(409, 'CONFLICT', 'Content changed. Reload before reviewing.');
      const saved = await tx.safeherContent.findUniqueOrThrow({ where: { slug: data.slug } });
      await tx.safeherRevision.create({
        data: {
          slug: saved.slug,
          version: saved.version,
          locale: saved.locale,
          lesson: lessonSchema.parse(saved.lesson),
          status: saved.status,
          reviewScope: saved.reviewScope,
          reviewedAt: saved.reviewedAt,
          reviewExpiresAt: saved.reviewExpiresAt,
          actorId: actor.id,
          action: data.status,
        },
      });
      await tx.auditEvent.create({
        data: {
          actorId: actor.id,
          organizationId: actor.organizationId,
          entityType: 'SafeHer',
          entityId: data.slug,
          action: 'CONTENT_' + data.status,
        },
      });
    });
    return response({ saved: true });
  }
  if (path === 'admin/service' && method === 'POST') {
    authorizeSafeher(actor, 'manage');
    const data = serviceSchema.parse(payload);
    await db.$transaction(async (tx) => {
      const service = await tx.safeherService.create({ data });
      const snapshot = await tx.safeherService.findUniqueOrThrow({ where: { id: service.id } });
      await tx.safeherServiceReview.create({
        data: {
          serviceId: service.id,
          actorId: actor.id,
          action: 'SERVICE_CREATE',
          snapshot: JSON.parse(JSON.stringify(snapshot)),
        },
      });
      await audit(actor, 'SERVICE_CREATE', service.id, tx);
    });
    return response({ saved: true });
  }
  if (path === 'admin/service-update' && method === 'POST') {
    authorizeSafeher(actor, 'partner');
    const { id, ...data } = serviceSchema.extend({ id: z.string().max(100) }).parse(payload);
    const row = await db.safeherService.findUnique({ where: { id } });
    if (!row || (actor.role === 'SUPPORT_PARTNER' && row.partnerId !== actor.id))
      throw new AppError(403, 'OWNERSHIP', 'This service is not assigned to your organization.');
    await db.$transaction(async (tx) => {
      const changed = await tx.safeherService.updateMany({
        where: {
          id,
          updatedAt: row.updatedAt,
          ...(actor.role === 'SUPPORT_PARTNER' ? { partnerId: actor.id } : {}),
        },
        data: {
          ...data,
          verifiedAt: null,
          verifiedBy: null,
          reviewExpiresAt: null,
          accessibilityConfirmedAt: null,
        },
      });
      if (!changed.count)
        throw new AppError(409, 'CONFLICT', 'Service changed. Reload before editing.');
      const snapshot = await tx.safeherService.findUniqueOrThrow({ where: { id: id } });
      await tx.safeherServiceReview.create({
        data: {
          serviceId: id,
          actorId: actor.id,
          action: 'SERVICE_UPDATE_REQUIRES_REVIEW',
          snapshot: JSON.parse(JSON.stringify(snapshot)),
        },
      });
      await audit(actor, 'SERVICE_UPDATE_REQUIRES_REVIEW', id, tx);
    });
    return response({ saved: true });
  }
  if (path === 'admin/verify' && method === 'POST') {
    authorizeSafeher(actor, 'manage');
    const { id } = z
      .object({ id: z.string().max(100) })
      .strict()
      .parse(payload);
    const service = await db.safeherService.findUnique({ where: { id } });
    if (!service || service.synthetic || !service.contactUrl || !service.verificationSource)
      throw new AppError(
        400,
        'VERIFICATION',
        'Synthetic services cannot be verified. A real service needs confirmed contact information and a verification source.',
      );
    await db.$transaction(async (tx) => {
      const changed = await tx.safeherService.updateMany({
        where: { id, updatedAt: service.updatedAt, synthetic: false },
        data: {
          verifiedAt: new Date(),
          verifiedBy: actor.id,
          verificationMethod: 'RECORDED_REVIEW',
          reviewExpiresAt: new Date(Date.now() + 180 * 86400000),
        },
      });
      if (!changed.count)
        throw new AppError(
          409,
          'CONFLICT',
          'Service changed. Confirm the latest details before verifying.',
        );
      const snapshot = await tx.safeherService.findUniqueOrThrow({ where: { id: id } });
      await tx.safeherServiceReview.create({
        data: {
          serviceId: id,
          actorId: actor.id,
          action: 'SERVICE_VERIFIED',
          snapshot: JSON.parse(JSON.stringify(snapshot)),
        },
      });
      await audit(actor, 'SERVICE_VERIFIED', id, tx);
    });
    return response({ saved: true });
  }
  throw new AppError(404, 'NOT_FOUND', 'Endpoint not found.');
}
async function safe(request: Request, context: Context) {
  try {
    return await handle(request, context);
  } catch (error) {
    return Response.json(
      {
        error: {
          message:
            error instanceof AppError
              ? error.message
              : error instanceof z.ZodError
                ? 'Please check the information entered.'
                : 'Service unavailable. Please try again later.',
        },
      },
      {
        status: error instanceof AppError ? error.status : error instanceof z.ZodError ? 400 : 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
export const GET = safe;
export const POST = safe;
export const DELETE = safe;
