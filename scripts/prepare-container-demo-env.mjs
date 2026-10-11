import 'dotenv/config';
import { writeFileSync } from 'node:fs';
const database = new URL(process.env.DATABASE_URL);
if (process.env.DEMO_MODE !== 'true' || !['localhost', '127.0.0.1'].includes(database.hostname))
  throw new Error('This helper is restricted to the local synthetic demo.');
database.hostname = 'db';
database.port = '5432';
const values = {
  DATABASE_URL: database.toString(),
  APP_URL: 'http://localhost:3300',
  DEMO_MODE: 'true',
  MESSAGE_PROVIDER: 'simulator',
  DEMO_PASSWORD: process.env.DEMO_PASSWORD,
  CONTACT_ENCRYPTION_KEY: process.env.CONTACT_ENCRYPTION_KEY,
  BACKUP_ENCRYPTION_KEY: process.env.BACKUP_ENCRYPTION_KEY,
};
const lines = Object.entries(values)
  .filter(([, value]) => value !== undefined)
  .map(([name, value]) => {
    if (/[\r\n]/.test(value))
      throw new Error('Multiline values are not supported in this local container helper.');
    return name + '=' + value;
  });
writeFileSync('.env.container.local', lines.join('\n') + '\n');
console.log(
  'Prepared ignored Docker-compatible synthetic environment for localhost:3300. No secret values printed.',
);
