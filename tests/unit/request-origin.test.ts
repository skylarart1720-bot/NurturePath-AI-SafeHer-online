import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkOrigin } from '../../lib/request-origin';

const request = (origin?: string, extra: Record<string, string> = {}) =>
  new Request('https://internal.example/api/safeher/ask', {
    method: 'POST',
    headers: { ...extra, ...(origin ? { origin } : {}) },
  });

beforeEach(() => {
  for (const name of [
    'APP_URL',
    'VERCEL',
    'VERCEL_ENV',
    'VERCEL_URL',
    'VERCEL_BRANCH_URL',
    'VERCEL_PROJECT_PRODUCTION_URL',
  ])
    vi.stubEnv(name, '');
});
afterEach(() => vi.unstubAllEnvs());

describe('deployment request origins', () => {
  it('accepts the configured custom domain and local development fallback', () => {
    expect(() => checkOrigin(request('http://localhost:3200'))).not.toThrow();
    vi.stubEnv('APP_URL', 'https://safeher.example/');
    expect(() => checkOrigin(request('https://safeher.example'))).not.toThrow();
    expect(() => checkOrigin(request('http://localhost:3200'))).toThrow();
  });
  it('accepts exact platform deployment and branch URLs with a stale APP_URL', () => {
    vi.stubEnv('APP_URL', 'http://localhost:3200');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_URL', 'safeher-abc.vercel.app');
    vi.stubEnv('VERCEL_BRANCH_URL', 'safeher-git-main.vercel.app');
    expect(() => checkOrigin(request('https://safeher-abc.vercel.app'))).not.toThrow();
    expect(() => checkOrigin(request('https://safeher-git-main.vercel.app'))).not.toThrow();
    expect(() => checkOrigin(request('https://other-project.vercel.app'))).toThrow();
    expect(() => checkOrigin(request('http://safeher-abc.vercel.app'))).toThrow();
  });
  it('uses the project production URL only for production deployments', () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'safeher.vercel.app');
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(() => checkOrigin(request('https://safeher.vercel.app'))).toThrow();
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(() => checkOrigin(request('https://safeher.vercel.app'))).not.toThrow();
  });
  it('rejects absent, null, malformed and hostile origins even with forged host headers', () => {
    vi.stubEnv('APP_URL', 'https://safeher.example');
    for (const origin of [
      undefined,
      'null',
      'https://safeher.example.evil.test',
      'https://safeher.example/path',
      'https://evil.test',
    ]) {
      expect(() =>
        checkOrigin(request(origin, { host: 'evil.test', 'x-forwarded-host': 'evil.test' })),
      ).toThrow();
    }
  });
  it('fails closed for invalid configuration and ignores platform URLs outside Vercel', () => {
    vi.stubEnv('APP_URL', 'invalid');
    vi.stubEnv('VERCEL_URL', 'safeher.vercel.app');
    expect(() => checkOrigin(request('https://safeher.vercel.app'))).toThrow();
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_URL', 'evil.test/path');
    expect(() => checkOrigin(request('https://evil.test'))).toThrow();
    expect(() => checkOrigin(request('http://localhost:3200'))).toThrow();
  });
});
