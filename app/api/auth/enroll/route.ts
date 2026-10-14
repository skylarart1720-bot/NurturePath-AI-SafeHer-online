import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { checkOrigin, hashToken, rateLimit } from '@/lib/auth';
import { readJson } from '@/lib/request-body';
import { AppError } from '@/lib/permissions';
import { newMfaSecret, verifyTotp } from '@/lib/mfa';
import { encryptContact, decryptContact } from '@/lib/encryption';

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const data = z
      .object({
        token: z.string().min(40).max(100),
        action: z.enum(['setup', 'complete']),
        password: z.string().min(12).max(128).optional(),
        code: z
          .string()
          .regex(/^\d{6}$/)
          .optional(),
      })
      .strict()
      .parse(await readJson(request, 4096));
    const id = hashToken(data.token);
    await rateLimit('enroll:' + id, 8);
    return await db.$transaction(
      async (tx) => {
        // Serialize setup/complete so a replaced secret cannot race with confirmation.
        await tx.$queryRaw`SELECT "id" FROM "SafeherEnrollment" WHERE "id"=${id} FOR UPDATE`;
        const record = await tx.safeherEnrollment.findUnique({ where: { id } });
        const user = record ? await tx.user.findUnique({ where: { id: record.userId } }) : null;
        if (
          !record ||
          record.usedAt ||
          record.expiresAt <= new Date() ||
          !user ||
          user.status !== 'INVITED'
        )
          throw new AppError(400, 'ENROLLMENT', 'Invitation is invalid or expired.');
        if (data.action === 'setup') {
          const secret = record.secretEncrypted
            ? decryptContact(record.secretEncrypted)
            : newMfaSecret();
          if (!record.secretEncrypted)
            await tx.safeherEnrollment.update({
              where: { id },
              data: { secretEncrypted: encryptContact(secret) },
            });
          return Response.json(
            {
              data: {
                secret,
                uri: `otpauth://totp/${encodeURIComponent('SafeHer:' + user.email)}?secret=${secret}&issuer=SafeHer&algorithm=SHA1&digits=6&period=30`,
              },
            },
            { headers: { 'Cache-Control': 'no-store' } },
          );
        }
        const counter = record.secretEncrypted
          ? verifyTotp(decryptContact(record.secretEncrypted), data.code ?? '')
          : null;
        if (counter === null || !data.password)
          throw new AppError(400, 'MFA', 'Enter a strong password and valid authenticator code.');
        await tx.safeherEnrollment.update({
          where: { id },
          data: { usedAt: new Date(), secretEncrypted: null },
        });
        await tx.user.update({
          where: { id: user.id },
          data: {
            passwordHash: await bcrypt.hash(data.password, 12),
            mfaEnabled: true,
            mfaSecretEncrypted: record.secretEncrypted,
            mfaLastCounter: counter,
            sessionVersion: { increment: 1 },
            status: 'ACTIVE',
          },
        });
        await tx.session.deleteMany({ where: { userId: user.id } });
        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            organizationId: user.organizationId,
            entityType: 'SafeHer',
            entityId: user.id,
            action: 'MFA_ENROLLMENT_COMPLETE',
          },
        });
        return Response.json(
          { data: { enrolled: true } },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      },
      { maxWait: 10000, timeout: 30000 },
    );
  } catch (error) {
    return Response.json(
      {
        error: {
          message:
            error instanceof AppError
              ? error.message
              : 'Enrollment is unavailable. Check your invitation and try again.',
        },
      },
      {
        status: error instanceof AppError ? error.status : error instanceof z.ZodError ? 400 : 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
