import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SafeherPage } from '@/components/safeher-page';
import { LessonActions } from '@/components/safeher-tools';
import { db } from '@/lib/db';
import { approvedLessons, demoMode } from '@/lib/safeher';
import { type Lesson } from '@/lib/safeher-content';
import { readingMinutes } from '@/lib/safeher-learning';
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
  const related = (await approvedLessons())
    .filter((item) => item.slug !== slug)
    .sort((a, b) => Number(b.category === lesson.category) - Number(a.category === lesson.category))
    .slice(0, 2);
  return (
    <SafeherPage title={lesson.title} intro={lesson.summary} eyebrow={lesson.category}>
      <Link href="/learn">← All learning resources</Link>
      <div className="sh-lesson-meta">
        <span>{readingMinutes(lesson)} min read</span>
        <span>1 reflection question</span>
        <span>English</span>
      </div>
      <nav className="sh-lesson-nav" aria-label="In this lesson">
        <a href="#lesson-reading">1. Read the lesson</a>
        <a href="#lesson-reflection">2. Check understanding</a>
        <a href="#keep-learning">3. Keep learning</a>
      </nav>
      <article className="sh-reading" id="lesson-reading">
        <h2>What to know</h2>
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
          <p>
            Review valid until{' '}
            {row.reviewExpiresAt.toLocaleDateString('en-GB', { timeZone: 'UTC' })}. Source
            references support learning; they do not mean the source organisation endorses SafeHer.
          </p>
        </div>
      </article>
      <LessonActions key={lesson.slug} lesson={lesson} />
      <section className="sh-lesson-next" id="keep-learning" aria-labelledby="keep-learning-title">
        <span className="sh-eyebrow">YOUR NEXT STEP</span>
        <h2 id="keep-learning-title">Keep learning, at your pace</h2>
        <div className="sh-grid">
          {related.map((item) => (
            <Link key={item.slug} href={'/learn/' + item.slug} className="sh-feature">
              <span className="sh-eyebrow">{item.category}</span>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <span className="sh-card-link">Read next · {readingMinutes(item)} min</span>
            </Link>
          ))}
        </div>
        <p>
          <Link href="/find-support">Explore support services</Link> ·{' '}
          <Link href="/contact">Give feedback on this lesson</Link>
        </p>
      </section>
    </SafeherPage>
  );
}
