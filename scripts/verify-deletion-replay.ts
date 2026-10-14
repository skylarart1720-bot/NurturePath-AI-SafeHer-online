import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const run = promisify(execFile);
const evidence = JSON.parse(readFileSync('docs/BACKUP-RESTORE-EVIDENCE.json', 'utf8'));
const url = new URL(process.env.DATABASE_URL!);
if (
  process.env.DEMO_MODE !== 'true' ||
  !['localhost', '127.0.0.1'].includes(url.hostname) ||
  !/^np_restore_\d+$/.test(evidence.target) ||
  evidence.result !== 'PASS'
)
  throw new Error('Requires a verified local synthetic scratch restore.');
url.hostname = '127.0.0.1';
url.pathname = '/' + evidence.target;
const client = new PrismaClient({ datasourceUrl: url.toString() });
const suffix = randomUUID();
const learnerId = 'replay-learner-' + suffix,
  staffId = 'replay-staff-' + suffix;
const env = { ...process.env, DATABASE_URL: url.toString(), SAFEHER_RESTORE_REPLAY: 'true' };
const command = (action: string, file: string) =>
  run(
    process.execPath,
    ['node_modules/tsx/dist/cli.mjs', 'scripts/safeher-deletion-ledger.ts', action, file],
    { env, timeout: 60000 },
  );
try {
  const organization = await client.organization.findUniqueOrThrow({
    where: { id: 'safeher-demo-org' },
  });
  await client.user.create({
    data: {
      id: learnerId,
      organizationId: organization.id,
      name: 'Synthetic restored deletion fixture',
      email: `${learnerId}@example.invalid`,
      role: 'REGISTERED_USER',
      passwordHash: 'not-a-login',
    },
  });
  await client.safeherProgress.create({ data: { userId: learnerId, slug: 'consent' } });
  await client.session.create({
    data: { id: 'fixture-' + suffix, userId: learnerId, expiresAt: new Date(Date.now() + 600000) },
  });
  await client.safeherDeletion.create({ data: { userId: learnerId, scope: 'ACCOUNT' } });
  const file = `backups/deletion-replay-${suffix}.enc`;
  await command('export', file);
  await command('replay', file);
  await command('replay', file);
  if (
    (await client.user.count({ where: { id: learnerId } })) ||
    (await client.safeherProgress.count({ where: { userId: learnerId } })) ||
    (await client.session.count({ where: { userId: learnerId } }))
  )
    throw new Error('Deletion replay did not remove the restored learner and related data.');
  await client.user.create({
    data: {
      id: staffId,
      organizationId: organization.id,
      name: 'Synthetic protected staff fixture',
      email: `${staffId}@example.invalid`,
      role: 'CONTENT_REVIEWER',
      passwordHash: 'not-a-login',
    },
  });
  await client.safeherProgress.create({ data: { userId: staffId, slug: 'consent' } });
  await client.safeherDeletion.create({ data: { userId: staffId, scope: 'ACCOUNT' } });
  const guardedFile = `backups/deletion-guard-${suffix}.enc`;
  await command('export', guardedFile);
  let rejected = false;
  try {
    await command('replay', guardedFile);
  } catch {
    rejected = true;
  }
  if (
    !rejected ||
    !(await client.user.count({ where: { id: staffId } })) ||
    !(await client.safeherProgress.count({ where: { userId: staffId } }))
  )
    throw new Error('Privileged account protection failed.');
  const report = {
    checkedAt: new Date().toISOString(),
    synthetic: true,
    scratchDatabase: evidence.target,
    encryptedExport: true,
    restoredLearnerRemoved: true,
    relatedProgressAndSessionsRemoved: true,
    repeatedReplayIdempotent: true,
    privilegedAccountRejectedWithoutPartialDeletion: true,
    result: 'PASS',
    limits: 'Local quarantined scratch restore; not hosted backup/PITR or legal review.',
  };
  writeFileSync(
    'docs/SAFEHER-DELETION-REPLAY-EVIDENCE.json',
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await client.safeherDeletion.deleteMany({ where: { userId: { in: [learnerId, staffId] } } });
  await client.user.deleteMany({ where: { id: { in: [learnerId, staffId] } } });
  await client.$disconnect();
}
