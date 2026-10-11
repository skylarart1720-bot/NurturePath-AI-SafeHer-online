'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardCheck,
  FileCheck2,
  GitBranch,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Brand } from './brand';
import { Registration } from './registration';
import { SecurityForm } from './security-form';
import { StaffForm } from './staff-form';
import {
  enqueue,
  rememberActor,
  pendingItems,
  syncQueue,
  discardPending,
  wipeOffline,
  rememberedActor,
} from '@/lib/offline';
import { transitions } from '@/lib/domain';
type Actor = { id: string; name: string; role: string; clinicId: string | null };
type Mother = {
  id: string;
  name: string;
  displayCode: string;
  careStage: string;
  preferredLanguage: string;
  version: number;
  assignedWorkerId: string;
};
type Consent = { id: string; purpose: string; channel: string; withdrawnAt: string | null };
type Appointment = {
  id: string;
  motherId: string;
  scheduledAt: string;
  kind: string;
  status: string;
  version: number;
  mother?: Mother;
};
type Followup = {
  id: string;
  motherId: string;
  dueAt: string;
  status: string;
  outcome: string | null;
  completedAt: string | null;
  mother?: Mother;
};
type Referral = {
  id: string;
  motherId: string;
  receivingFacility: string;
  reasonCode: string;
  status: string;
  version: number;
  createdAt: string;
  closureNotes: string | null;
  mother?: Mother;
};
type Delivery = { id: string; channel: string; status: string; createdAt: string };
type Detail = Mother & {
  phone: string;
  estimatedDueDate: string | null;
  consents: Consent[];
  appointments: Appointment[];
  followups: Followup[];
  referrals: Referral[];
  deliveries: Delivery[];
};
type Ratio = {
  numerator: number | null;
  denominator: number | null;
  percent: number | null;
  suppressed: boolean;
};
type Metrics = {
  active: number | null;
  appointments: number | null;
  overdue: number | null;
  pending: number | null;
  referrals: number | null;
  contactRate: Ratio;
  recordedFollowUp: Ratio;
  closureRate: Ratio;
  optOutRate: Ratio;
  medianHoursToContact: number | null;
  missingOutcome: number | null;
  suppressed: boolean;
};
type Template = {
  id: string;
  title: string;
  body: string;
  locale: string;
  category: string;
  approvedAt: string | null;
  modelVersion: string | null;
  sourceId: string | null;
};
type Staff = { id: string; name: string; role: string; status: string; clinicId: string | null };
type Clinic = { id: string; name: string; region: string };
type Audit = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
};
type Pending = Awaited<ReturnType<typeof pendingItems>>[number];
const date = (value: string) =>
  new Intl.DateTimeFormat('en-GH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Accra',
  }).format(new Date(value));
