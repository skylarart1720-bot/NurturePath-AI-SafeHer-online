import { describe, expect, it } from 'vitest';
import { ghanaDirectorySources, ghanaDirectoryCheckedAt } from '../../lib/ghana-directory-sources';
import {
  currentDirectoryCheck,
  filterDirectory,
  type DirectoryEntry,
} from '../../lib/safeher-directory';
const now = new Date('2026-10-14T12:00:00Z');
const filters = {
  query: '',
  region: 'All regions',
  category: 'All services',
  access: 'Any access',
  includeExamples: false,
};
describe('Public-source Ghana directory', () => {
  it('has six real organisations with dated primary sources and published contacts', () => {
    expect(ghanaDirectorySources).toHaveLength(6);
    for (const entry of ghanaDirectorySources) {
      expect(entry.synthetic).toBe(false);
      expect(entry.verifiedAt).toBe(ghanaDirectoryCheckedAt);
      expect(entry.verificationMethod).toBe('OFFICIAL_PUBLICATION');
      expect(entry.contactPhone).toBeTruthy();
      expect(new URL(entry.verificationSource!).protocol).toBe('https:');
      expect(currentDirectoryCheck(entry, now)).toBe(true);
    }
  });
  it('never treats a synthetic entry as checked even if dates are supplied', () => {
    const fake = { ...ghanaDirectorySources[0], synthetic: true };
    expect(currentDirectoryCheck(fake, now)).toBe(false);
    expect(filterDirectory([fake], filters, now)).toEqual([]);
    expect(filterDirectory([fake], { ...filters, includeExamples: true }, now)).toHaveLength(0);
  });
  it('hides expired, future-dated, and unsourced entries', () => {
    for (const altered of [
      { verifiedAt: '2025-01-01' },
      { verifiedAt: '2027-01-01' },
      { verifiedAt: 'bad-date' },
      { verificationSource: null },
      { contactUrl: null },
    ]) {
      const entry = { ...ghanaDirectorySources[0], ...altered };
      expect(currentDirectoryCheck(entry, now)).toBe(false);
      expect(filterDirectory([entry], filters, now)).toHaveLength(0);
    }
  });
  it('matches additional service categories and national enquiry coverage', () => {
    expect(
      filterDirectory(
        ghanaDirectorySources,
        { ...filters, category: 'GBV response', region: 'Ashanti' },
        now,
      ).map((e) => e.id),
    ).toEqual(['safeher-gh-dovvsu', 'safeher-gh-helpline-of-hope']);
    expect(
      filterDirectory(
        ghanaDirectorySources,
        { ...filters, category: 'Reproductive healthcare' },
        now,
      ),
    ).toHaveLength(2);
    expect(
      filterDirectory(ghanaDirectorySources, { ...filters, access: 'Online' }, now),
    ).toHaveLength(6);
    expect(
      filterDirectory(ghanaDirectorySources, { ...filters, access: 'In person' }, now),
    ).toHaveLength(0);
  });
  it('excludes examples even when a legacy client requests them', () => {
    const fake: DirectoryEntry = {
      ...ghanaDirectorySources[0],
      id: 'synthetic',
      name: 'Example only',
      synthetic: true,
      verifiedAt: null,
      contactUrl: null,
      verificationSource: null,
      contactPhone: null,
    };
    expect(filterDirectory([...ghanaDirectorySources, fake], filters, now)).toHaveLength(6);
    expect(
      filterDirectory([...ghanaDirectorySources, fake], { ...filters, includeExamples: true }, now),
    ).toHaveLength(6);
  });
  it('combines support starting points with region, category and access filters', () => {
    expect(
      filterDirectory(ghanaDirectorySources, { ...filters, startingPoint: 'health' }, now),
    ).toHaveLength(2);
    expect(
      filterDirectory(
        ghanaDirectorySources,
        { ...filters, startingPoint: 'safety', region: 'Ashanti' },
        now,
      ).map((entry) => entry.id),
    ).toEqual(['safeher-gh-dovvsu', 'safeher-gh-helpline-of-hope']);
    expect(
      filterDirectory(ghanaDirectorySources, { ...filters, startingPoint: 'legal' }, now).map(
        (entry) => entry.id,
      ),
    ).toEqual(['safeher-gh-legal-aid']);
    expect(
      filterDirectory(ghanaDirectorySources, { ...filters, startingPoint: 'online' }, now).map(
        (entry) => entry.id,
      ),
    ).toEqual(['safeher-gh-csa']);
    expect(
      filterDirectory(
        ghanaDirectorySources,
        { ...filters, startingPoint: 'legal', access: 'In person' },
        now,
      ),
    ).toEqual([]);
    expect(
      filterDirectory(ghanaDirectorySources, { ...filters, startingPoint: 'invalid' }, now),
    ).toEqual([]);
  });
});
