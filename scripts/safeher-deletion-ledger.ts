import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '../lib/db';
const [action, file] = process.argv.slice(2);
if (!['export', 'replay'].includes(action) || !file)
  throw new Error('Usage: export|replay <encrypted-ledger-file>');
if (!/^[a-f0-9]{64}$/i.test(process.env.BACKUP_ENCRYPTION_KEY ?? ''))
  throw new Error('Independent backup encryption key required.');
const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY!, 'hex');
const schema = z.array(
  z.object({
    userId: z.string().max(100),
    scope: z.enum(['ACCOUNT', 'PROGRESS']),
    createdAt: z.iso.datetime(),
  }),
);
try {
  if (action === 'export') {
    const rows = await db.safeherDeletion.findMany();
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', key, iv);
    const bytes = Buffer.concat([cipher.update(JSON.stringify(rows)), cipher.final()]);
    writeFileSync(
      file,
      JSON.stringify({
        version: 1,
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64'),
        data: bytes.toString('base64'),
      }),
      { flag: 'wx' },
    );
    console.log('Encrypted deletion ledger exported. Retain outside database backups.');
  } else {
    if (process.env.SAFEHER_RESTORE_REPLAY !== 'true')
      throw new Error('Explicit SAFEHER_RESTORE_REPLAY=true required on a quarantined restore.');
    const envelope = JSON.parse(readFileSync(file, 'utf8'));
    if (envelope.version !== 1) throw new Error('Unknown ledger format.');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    const rows = schema.parse(
      JSON.parse(
        Buffer.concat([
          decipher.update(Buffer.from(envelope.data, 'base64')),
          decipher.final(),
        ]).toString('utf8'),
      ),
    );
    await db.$transaction(async (tx) => {
      for (const row of rows) {
        await tx.safeherProgress.deleteMany({
          where: {
            userId: row.userId,
            ...(row.scope === 'PROGRESS' ? { completedAt: { lte: new Date(row.createdAt) } } : {}),
          },
        });
        if (row.scope === 'ACCOUNT') {
          const user = await tx.user.findUnique({ where: { id: row.userId } });
          if (user && user.role !== 'REGISTERED_USER')
            throw new Error('Ledger cannot delete privileged accounts.');
          await tx.safeherEnrollment.deleteMany({ where: { userId: row.userId } });
          await tx.user.deleteMany({ where: { id: row.userId, role: 'REGISTERED_USER' } });
        }
        await tx.safeherDeletion.upsert({
          where: { userId: row.userId },
          create: { ...row, createdAt: new Date(row.createdAt) },
          update: { scope: row.scope, createdAt: new Date(row.createdAt) },
        });
      }
    });
    console.log('Deletion ledger replay completed. Validate before reopening restored services.');
  }
} finally {
  await db.$disconnect();
}
