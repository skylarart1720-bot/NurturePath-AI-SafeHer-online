import { readJson } from '@/lib/request-body';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireActor, checkOrigin, rateLimit, createSession } from '@/lib/auth';
import { newMfaSecret, verifyTotp } from '@/lib/mfa';
import { encryptContact, decryptContact } from '@/lib/encryption';
import { AppError } from '@/lib/permissions';
export async function GET() {
  try {
    const actor = await requireActor();
    const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });
    return NextResponse.json({ data: { enabled: user.mfaEnabled } });
  } catch {
    return NextResponse.json({ error: { message: 'Sign in again.' } }, { status: 401 });
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const actor = await requireActor();
    await rateLimit('mfa:' + actor.id, 8);
    const data = z
      .object({
        action: z.enum(['setup', 'enable']),
        password: z.string().min(1).max(128),
        code: z
          .string()
          .regex(/^\d{6}$/)
          .optional(),
      })
      .strict()
      .parse(await readJson(request, 4096));
    const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });
    if (!(await bcrypt.compare(data.password, user.passwordHash)))
      throw new AppError(401, 'PASSWORD', 'Current password is incorrect.');
    if (user.mfaEnabled)
      throw new AppError(
        409,
        'MFA',
        'Authenticator is already enabled. Contact your designated administrator for a reviewed recovery process.',
      );
    if (data.action === 'setup') {
      const secret = newMfaSecret();
      const changed = await db.user.updateMany({
        where: {
          id: user.id,
          mfaEnabled: false,
          sessionVersion: user.sessionVersion,
          passwordHash: user.passwordHash,
        },
        data: { mfaSecretEncrypted: encryptContact(secret), mfaLastCounter: null },
      });
      if (changed.count !== 1)
        throw new AppError(
          409,
          'SECURITY_CHANGED',
          'Account security changed. Refresh and review.',
        );
      return NextResponse.json({
        data: {
          secret,
          uri: `otpauth://totp/${encodeURIComponent('NurturePath:' + user.email)}?secret=${secret}&issuer=NurturePath&algorithm=SHA1&digits=6&period=30`,
        },
      });
    }
    const counter = user.mfaSecretEncrypted
      ? verifyTotp(decryptContact(user.mfaSecretEncrypted), data.code ?? '')
      : null;
    if (counter === null) throw new AppError(400, 'CODE', 'Enter a valid authenticator code.');
    await db.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: {
          id: user.id,
          mfaEnabled: false,
          mfaSecretEncrypted: user.mfaSecretEncrypted,
          sessionVersion: user.sessionVersion,
          passwordHash: user.passwordHash,
        },
        data: { mfaEnabled: true, mfaLastCounter: counter, sessionVersion: { increment: 1 } },
      });
      if (changed.count !== 1)
        throw new AppError(409, 'MFA_CHANGED', 'Authenticator setup changed. Refresh and review.');
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          organizationId: user.organizationId,
          clinicId: user.clinicId,
          entityType: 'User',
          entityId: user.id,
          action: 'MFA_ENABLE',
        },
      });
    });
    await createSession(user.id, user.sessionVersion + 1);
    return NextResponse.json({ data: { enabled: true } });
  } catch (e) {
    return NextResponse.json(
      {
        error: {
          message: e instanceof AppError ? e.message : 'Unable to update authenticator settings.',
        },
      },
      { status: e instanceof AppError ? e.status : 400 },
    );
  }
}
