import { randomUUID, createHash } from 'node:crypto';
import { Prisma, type Role, type ReferralStatus } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { allow, AppError, motherScope, type Actor } from './permissions';
import {
  motherInput,
  appointmentInput,
  referralInput,
  canTransition,
  hasConsent,
  metric,
} from './domain';
import { encryptContact, decryptContact } from './encryption';
import { assertOnboardingAllowed, requireDemo } from './governance';
import { simplifyApprovedContent } from './ai';

export type Tx = Prisma.TransactionClient;
const uuid = z.string().uuid();
const versionInput = z.number().int().positive();
export function audit(tx: Tx, actor: Actor, entityType: string, entityId: string, action: string) {
  return tx.auditEvent.create({
    data: {
      actorId: actor.id,
      organizationId: actor.organizationId,
      clinicId: actor.clinicId,
      entityType,
      entityId,
      action,
    },
  });
}
async function mother(tx: Tx, actor: Actor, id: string) {
  const row = await tx.mother.findFirst({
    where: { ...motherScope(actor), id: uuid.parse(id) },
    include: { consents: true },
  });
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Record not found in your assigned scope.');
  if (!row.consents.some((c) => c.purpose === 'REGISTRATION' && !c.withdrawnAt))
    throw new AppError(409, 'CONSENT_WITHDRAWN', 'Registration consent has been withdrawn.');
  return row;
}
export function checkVersion(actual: number, expected: number) {
  if (actual !== expected)
    throw new AppError(
      409,
      'VERSION_CONFLICT',
      'This record changed. Refresh and review before saving.',
    );
}
function isoDate(value: string) {
  return new Date(value);
}
export async function mutate(tx: Tx, actor: Actor, kind: string, raw: unknown) {
  requireDemo();
  if (kind === 'mothers') {
    assertOnboardingAllowed();
    allow(actor, ['HEALTH_WORKER', 'CLINIC_ADMIN']);
    const data = motherInput.extend({ assignedWorkerId: uuid.optional() }).parse(raw);
    const workerId = actor.role === 'HEALTH_WORKER' ? actor.id : data.assignedWorkerId;
    const worker =
      workerId &&
      (await tx.user.findFirst({
        where: {
          id: workerId,
          organizationId: actor.organizationId,
          clinicId: actor.clinicId,
          role: 'HEALTH_WORKER',
          status: 'ACTIVE',
        },
      }));
    if (!worker || !actor.clinicId)
      throw new AppError(400, 'ASSIGNMENT', 'Choose an active worker in your clinic.');
    const row = await tx.mother.create({
      data: {
        organizationId: actor.organizationId,
        clinicId: actor.clinicId,
        assignedWorkerId: worker.id,
        displayCode: 'DEMO-' + randomUUID().slice(0, 8).toUpperCase(),
        name: data.name,
        phoneEncrypted: data.phone ? encryptContact(data.phone) : null,
        preferredLanguage: data.preferredLanguage,
        careStage: data.careStage,
        adultConfirmed: true,
        estimatedDueDate: data.estimatedDueDate ? isoDate(data.estimatedDueDate) : null,
        consents: {
          create: [
            { purpose: 'REGISTRATION', channel: 'IN_PERSON', recordedBy: actor.id },
            ...(data.smsConsent
              ? [{ purpose: 'REMINDERS', channel: 'SMS', recordedBy: actor.id }]
              : []),
            ...(data.whatsappConsent
              ? [{ purpose: 'REMINDERS', channel: 'WHATSAPP', recordedBy: actor.id }]
              : []),
          ],
        },
      },
    });
    await audit(tx, actor, 'Mother', row.id, 'REGISTER');
    return { id: row.id, displayCode: row.displayCode };
  }
  if (kind === 'appointments') {
    const data = appointmentInput.parse(raw);
    const m = await mother(tx, actor, data.motherId);
    const row = await tx.appointment.create({
      data: {
        ...data,
        scheduledAt: isoDate(data.scheduledAt),
        clinicId: m.clinicId,
        createdBy: actor.id,
      },
    });
    await tx.followUp.create({
      data: {
        motherId: m.id,
        appointmentId: row.id,
        assignedTo: m.assignedWorkerId,
        dueAt: row.scheduledAt,
      },
    });
    await audit(tx, actor, 'Appointment', row.id, 'SCHEDULE');
    return row;
  }
  if (kind === 'mothers/update') {
    const data = z
      .object({
        id: uuid,
        version: versionInput,
        name: z.string().trim().min(2).max(80).optional(),
        phone: z
          .string()
          .regex(/^\+?[0-9 ()-]{7,20}$/)
          .or(z.literal(''))
          .optional(),
        preferredLanguage: z.enum(['en', 'tw', 'ee', 'dag']).optional(),
        careStage: z.enum(['ANTENATAL', 'POSTNATAL']).optional(),
      })
      .strict()
      .parse(raw);
    const m = await mother(tx, actor, data.id);
    checkVersion(m.version, data.version);
    const row = await tx.mother.update({
      where: { id: m.id, version: data.version },
      data: {
        name: data.name,
        preferredLanguage: data.preferredLanguage,
        careStage: data.careStage,
        ...(data.phone !== undefined
          ? { phoneEncrypted: data.phone ? encryptContact(data.phone) : null }
          : {}),
        version: { increment: 1 },
      },
    });
    await audit(tx, actor, 'Mother', m.id, 'UPDATE');
    return { id: row.id, version: row.version };
  }
  if (kind === 'followups') {
    const data = z.object({ motherId: uuid, dueAt: z.string().datetime() }).strict().parse(raw);
    const m = await mother(tx, actor, data.motherId);
    const row = await tx.followUp.create({
      data: { motherId: m.id, dueAt: isoDate(data.dueAt), assignedTo: m.assignedWorkerId },
    });
    await audit(tx, actor, 'FollowUp', row.id, 'CREATE');
    return row;
  }
  if (kind === 'appointments/update') {
    const data = z
      .object({
        id: uuid,
        version: versionInput,
        status: z.enum(['SCHEDULED', 'ATTENDED', 'MISSED', 'CANCELLED']),
        scheduledAt: z.string().datetime().optional(),
      })
      .strict()
      .parse(raw);
    const row = await tx.appointment.findFirst({
      where: { id: data.id, mother: motherScope(actor) },
    });
    if (!row) throw new AppError(404, 'NOT_FOUND', 'Appointment not found.');
    await mother(tx, actor, row.motherId);
    checkVersion(row.version, data.version);
    const result = await tx.appointment.update({
      where: { id: row.id, version: data.version },
      data: {
        status: data.status,
        ...(data.scheduledAt ? { scheduledAt: isoDate(data.scheduledAt) } : {}),
        version: { increment: 1 },
      },
    });
    if (data.scheduledAt)
      await tx.followUp.updateMany({
        where: { appointmentId: row.id, status: 'PENDING' },
        data: { dueAt: isoDate(data.scheduledAt) },
      });
    if (data.status === 'CANCELLED')
      await tx.followUp.updateMany({
        where: { appointmentId: row.id, status: 'PENDING' },
        data: { status: 'CANCELLED', completedAt: new Date(), outcome: 'APPOINTMENT_CANCELLED' },
      });
    await audit(tx, actor, 'Appointment', row.id, 'UPDATE');
    return result;
  }
  if (kind === 'followups/update') {
    const data = z
      .object({
        id: uuid,
        outcome: z.enum(['REACHED', 'NO_ANSWER', 'RESCHEDULED', 'DECLINED']),
        nextDueAt: z.string().datetime().optional(),
      })
      .strict()
      .parse(raw);
    const row = await tx.followUp.findFirst({ where: { id: data.id, mother: motherScope(actor) } });
    if (!row) throw new AppError(404, 'NOT_FOUND', 'Follow-up not found.');
    const m = await mother(tx, actor, row.motherId);
    if (row.status !== 'PENDING')
      throw new AppError(409, 'ALREADY_COMPLETED', 'Follow-up already recorded.');
    if (['NO_ANSWER', 'RESCHEDULED'].includes(data.outcome) && !data.nextDueAt)
      throw new AppError(400, 'NEXT_ACTION', 'Choose a date for the next follow-up.');
    const updated = await tx.followUp.updateMany({
      where: { id: row.id, status: 'PENDING' },
      data: { status: 'COMPLETED', outcome: data.outcome, completedAt: new Date() },
    });
    if (updated.count !== 1)
      throw new AppError(409, 'ALREADY_COMPLETED', 'Follow-up already recorded.');
    if (data.nextDueAt) {
      await tx.followUp.create({
        data: {
          motherId: row.motherId,
          appointmentId: row.appointmentId,
          dueAt: isoDate(data.nextDueAt),
          assignedTo: m.assignedWorkerId,
        },
      });
      if (data.outcome === 'RESCHEDULED' && row.appointmentId)
        await tx.appointment.update({
          where: { id: row.appointmentId },
          data: {
            scheduledAt: isoDate(data.nextDueAt),
            status: 'SCHEDULED',
            version: { increment: 1 },
          },
        });
    }
    await audit(tx, actor, 'FollowUp', row.id, 'RECORD_' + data.outcome);
    return { id: row.id };
  }
  if (kind === 'referrals') {
    const data = referralInput.parse(raw);
    const m = await mother(tx, actor, data.motherId);
    if (data.urgency === 'CLINICIAN_SELECTED' && actor.role !== 'CLINIC_ADMIN')
      throw new AppError(
        403,
        'CLINICIAN_REVIEW',
        'A clinic coordinator must record clinician-selected urgency.',
      );
    const row = await tx.referral.create({ data: { ...data, clinicId: m.clinicId } });
    await audit(tx, actor, 'Referral', row.id, 'CREATE');
    return row;
  }
  if (kind === 'referrals/update') {
    const data = z
      .object({
        id: uuid,
        version: versionInput,
        status: z.enum(['ACCEPTED', 'ATTENDED', 'CLOSED', 'UNABLE_TO_CONTACT']),
        closureNotes: z.string().trim().max(250).optional(),
      })
      .strict()
      .parse(raw);
    const row = await tx.referral.findFirst({ where: { id: data.id, mother: motherScope(actor) } });
    if (!row) throw new AppError(404, 'NOT_FOUND', 'Referral not found.');
    await mother(tx, actor, row.motherId);
    checkVersion(row.version, data.version);
    if (!canTransition(row.status, data.status))
      throw new AppError(409, 'TRANSITION', 'This referral status transition is not allowed.');
    if (data.status === 'CLOSED' && !data.closureNotes)
      throw new AppError(400, 'CLOSURE_NOTES', 'Record a non-clinical completion note.');
    const result = await tx.referral.update({
      where: { id: row.id, version: data.version },
      data: {
        status: data.status as ReferralStatus,
        closedAt: data.status === 'CLOSED' ? new Date() : null,
        closureNotes: data.closureNotes,
        version: { increment: 1 },
      },
    });
    await audit(tx, actor, 'Referral', row.id, data.status);
    return result;
  }
  if (kind === 'consents') {
    const data = z
      .object({
        motherId: uuid,
        purpose: z.enum(['REGISTRATION', 'REMINDERS']),
        channel: z.enum(['IN_PERSON', 'SMS', 'WHATSAPP']),
        withdraw: z.boolean(),
        version: versionInput,
      })
      .strict()
      .parse(raw);
    if ((data.purpose === 'REGISTRATION') !== (data.channel === 'IN_PERSON'))
      throw new AppError(400, 'CONSENT_CHANNEL', 'Invalid consent purpose/channel.');
    const m = await mother(tx, actor, data.motherId);
    checkVersion(m.version, data.version);
    await tx.mother.update({
      where: { id: m.id, version: data.version },
      data: {
        version: { increment: 1 },
        ...(data.purpose === 'REGISTRATION' && data.withdraw ? { archivedAt: new Date() } : {}),
      },
    });
    await tx.consent.upsert({
      where: {
        motherId_purpose_channel: { motherId: m.id, purpose: data.purpose, channel: data.channel },
      },
      create: {
        motherId: m.id,
        purpose: data.purpose,
        channel: data.channel,
        recordedBy: actor.id,
        withdrawnAt: data.withdraw ? new Date() : null,
      },
      update: {
        withdrawnAt: data.withdraw ? new Date() : null,
        ...(!data.withdraw ? { grantedAt: new Date(), recordedBy: actor.id } : {}),
      },
    });
    if (data.purpose === 'REGISTRATION' && data.withdraw)
      await tx.followUp.updateMany({
        where: { motherId: m.id, status: 'PENDING' },
        data: { status: 'CANCELLED', outcome: 'CONSENT_WITHDRAWN', completedAt: new Date() },
      });
    await audit(tx, actor, 'Consent', m.id, data.withdraw ? 'WITHDRAW' : 'GRANT');
    return { id: m.id };
  }
  if (kind === 'mothers/assign') {
    allow(actor, ['CLINIC_ADMIN']);
    const data = z
      .object({ motherId: uuid, workerId: uuid, version: versionInput })
      .strict()
      .parse(raw);
    const m = await mother(tx, actor, data.motherId);
    checkVersion(m.version, data.version);
    const worker = await tx.user.findFirst({
      where: {
        id: data.workerId,
        organizationId: actor.organizationId,
        clinicId: actor.clinicId,
        role: 'HEALTH_WORKER',
        status: 'ACTIVE',
      },
    });
    if (!worker) throw new AppError(400, 'ASSIGNMENT', 'Worker not found in your clinic.');
    await tx.mother.update({
      where: { id: m.id, version: data.version },
      data: { assignedWorkerId: worker.id, version: { increment: 1 } },
    });
    await tx.followUp.updateMany({
      where: { motherId: m.id, status: 'PENDING' },
      data: { assignedTo: worker.id },
    });
    await audit(tx, actor, 'Mother', m.id, 'ASSIGN');
    return { id: m.id };
  }
  if (kind === 'messages/preview' || kind === 'messages/send') {
    const data = z
      .object({ motherId: uuid, templateId: uuid, channel: z.enum(['SMS', 'WHATSAPP']) })
      .strict()
      .parse(raw);
    const m = await mother(tx, actor, data.motherId);
    if (!hasConsent(m.consents, data.channel))
      throw new AppError(409, 'NO_CONSENT', 'This channel has no active reminder consent.');
    if (!m.phoneEncrypted) throw new AppError(409, 'NO_CONTACT', 'No contact number is recorded.');
    const template = await tx.messageTemplate.findFirst({
      where: {
        id: data.templateId,
        organizationId: actor.organizationId,
        approvedAt: { not: null },
        locale: m.preferredLanguage,
        category: 'NEUTRAL_REMINDER',
      },
    });
    if (!template)
      throw new AppError(
        400,
        'UNAPPROVED_TEMPLATE',
        'Choose an approved neutral reminder in the preferred language.',
      );
    if (kind === 'messages/preview')
      return { body: template.body, channel: data.channel, simulator: true };
    // Never make outbound provider requests in the synthetic MVP.
    const result = await tx.messageDelivery.create({
      data: {
        motherId: m.id,
        templateId: template.id,
        channel: data.channel,
        status: 'SIMULATED_DELIVERED',
        providerId: 'sim-' + randomUUID(),
      },
    });
    await audit(tx, actor, 'MessageDelivery', result.id, 'SIMULATE');
    return { id: result.id, status: result.status, simulator: true };
  }
  if (kind === 'ai/simplify-approved-content') {
    allow(actor, ['PLATFORM_ADMIN', 'CLINIC_ADMIN']);
    const data = z
      .object({ sourceId: uuid, locale: z.enum(['en', 'tw', 'ee', 'dag']) })
      .strict()
      .parse(raw);
    const source = await tx.messageTemplate.findFirst({
      where: { id: data.sourceId, organizationId: actor.organizationId, approvedAt: { not: null } },
    });
    if (!source) throw new AppError(404, 'NOT_FOUND', 'Approved source not found.');
    const draft = simplifyApprovedContent(source, data.locale);
    const row = await tx.messageTemplate.create({
      data: {
        organizationId: actor.organizationId,
        title: 'Draft: ' + source.title,
        category: source.category,
        locale: data.locale,
        body: draft.body,
        sourceId: source.id,
        modelVersion: draft.modelVersion,
      },
    });
    await audit(tx, actor, 'MessageTemplate', row.id, 'DRAFT_DETERMINISTIC');
    return { ...draft, id: row.id };
  }
  if (kind === 'templates/approve') {
    allow(actor, ['CLINIC_ADMIN']);
    const data = z.object({ id: uuid }).strict().parse(raw);
    const row = await tx.messageTemplate.findFirst({
      where: { id: data.id, organizationId: actor.organizationId, locale: 'en', approvedAt: null },
    });
    if (!row) throw new AppError(404, 'NOT_FOUND', 'English draft not found.');
    const result = await tx.messageTemplate.update({
      where: { id: row.id },
      data: { approvedAt: new Date(), approvedBy: actor.id },
    });
    await audit(tx, actor, 'MessageTemplate', row.id, 'DEMO_REVIEW_APPROVE');
    return result;
  }
  if (kind === 'clinics') {
    allow(actor, ['PLATFORM_ADMIN']);
    const data = z
      .object({
        name: z.string().trim().min(3).max(100),
        region: z.string().trim().min(2).max(100),
      })
      .strict()
      .parse(raw);
    const row = await tx.clinic.create({ data: { ...data, organizationId: actor.organizationId } });
    await audit(tx, actor, 'Clinic', row.id, 'CREATE');
    return row;
  }
  if (kind === 'users/status') {
    allow(actor, ['PLATFORM_ADMIN']);
    const data = z
      .object({ id: uuid, status: z.enum(['ACTIVE', 'DISABLED']) })
      .strict()
      .parse(raw);
    if (data.id === actor.id)
      throw new AppError(400, 'SELF_DISABLE', 'You cannot deactivate your own account.');
    const user = await tx.user.findFirst({
      where: { id: data.id, organizationId: actor.organizationId },
    });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'Staff member not found.');
    await tx.user.update({
      where: { id: user.id },
      data: { status: data.status, sessionVersion: { increment: 1 } },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await audit(tx, actor, 'User', user.id, data.status);
    return { id: user.id };
  }
  if (kind === 'users') {
    allow(actor, ['PLATFORM_ADMIN']);
    const data = z
      .object({
        name: z.string().trim().min(2).max(80),
        email: z.string().email().max(200),
        role: z.enum(['HEALTH_WORKER', 'CLINIC_ADMIN', 'AUDITOR']),
        clinicId: uuid.optional(),
        password: z.string().min(12).max(128),
      })
      .strict()
      .parse(raw);
    if (data.role !== 'AUDITOR') {
      if (
        !data.clinicId ||
        !(await tx.clinic.findFirst({
          where: { id: data.clinicId, organizationId: actor.organizationId },
        }))
      )
        throw new AppError(400, 'CLINIC', 'Choose a facility in your organization.');
    }
    const row = await tx.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        role: data.role,
        organizationId: actor.organizationId,
        clinicId: data.role === 'AUDITOR' ? null : data.clinicId,
        passwordHash: await bcrypt.hash(data.password, 12),
      },
    });
    await audit(tx, actor, 'User', row.id, 'CREATE');
    return { id: row.id, role: row.role };
  }
  throw new AppError(404, 'NOT_FOUND', 'Action not found.');
}

