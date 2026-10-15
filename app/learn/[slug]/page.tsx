import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SafeherPage } from '@/components/safeher-page';
import { LessonActions } from '@/components/safeher-tools';
import { db } from '@/lib/db';
import { demoMode } from '@/lib/safeher';
import { type Lesson } from '@/lib/safeher-content';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await db.safeherContent.findUnique({ where: { slug } });
  if (
    !row ||
    row.status !== 'APPROVED' ||
    !row.reviewedAt ||
    row.reviewedAt > new Date() ||
    !row.reviewExpiresAt ||
    row.reviewExpiresAt <= new Date() ||
    row.locale !== 'en' ||
    (!demoMode() && row.reviewScope !== 'PILOT_REVIEWED')
  )
    notFound();
  const lesson: Lesson = {
    ...(row.lesson as unknown as Lesson),
    review: {
      version: row.version,
      reviewedAt: row.reviewedAt.toISOString(),
      expiresAt: row.reviewExpiresAt.toISOString(),
      scope: row.reviewScope,
    },
  };
  return (
    <SafeherPage title={lesson.title} intro={lesson.summary} eyebrow={lesson.category}>
      <Link href="/learn">← All learning resources</Link>
      <article className="sh-reading">
        {lesson.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <div className="sh-sources">
          <strong>Source reference</strong>
          <p>
            <a href={lesson.source} rel="noreferrer">
              {lesson.sourceName}
            </a>
          </p>
          <p>
            Last reviewed: {row.reviewedAt.toLocaleDateString('en-GB', { timeZone: 'UTC' })} ·{' '}
            {row.reviewScope === 'DEMO_ONLY'
              ? 'Approved for synthetic demonstration only; professional review required'
              : 'Professionally reviewed for pilot'}{' '}
            · English · Version {row.version}
          </p>
        </div>
      </article>
      <LessonActions lesson={lesson} />
    </SafeherPage>
  );
}
