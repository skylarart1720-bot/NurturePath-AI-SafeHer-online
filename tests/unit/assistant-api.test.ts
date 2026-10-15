import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../lib/db', () => ({
  db: {
    $queryRaw: vi.fn(),
    safeherContent: { findMany: vi.fn() },
    safeherService: { findMany: vi.fn() },
    safeherMetric: { upsert: vi.fn() },
  },
}));
import { db } from '../../lib/db';
import { lessons } from '../../lib/safeher-content';
import { ghanaDirectorySources } from '../../lib/ghana-directory-sources';
import { POST } from '../../app/api/safeher/[...path]/route';
const ask = (question: string) =>
  POST(
    new Request('https://safeher.example/api/safeher/ask', {
      method: 'POST',
      headers: { origin: 'https://safeher.example', 'content-type': 'application/json' },
      body: JSON.stringify({ question, locale: 'en' }),
    }),
    { params: Promise.resolve({ path: ['ask'] }) },
  );
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('APP_URL', 'https://safeher.example');
  vi.stubEnv('DEMO_MODE', 'true');
  vi.stubEnv('SAFEHER_AI_ENABLED', 'false');
  vi.mocked(db.$queryRaw).mockResolvedValue([{ count: 1 }]);
  vi.mocked(db.safeherContent.findMany).mockResolvedValue(
    lessons.map((lesson) => ({
      slug: lesson.slug,
      lesson: JSON.parse(JSON.stringify(lesson)),
      version: 1,
      locale: 'en',
      status: 'APPROVED',
      reviewScope: 'DEMO_ONLY',
      reviewedBy: 'test-reviewer',
      updatedAt: new Date(),
      reviewedAt: new Date(Date.now() - 60000),
      reviewExpiresAt: new Date(Date.now() + 86400000),
    })) as Awaited<ReturnType<typeof db.safeherContent.findMany>>,
  );
  vi.mocked(db.safeherService.findMany).mockResolvedValue([]);
});
afterEach(() => vi.unstubAllEnvs());
describe('Ask API improvements', () => {
  it('returns relevant current real contacts with only public presentation fields', async () => {
    const contact = {
      ...ghanaDirectorySources.find((entry) => entry.id === 'safeher-gh-csa')!,
      verifiedAt: new Date(Date.now() - 60000),
      reviewExpiresAt: new Date(Date.now() + 86400000),
      publicationStatus: 'PUBLISHED',
      verifiedBy: 'private-reviewer-id',
      partnerId: 'private-partner-id',
    };
    vi.mocked(db.safeherService.findMany).mockResolvedValue([
      contact,
      { ...contact, id: 'synthetic', synthetic: true },
      { ...contact, id: 'expired', reviewExpiresAt: new Date(0) },
    ] as Awaited<ReturnType<typeof db.safeherService.findMany>>);
    const response = await ask('Someone keeps threatening me online');
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.found).toBe(true);
    expect(data.followUps.length).toBeGreaterThan(0);
    expect(data.supportContacts).toEqual([
      {
        id: contact.id,
        name: contact.name,
        category: contact.category,
        contactUrl: contact.contactUrl,
      },
    ]);
    expect(db.safeherService.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ synthetic: false, publicationStatus: 'PUBLISHED' }),
      }),
    );
  });
  it('preserves a sourced answer when the related-contact lookup fails', async () => {
    vi.mocked(db.safeherService.findMany).mockRejectedValueOnce(new Error('Unavailable'));
    const { data } = await (await ask('online harassment')).json();
    expect(data.found).toBe(true);
    expect(data.supportUnavailable).toBe(true);
    expect(data.supportContacts).toEqual([]);
    expect(data.sources.length).toBeGreaterThan(0);
  });
  it('uses clarification for unknown questions without suggesting unrelated providers', async () => {
    const { data } = await (await ask('quantum mechanics')).json();
    expect(data.status).toBe('clarify');
    expect(data.followUps.length).toBeGreaterThan(0);
    expect(data.supportContacts).toEqual([]);
    expect(db.safeherService.findMany).not.toHaveBeenCalled();
  });
  it('reports content failure separately from a question with no matching topic', async () => {
    vi.mocked(db.safeherContent.findMany).mockRejectedValueOnce(new Error('Unavailable'));
    const { data } = await (await ask('consent')).json();
    expect(data.status).toBe('unavailable');
    expect(data.followUps).toEqual([]);
    expect(data.supportContacts).toEqual([]);
  });
});