export async function write(actor: Actor, kind: string, payload: unknown) {
  return db.$transaction((tx) => mutate(tx, actor, kind, payload), {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}
export async function syncMutation(actor: Actor, raw: unknown) {
  const data = z
    .object({
      idempotencyKey: uuid,
      deviceId: uuid,
      mutationType: z.enum([
        'mothers',
        'appointments',
        'appointments/update',
        'followups/update',
        'referrals',
        'referrals/update',
      ]),
      payload: z.unknown(),
    })
    .strict()
    .parse(raw);
  const hash = createHash('sha256')
    .update(JSON.stringify({ mutationType: data.mutationType, payload: data.payload }))
    .digest('hex');
  return db.$transaction(
    async (tx) => {
      const old = await tx.offlineMutation.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (old) {
        if (old.actorId !== actor.id || old.deviceId !== data.deviceId || old.payloadHash !== hash)
          throw new AppError(
            409,
            'REPLAY_MISMATCH',
            'This replay key belongs to a different request.',
          );
        return { duplicate: true, result: old.result };
      }
      const result = await mutate(tx, actor, data.mutationType, data.payload);
      await tx.offlineMutation.create({
        data: {
          idempotencyKey: data.idempotencyKey,
          actorId: actor.id,
          deviceId: data.deviceId,
          mutationType: data.mutationType,
          payloadHash: hash,
          result: JSON.parse(JSON.stringify(result)),
        },
      });
      return { duplicate: false, result };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function metrics(actor: Actor, start?: Date, end?: Date) {
  const clinicId = ['HEALTH_WORKER', 'CLINIC_ADMIN'].includes(actor.role)
    ? (actor.clinicId ?? 'NO_CLINIC')
    : undefined;
  const scope = {
    organizationId: actor.organizationId,
    clinicId,
    archivedAt: null,
    ...(actor.role === 'HEALTH_WORKER' ? { assignedWorkerId: actor.id } : {}),
  };
  const period = { ...(start ? { gte: start } : {}), ...(end ? { lt: end } : {}) };
  const [active, appointments, followups, referrals, withdrawn] = await Promise.all([
    db.mother.count({ where: scope }),
    db.appointment.findMany({
      where: { mother: scope, scheduledAt: period },
      select: { id: true, scheduledAt: true, status: true },
    }),
    db.followUp.findMany({
      where: { mother: scope, dueAt: period },
      select: { appointmentId: true, dueAt: true, status: true, completedAt: true, outcome: true },
    }),
    db.referral.findMany({ where: { mother: scope, createdAt: period }, select: { status: true } }),
    db.consent.count({
      where: {
        mother: {
          organizationId: actor.organizationId,
          clinicId,
          ...(actor.role === 'HEALTH_WORKER' ? { assignedWorkerId: actor.id } : {}),
        },
        purpose: 'REGISTRATION',
        withdrawnAt: { not: null, ...period },
      },
    }),
  ]);
  const complete = followups.filter((f) => f.status === 'COMPLETED');
  const reached = complete.filter((f) => f.outcome === 'REACHED');
  const delays = reached
    .filter((f) => f.completedAt)
    .map((f) => Math.max(0, (+f.completedAt! - +f.dueAt) / 3600000))
    .sort((a, b) => a - b);
  const suppress = actor.role === 'PLATFORM_ADMIN' || actor.role === 'AUDITOR';
  const count = (n: number) => (suppress && n < 10 ? null : n);
  const recorded = new Set(complete.map((f) => f.appointmentId));
  const median = delays.length
    ? (delays[Math.floor((delays.length - 1) / 2)] + delays[Math.ceil((delays.length - 1) / 2)]) / 2
    : null;
  return {
    demo: true,
    start: start?.toISOString() ?? null,
    end: end?.toISOString() ?? null,
    active: count(active),
    appointments: count(appointments.length),
    overdue: count(followups.filter((f) => f.status === 'PENDING' && f.dueAt < new Date()).length),
    pending: count(followups.filter((f) => f.status === 'PENDING').length),
    referrals: count(referrals.length),
    contactRate: metric(reached.length, followups.length, suppress),
    recordedFollowUp: metric(
      appointments.filter((a) => recorded.has(a.id)).length,
      appointments.length,
      suppress,
    ),
    closureRate: metric(
      referrals.filter((r) => r.status === 'CLOSED').length,
      referrals.length,
      suppress,
    ),
    optOutRate: metric(withdrawn, active + withdrawn, suppress),
    medianHoursToContact: suppress && delays.length < 10 ? null : median,
    missingOutcome: count(complete.filter((f) => !f.outcome).length),
    suppressed: suppress,
  };
}
export async function read(actor: Actor, kind: string, url: URL) {
  const page = Math.floor(Math.max(1, Math.min(10000, Number(url.searchParams.get('page')) || 1)));
  const take = 50;
  const skip = (page - 1) * take;
  if (kind === 'session') return actor;
  if (kind === 'dashboard/metrics') {
    const date = (name: string) => {
      const value = url.searchParams.get(name);
      if (!value) return undefined;
      const parsed = new Date(value);
      if (!Number.isFinite(+parsed)) throw new AppError(400, 'DATE', 'Invalid reporting date.');
      return parsed;
    };
    const start = date('start'),
      end = date('end');
    if (start && end && start >= end)
      throw new AppError(400, 'DATE', 'End date must follow start date.');
    return metrics(actor, start, end);
  }
  if (kind === 'audit') {
    allow(actor, ['PLATFORM_ADMIN', 'CLINIC_ADMIN', 'AUDITOR']);
    return {
      items: await db.auditEvent.findMany({
        where: {
          organizationId: actor.organizationId,
          ...(actor.role === 'CLINIC_ADMIN' ? { clinicId: actor.clinicId ?? 'NO_CLINIC' } : {}),
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take,
      }),
      page,
    };
  }
  if (kind === 'staff') {
    allow(actor, ['PLATFORM_ADMIN', 'CLINIC_ADMIN']);
    return {
      items: await db.user.findMany({
        where: {
          organizationId: actor.organizationId,
          ...(actor.role === 'CLINIC_ADMIN' ? { clinicId: actor.clinicId ?? 'NO_CLINIC' } : {}),
        },
        select: { id: true, name: true, role: true, clinicId: true, status: true },
        orderBy: { name: 'asc' },
      }),
    };
  }
  if (kind === 'clinics') {
    allow(actor, ['PLATFORM_ADMIN', 'CLINIC_ADMIN']);
    return {
      items: await db.clinic.findMany({
        where: {
          organizationId: actor.organizationId,
          ...(actor.role === 'CLINIC_ADMIN' ? { id: actor.clinicId ?? 'NO_CLINIC' } : {}),
        },
      }),
    };
  }
  if (kind === 'templates') {
    allow(actor, ['PLATFORM_ADMIN', 'CLINIC_ADMIN', 'HEALTH_WORKER']);
    return {
      items: await db.messageTemplate.findMany({
        where: {
          organizationId: actor.organizationId,
          ...(actor.role === 'HEALTH_WORKER'
            ? { approvedAt: { not: null }, category: 'NEUTRAL_REMINDER' }
            : {}),
        },
        orderBy: { title: 'asc' },
      }),
    };
  }
  const scope = motherScope(actor);
  if (kind === 'mothers') {
    const q = url.searchParams.get('q')?.slice(0, 80);
    const where = {
      ...scope,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { displayCode: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.mother.findMany({
        where,
        select: {
          id: true,
          displayCode: true,
          name: true,
          careStage: true,
          preferredLanguage: true,
          version: true,
          assignedWorkerId: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      db.mother.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }
  if (kind.startsWith('mothers/')) {
    const m = await mother(db, actor, kind.split('/')[1]);
    const detail = await db.mother.findUniqueOrThrow({
      where: { id: m.id },
      include: {
        appointments: { orderBy: { scheduledAt: 'desc' } },
        followups: { orderBy: { dueAt: 'desc' } },
        referrals: { orderBy: { createdAt: 'desc' } },
        deliveries: { orderBy: { createdAt: 'desc' } },
      },
    });
    const { phoneEncrypted, ...safe } = detail;
    await audit(db, actor, 'Mother', m.id, 'VIEW');
    return {
      ...safe,
      consents: m.consents,
      phone: phoneEncrypted ? decryptContact(phoneEncrypted) : '',
    };
  }
  if (['appointments', 'followups', 'referrals'].includes(kind)) {
    const where = { mother: scope };
    const include = { mother: { select: { id: true, displayCode: true, name: true } } };
    const items =
      kind === 'appointments'
        ? await db.appointment.findMany({
            where,
            include,
            skip,
            take,
            orderBy: { scheduledAt: 'asc' },
          })
        : kind === 'followups'
          ? await db.followUp.findMany({
              where,
              include,
              skip,
              take,
              orderBy: [{ status: 'desc' }, { dueAt: 'asc' }],
            })
          : await db.referral.findMany({
              where,
              include,
              skip,
              take,
              orderBy: { createdAt: 'desc' },
            });
    return { items, page };
  }
  throw new AppError(404, 'NOT_FOUND', 'Resource not found.');
}
export const demoRoles: Role[] = ['HEALTH_WORKER', 'CLINIC_ADMIN', 'PLATFORM_ADMIN', 'AUDITOR'];
