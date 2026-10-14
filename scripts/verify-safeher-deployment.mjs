const origin = process.argv[2];
if (!origin || new URL(origin).protocol !== 'https:')
  throw new Error('Supply the approved HTTPS staging origin.');
const checks = [];
for (const path of [
  '/',
  '/learn',
  '/find-support',
  '/ask-safeher',
  '/offline',
  '/enroll',
  '/api/health',
]) {
  const response = await fetch(new URL(path, origin), {
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      `${path}: HTTP ${response.status}; check deployment protection and runtime configuration.`,
    );
  if (path === '/api/health') {
    const health = await response.json();
    if (health.status !== 'ok' && health.data?.status !== 'ok')
      throw new Error('Health status is not ready.');
  } else {
    const csp = response.headers.get('content-security-policy');
    if (
      !csp?.includes("'nonce-") ||
      csp
        .split(';')
        .find((x) => x.includes('script-src'))
        ?.includes('unsafe-inline')
    )
      throw new Error('Expected nonce script policy.');
  }
  checks.push({ path, status: response.status });
}
const hostile = await fetch(new URL('/api/safeher/ask', origin), {
  method: 'POST',
  headers: { origin: 'https://untrusted.invalid', 'content-type': 'application/json' },
  body: JSON.stringify({ question: 'consent' }),
  signal: AbortSignal.timeout(15000),
});
if (hostile.status !== 403) throw new Error('Hostile Origin was not rejected.');
console.log(
  JSON.stringify(
    {
      origin,
      checkedAt: new Date().toISOString(),
      checks,
      hostileOriginRejected: true,
      limits:
        'Read-only smoke checks plus rejected request; not professional approval, penetration testing, or restore evidence.',
    },
    null,
    2,
  ),
);
