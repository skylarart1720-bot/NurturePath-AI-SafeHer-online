import 'dotenv/config';
import { db } from '../lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { verifyTotp } from '../lib/mfa';
import { decryptContact } from '../lib/encryption';
const input = z.object({
  actorEmail: z.email(),
  actorPassword: z.string().min(1).max(128),
  actorCode: z.string().regex(/^\d{6}$/),
  email: z.email(),
  role: z.enum(['REGISTERED_USER', 'CONTENT_REVIEWER', 'SUPPORT_PARTNER']),
  serviceId: z.string().optional(),
});
try {
  const values = input.parse(
    JSON.parse(
      await new Promise<string>((resolve) => {
        let text = '';
        process.stdin.on('data', (chunk) => (text += chunk));
        process.stdin.on('end', () => resolve(text));
      }),
    ),
  );
  const actor = await db.user.findUnique({ where: { email: values.actorEmail } });
  if (!actor || actor.role !== 'PLATFORM_ADMIN' || actor.status !== 'ACTIVE')
    throw new Error('Active administrator required.');
  if (
    !actor.mfaEnabled ||
    !actor.mfaSecretEncrypted ||
    !(await bcrypt.compare(values.actorPassword, actor.passwordHash))
  )
    throw new Error('Administrator password and enabled MFA required.');
  const counter = verifyTotp(
    decryptContact(actor.mfaSecretEncrypted),
    values.actorCode,
    actor.mfaLastCounter,
  );
  if (counter === null) throw new Error('Fresh authenticator code required.');
  const user = await db.user.findUnique({ where: { email: values.email } });
  if (!user || user.organizationId !== actor.organizationId)
    throw new Error('User must belong to the administrator organization.');
  if (user.id === actor.id) throw new Error('Administrators cannot remove their own administrator role.');
  if (values.serviceId && values.role !== 'SUPPORT_PARTNER')
    throw new Error('Service assignment requires support-partner role.');
  await db.$transaction(async (tx) => {
    const changed = await tx.user.updateMany({
      where: {
        id: actor.id,
        mfaLastCounter: actor.mfaLastCounter,
        sessionVersion: actor.sessionVersion,
      },
      data: { mfaLastCounter: counter },
    });
    if (!changed.count) throw new Error('Administrator security changed.');
    await tx.user.update({
      where: { id: user.id },
      data: { role: values.role, sessionVersion: { increment: 1 } },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
    if (values.serviceId)
      await tx.safeherService.update({
        where: { id: values.serviceId },
        data: { partnerId: user.id },
      });
    await tx.auditEvent.create({
      data: {
        actorId: actor.id,
        organizationId: actor.organizationId,
        entityType: 'SafeHer',
        entityId: user.id,
        action: 'OPERATOR_ROLE_' + values.role,
      },
    });
  });
  console.log('Role updated, sessions revoked, optional service assigned, audit recorded.');
} finally {
  await db.$disconnect();
}
