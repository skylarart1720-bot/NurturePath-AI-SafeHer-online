import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { checkOrigin, createSession, rateLimit } from '@/lib/auth';
import { AppError } from '@/lib/permissions';
import { decryptContact } from '@/lib/encryption';
import { verifyTotp } from '@/lib/mfa';
const input = z
  .object({
    email: z.string().email().max(200),
    password: z.string().min(1).max(128),
    code: z
      .string()
      .regex(/^\d{6}$/)
      .optional()
      .or(z.literal('')),
  })
  .strict();
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const data = input.parse(await request.json());
    await rateLimit('login:' + data.email.toLowerCase(), 8);
    const user = await db.user.findUnique({ where: { email: data.email.toLowerCase() } });
    const valid = await bcrypt.compare(
      data.password,
      user?.passwordHash ?? '$2b$12$T12mDC6qpJLcKrjRuAaVs.lfbCAgNBksNvYg..SbHGoJm2k5uG3MC',
    );
    if (!user || !valid || user.status !== 'ACTIVE')
      return NextResponse.json(
        { error: { message: 'Email or password is incorrect.' } },
        { status: 401 },
      );
    if (user.mfaEnabled) {
      const counter = user.mfaSecretEncrypted
        ? verifyTotp(decryptContact(user.mfaSecretEncrypted), data.code ?? '', user.mfaLastCounter)
        : null;
      if (counter === null)
        return NextResponse.json(
          { error: { message: 'A valid unused authenticator code is required.' } },
          { status: 401 },
        );
      const updated = await db.user.updateMany({
        where: { id: user.id, mfaLastCounter: user.mfaLastCounter },
        data: { mfaLastCounter: counter },
      });
      if (updated.count !== 1)
        return NextResponse.json(
          { error: { message: 'Please use a fresh authenticator code.' } },
          { status: 401 },
        );
    }
    if (
      process.env.DEMO_MODE !== 'true' &&
      ['PLATFORM_ADMIN', 'CLINIC_ADMIN'].includes(user.role) &&
      !user.mfaEnabled
    )
      throw new AppError(
        403,
        'MFA_REQUIRED',
        'Privileged MFA must be configured before production access.',
      );
    await createSession(user.id, user.sessionVersion);
    await db.auditEvent.create({
      data: {
        actorId: user.id,
        organizationId: user.organizationId,
        clinicId: user.clinicId,
        entityType: 'Session',
        entityId: user.id,
        action: 'LOGIN',
      },
    });
    return NextResponse.json({
      data: {
        destination:
          user.role === 'HEALTH_WORKER'
            ? '/worker'
            : user.role === 'CLINIC_ADMIN'
              ? '/clinic'
              : '/admin',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          message:
            error instanceof AppError ? error.message : 'Unable to sign in. Check your details.',
        },
      },
      { status: error instanceof AppError ? error.status : 400 },
    );
  }
}
