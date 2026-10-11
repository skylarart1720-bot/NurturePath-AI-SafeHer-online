import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkOrigin, hashToken, rateLimit } from '@/lib/auth';
import { AppError } from '@/lib/permissions';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const raw = await request.json();
    if (raw.token) {
      const data = z
        .object({ token: z.string().min(30).max(100), password: z.string().min(12).max(128) })
        .strict()
        .parse(raw);
      await rateLimit('reset-token:' + hashToken(data.token), 5);
      await db.$transaction(async (tx) => {
        const record = await tx.passwordReset.findUnique({ where: { id: hashToken(data.token) } });
        if (!record || record.usedAt || record.expiresAt < new Date())
          throw new AppError(400, 'TOKEN', 'This reset link is invalid or expired.');
        const used = await tx.passwordReset.updateMany({
          where: { id: record.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        if (used.count !== 1)
          throw new AppError(400, 'TOKEN', 'This reset link has already been used.');
        await tx.user.update({
          where: { id: record.userId },
          data: {
            passwordHash: await bcrypt.hash(data.password, 12),
            sessionVersion: { increment: 1 },
          },
        });
        await tx.session.deleteMany({ where: { userId: record.userId } });
      });
      return NextResponse.json({ data: { message: 'Password changed. Sign in again.' } });
    }
    const data = z
      .object({ email: z.string().email().max(200) })
      .strict()
      .parse(raw);
    await rateLimit('reset:' + data.email.toLowerCase(), 3);
    const user = await db.user.findUnique({ where: { email: data.email.toLowerCase() } });
    // Local mailbox simulator is enabled only for synthetic localhost use. No account-enumerating production output.
    let demoResetLink: string | undefined;
    if (
      user &&
      process.env.DEMO_MODE === 'true' &&
      process.env.NODE_ENV !== 'production' &&
      ['localhost', '127.0.0.1'].includes(new URL(process.env.APP_URL!).hostname)
    ) {
      const token = randomBytes(32).toString('base64url');
      await db.passwordReset.create({
        data: {
          id: hashToken(token),
          userId: user.id,
          expiresAt: new Date(Date.now() + 15 * 60000),
        },
      });
      demoResetLink = '/reset?token=' + token;
    }
    return NextResponse.json({
      data: {
        message:
          'If your account is eligible, a reset link will be provided through your configured recovery channel. Hosted demos require an administrator.',
        demoResetLink,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: { message: error instanceof AppError ? error.message : 'Check your reset details.' },
      },
      { status: error instanceof AppError ? error.status : 400 },
    );
  }
}
