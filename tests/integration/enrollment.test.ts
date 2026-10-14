import 'dotenv/config';
import { afterAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { db } from '../../lib/db';
import { hashToken } from '../../lib/session';
import { totp } from '../../lib/mfa';
import { POST } from '../../app/api/auth/enroll/route';

const origin = process.env.APP_URL ?? 'http://localhost:3200';
const request = (body: unknown) =>
  new Request(origin + '/api/auth/enroll', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
describe('staff MFA enrollment', () => {
  afterAll(() => db.$disconnect());
  it('requires correct MFA, activates once, and rejects invitation replay', async () => {
    expect(process.env.DEMO_MODE).toBe('true');
    const user = await db.user.create({
      data: {
        organizationId: 'safeher-demo-org',
        email: `enroll-${crypto.randomUUID()}@example.invalid`,
        name: 'Synthetic invitation fixture',
        role: 'CONTENT_REVIEWER',
        status: 'INVITED',
        passwordHash: 'not-a-login',
      },
    });
    const token = randomBytes(32).toString('base64url');
    try {
      await db.safeherEnrollment.create({
        data: { id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 600000) },
      });
      const setup = await POST(request({ token, action: 'setup' }));
      expect(setup.status).toBe(200);
      const { data } = await setup.json();
      const secret = data.secret as string;
      expect(
        (
          await POST(
            request({
              token,
              action: 'complete',
              password: 'SyntheticEnrollment!2026',
              code: 'invalid',
            }),
          )
        ).status,
      ).toBe(400);
      expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).status).toBe('INVITED');
      const complete = await POST(
        request({
          token,
          action: 'complete',
          password: 'SyntheticEnrollment!2026',
          code: totp(secret, Math.floor(Date.now() / 30000)),
        }),
      );
      expect(complete.status).toBe(200);
      const enrolled = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(enrolled.mfaEnabled).toBe(true);
      expect(enrolled.status).toBe('ACTIVE');
      expect(enrolled.sessionVersion).toBe(2);
      expect((await POST(request({ token, action: 'setup' }))).status).toBe(400);
      expect(
        (await db.safeherEnrollment.findUniqueOrThrow({ where: { id: hashToken(token) } }))
          .secretEncrypted,
      ).toBeNull();
    } finally {
      await db.safeherEnrollment.deleteMany({ where: { userId: user.id } });
      await db.auditEvent.deleteMany({ where: { entityId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    }
  });
  it('rejects expired or unknown invitations and hostile Origin', async () => {
    const token = randomBytes(32).toString('base64url');
    expect((await POST(request({ token, action: 'setup' }))).status).toBe(400);
    expect(
      (
        await POST(
          new Request(origin + '/api/auth/enroll', {
            method: 'POST',
            headers: { origin: 'https://untrusted.invalid' },
            body: JSON.stringify({ token, action: 'setup' }),
          }),
        )
      ).status,
    ).toBe(403);
  });
});
