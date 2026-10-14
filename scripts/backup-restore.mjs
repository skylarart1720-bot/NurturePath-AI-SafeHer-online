import 'dotenv/config';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const run = promisify(execFile);
const db = new URL(process.env.DATABASE_URL);
if (
  process.env.DEMO_MODE !== 'true' ||
  !['localhost', '127.0.0.1'].includes(db.hostname) ||
  db.pathname !== '/nurturepath'
)
  throw new Error('This exercise is restricted to the local synthetic demonstration database.');
if (!/^[a-f0-9]{64}$/i.test(process.env.BACKUP_ENCRYPTION_KEY ?? ''))
  throw new Error('Configure an independent 64-hex BACKUP_ENCRYPTION_KEY.');
const container = 'nurturepathai-db-1';
const docker = (...args) =>
  run('docker', ['exec', container, ...args], {
    encoding: 'buffer',
    maxBuffer: 30 * 1024 * 1024,
    timeout: 60000,
  });
const started = Date.now();
const { stdout: dump } = await docker(
  'pg_dump',
  '-U',
  'nurturepath',
  '-d',
  'nurturepath',
  '--format=custom',
  '--no-owner',
  '--no-acl',
);
const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, 'hex');
const iv = randomBytes(12),
  cipher = createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(dump), cipher.final()]);
mkdirSync('backups', { recursive: true });
const file = 'backups/demo-' + Date.now() + '.npbackup';
writeFileSync(
  file,
  JSON.stringify({
    version: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64'),
  }),
);
const backup = JSON.parse(readFileSync(file, 'utf8'));
const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(backup.iv, 'base64'));
decipher.setAuthTag(Buffer.from(backup.tag, 'base64'));
const restored = Buffer.concat([
  decipher.update(Buffer.from(backup.data, 'base64')),
  decipher.final(),
]);
if (!restored.equals(dump)) throw new Error('Encrypted backup round trip mismatch.');
const target = 'np_restore_' + Date.now();
if (!/^np_restore_\d+$/.test(target)) throw new Error('Invalid scratch target.');
await docker('createdb', '-U', 'nurturepath', target);
// Pipe only decrypted in-memory bytes to pg_restore; no plaintext backup file.
await new Promise((resolve, reject) => {
  const child = execFile(
    'docker',
    [
      'exec',
      '-i',
      container,
      'pg_restore',
      '-U',
      'nurturepath',
      '-d',
      target,
      '--no-owner',
      '--no-acl',
      '--exit-on-error',
    ],
    { timeout: 60000 },
    (error) => (error ? reject(new Error('Scratch restore failed.')) : resolve()),
  );
  child.stdin.end(restored);
});
const tables = [
  'Organization',
  'Clinic',
  'User',
  'Mother',
  'Consent',
  'Appointment',
  'FollowUp',
  'Referral',
  'SafeherContent',
  'SafeherRevision',
  'SafeherTranslation',
  'SafeherService',
  'SafeherServiceReview',
  'SafeherProgress',
  'SafeherFeedback',
  'SafeherMetric',
  'SafeherDeletion',
  'SafeherEnrollment',
];
const sql =
  tables.map((table) => `SELECT '${table}',count(*) FROM "${table}"`).join(' UNION ALL ') +
  ' ORDER BY 1';
const source = (
  await docker('psql', '-U', 'nurturepath', '-d', 'nurturepath', '-At', '-c', sql)
).stdout.toString();
const targetCounts = (
  await docker('psql', '-U', 'nurturepath', '-d', target, '-At', '-c', sql)
).stdout.toString();
if (source !== targetCounts)
  throw new Error('Restored table counts differ. Do not claim restore proof.');
const report = {
  synthetic: true,
  source: 'local nurturepath',
  target,
  encryptedBackup: file,
  sha256: createHash('sha256').update(dump).digest('hex'),
  tableCounts: source.trim().split('\n'),
  elapsedMs: Date.now() - started,
  result: 'PASS',
  limits: 'Local synthetic restore only; not managed PITR or production RPO/RTO proof.',
};
writeFileSync('docs/BACKUP-RESTORE-EVIDENCE.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
// Leave the isolated scratch database available for inspection. Never overwrite/drop the source.
