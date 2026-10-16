import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), create: vi.fn(), rateLimit: vi.fn() }));
vi.mock('../../lib/db', () => ({
  db: { safeherService: { findFirst: mocks.findFirst }, safeherFeedback: { create: mocks.create } },
}));
vi.mock('../../lib/auth', async (original) => ({
  ...(await original<typeof import('../../lib/auth')>()),
  rateLimit: mocks.rateLimit,
}));
vi.mock('../../lib/safeher-rate-identity', () => ({
  requestRateIdentity: async () => ({ identity: 'synthetic-test', identified: true }),
}));
import { POST } from '../../app/api/safeher/[...path]/route';
import { AppError } from '../../lib/permissions';
const context = { params: Promise.resolve({ path: ['directory', 'report'] }) };
const request = (payload: unknown, origin = 'http://localhost:3200') =>
  new Request('http://localhost:3200/api/safeher/directory/report', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
const payload = { serviceId: 'service-fixture', reason: 'Service unavailable' };

describe('structured directory reports', () => {
  beforeEach(() => {
    vi.stubEnv('APP_URL', 'http://localhost:3200');
    vi.clearAllMocks();
    mocks.rateLimit.mockResolvedValue(undefined);
    mocks.findFirst.mockResolvedValue({ id: 'service-fixture', name: 'Fixture organisation' });
    mocks.create.mockResolvedValue({ id: 'report-fixture' });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it('accepts a fixed reason for a published real service without staff login', async () => {
    const res = await POST(request(payload), context);
    expect(res.status).toBe(202);
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: 'service-fixture', synthetic: false, publicationStatus: 'PUBLISHED' },
      select: { id: true, name: true },
    });
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        category: 'Service information · Fixture organisation [service-fixture]',
        rating: 'Service unavailable',
      },
    });
    expect(mocks.rateLimit).toHaveBeenCalledWith(
      expect.stringContaining('safeher:directory/report:'),
      10,
    );
  });
  it.each([
    { ...payload, story: 'No personal stories accepted' },
    { ...payload, reason: 'Arbitrary free text' },
    { ...payload, serviceId: 'x'.repeat(101) },
  ])('rejects unsupported or extra fields before lookup', async (invalid) => {
    expect((await POST(request(invalid), context)).status).toBe(400);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('does not record reports for missing, withdrawn or synthetic listings', async () => {
    mocks.findFirst.mockResolvedValue(null);
    expect((await POST(request(payload), context)).status).toBe(404);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('rejects cross-origin requests and stops when the rate limit is reached', async () => {
    expect((await POST(request(payload, 'https://invalid.example'), context)).status).toBe(403);
    mocks.rateLimit.mockRejectedValueOnce(new AppError(429, 'RATE_LIMIT', 'Try later.'));
    expect((await POST(request(payload), context)).status).toBe(429);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
