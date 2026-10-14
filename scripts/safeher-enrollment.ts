import 'dotenv/config';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../lib/db';
import { hashToken } from '../lib/session';
import { verifyTotp } from '../lib/mfa';
import { decryptContact } from '../lib/encryption';

const schema = z
  .object({
    action: z.enum(['bootstrap', 'invite', 'recover']),
    email: z.email(),
    name: z.string().min(1).max(100),
    organizationId: z.string().min(1),
  organizationName: z.string().trim().min(3).max(120).optional(),
  role: z.enum(['PLATFORM_ADMIN', 'CONTENT_REVIEWER', 'SUPPORT_PARTNER', 'REGISTERED_USER']),
    actorEmail: z.email().optional(),
    actorPassword: z.string().optional(),
    actorCode: z.string().optional(),
    bootstrapSecret: z.string().optional(),
    evidenceReference: z.string().min(8).max(150),
  })
  .strict();
try {
  let raw = '';
  for await (const chunk of process.stdin) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 4096) throw new Error('Input too large.');
  }
  const input = schema.parse(JSON.parse(raw));
  const token = randomBytes(32).toString('base64url');
  await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(7313026)`;
      let actorId: string;
      if (input.action === 'bootstrap') {
        const configured = process.env.SAFEHER_BOOTSTRAP_SECRET;
        if (
          !configured ||
          configured.length < 32 ||
          !input.bootstrapSecret ||
          !timingSafeEqual(
            Buffer.from(hashToken(configured)),
            Buffer.from(hashToken(input.bootstrapSecret)),
          )
        )
          throw new Error('A configured one-time bootstrap secret is required.');
        if (
          input.role !== 'PLATFORM_ADMIN' ||
          (await tx.user.count({ where: { role: 'PLATFORM_ADMIN' } }))
        )
          throw new Error('Bootstrap is available only before any administrator exists.');
        actorId = 'trusted-host-bootstrap';
      } else {
        const actor = input.actorEmail
          ? await tx.user.findUnique({ where: { email: input.actorEmail.toLowerCase() } })
          : null;
        if (
          !actor ||
          actor.role !== 'PLATFORM_ADMIN' ||
          actor.status !== 'ACTIVE' ||
          actor.organizationId !== input.organizationId ||
          !actor.mfaEnabled ||
          !actor.mfaSecretEncrypted ||
          !(await bcrypt.compare(input.actorPassword ?? '', actor.passwordHash))
        )
          throw new Error('Active administrator password and MFA are required.');
        const counter = verifyTotp(
          decryptContact(actor.mfaSecretEncrypted),
          input.actorCode ?? '',
          actor.mfaLastCounter,
        );
        if (counter === null) throw new Error('A fresh authenticator code is required.');
        const changed = await tx.user.updateMany({
          where: {
            id: actor.id,
            mfaLastCounter: actor.mfaLastCounter,
            sessionVersion: actor.sessionVersion,
          },
          data: { mfaLastCounter: counter },
        });
        if (!changed.count) throw new Error('Administrator security changed.');
        actorId = actor.id;
      }
    const organization = await tx.organization.findUnique({ where: { id: input.organizationId } });
    if (!organization) {
      if (input.action !== 'bootstrap' || !input.organizationName) throw new Error('An existing organization or an explicit bootstrap organization name is required.');
      await tx.organization.create({ data: { id: input.organizationId, name: input.organizationName } });
    }
      const existing = await tx.user.findUnique({ where: { email: input.email.toLowerCase() } });
      if (
        input.action === 'recover' &&
        (!existing ||
          existing.organizationId !== input.organizationId ||
          existing.role !== input.role)
      )
        throw new Error(
          'Recovery requires an existing account with the same organization and role.',
        );
      if (input.action !== 'recover' && existing)
        throw new Error('Account exists; use reviewed recovery.');
      const user =
        input.action === 'recover'
          ? await tx.user.update({
              where: { id: existing!.id },
              data: {
                status: 'INVITED',
                mfaEnabled: false,
                mfaSecretEncrypted: null,
                mfaLastCounter: null,
                passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 12),
                sessionVersion: { increment: 1 },
              },
            })
          : await tx.user.create({
              data: {
                organizationId: input.organizationId,
                name: input.name,
                email: input.email.toLowerCase(),
                role: input.role,
                status: 'INVITED',
                passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 12),
              },
            });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.passwordReset.deleteMany({ where: { userId: user.id } });
      await tx.safeherEnrollment.deleteMany({ where: { userId: user.id } });
      await tx.safeherEnrollment.create({
        data: {
          id: hashToken(token),
          userId: user.id,
          expiresAt: new Date(Date.now() + 30 * 60000),
        },
      });
      await tx.auditEvent.create({
        data: {
          actorId,
          organizationId: input.organizationId,
          entityType: 'SafeHer',
          entityId: user.id,
          action: 'STAFF_' + input.action.toUpperCase(),
          metadataRedacted: { evidenceReference: input.evidenceReference },
        },
      });
    },
    { timeout: 30000 },
  );
  // Deliver through an approved private channel. URL fragment keeps the token out of HTTP access logs.
  console.log(new URL('/enroll#token=' + token, process.env.APP_URL).toString());
} finally {
  await db.$disconnect();
}
