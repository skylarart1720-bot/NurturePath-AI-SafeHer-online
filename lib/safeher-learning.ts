import type { Lesson } from './safeher-content';

export function readingMinutes(lesson: Lesson) {
  const words = [lesson.summary, ...lesson.paragraphs, lesson.question, ...lesson.answers]
    .join(' ')
    .trim()
    .split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 180));
}

export function matchingLessons(items: Lesson[], category: string, query: string) {
  const terms = query.toLocaleLowerCase('en').trim().split(/\s+/).filter(Boolean);
  return items.filter((lesson) => {
    const text = [lesson.title, lesson.summary, lesson.category, ...lesson.keywords]
      .join(' ')
      .toLocaleLowerCase('en');
    return (
      (category === 'All topics' || lesson.category === category) &&
      terms.every((term) => text.includes(term))
    );
  });
}
