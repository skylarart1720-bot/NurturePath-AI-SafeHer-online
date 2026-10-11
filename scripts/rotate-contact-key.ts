import 'dotenv/config';
import { db } from '../lib/db';
import { encryptContact, decryptContact } from '../lib/encryption';
async function main() {
  const target = process.env.ACTIVE_CONTACT_KEY_ID;
  const url = new URL(process.env.DATABASE_URL!);
  if (
    process.env.DEMO_MODE !== 'true' ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    !target ||
    !/^v[2-9]\d*$/.test(target)
  )
    throw new Error(
      'Rotation exercise requires local synthetic database and a configured new ACTIVE_CONTACT_KEY_ID.',
    );
  const test = 'synthetic-key-check';
  if (decryptContact(encryptContact(test)) !== test) throw new Error('New key round trip failed.');
  let count = 0;
  for (const m of await db.mother.findMany({
    where: { phoneEncrypted: { not: null } },
    select: { id: true, version: true, phoneEncrypted: true },
  })) {
    if (m.phoneEncrypted!.startsWith(target + '.')) continue;
    const plaintext = decryptContact(m.phoneEncrypted!);
    const encrypted = encryptContact(plaintext);
    if (decryptContact(encrypted) !== plaintext) throw new Error('Rotation round trip failed.');
    await db.$transaction(async (tx) => {
      await tx.mother.update({
        where: { id: m.id, version: m.version },
        data: { phoneEncrypted: encrypted, version: { increment: 1 } },
      });
      await tx.auditEvent.create({
        data: {
          actorId: 'local-key-rotation',
          organizationId: (
            await tx.mother.findUniqueOrThrow({
              where: { id: m.id },
              select: { organizationId: true },
            })
          ).organizationId,
          entityType: 'Mother',
          entityId: m.id,
          action: 'CONTACT_KEY_ROTATE',
        },
      });
    });
    count++;
  }
  for (const user of await db.user.findMany({
    where: { mfaSecretEncrypted: { not: null } },
    select: { id: true, mfaSecretEncrypted: true },
  }))
    if (!user.mfaSecretEncrypted!.startsWith(target + '.'))
      await db.user.update({
        where: { id: user.id },
        data: { mfaSecretEncrypted: encryptContact(decryptContact(user.mfaSecretEncrypted!)) },
      });
  console.log(
    JSON.stringify({
      synthetic: true,
      contactsRotated: count,
      keyId: target,
      plaintextLogged: false,
    }),
  );
}
main()
  .catch(() => {
    console.error(
      'Key rotation failed. Preserve old keys, check configuration, and reconcile record versions.',
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
