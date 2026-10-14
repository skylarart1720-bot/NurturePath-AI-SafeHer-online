import type { Lesson } from './safeher-content';
export function usableDownload(lesson: Lesson, now = Date.now()) {
  if (!lesson.review) return false;
  const reviewed = Date.parse(lesson.review.reviewedAt);
  const expiry = Date.parse(lesson.review.expiresAt);
  return (
    Number.isFinite(reviewed) &&
    Number.isFinite(expiry) &&
    reviewed <= now &&
    expiry > now &&
    expiry > reviewed
  );
}
export function reconcileDownloads(saved: Lesson[], published: Lesson[]) {
  return saved.filter(
    (item) =>
      usableDownload(item) &&
      published.some(
        (current) =>
          current.slug === item.slug &&
          current.review?.version === item.review?.version &&
          current.review?.scope === item.review?.scope,
      ),
  );
}
