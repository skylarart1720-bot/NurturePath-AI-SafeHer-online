import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const mode = process.argv[2];
if (!['dev', 'start'].includes(mode)) throw new Error('Choose dev or start.');
const port = Number(
  process.env.PORT || new URL(process.env.APP_URL || 'http://localhost:3200').port || 3200,
);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Configure an unprivileged application port.');
let args;
if (mode === 'start') {
  const server = resolve('.next/standalone/server.js');
  if (!existsSync(server)) throw new Error('Run npm run build before starting the compiled app.');
  cpSync('public', '.next/standalone/public', { recursive: true });
  cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });
  args = [server];
} else
  args = [
    require.resolve('next/dist/bin/next'),
    mode,
    '--hostname',
    process.env.NP_BIND_HOST || '127.0.0.1',
    '--port',
    String(port),
    ...process.argv.slice(3),
  ];
const child = spawn(process.execPath, args, {
  stdio: 'inherit',
  env: { ...process.env, PORT: String(port), HOSTNAME: process.env.NP_BIND_HOST || '127.0.0.1', SAFEHER_DEV_SERVER: mode === 'dev' ? 'true' : 'false' },
});
process.on('SIGINT', () => child.kill('SIGTERM'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.on('error', () => {
  console.error('Unable to start Next.js.');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code || 0;
});
