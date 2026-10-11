import 'dotenv/config';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
const base = process.env.APP_URL;
if (
  process.env.DEMO_MODE !== 'true' ||
  !['localhost', '127.0.0.1'].includes(new URL(base).hostname)
)
  throw new Error('Local synthetic load check only.');
const login = await fetch(base + '/api/auth/login', {
  method: 'POST',
  headers: { Origin: base, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'worker2@demo.nurturepath.test',
    password: process.env.DEMO_PASSWORD,
  }),
});
if (!login.ok) throw new Error('Demo authentication failed.');
const cookie = login.headers.get('set-cookie')?.split(';')[0];
const duration = [],
  failures = [];
const started = performance.now();
let next = 0;
await Promise.all(
  Array.from({ length: 5 }, async () => {
    while (next < 100) {
      const index = next++;
      const before = performance.now();
      const r = await fetch(base + '/api/mothers', { headers: { Cookie: cookie } });
      await r.text();
      duration.push(performance.now() - before);
      if (!r.ok) failures.push({ index, status: r.status });
    }
  }),
);
duration.sort((a, b) => a - b);
await fetch(base + '/api/auth/logout', {
  method: 'POST',
  headers: { Cookie: cookie, Origin: base, 'Content-Type': 'application/json' },
  body: '{}',
});
const report = {
  synthetic: true,
  environment: 'localhost',
  requests: 100,
  concurrency: 5,
  path: '/api/mothers',
  failures: failures.length,
  p50Ms: Math.round(duration[49]),
  p95Ms: Math.round(duration[94]),
  maxMs: Math.round(duration[99]),
  elapsedMs: Math.round(performance.now() - started),
  limits:
    'Local synthetic standalone benchmark only, not a production capacity or availability claim. Compare measured p95 with the 800 ms target.',
};
writeFileSync('docs/LOAD-TEST-EVIDENCE.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
