import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../lib/db';
import { read, write, syncMutation } from '../../lib/service';
import { createSessionRecord, tokenVersionCurrent, hashToken } from '../../lib/session';
import type { Actor } from '../../lib/permissions';
let worker: Actor, coordinator: Actor, other: Actor, admin: Actor;
const ids: string[] = [];
beforeAll(async () => {
  const users = await db.user.findMany({
    where: {
      email: {
        in: [
          'worker@demo.nurturepath.test',
          'clinic@demo.nurturepath.test',
          'worker2@demo.nurturepath.test',
          'admin@demo.nurturepath.test',
        ],
      },
    },
  });
  const get = (email: string) => {
    const u = users.find((u) => u.email === email);
    if (!u) throw new Error('Seed the demo database before integration tests.');
    return u as Actor;
  };
  worker = get('worker@demo.nurturepath.test');
  coordinator = get('clinic@demo.nurturepath.test');
  other = get('worker2@demo.nurturepath.test');
  admin = get('admin@demo.nurturepath.test');
});
afterAll(async () => {
  await db.messageDelivery.deleteMany({ where: { motherId: { in: ids } } });
  await db.followUp.deleteMany({ where: { motherId: { in: ids } } });
  await db.appointment.deleteMany({ where: { motherId: { in: ids } } });
  await db.referral.deleteMany({ where: { motherId: { in: ids } } });
  await db.consent.deleteMany({ where: { motherId: { in: ids } } });
  await db.mother.deleteMany({ where: { id: { in: ids } } });
  await db.offlineMutation.deleteMany({
    where: { deviceId: '40000000-0000-4000-8000-000000000001' },
  });
  await db.$disconnect();
});
const registration = {
  name: 'Demo Integration Adult',
  phone: '+233000000099',
  careStage: 'ANTENATAL',
  adultConfirmed: true,
  registrationConsent: true,
  smsConsent: true,
  whatsappConsent: false,
  preferredLanguage: 'en',
  estimatedDueDate: '',
};
describe('database-backed workflows', () => {
  it('revocation versions reject stale sign-ins and already-issued sessions', async () => {
    const user = await db.user.create({
      data: {
        organizationId: worker.organizationId,
        clinicId: worker.clinicId,
        role: 'HEALTH_WORKER',
        name: 'Demo Session Regression',
        email: randomUUID() + '@demo.nurturepath.test',
        passwordHash: 'unused-synthetic-test-hash',
      },
    });
    try {
      const first = await createSessionRecord(user.id, user.sessionVersion);
      expect(tokenVersionCurrent(first.token, user.sessionVersion)).toBe(true);
      await db.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
      expect(tokenVersionCurrent(first.token, user.sessionVersion + 1)).toBe(false);
      await expect(createSessionRecord(user.id, user.sessionVersion)).rejects.toMatchObject({
        code: 'SESSION_REVOKED',
      });
      const fresh = await createSessionRecord(user.id, user.sessionVersion + 1);
      expect(tokenVersionCurrent(fresh.token, user.sessionVersion + 1)).toBe(true);
      const altered = first.token.replace(/^\d+/, String(user.sessionVersion + 1));
      expect(await db.session.findUnique({ where: { id: hashToken(altered) } })).toBeNull();
    } finally {
      await db.user.delete({ where: { id: user.id } });
    }
  });
  it('runs enrolment, scheduling, contact, referral closure and consent enforcement', async () => {
    const m = (await write(worker, 'mothers', registration)) as { id: string };
    ids.push(m.id);
    const stored = await db.mother.findUniqueOrThrow({ where: { id: m.id } });
    expect(stored.phoneEncrypted).not.toContain('+233');
    await expect(read(other, 'mothers/' + m.id, new URL('http://localhost'))).rejects.toMatchObject(
      { status: 404 },
    );
    await expect(
      read(
        { ...worker, organizationId: randomUUID() },
        'mothers/' + m.id,
        new URL('http://localhost'),
      ),
    ).rejects.toMatchObject({ status: 404 });
    await expect(read(admin, 'mothers', new URL('http://localhost'))).rejects.toMatchObject({
      status: 403,
    });
    const appointment = (await write(worker, 'appointments', {
      motherId: m.id,
      scheduledAt: new Date(Date.now() - 86400000).toISOString(),
      kind: 'ANTENATAL',
    })) as { id: string };
    const task = await db.followUp.findFirstOrThrow({ where: { appointmentId: appointment.id } });
    await write(worker, 'followups/update', { id: task.id, outcome: 'REACHED' });
    await expect(
      write(worker, 'followups/update', { id: task.id, outcome: 'REACHED' }),
    ).rejects.toMatchObject({ status: 409 });
    const referral = (await write(worker, 'referrals', {
      motherId: m.id,
      receivingFacility: 'Demo integration receiving clinic',
      reasonCode: 'CONTINUITY_OF_CARE',
    })) as { id: string };
    await expect(
      write(worker, 'referrals/update', {
        id: referral.id,
        version: 1,
        status: 'CLOSED',
        closureNotes: 'Synthetic completion.',
      }),
    ).rejects.toMatchObject({ status: 409 });
    for (const [version, status] of [
      [1, 'ACCEPTED'],
      [2, 'ATTENDED'],
      [3, 'CLOSED'],
    ] as const)
      await write(coordinator, 'referrals/update', {
        id: referral.id,
        version,
        status,
        ...(status === 'CLOSED' ? { closureNotes: 'Synthetic attendance confirmed.' } : {}),
      });
    const closed = await db.referral.findUniqueOrThrow({ where: { id: referral.id } });
    expect(closed.status).toBe('CLOSED');
    expect(closed.closedAt).not.toBeNull();
    const templateId = '30000000-0000-4000-8000-000000000001';
    await write(worker, 'messages/send', { motherId: m.id, templateId, channel: 'SMS' });
    await write(worker, 'consents', {
      motherId: m.id,
      purpose: 'REMINDERS',
      channel: 'SMS',
      withdraw: true,
      version: 1,
    });
    await expect(
      write(worker, 'messages/send', { motherId: m.id, templateId, channel: 'SMS' }),
    ).rejects.toMatchObject({ code: 'NO_CONSENT' });
    await expect(
      write(worker, 'consents', {
        motherId: m.id,
        purpose: 'REMINDERS',
        channel: 'SMS',
        withdraw: false,
        version: 1,
      }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    const events = await db.auditEvent.findMany({ where: { entityId: m.id } });
    expect(events.length).toBeGreaterThan(1);
    expect(JSON.stringify(events)).not.toContain('+233');
    expect(JSON.stringify(events)).not.toContain(registration.name);
  });
  it('replays an offline mutation exactly once and rejects key reuse', async () => {
    const data = {
      idempotencyKey: randomUUID(),
      deviceId: '40000000-0000-4000-8000-000000000001',
      mutationType: 'mothers',
      payload: registration,
    };
    const first = await syncMutation(worker, data);
    ids.push((first.result as { id: string }).id);
    expect(first.duplicate).toBe(false);
    const second = await syncMutation(worker, data);
    expect(second.duplicate).toBe(true);
    expect(second.result).toEqual(first.result);
    await expect(syncMutation(other, data)).rejects.toMatchObject({ code: 'REPLAY_MISMATCH' });
    await expect(
      syncMutation(worker, { ...data, payload: { ...registration, name: 'Different Demo' } }),
    ).rejects.toMatchObject({ code: 'REPLAY_MISMATCH' });
  });
  it('rejects stale offline appointment edits and withdrawn registration', async () => {
    const m = (await write(worker, 'mothers', registration)) as { id: string };
    ids.push(m.id);
    const appointment = (await write(worker, 'appointments', {
      motherId: m.id,
      scheduledAt: new Date().toISOString(),
      kind: 'ANTENATAL',
    })) as { id: string };
    await write(worker, 'appointments/update', {
      id: appointment.id,
      version: 1,
      status: 'ATTENDED',
    });
    await expect(
      syncMutation(worker, {
        idempotencyKey: randomUUID(),
        deviceId: '40000000-0000-4000-8000-000000000001',
        mutationType: 'appointments/update',
        payload: { id: appointment.id, version: 1, status: 'MISSED' },
      }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await write(worker, 'consents', {
      motherId: m.id,
      purpose: 'REGISTRATION',
      channel: 'IN_PERSON',
      withdraw: true,
      version: 1,
    });
    await expect(
      write(worker, 'appointments', {
        motherId: m.id,
        scheduledAt: new Date().toISOString(),
        kind: 'ANTENATAL',
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(
      (await db.followUp.findFirstOrThrow({ where: { appointmentId: appointment.id } })).status,
    ).toBe('CANCELLED');
  });
  it('rejects free-form patient/medical prompts before content processing', async () => {
    await expect(
      write(coordinator, 'ai/simplify-approved-content', {
        sourceId: '30000000-0000-4000-8000-000000000002',
        locale: 'en',
        prompt: 'Diagnose Demo Adult',
      }),
    ).rejects.toThrow();
    await expect(
      write(worker, 'ai/simplify-approved-content', {
        sourceId: '30000000-0000-4000-8000-000000000002',
        locale: 'en',
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