const nice = (value: string) => value.toLowerCase().replaceAll('_', ' ');
const initials = (value: string) =>
  value
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0])
    .join('');
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function api<T>(path: string, data?: unknown): Promise<T> {
  const response = await fetch('/api/' + path, {
    cache: 'no-store',
    ...(data !== undefined
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      : {}),
  });
  const body = await response.json();
  if (!response.ok) throw new ApiError(body.error?.message ?? 'Request failed.', response.status);
  return body.data;
}
type Action = (kind: string, data: unknown) => Promise<boolean>;
function Status({ value }: { value: string }) {
  return (
    <span
      className={
        'badge ' +
        (['OVERDUE', 'UNABLE_TO_CONTACT', 'MISSED'].includes(value)
          ? 'red'
          : value === 'PENDING'
            ? 'coral'
            : ['CANCELLED', 'DECLINED', 'NO_ANSWER'].includes(value)
              ? 'gray'
              : '')
      }
    >
      {nice(value)}
    </span>
  );
}
function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty">
      <Heart size={28} style={{ margin: 'auto', color: '#087e83' }} />
      <h3>{title}</h3>
      <p className="muted">{body}</p>
    </div>
  );
}
function Stat({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string;
  value: string | number | null;
  note: string;
  icon: typeof Users;
}) {
  return (
    <article className="stat">
      <div className="stat-top">
        <span>{title}</span>
        <span className="stat-icon">
          <Icon size={17} />
        </span>
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      <small>{value === null ? 'Suppressed: fewer than 10 records' : note}</small>
    </article>
  );
}
function RatioCard({ title, ratio, body }: { title: string; ratio: Ratio; body: string }) {
  return (
    <section className="panel">
      <h3 style={{ fontSize: 16 }}>{title}</h3>
      <div className="big-percent">{ratio.percent === null ? '—' : ratio.percent + '%'}</div>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: (ratio.percent ?? 0) + '%' }} />
      </div>
      <p className="muted">
        {ratio.suppressed
          ? 'Small cells suppressed.'
          : `${ratio.numerator} / ${ratio.denominator} · ${body}`}
      </p>
    </section>
  );
}
function Form({
  action,
  kind,
  children,
  transform,
  submitLabel = 'Save',
}: {
  action: Action;
  kind: string;
  children: React.ReactNode;
  transform: (data: FormData) => unknown;
  submitLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form-stack"
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        try {
          if (await action(kind, transform(new FormData(form)))) form.reset();
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      <button type="submit" disabled={busy}>
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
function Confirm({
  title,
  body,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div className="modal-backdrop">
      <div
        ref={box}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !busy) onClose();
          if (e.key === 'Tab') {
            const controls = box.current?.querySelectorAll<HTMLButtonElement>('button');
            if (!controls?.length) return;
            const first = controls[0],
              last = controls[controls.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
            if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <h2 id="confirm-title">{title}</h2>
        <p>{body}</p>
        <div className="actions">
          <button className="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            className="danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export function Workspace({
  actor: initialActor,
  section = 'overview',
  recordId,
  offlineCapture = false,
}: {
  actor?: Actor;
  section?: string;
  recordId?: string;
  offlineCapture?: boolean;
}) {
  const router = useRouter();
  const [actor, setActor] = useState<Actor | null>(initialActor ?? null);
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<Pending[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [m, setMetrics] = useState<Metrics | null>(null);
  const [mothers, setMothers] = useState<Mother[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [tasks, setTasks] = useState<Followup[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [preview, setPreview] = useState('');
  const [range, setRange] = useState({ start: '', end: '' });
  const [dates, setDates] = useState({ start: '', end: '' });
  const [confirm, setConfirm] = useState<{
    title: string;
    body: string;
    run: () => Promise<void>;
  } | null>(null);
  const worker = actor?.role === 'HEALTH_WORKER';
  const coordinator = actor?.role === 'CLINIC_ADMIN';
  const admin = actor?.role === 'PLATFORM_ADMIN';
  const auditor = actor?.role === 'AUDITOR';
  const base = worker ? '/worker' : coordinator ? '/clinic' : '/admin';
  const refreshQueue = useCallback(async () => setQueue(await pendingItems()), []);
  useEffect(() => {
    let live = true;
    async function init() {
      await Promise.resolve();
      if ('serviceWorker' in navigator) {
        void navigator.serviceWorker.register('/sw.js').catch(() => {
          if (live) setError('Offline caching is unavailable. Keep this tab open while capturing.');
        });
      }
      let current = initialActor ?? rememberedActor();
      if (!current && navigator.onLine) {
        try {
          current = await api<Actor>('session');
        } catch {
          /* Public offline shell without a session. */
        }
      }
      try {
        if (current) {
          await rememberActor(current);
          if (live) setActor(current);
        }
        if (live) setOnline(navigator.onLine);
        await refreshQueue();
      } catch {
        if (live) setError('Encrypted device storage is unavailable. Reconnect before saving.');
      }
    }
    void init();
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('np-queue', refreshQueue);
    return () => {
      live = false;
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener('np-queue', refreshQueue);
    };
  }, [initialActor, refreshQueue]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      await Promise.resolve();
      if (cancelled) return;
      if (!actor || offlineCapture || !online) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const results = await Promise.allSettled([
          api<Metrics>(
            'dashboard/metrics' +
              (dates.start || dates.end
                ? '?' +
                  new URLSearchParams({
                    ...dates,
                    ...(dates.end
                      ? { end: new Date(new Date(dates.end).getTime() + 86400000).toISOString() }
                      : {}),
                  }).toString()
                : ''),
          ),
          ...(!admin && !auditor
            ? [
                api<{ items: Mother[]; total: number }>(
                  `mothers?page=${page}&q=${encodeURIComponent(search)}`,
                ).then((r) => {
                  if (!cancelled) {
                    setMothers(r.items);
                    setTotal(r.total);
                  }
                }),
                api<{ items: Followup[] }>(`followups?page=${page}`).then((r) => {
                  if (!cancelled) setTasks(r.items);
                }),
                api<{ items: Appointment[] }>(`appointments?page=${page}`).then((r) => {
                  if (!cancelled) setAppointments(r.items);
                }),
                api<{ items: Referral[] }>(`referrals?page=${page}`).then((r) => {
                  if (!cancelled) setReferrals(r.items);
                }),
              ]
            : []),
          ...(recordId
            ? [
                api<Detail>('mothers/' + recordId).then((r) => {
                  if (!cancelled) setDetail(r);
                }),
              ]
            : []),
          ...(!auditor
            ? [
                api<{ items: Template[] }>('templates').then((r) => {
                  if (!cancelled) setTemplates(r.items);
                }),
              ]
            : []),
          ...(admin || coordinator
            ? [
                api<{ items: Staff[] }>('staff').then((r) => {
                  if (!cancelled) setStaff(r.items);
                }),
                api<{ items: Clinic[] }>('clinics').then((r) => {
                  if (!cancelled) setClinics(r.items);
                }),
              ]
            : []),
          ...(!worker
            ? [
                api<{ items: Audit[] }>(`audit?page=${page}`).then((r) => {
                  if (!cancelled) setAudits(r.items);
                }),
              ]
            : []),
        ]);
        if (cancelled) return;
        const first = results[0];
        if (first.status === 'fulfilled') setMetrics(first.value as Metrics);
        const failed = results.find((r) => r.status === 'rejected') as
          PromiseRejectedResult | undefined;
        if (failed) throw failed.reason;
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 401) router.push('/login');
          else setError(e instanceof Error ? e.message : 'Unable to load your workspace.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    actor,
    online,
    offlineCapture,
    recordId,
    page,
    search,
    refresh,
    dates,
    admin,
    auditor,
    worker,
    coordinator,
    router,
  ]);
  const action: Action = async (kind, data) => {
    setError('');
    try {
      if (!navigator.onLine) {
        await enqueue(kind, data);
        setToast('Saved in the encrypted offline queue. Sign in and sync within 24 hours.');
        return true;
      }
      await api(kind, data);
      setToast('Saved. Your care workspace is up to date.');
      setRefresh((n) => n + 1);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
      window.scrollTo({ top: 0, behavior: 'instant' });
      return false;
    }
  };
  async function sync() {
    setSyncing(true);
    setError('');
    try {
      const count = await syncQueue();
      setToast(`${count} pending change${count === 1 ? '' : 's'} synchronized.`);
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sync.');
    } finally {
      setSyncing(false);
      await refreshQueue();
    }
  }
  async function logout() {
    try {
      if (!navigator.onLine)
        throw new Error('Reconnect to securely sign out and revoke your server session.');
      await api('auth/logout', {});
      await wipeOffline();
      setMothers([]);
      setTasks([]);
      setAppointments([]);
      setReferrals([]);
      setDetail(null);
      setMetrics(null);
      setActor(null);
      router.replace('/login');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign out.');
    }
  }
  const nav = [
    { label: 'Overview', slug: 'overview', icon: LayoutDashboard },
    ...(!admin && !auditor
      ? [
          { label: 'Mothers', slug: 'mothers', icon: Users },
          { label: 'Follow-ups', slug: 'followups', icon: ClipboardCheck },
          { label: 'Appointments', slug: 'appointments', icon: CalendarDays },
          { label: 'Referrals', slug: 'referrals', icon: GitBranch },
        ]
      : []),
    { label: 'Impact', slug: 'impact', icon: Activity },
    ...(!auditor ? [{ label: 'Message library', slug: 'messages', icon: MessageSquare }] : []),
    ...(admin || coordinator
      ? [{ label: admin ? 'Facilities & access' : 'Clinic team', slug: 'team', icon: Settings }]
      : []),
    ...(!worker ? [{ label: 'Audit trail', slug: 'audit', icon: ShieldCheck }] : []),
    ...(!admin && !auditor ? [{ label: 'Offline queue', slug: 'sync', icon: WifiOff }] : []),
  ];
  const selected = offlineCapture ? 'register' : section;
  const title = recordId
    ? 'A connected care record'
    : selected === 'register'
      ? 'Enroll a mother'
      : (nav.find((n) => n.slug === selected)?.label ?? 'Your workspace');
  const pending = tasks.filter((t) => t.status === 'PENDING');
  const overdue = pending.filter((t) => new Date(t.dueAt) < new Date());
  function taskRows(rows: Followup[]) {
    return rows.length ? (
      rows.map((t) => (
        <div className="task-row" key={t.id}>
          <Link className="task-person" href={`${base}/mothers/${t.motherId}`}>
            <span className="avatar">{initials(t.mother?.name ?? 'DM')}</span>
            <div>
              <strong>{t.mother?.name ?? 'Fictional record'}</strong>
              <small>{t.mother?.displayCode} · follow-up</small>
            </div>
          </Link>
          <div className="task-meta">
            <Status
              value={
                t.status === 'PENDING' && new Date(t.dueAt) < new Date() ? 'OVERDUE' : t.status
              }
            />
            <small>{date(t.dueAt)}</small>
          </div>
        </div>
      ))
    ) : (
      <Empty title="All caught up" body="New follow-up tasks appear when you schedule a visit." />
    );
  }
  function referralRows(rows: Referral[]) {
    return rows.length ? (
      rows.map((r) => (
        <div className="record-row" key={r.id}>
          <div>
            <Link href={`${base}/mothers/${r.motherId}`}>
              <strong>{r.mother?.name ?? detail?.name ?? 'Fictional mother'}</strong>
            </Link>
            <div className="muted">
              {r.receivingFacility} · {nice(r.reasonCode)}
            </div>
            <Status value={r.status} />
            {r.closureNotes && (
              <p className="muted" style={{ marginTop: 5 }}>
                {r.closureNotes}
              </p>
            )}
          </div>
          {r.status !== 'CLOSED' && (
            <div style={{ width: '100%', maxWidth: 310 }}>
              <Form
                action={action}
                kind="referrals/update"
                submitLabel="Record next status"
                transform={(f) => ({
                  id: r.id,
                  version: r.version,
                  status: f.get('status'),
                  closureNotes: f.get('closureNotes') || undefined,
                })}
              >
                <label>
                  Next referral status
                  <select name="status" required>
                    {(transitions[r.status] ?? []).map((s) => (
                      <option value={s} key={s}>
                        {nice(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Completion note (required to close)
                  <input
                    name="closureNotes"
                    maxLength={250}
                    placeholder="Non-clinical coordination note"
                  />
                </label>
              </Form>
            </div>
          )}
        </div>
      ))
    ) : (
      <Empty
        title="No referrals in this view"
        body="Create a referral from an assigned mother's care record."
      />
    );
  }
  if (!actor)
    return (
      <main id="main" className="legal">
        <Brand />
        <h1 style={{ marginTop: 40 }}>Sign in before offline capture</h1>
        <p>
          Open your worker workspace while connected to establish an authorized browser session.
        </p>
        <Link href="/login" className="button">
          Go to sign in
        </Link>
      </main>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="eyebrow" style={{ paddingLeft: 15, color: '#72878c' }}>
          Care workspace
        </div>
        <nav aria-label="Workspace navigation">
          {nav.map((n) => (
            <Link
              className={'nav-item ' + (selected === n.slug ? 'active' : '')}
              key={n.slug}
              href={n.slug === 'overview' ? base : base + '/' + n.slug}
            >
              <n.icon size={19} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="notice" style={{ fontSize: 11, marginBottom: 22 }}>
            Fictional records only.
            <br />
            No emergency monitoring.
          </div>
          <div className="profile">
            <div className="avatar">{initials(actor.name)}</div>
            <div>
              <strong>{actor.name}</strong>
              <span>{nice(actor.role)}</span>
            </div>
          </div>
          <button
            className="text-button"
            onClick={() =>
              queue.length
                ? setConfirm({
                    title: 'Discard pending changes and sign out?',
                    body: 'Signing out removes the encrypted local queue. Sync first if you want to keep these synthetic changes.',
                    run: async () => {
                      setConfirm(null);
                      await logout();
                    },
                  })
                : void logout()
            }
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <details className="mobile-menu">
            <summary aria-label="Open all workspace navigation">
              <Menu size={20} />
              Menu
            </summary>
            <nav aria-label="All mobile workspace routes">
              {nav.map((n) => (
                <Link
                  key={n.slug}
                  href={n.slug === 'overview' ? base : base + '/' + n.slug}
                  className="nav-item"
                >
                  <n.icon size={18} />
                  {n.label}
                </Link>
              ))}
              <Link className="nav-item" href={base + '/security'}>
                <ShieldCheck size={18} />
                Account security
              </Link>
            </nav>
          </details>
          <div className="breadcrumb">
            <span style={{ color: '#7b8c93' }}>Workspace</span> /{' '}
            <strong style={{ color: 'var(--navy)' }}>{title}</strong>
          </div>
          <div className="actions">
            <span className="badge coral">DEMO</span>
            <Link className="status-pill" href={base + (admin || auditor ? '/security' : '/sync')}>
              {online ? <Wifi size={14} /> : <WifiOff size={14} />}{' '}
              {online ? 'Connected' : 'Offline'}
              {queue.length ? ` · ${queue.length} pending` : ''}
            </Link>
          </div>
        </header>
        <main id="main" className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {coordinator
                  ? 'Clinic coordination'
                  : admin
                    ? 'Programme oversight'
                    : auditor
                      ? 'Accountable access'
                      : 'Community care'}
              </div>
              <h1>
                {selected === 'overview' ? `Good to see you, ${actor.name.split(' ')[0]}.` : title}
              </h1>
              <p className="muted">
                {selected === 'overview'
                  ? 'Here’s where a little follow-up can make the next step clearer.'
                  : 'Synthetic data · dates shown in Africa/Accra time'}
              </p>
            </div>
            {!admin && !auditor && selected !== 'register' && !recordId && (
              <Link href={`${base}/register`} className="button">
                <Plus size={17} />
                Enroll a mother
              </Link>
            )}
          </div>
          {error && (
            <div className="error" role="alert" style={{ marginBottom: 20 }}>
              {error}{' '}
              <button className="text-button" onClick={() => setRefresh((n) => n + 1)}>
                Retry
              </button>
            </div>
          )}
          {!online && (
            <div className="notice warning" role="status" style={{ marginBottom: 22 }}>
              You’re offline. New changes are encrypted and queued on this device. Consent changes
              and messages need a connection.
            </div>
          )}
          {loading && (
            <div aria-busy="true" aria-label="Loading workspace">
              <div className="skeleton" />
              <div className="skeleton tall" />
            </div>
          )}
          {!loading && selected === 'register' && (
            <>
              <Registration
                coordinator={coordinator}
                workers={staff.filter((s) => s.role === 'HEALTH_WORKER' && s.status === 'ACTIVE')}
                save={(d) => action('mothers', d)}
              />
              {offlineCapture && (
                <section className="panel" style={{ maxWidth: 820 }}>
                  <div className="panel-header">
                    <div>
                      <h2>
                        {queue.length ? 'Pending on this device' : 'Everything is synchronized'}
                      </h2>
                      <p>{queue.length} encrypted changes · sync within 24 hours</p>
                    </div>
                    <button disabled={!online || syncing} onClick={sync}>
                      {syncing ? 'Syncing…' : 'Sync now'}
                    </button>
                  </div>
                  <p className="muted">
                    Sync directly from this cached shell after reconnecting. Scheduling becomes
                    available once enrolment is synchronized.
                  </p>
                  {queue.map((q) => (
                    <div className="queue-item" key={q.idempotencyKey}>
                      <strong>{nice(q.mutationType)}</strong>
                      {q.error && (
                        <div className="error" role="alert">
                          {q.error}
                        </div>
                      )}
                      <button
                        className="text-button"
                        onClick={() =>
                          setConfirm({
                            title: 'Discard this pending change?',
                            body: 'This removes the unsynchronized encrypted payload from this device.',
                            run: async () => {
                              await discardPending(q.idempotencyKey);
                              setConfirm(null);
                            },
                          })
                        }
                      >
                        Discard after review
                      </button>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
          {!loading && selected === 'overview' && (
            <>
              {m && (
                <div className="stats">
                  <Stat
                    title="Active mothers"
                    value={m.active}
                    note="Consenting adult demo records"
                    icon={Users}
                  />
                  <Stat
                    title="Pending follow-ups"
                    value={m.pending}
                    note="Recorded tasks awaiting action"
                    icon={ClipboardCheck}
                  />
                  <Stat
                    title="Overdue contacts"
                    value={m.overdue}
                    note="Pending beyond their due time"
                    icon={CalendarDays}
                  />
                  <Stat
                    title="Referrals created"
                    value={m.referrals}
                    note="Closure tracked separately"
                    icon={GitBranch}
                  />
                </div>
              )}
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>
                        {admin || auditor ? 'Programme at a glance' : 'Follow-up comes first'}
                      </h2>
                      <p>
                        {admin || auditor
                          ? 'Privacy-preserving, synthetic workflow indicators'
                          : `${overdue.length} overdue tasks in this page · focus on the next contact`}
                      </p>
                    </div>
                    <Link
                      href={`${base}/${admin || auditor ? 'impact' : 'followups'}`}
                      className="text-button"
                      style={{ fontSize: 12 }}
                    >
                      View all <ArrowRight size={14} />
                    </Link>
                  </div>
                  {admin || auditor ? (
                    <>
                      <div className="mini-step">
                        <div className="feature-icon">
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <h3>Patient onboarding is blocked</h3>
                          <p>
                            Legal, clinical, partner, security, and operational gates remain
                            pending.
                          </p>
                        </div>
                      </div>
                      <div className="mini-step">
                        <div className="feature-icon">
                          <Activity size={18} />
                        </div>
                        <div>
                          <h3>Measure continuity honestly</h3>
                          <p>
                            Follow-up, contact, and referral closure rates include denominators.
                            Small cells are suppressed for programme and audit views.
                          </p>
                        </div>
                      </div>
                      <Link className="button secondary" href={`${base}/impact`}>
                        Explore process indicators
                      </Link>
                    </>
                  ) : (
                    taskRows(pending.slice(0, 5))
                  )}
                </section>
                <div>
                  {m && (
                    <RatioCard
                      title="Referrals, all the way through"
                      ratio={m.closureRate}
                      body="created referrals documented as closed"
                    />
                  )}
                  <section className="panel" style={{ background: 'var(--mint)' }}>
                    <h3 style={{ fontSize: 18 }}>A clear next step</h3>
                    <div className="mini-step">
                      <div className="feature-icon" style={{ background: 'white' }}>
                        <Check size={17} />
                      </div>
                      <div>
                        <h3>Document the outcome</h3>
                        <p>A recorded contact or completed referral keeps the team informed.</p>
                      </div>
                    </div>
                    <Link href="/safety" className="muted">
                      Read the clinical safety boundaries →
                    </Link>
                  </section>
                </div>
              </div>
            </>
          )}
          {!loading && selected === 'mothers' && !recordId && (
            <section className="panel">
              <div className="panel-header">
                <h2>
                  {coordinator ? 'Consenting mothers in your clinic' : 'Your assigned mothers'}
                </h2>
                <span className="badge gray">{total} records</span>
              </div>
              <form
                className="searchbar"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearch(query);
                  setPage(1);
                }}
              >
                <label style={{ flex: 1 }}>
                  <span className="muted">Search name or demo code</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find a fictional record"
                  />
                </label>
                <button
                  type="submit"
                  className="secondary"
                  style={{ alignSelf: 'end' }}
                  aria-label="Search mothers"
                >
                  <Search size={18} />
                </button>
              </form>
              {mothers.length ? (
                mothers.map((x) => (
                  <Link href={`${base}/mothers/${x.id}`} className="record-row" key={x.id}>
                    <div className="task-person">
                      <span className="avatar">{initials(x.name)}</span>
                      <div>
                        <strong>{x.name}</strong>
                        <small>
                          {x.displayCode} · {x.preferredLanguage.toUpperCase()}
                        </small>
                      </div>
                    </div>
                    <div className="actions">
                      <Status value={x.careStage} />
                      <ArrowRight size={18} />
                    </div>
                  </Link>
                ))
              ) : (
                <Empty
                  title="No matching mothers"
                  body="Try another search or enroll a fictional adult record."
                />
              )}
              <div className="form-footer">
                <button
                  className="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span className="muted">Page {page}</span>
                <button
                  className="secondary"
                  disabled={page * 50 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </section>
          )}
          {!loading && recordId && detail && (
            <>
              <div className="notice" style={{ marginBottom: 23 }}>
                Assigned care coordination record. No diagnosis, medical risk score, or emergency
                monitoring.
              </div>
              <div className="detail-layout">
                <div>
                  <section className="panel">
                    <div className="panel-header">
                      <div>
                        <h2>{detail.name}</h2>
                        <p>{detail.displayCode}</p>
                      </div>
                      <Status value={detail.careStage} />
                    </div>
                    <dl className="info-grid">
                      <div>
                        <dt>Phone · encrypted on server</dt>
                        <dd>{detail.phone || 'Not recorded'}</dd>
                      </div>
                      <div>
                        <dt>Language preference</dt>
                        <dd>
                          {detail.preferredLanguage.toUpperCase()}
                          {detail.preferredLanguage !== 'en' ? ' · human review pending' : ''}
                        </dd>
                      </div>
                      <div>
                        <dt>Estimated due date</dt>
                        <dd>
                          {detail.estimatedDueDate
                            ? date(detail.estimatedDueDate).split(',')[0]
                            : 'Not recorded'}
                        </dd>
                      </div>
                      <div>
                        <dt>Record version</dt>
                        <dd>{detail.version}</dd>
                      </div>
                    </dl>
                    <h3 style={{ fontSize: 16 }}>Communication choices</h3>
                    {['SMS', 'WHATSAPP'].map((channel) => {
                      const granted = detail.consents.some(
                        (c) => c.channel === channel && !c.withdrawnAt,
                      );
                      return (
                        <div className="record-row" key={channel}>
                          <div>
                            <strong>{channel === 'SMS' ? 'SMS' : 'WhatsApp'}</strong>
                            <div className="muted">
                              {granted ? 'Active reminder consent' : 'No active reminder consent'}
                            </div>
                          </div>
                          <button
                            className="secondary"
                            onClick={() =>
                              setConfirm({
                                title: granted
                                  ? 'Withdraw reminder consent?'
                                  : 'Record renewed reminder consent?',
                                body: granted
                                  ? 'No simulated messages will be allowed on this channel after withdrawal.'
                                  : 'Confirm the adult has explicitly agreed to this contact channel.',
                                run: async () => {
                                  await action('consents', {
                                    motherId: detail.id,
                                    purpose: 'REMINDERS',
                                    channel,
                                    withdraw: granted,
                                    version: detail.version,
                                  });
                                  setConfirm(null);
                                },
                              })
                            }
                          >
                            {granted ? 'Withdraw' : 'Record consent'}
                          </button>
                        </div>
                      );
                    })}
                    <button
                      className="text-button"
                      style={{ color: 'var(--danger)', marginTop: 15 }}
                      onClick={() =>
                        setConfirm({
                          title: 'Withdraw registration and archive?',
                          body: 'This removes the record from active care views and cancels pending follow-ups. Records remain retained for governance review.',
                          run: async () => {
                            if (
                              await action('consents', {
                                motherId: detail.id,
                                purpose: 'REGISTRATION',
                                channel: 'IN_PERSON',
                                withdraw: true,
                                version: detail.version,
                              })
                            )
                              router.push(base + '/mothers');
                            setConfirm(null);
                          },
                        })
                      }
                    >
                      Withdraw registration consent
                    </button>
                    {coordinator && (
                      <div style={{ marginTop: 20 }}>
                        <h3 style={{ fontSize: 16 }}>Assign care worker</h3>
                        <Form
                          action={action}
                          kind="mothers/assign"
                          submitLabel="Update assignment"
                          transform={(f) => ({
                            motherId: detail.id,
                            workerId: f.get('workerId'),
                            version: detail.version,
                          })}
                        >
                          <label>
                            Active worker
                            <select name="workerId" defaultValue={detail.assignedWorkerId}>
                              {staff
                                .filter((s) => s.role === 'HEALTH_WORKER' && s.status === 'ACTIVE')
                                .map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                            </select>
                          </label>
                        </Form>
                      </div>
                    )}
                  </section>
                  <section className="panel">
                    <h2>Follow-up history</h2>
                    {detail.followups.length ? (
                      <div className="timeline">
                        {detail.followups.map((t) => (
                          <div key={t.id}>
                            <strong>{date(t.dueAt)}</strong>
                            <p>
                              <Status value={t.status} />{' '}
                              <span>
                                {t.outcome ? nice(t.outcome) : 'Contact outcome not yet recorded'}
                              </span>
                            </p>
                            {t.status === 'PENDING' && (
                              <div style={{ marginTop: 14 }}>
                                <Form
                                  action={action}
                                  kind="followups/update"
                                  submitLabel="Record contact outcome"
                                  transform={(f) => ({
                                    id: t.id,
                                    outcome: f.get('outcome'),
                                    nextDueAt: f.get('nextDueAt')
                                      ? new Date(f.get('nextDueAt') as string).toISOString()
                                      : undefined,
                                  })}
                                >
                                  <label>
                                    Outcome
                                    <select name="outcome">
                                      <option value="REACHED">Reached</option>
                                      <option value="NO_ANSWER">
                                        No answer · next action required
                                      </option>
                                      <option value="RESCHEDULED">
                                        Rescheduled · next action required
                                      </option>
                                      <option value="DECLINED">Declined</option>
                                    </select>
                                  </label>
                                  <label>
                                    Next contact (required for no answer / rescheduled)
                                    <input name="nextDueAt" type="datetime-local" />
                                  </label>
                                </Form>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        title="No follow-up tasks yet"
                        body="Schedule the first visit to create a task."
                      />
                    )}
                  </section>
                  <section className="panel">
                    <h2>Referral journey</h2>
                    {referralRows(detail.referrals)}
                  </section>
                </div>
                <div>
                  <section className="panel">
                    <h2>Schedule the next visit</h2>
                    <Form
                      action={action}
                      kind="appointments"
                      submitLabel="Schedule visit & follow-up"
                      transform={(f) => ({
                        motherId: detail.id,
                        scheduledAt: new Date(f.get('scheduledAt') as string).toISOString(),
                        kind: f.get('kind'),
                      })}
                    >
                      <label>
                        Visit type
                        <select name="kind">
                          <option value="ANTENATAL">Antenatal</option>
                          <option value="POSTNATAL">Postnatal</option>
                          <option value="FOLLOW_UP">Follow-up</option>
                        </select>
                      </label>
                      <label>
                        Date and time (your device timezone)
                        <input type="datetime-local" name="scheduledAt" required />
                      </label>
                    </Form>
                    {detail.appointments.map((a) => (
                      <div className="record-row" key={a.id}>
                        <div>
                          <strong style={{ fontSize: 13 }}>{nice(a.kind)}</strong>
                          <div className="muted">{date(a.scheduledAt)}</div>
                        </div>
                        <Status value={a.status} />
                      </div>
                    ))}
                  </section>
                  <section className="panel">
                    <h2>Coordinate a referral</h2>
                    <Form
                      action={action}
                      kind="referrals"
                      submitLabel="Create referral"
                      transform={(f) => ({
                        motherId: detail.id,
                        receivingFacility: f.get('facility'),
                        reasonCode: f.get('reason'),
                        urgency: f.get('urgency'),
                      })}
                    >
                      <label>
                        Receiving facility
                        <input
                          name="facility"
                          required
                          minLength={3}
                          maxLength={120}
                          placeholder="Fictional receiving facility"
                          list="facilities"
                        />
                        <datalist id="facilities">
                          {clinics.map((c) => (
                            <option key={c.id} value={c.name} />
                          ))}
                        </datalist>
                      </label>
                      <label>
                        Coordination reason
                        <select name="reason">
                          <option value="CONTINUITY_OF_CARE">Continuity of care</option>
                          <option value="SCHEDULED_REVIEW">Scheduled review</option>
                          <option value="FACILITY_TRANSFER">Facility transfer</option>
                          <option value="REQUESTED_SUPPORT">Requested support</option>
                        </select>
                      </label>
                      <label>
                        Urgency
                        <select name="urgency">
                          <option value="ROUTINE">Routine coordination</option>
                          {coordinator && (
                            <option value="CLINICIAN_SELECTED">
                              Selected by reviewing clinician
                            </option>
                          )}
                        </select>
                      </label>
                    </Form>
                  </section>
                  <section className="panel">
                    <h2>Neutral reminder simulator</h2>
                    <Form
                      action={async (kind, data) => {
                        try {
                          const result = await api<{ body: string }>(kind, data);
                          setPreview(result.body);
                          return true;
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Unable to preview.');
                          return false;
                        }
                      }}
                      kind="messages/preview"
                      submitLabel="Preview consented message"
                      transform={(f) => ({
                        motherId: detail.id,
                        templateId: f.get('templateId'),
                        channel: f.get('channel'),
                      })}
                    >
                      <label>
                        Approved reminder
                        <select name="templateId" required>
                          <option value="">Choose a template</option>
                          {templates
                            .filter(
                              (t) =>
                                t.approvedAt &&
                                t.category === 'NEUTRAL_REMINDER' &&
                                t.locale === detail.preferredLanguage,
                            )
                            .map((t) => (
                              <option value={t.id} key={t.id}>
                                {t.title}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Channel
                        <select name="channel">
                          <option value="SMS">SMS</option>
                          <option value="WHATSAPP">WhatsApp</option>
                        </select>
                      </label>
                    </Form>
                    {preview && (
                      <div className="content-preview" aria-live="polite">
                        {preview}
                      </div>
                    )}
                    <div style={{ marginTop: 18 }}>
                      <Form
                        action={action}
                        kind="messages/send"
                        submitLabel="Simulate delivery (no message sent)"
                        transform={(f) => ({
                          motherId: detail.id,
                          templateId: f.get('templateId'),
                          channel: f.get('channel'),
                        })}
                      >
                        <label>
                          Delivery template
                          <select name="templateId" required>
                            <option value="">Choose an approved reminder</option>
                            {templates
                              .filter(
                                (t) =>
                                  t.approvedAt &&
                                  t.category === 'NEUTRAL_REMINDER' &&
                                  t.locale === detail.preferredLanguage,
                              )
                              .map((t) => (
                                <option value={t.id} key={t.id}>
                                  {t.title}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Delivery channel
                          <select name="channel">
                            <option value="SMS">SMS</option>
                            <option value="WHATSAPP">WhatsApp</option>
                          </select>
                        </label>
                      </Form>
                    </div>
                    {detail.deliveries.map((d) => (
                      <div className="record-row" key={d.id}>
                        <div>
                          <strong style={{ fontSize: 12 }}>{d.channel} · simulated</strong>
                          <p className="muted">{date(d.createdAt)}</p>
                        </div>
                        <Status value={d.status} />
                      </div>
                    ))}
                  </section>
                </div>
              </div>
            </>
          )}
          {!loading && selected === 'followups' && (
            <section className="panel">
              <div className="panel-header">
                <h2>One next action at a time</h2>
              </div>
              <div className="tabs">
                {['ALL', 'PENDING', 'OVERDUE', 'COMPLETED'].map((f) => (
                  <button
                    key={f}
                    className={filter === f ? '' : 'secondary'}
                    onClick={() => setFilter(f)}
                  >
                    {nice(f)}
                  </button>
                ))}
              </div>
              {taskRows(
                tasks.filter(
                  (t) =>
                    filter === 'ALL' ||
                    (filter === 'OVERDUE' &&
                      t.status === 'PENDING' &&
                      new Date(t.dueAt) < new Date()) ||
                    t.status === filter,
                ),
              )}
              <div className="form-footer">
                <button
                  className="secondary"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>Page {page}</span>
                <button
                  className="secondary"
                  disabled={tasks.length < 50}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </section>
          )}
          {!loading && selected === 'appointments' && (
            <section className="panel">
              <h2>Planned visits</h2>
              {appointments.length ? (
                appointments.map((a) => (
                  <div className="record-row" key={a.id}>
                    <div>
                      <Link href={`${base}/mothers/${a.motherId}`}>
                        <strong>{a.mother?.name}</strong>
                      </Link>
                      <p className="muted">
                        {date(a.scheduledAt)} · {nice(a.kind)}
                      </p>
                      <Status value={a.status} />
                    </div>
                    <div style={{ width: '100%', maxWidth: 310 }}>
                      <Form
                        action={action}
                        kind="appointments/update"
                        submitLabel="Update visit"
                        transform={(f) => ({
                          id: a.id,
                          version: a.version,
                          status: f.get('status'),
                          scheduledAt: f.get('scheduledAt')
                            ? new Date(f.get('scheduledAt') as string).toISOString()
                            : undefined,
                        })}
                      >
                        <label>
                          Visit status
                          <select name="status" defaultValue={a.status}>
                            {['SCHEDULED', 'ATTENDED', 'MISSED', 'CANCELLED'].map((s) => (
                              <option value={s} key={s}>
                                {nice(s)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Reschedule date (optional)
                          <input type="datetime-local" name="scheduledAt" />
                        </label>
                      </Form>
                    </div>
                  </div>
                ))
              ) : (
                <Empty
                  title="No scheduled visits"
                  body="Open a mother's record to schedule the next visit."
                />
              )}
              <div className="form-footer">
                <button
                  className="secondary"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>Page {page}</span>
                <button
                  className="secondary"
                  disabled={appointments.length < 50}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </section>
          )}
          {!loading && selected === 'referrals' && (
            <section className="panel">
              <div className="panel-header">
                <h2>From referral to completed action</h2>
                <span className="badge gray">Closed ≠ just created</span>
              </div>
              <div className="tabs">
                {['ALL', 'CREATED', 'ACCEPTED', 'ATTENDED', 'CLOSED', 'UNABLE_TO_CONTACT'].map(
                  (f) => (
                    <button
                      key={f}
                      className={filter === f ? '' : 'secondary'}
                      onClick={() => setFilter(f)}
                    >
                      {nice(f)}
                    </button>
                  ),
                )}
              </div>
              {referralRows(referrals.filter((r) => filter === 'ALL' || r.status === filter))}
              <div className="form-footer">
                <button
                  className="secondary"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>Page {page}</span>
                <button
                  className="secondary"
                  disabled={referrals.length < 50}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </section>
          )}
          {!loading && selected === 'impact' && (
            <>
              <div className="notice" style={{ marginBottom: 22 }}>
                DEMO process indicators only. No clinical impact claims.{' '}
                {m?.suppressed
                  ? 'Cells with fewer than 10 records are suppressed.'
                  : 'Clinic-level operational metrics are visible to authorized care staff.'}
              </div>
              <form
                className="filter-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  setDates(range);
                }}
              >
                <label>
                  From date
                  <input
                    type="date"
                    value={range.start}
                    onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
                  />
                </label>
                <label>
                  Through date
                  <input
                    type="date"
                    value={range.end}
                    onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
                  />
                </label>
                <button type="submit">Apply date range</button>
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    setRange({ start: '', end: '' });
                    setDates({ start: '', end: '' });
                  }}
                >
                  All time
                </button>
              </form>
              {m && (
                <>
                  <div className="stats">
                    <Stat
                      title="Active enrolments"
                      value={m.active}
                      note="Current active cohort, irrespective of range"
                      icon={Users}
                    />
                    <Stat
                      title="Scheduled visits"
                      value={m.appointments}
                      note="By scheduled date within range"
                      icon={CalendarDays}
                    />
                    <Stat
                      title="Median contact delay"
                      value={
                        m.medianHoursToContact === null
                          ? null
                          : m.medianHoursToContact.toFixed(1) + 'h'
                      }
                      note="Nonnegative hours after due time, reached contacts"
                      icon={Activity}
                    />
                    <Stat
                      title="Missing outcomes"
                      value={m.missingOutcome}
                      note="Completed tasks without an outcome"
                      icon={FileCheck2}
                    />
                  </div>
                  <div className="three-grid">
                    <RatioCard
                      title="Recorded follow-up"
                      ratio={m.recordedFollowUp}
                      body="scheduled visits with a recorded contact attempt"
                    />
                    <RatioCard
                      title="Contact rate"
                      ratio={m.contactRate}
                      body="follow-up tasks recorded as reached"
                    />
                    <RatioCard
                      title="Referral closure"
                      ratio={m.closureRate}
                      body="created referrals recorded as closed"
                    />
                  </div>
                  <RatioCard
                    title="Registration opt-out"
                    ratio={m.optOutRate}
                    body="withdrawn registrations / active plus withdrawn registrations"
                  />
                  <p className="muted">
                    Excluded: archived records from care metrics; cancelled tasks remain in the task
                    denominator. Date ranges apply to scheduled visits, due follow-ups, created
                    referrals, and withdrawal timestamps. No eligible observations display —.
                  </p>
                </>
              )}
            </>
          )}
          {!loading && selected === 'messages' && (
            <>
              <div className="notice" style={{ marginBottom: 22 }}>
                Deterministic wording assistant · approved sources only · no patient prompts.
                English demo copy is illustrative. Generated drafts need human review;
                local-language translations remain disabled.
              </div>
              {(admin || coordinator) && (
                <section className="panel">
                  <h2>Simplify an approved source</h2>
                  <Form
                    action={action}
                    kind="ai/simplify-approved-content"
                    submitLabel="Create a draft for review"
                    transform={(f) => ({ sourceId: f.get('sourceId'), locale: 'en' })}
                  >
                    <label>
                      Versioned approved source
                      <select name="sourceId" required>
                        <option value="">Choose a source</option>
                        {templates
                          .filter((t) => t.approvedAt)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title}
                            </option>
                          ))}
                      </select>
                    </label>
                  </Form>
                </section>
              )}
              {templates.map((t) => (
                <section className="panel" key={t.id}>
                  <div className="panel-header">
                    <div>
                      <h2>{t.title}</h2>
                      <p>
                        {t.locale.toUpperCase()} · {nice(t.category)} ·{' '}
                        {t.modelVersion ?? 'Fixed demo source'}
                      </p>
                    </div>
                    <Status value={t.approvedAt ? 'APPROVED_DEMO' : 'DRAFT_REVIEW_REQUIRED'} />
                  </div>
                  <div className="content-preview">{t.body}</div>
                  {t.sourceId && <p className="reference">Source ID: {t.sourceId}</p>}
                  {!t.approvedAt && coordinator && (
                    <button
                      onClick={() =>
                        setConfirm({
                          title: 'Approve this synthetic English draft?',
                          body: 'This records a demo review only. Actual healthcare content requires a named qualified clinician and documented review before real use.',
                          run: async () => {
                            await action('templates/approve', { id: t.id });
                            setConfirm(null);
                          },
                        })
                      }
                    >
                      Record demo human review
                    </button>
                  )}
                </section>
              ))}
            </>
          )}
          {!loading && selected === 'team' && (
            <>
              <section className="panel">
                <h2>{admin ? 'Facilities in this organization' : 'Your clinic'}</h2>
                {clinics.map((c) => (
                  <div className="record-row" key={c.id}>
                    <div>
                      <strong>{c.name}</strong>
                      <p className="muted">{c.region}</p>
                    </div>
                    <span className="badge gray">Synthetic facility</span>
                  </div>
                ))}
                {admin && (
                  <div style={{ marginTop: 25, maxWidth: 550 }}>
                    <Form
                      action={action}
                      kind="clinics"
                      submitLabel="Add fictional facility"
                      transform={(f) => ({ name: f.get('name'), region: f.get('region') })}
                    >
                      <label>
                        Facility name
                        <input name="name" required minLength={3} maxLength={100} />
                      </label>
                      <label>
                        Region
                        <input name="region" required minLength={2} maxLength={100} />
                      </label>
                    </Form>
                  </div>
                )}
              </section>
              <section className="panel">
                <h2>Team access</h2>
                {staff.map((s) => (
                  <div className="record-row" key={s.id}>
                    <div className="task-person">
                      <span className="avatar">{initials(s.name)}</span>
                      <div>
                        <strong>{s.name}</strong>
                        <small>{nice(s.role)}</small>
                      </div>
                    </div>
                    <div className="actions">
                      <Status value={s.status} />
                      {admin && s.id !== actor.id && (
                        <button
                          className="secondary"
                          onClick={() =>
                            setConfirm({
                              title:
                                s.status === 'ACTIVE'
                                  ? 'Deactivate staff access?'
                                  : 'Reactivate staff access?',
                              body: 'Account status changes revoke current sessions. Pending offline requests must pass authorization again.',
                              run: async () => {
                                await action('users/status', {
                                  id: s.id,
                                  status: s.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                                });
                                setConfirm(null);
                              },
                            })
                          }
                        >
                          {s.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}
          {!loading && selected === 'team' && admin && (
            <StaffForm
              clinics={clinics}
              onSaved={() => {
                setToast('Synthetic staff account created.');
                setRefresh((n) => n + 1);
              }}
            />
          )}
          {!loading && selected === 'audit' && (
            <section className="panel audit-list">
              <h2>Accountable actions</h2>
              <p className="muted">
                Metadata only. No contact values, message bodies, or care notes are logged here.
              </p>
              {audits.length ? (
                audits.map((a) => (
                  <div className="record-row" key={a.id}>
                    <div>
                      <strong>{nice(a.action)}</strong> · {a.entityType}
                      <div>
                        <code>{a.entityId}</code>
                      </div>
                    </div>
                    <span className="muted">{date(a.timestamp)}</span>
                  </div>
                ))
              ) : (
                <Empty
                  title="No events yet"
                  body="Authorized actions will appear in the audit trail."
                />
              )}
              <div className="form-footer">
                <button
                  className="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>Page {page}</span>
                <button
                  className="secondary"
                  disabled={audits.length < 50}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </section>
          )}
          {!loading && selected === 'sync' && (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Review, then reconnect</h2>
                  <p>{queue.length} encrypted pending changes · 24-hour retention</p>
                </div>
                <button disabled={!online || syncing} onClick={sync}>
                  {syncing ? 'Syncing…' : 'Sync now'}
                </button>
              </div>
              <div className="notice warning">
                The encryption key lives in this tab’s session storage. Sync before closing the tab
                or signing out. Consent withdrawal and server permissions win over queued edits.
                Failed changes stay pending for review.
              </div>
              {queue.length ? (
                queue.map((q) => (
                  <div className="queue-item" key={q.idempotencyKey}>
                    <strong>{nice(q.mutationType)}</strong>
                    <p className="muted">Captured {date(new Date(q.createdAt).toISOString())}</p>
                    {q.error && (
                      <div className="error">
                        {q.error} Refresh the online record and reconcile manually; discard this
                        queued change after review.
                      </div>
                    )}
                    <button
                      className="text-button"
                      onClick={() =>
                        setConfirm({
                          title: 'Discard this pending change?',
                          body: 'The encrypted unsynchronized change will be permanently removed from this device.',
                          run: async () => {
                            await discardPending(q.idempotencyKey);
                            setConfirm(null);
                          },
                        })
                      }
                    >
                      Discard after review
                    </button>
                  </div>
                ))
              ) : (
                <Empty
                  title="Everything is synchronized"
                  body="Offline changes will appear here until the server accepts them."
                />
              )}
              <Link className="button secondary" href="/offline">
                Open offline registration shell
              </Link>
            </section>
          )}
          {!loading && selected === 'security' && <SecurityForm />}
          <div className="muted" style={{ fontSize: 11, marginTop: 22 }}>
            NurturePath AI · Synthetic demonstration · Care coordination, not medical advice.{' '}
            <Link href="/safety">Safety boundaries</Link> ·{' '}
            <Link href={base + '/security'}>Account security</Link>{' '}
            <button
              className="text-button"
              style={{ fontSize: 12 }}
              onClick={() =>
                queue.length
                  ? setConfirm({
                      title: 'Discard queue and sign out?',
                      body: 'Pending changes are wiped on logout. Sync first to keep them.',
                      run: async () => {
                        setConfirm(null);
                        await logout();
                      },
                    })
                  : void logout()
              }
            >
              Sign out
            </button>
          </div>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile workspace navigation">
        {nav
          .filter((n) =>
            ['overview', 'mothers', 'followups', 'referrals', 'impact', 'audit'].includes(n.slug),
          )
          .slice(0, 5)
          .map((n) => (
            <Link
              key={n.slug}
              href={n.slug === 'overview' ? base : base + '/' + n.slug}
              className={selected === n.slug ? 'active' : ''}
            >
              <n.icon size={19} />
              {n.label}
            </Link>
          ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {confirm && (
        <Confirm
          title={confirm.title}
          body={confirm.body}
          onClose={() => setConfirm(null)}
          onConfirm={confirm.run}
        />
      )}
    </div>
  );
}
