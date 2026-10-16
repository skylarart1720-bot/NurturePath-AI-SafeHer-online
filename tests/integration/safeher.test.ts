import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { db } from '../../lib/db';
import { approvedLessons } from '../../lib/safeher';
import { lessons } from '../../lib/safeher-content';
import { ghanaDirectorySources } from '../../lib/ghana-directory-sources';
import { currentDirectoryCheck } from '../../lib/safeher-directory';
import { GET, POST } from '../../app/api/safeher/[...path]/route';
const context = (path: string) => ({ params: Promise.resolve({ path: path.split('/') }) });
const request = (
  path: string,
  body: unknown,
  origin = process.env.APP_URL ?? 'http://localhost:3200',
) =>
  new Request(origin + '/api/safeher/' + path, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
describe('SafeHer database and public API', () => {
  it('returns the sourced real contacts with evidence and no partner assignment', async () => {
    const res = await GET(
      new Request('http://localhost/api/safeher/directory'),
      context('directory'),
    );
    expect(res.status).toBe(200);
    const { data } = await res.json();
    for (const entry of ghanaDirectorySources) {
      const published = data.find((row: { id: string }) => row.id === entry.id);
      expect(published).toBeTruthy();
      expect(published.contactPhone).toBe(entry.contactPhone);
      expect(published.verificationSource).toBe(entry.verificationSource);
      expect(published.serviceCategories).toEqual(entry.serviceCategories);
      expect(currentDirectoryCheck(published)).toBe(true);
      expect(published).not.toHaveProperty('partnerId');
      expect(published).not.toHaveProperty('verifiedBy');
    }
  });
  beforeAll(async () => {
    expect(process.env.DEMO_MODE).toBe('true');
    await db.$queryRaw`SELECT 1`;
  });
  afterAll(async () => {
    await db.$disconnect();
  });
  it('publishes only reviewed approved English content', async () => {
    const items = await approvedLessons();
    expect(items).toHaveLength(12);
  });
  it('returns source attribution without persisting questions', async () => {
    const res = await POST(request('ask', { question: 'What is consent?' }), context('ask'));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.sources.length).toBeGreaterThan(0);
    expect(data.mode).toContain('extractive');
  });
  it('returns static guidance without an external call when the rate-limit database is unavailable', async () => {
    const query = vi
      .spyOn(db, '$queryRaw')
      .mockRejectedValueOnce(new Error('Synthetic database outage'));
    try {
      const res = await POST(request('ask', { question: 'What is consent?' }), context('ask'));
      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(data.found).toBe(false);
      expect(data.sources).toEqual([]);
      expect(data.text).toContain('temporarily unavailable');
      expect(query).toHaveBeenCalledTimes(1);
    } finally {
      query.mockRestore();
    }
  });
  it('validates input and rejects extra sensitive fields', async () => {
    const res = await POST(
      request('ask', { question: 'consent', name: 'Synthetic' }),
      context('ask'),
    );
    expect(res.status).toBe(400);
  });
  it('rejects cross-origin mutation', async () => {
    const res = await POST(
      request('ask', { question: 'consent' }, 'https://invalid.example'),
      context('ask'),
    );
    expect(res.status).toBe(403);
  });
  it('never sends referrals', async () => {
    const res = await POST(request('referrals', {}), context('referrals'));
    expect(res.status).toBe(403);
  });
  it('records structured listing reports without changing or contacting the provider', async () => {
    const entry = ghanaDirectorySources[0];
    const category = `Service information · ${entry.name} [${entry.id}]`;
    const before = await db.safeherService.findUniqueOrThrow({ where: { id: entry.id } });
    try {
      const res = await POST(
        request('directory/report', { serviceId: entry.id, reason: 'Service unavailable' }),
        context('directory/report'),
      );
      expect(res.status).toBe(202);
      expect((await res.json()).data.recorded).toBe(true);
      expect(
        await db.safeherFeedback.findFirst({ where: { category, rating: 'Service unavailable' } }),
      ).toBeTruthy();
      const after = await db.safeherService.findUniqueOrThrow({ where: { id: entry.id } });
      expect(after).toEqual(before);
      const invalid = await POST(
        request('directory/report', {
          serviceId: entry.id,
          reason: 'Service unavailable',
          story: 'Do not collect this',
        }),
        context('directory/report'),
      );
      expect(invalid.status).toBe(400);
      const missing = await POST(
        request('directory/report', {
          serviceId: 'missing-public-service',
          reason: 'Service unavailable',
        }),
        context('directory/report'),
      );
      expect(missing.status).toBe(404);
      const crossOrigin = await POST(
        request(
          'directory/report',
          { serviceId: entry.id, reason: 'Service unavailable' },
          'https://invalid.example',
        ),
        context('directory/report'),
      );
      expect(crossOrigin.status).toBe(403);
    } finally {
      await db.safeherFeedback.deleteMany({ where: { category, rating: 'Service unavailable' } });
    }
  });
  it('excludes synthetic entries from the public directory', async () => {
    const res = await GET(
      new Request('http://localhost/api/safeher/directory'),
      context('directory'),
    );
    const { data } = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(ghanaDirectorySources.length);
    expect(data.every((x: { synthetic: boolean }) => x.synthetic === false)).toBe(true);
  });
  it('supports deletion cascade without affecting another account', async () => {
    const org = await db.organization.findUniqueOrThrow({ where: { id: 'safeher-demo-org' } });
    const user = await db.user.create({
      data: {
        email: `delete-${crypto.randomUUID()}@example.invalid`,
        name: 'Deletion fixture',
        organizationId: org.id,
        role: 'REGISTERED_USER',
        passwordHash: 'not-a-login',
      },
    });
    await db.safeherProgress.create({ data: { userId: user.id, slug: 'consent' } });
    await db.user.delete({ where: { id: user.id } });
    expect(await db.safeherProgress.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.user.count({ where: { email: 'learner@safeher.example' } })).toBe(1);
  });
  it('excludes expired or future content reviews', async () => {
    const slug = 'review-expiry-' + crypto.randomUUID();
    try {
      await db.safeherContent.create({
        data: {
          slug,
          lesson: { ...lessons[0], slug },
          status: 'APPROVED',
          reviewedAt: new Date(Date.now() + 86400000),
          reviewExpiresAt: new Date(Date.now() + 180 * 86400000),
        },
      });
      expect((await approvedLessons()).some((item) => item.slug === slug)).toBe(false);
      await db.safeherContent.update({
        where: { slug },
        data: {
          reviewedAt: new Date(Date.now() - 86400000),
          reviewExpiresAt: new Date(Date.now() - 1000),
        },
      });
      expect((await approvedLessons()).some((item) => item.slug === slug)).toBe(false);
    } finally {
      await db.safeherContent.deleteMany({ where: { slug } });
    }
  });
  it('never publishes real directory contacts with future, expired, or withdrawn checks', async () => {
    const id = 'directory-expiry-' + crypto.randomUUID();
    const published = async () => {
      const res = await GET(
        new Request('http://localhost/api/safeher/directory'),
        context('directory'),
      );
      expect(res.status).toBe(200);
      return (await res.json()).data.some((row: { id: string }) => row.id === id);
    };
    try {
      await db.safeherService.create({
        data: {
          id,
          name: 'Synthetic verification fixture',
          description: 'Not a real provider',
          region: 'Test only',
          category: 'Test only',
          accessMethod: 'Online',
          eligibility: 'Fixture only',
          synthetic: false,
          contactUrl: 'https://example.invalid',
          verificationSource: 'https://example.invalid',
          verifiedAt: new Date(Date.now() + 86400000),
          reviewExpiresAt: new Date(Date.now() + 180 * 86400000),
          referralInstructions: 'No contact available',
        },
      });
      expect(await published()).toBe(false);
      await db.safeherService.update({
        where: { id },
        data: {
          verifiedAt: new Date(Date.now() - 86400000),
          reviewExpiresAt: new Date(Date.now() - 1000),
        },
      });
      expect(await published()).toBe(false);
      await db.safeherService.update({
        where: { id },
        data: { reviewExpiresAt: new Date(Date.now() + 86400000), publicationStatus: 'WITHDRAWN' },
      });
      expect(await published()).toBe(false);
    } finally {
      await db.safeherService.deleteMany({ where: { id } });
    }
  });
});
