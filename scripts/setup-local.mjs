import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env')) {
  console.log('Existing .env preserved.');
} else {
  let value = readFileSync('.env.example', 'utf8');
  value = value
    .replace('replace-with-at-least-32-random-characters', randomBytes(32).toString('base64url'))
    .replace('replace-with-64-hex-characters', randomBytes(32).toString('hex'))
    .replace('replace-with-a-local-demo-password', 'NurtureDemo!2026')
    .replace('replace-with-an-independent-64-hex-key', randomBytes(32).toString('hex'));
  writeFileSync('.env', value);
  console.log('Local synthetic-demo .env created. Demo credentials are documented in README.md.');
}
if (!/^BACKUP_ENCRYPTION_KEY=/m.test(readFileSync('.env', 'utf8'))) {
  writeFileSync(
    '.env',
    readFileSync('.env', 'utf8') +
      '\nBACKUP_ENCRYPTION_KEY="' +
      randomBytes(32).toString('hex') +
      '"\n',
  );
  console.log('Added independent local backup key.');
}
