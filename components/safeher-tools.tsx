'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Download, Send, CheckCircle, BookOpen, Trash2 } from 'lucide-react';
import { type Lesson } from '@/lib/safeher-content';
import { api } from '@/lib/safeher-client';
import { usableDownload, reconcileDownloads } from '@/lib/safeher-downloads';
export { api };
export function AskSafeher() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<{
    text: string;
    sources: { title: string; url: string; slug: string; review?: Lesson['review'] }[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setAnswer(null);
    try {
      setAnswer(await api('ask', { question, locale: 'en' }));
      setQuestion('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to connect.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="sh-chat">
      <div className="sh-chat-intro">
        <span className="sh-feature-icon mint">
          <BookOpen />
        </span>
        <h2>What would you like to understand?</h2>
        <p>
          Ask a general question. Leave out names, addresses, medical records, or details that
          identify you.
        </p>
      </div>
      <div className="sh-suggestions">
        {[
          'What does consent mean?',
          'How can I handle online harassment?',
          'What is child marriage?',
          'How do I protect my account?',
        ].map((q) => (
          <button className="secondary" key={q} onClick={() => setQuestion(q)}>
            {q}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {answer && (
        <article className="sh-answer" aria-live="polite">
          <h3>A starting point from SafeHer</h3>
          {answer.text.split('\n\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {answer.sources.length > 0 && (
            <div className="sh-sources">
              <strong>Sources & related learning</strong>
              {answer.sources.map((source) => (
                <p key={source.slug}>
                  <a href={source.url} rel="noreferrer">
                    {source.title}
                  </a>{' '}
                  · <Link href={'/learn/' + source.slug}>Read lesson</Link>
                  {source.review && (
                    <span className="sh-small">
                      {' '}
                      · Version {source.review.version} · Reviewed{' '}
                      {source.review.reviewedAt.slice(0, 10)} ·{' '}
                      {source.review.scope === 'DEMO_ONLY'
                        ? 'Demonstration review; professional review required'
                        : 'Pilot review'}{' '}
                      · Expires {source.review.expiresAt.slice(0, 10)}
                    </span>
                  )}
                </p>
              ))}
            </div>
          )}
          <button className="text-button" onClick={() => setAnswer(null)}>
            Clear this answer
          </button>
        </article>
      )}
      <form onSubmit={submit} className="sh-question">
        <label htmlFor="question">Your question</label>
        <textarea
          id="question"
          required
          minLength={2}
          maxLength={1000}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="For example: How can I set boundaries?"
          rows={3}
        />
        <button disabled={busy} type="submit">
          <Send size={17} />
          {busy ? 'Finding reviewed information…' : 'Ask SafeHer'}
        </button>
      </form>
      <p className="sh-small">
        Source-grounded extractive assistance · English · Internet required. Questions are processed
        on the server, not saved in our database or sent to an external AI provider. Hosting logs
        and network records may still exist. <Link href="/privacy">Read the privacy details.</Link>
      </p>
    </div>
  );
}
export function LearningHub({ items }: { items: Lesson[] }) {
  const [filter, setFilter] = useState('All topics');
  const categories = ['All topics', ...new Set(items.map((l) => l.category))];
  return (
    <>
      <div className="sh-tabs" aria-label="Filter learning topics">
        {categories.map((c) => (
          <button
            key={c}
            className={filter === c ? '' : 'secondary'}
            aria-pressed={filter === c}
            onClick={() => setFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="sh-grid">
        {items
          .filter((l) => filter === 'All topics' || l.category === filter)
          .map((l, i) => (
            <Link href={'/learn/' + l.slug} className="sh-feature" key={l.slug}>
              <div className="sh-lesson-top">
                <span className="sh-feature-icon mint">
                  <BookOpen size={23} />
                </span>
                <small>LESSON {String(i + 1).padStart(2, '0')}</small>
              </div>
              <span className="sh-eyebrow">{l.category}</span>
              <h2>{l.title}</h2>
              <p>{l.summary}</p>
              <span className="sh-card-link">
                Start learning · 3 min <ArrowRight size={16} />
              </span>
            </Link>
          ))}
      </div>
      {items.length === 0 && (
        <p className="notice">No published resources are available. Please try again later.</p>
      )}
      <SavedResources />
    </>
  );
}
function readSaved(): Lesson[] {
  try {
    const rows: unknown = JSON.parse(localStorage.getItem('safeher-downloads') ?? '[]');
    return Array.isArray(rows)
      ? rows.filter(
          (item): item is Lesson =>
            !!item && typeof item === 'object' && 'slug' in item && usableDownload(item as Lesson),
        )
      : [];
  } catch {
    return [];
  }
}
export function LessonActions({ lesson }: { lesson: Lesson }) {
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setSaved(readSaved().some((l) => l.slug === lesson.slug)));
    api('metrics', { event: 'resource_access' }).catch(() => {});
  }, [lesson.slug]);
  async function complete() {
    setChecked(true);
    if (choice !== lesson.correct) return;
    setMessage('Lesson completed. Progress is not saved on this device.');
    try {
      const me = await api('me');
      if (me) {
        await api('progress', { slug: lesson.slug });
        setMessage('Lesson completed. Saved to your optional account.');
      }
      await api('metrics', { event: 'module_complete' });
    } catch {
      setMessage('Lesson completed. Account progress could not be saved.');
    }
  }
  function download() {
    try {
      if (!usableDownload(lesson)) {
        setMessage('This resource needs a current review before it can be saved.');
        return;
      }
      const rows = readSaved().filter((l) => l.slug !== lesson.slug);
      localStorage.setItem('safeher-downloads', JSON.stringify([...rows, lesson]));
      setSaved(true);
      setMessage(
        'Saved on this device. Open Saved resources from the learning hub or offline page. Anyone with access to this browser may see downloads.',
      );
    } catch {
      setMessage('Your browser could not save the resource.');
    }
  }
  return (
    <>
      <section className="sh-quiz">
        <div className="sh-eyebrow">A MOMENT TO REFLECT</div>
        <h2>Check your understanding</h2>
        <fieldset>
          <legend>{lesson.question}</legend>
          {lesson.answers.map((a, i) => (
            <label className="sh-option" key={a}>
              <input
                type="radio"
                name="quiz"
                checked={choice === i}
                onChange={() => {
                  setChoice(i);
                  setChecked(false);
                }}
              />
              {a}
            </label>
          ))}
        </fieldset>
        <button disabled={choice === null} onClick={complete}>
          Check answer <CheckCircle size={16} />
        </button>
        {checked && (
          <p role="status">
            {choice === lesson.correct ? 'That’s right.' : 'Try again.'} {lesson.explanation}
          </p>
        )}
      </section>
      <div className="sh-actions">
        <button className="secondary" onClick={download}>
          <Download size={17} />
          {saved ? 'Update saved resource' : 'Save for offline reading'}
        </button>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </>
  );
}
export function SavedResources() {
  const [saved, setSaved] = useState<Lesson[]>([]);
  const [selected, setSelected] = useState<Lesson | null>(null);
  useEffect(() => {
    function refresh() {
      const rows = readSaved();
      setSaved(rows);
      setSelected((current) => (current && usableDownload(current) ? current : null));
      api('content')
        .then((published: Lesson[]) => {
          const valid = reconcileDownloads(rows, published);
          localStorage.setItem('safeher-downloads', JSON.stringify(valid));
          setSaved(valid);
          setSelected((current) =>
            current && valid.some((item) => item.slug === current.slug) ? current : null,
          );
        })
        .catch(() => {});
    }
    queueMicrotask(refresh);
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('online', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', refresh);
    };
  }, []);
  function clear() {
    localStorage.removeItem('safeher-downloads');
    setSaved([]);
    setSelected(null);
  }
  return (
    <section className="sh-saved">
      <div className="sh-eyebrow">LOW-CONNECTIVITY LEARNING</div>
      <h2>Saved resources</h2>
      <p>
        Downloads are stored on this device only. They may be visible to anyone who uses this
        browser. Expired copies are removed. When connected, withdrawn or changed resources are
        removed. Offline withdrawal checks wait until you reconnect.
      </p>
      {saved.length === 0 ? (
        <p>No resources saved yet. Open a lesson and select “Save for offline reading”.</p>
      ) : (
        <>
          <div className="sh-tabs">
            {saved.map((l) => (
              <button className="secondary" key={l.slug} onClick={() => setSelected(l)}>
                {l.title}
              </button>
            ))}
          </div>
          <button className="text-button" onClick={clear}>
            <Trash2 size={16} /> Remove all downloads
          </button>
        </>
      )}
      {selected && (
        <article className="sh-answer">
          <h3>{selected.title}</h3>
          {selected.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <a href={selected.source}>{selected.sourceName}</a>
          <p className="sh-small">
            Version {selected.review?.version} · Reviewed {selected.review?.reviewedAt.slice(0, 10)}{' '}
            ·{' '}
            {selected.review?.scope === 'DEMO_ONLY'
              ? 'Demonstration review; professional review required'
              : 'Pilot review'}{' '}
            · Expires {selected.review?.expiresAt.slice(0, 10)} · Saved copy
          </p>
        </article>
      )}
    </section>
  );
}
export { VerifiedDirectory as Directory } from './safeher-directory';
export function Feedback() {
  const [category, setCategory] = useState('Accessibility');
  const [rating, setRating] = useState('Helpful');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('feedback', { category, rating });
      setMessage('Thank you. Your non-identifying feedback was recorded.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to submit.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="sh-question" onSubmit={submit}>
      <p>
        Share structured feedback without names, contact details, or personal disclosures. This form
        is not monitored for emergency requests.
      </p>
      <label>
        What is your feedback about?
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {['Accessibility', 'Content clarity', 'Service information', 'Privacy'].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label>
        Your experience
        <select value={rating} onChange={(e) => setRating(e.target.value)}>
          <option>Helpful</option>
          <option>Needs improvement</option>
        </select>
      </label>
      <button disabled={busy}>Send feedback</button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
