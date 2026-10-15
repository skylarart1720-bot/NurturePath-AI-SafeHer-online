import { describe, expect, it } from 'vitest';
import { lessons } from '../../lib/safeher-content';
import { matchingLessons, readingMinutes } from '../../lib/safeher-learning';

describe('lesson discovery', () => {
  it('combines category and case-insensitive search across keywords', () => {
    expect(matchingLessons(lessons, 'Your rights', '  PERMISSION  ').map((l) => l.slug)).toEqual([
      'consent',
    ]);
    expect(matchingLessons(lessons, 'Digital safety', 'permission')).toEqual([]);
    expect(matchingLessons(lessons, 'All topics', 'body boundaries').map((l) => l.slug)).toContain(
      'bodily-autonomy',
    );
  });
  it('handles empty queries and unknown terms without losing the original order', () => {
    expect(matchingLessons(lessons, 'All topics', '   ')).toEqual(lessons);
    expect(matchingLessons(lessons, 'All topics', 'unfindablexyz')).toEqual([]);
  });
  it('estimates reading time from content with a minimum of one minute', () => {
    expect(readingMinutes(lessons[0])).toBe(1);
    expect(
      readingMinutes({ ...lessons[0], paragraphs: ['word '.repeat(540)] }),
    ).toBeGreaterThanOrEqual(3);
  });
});
