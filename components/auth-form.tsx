'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Brand } from './brand';
export function AuthForm({
  reset = false,
  token = null,
}: {
  reset?: boolean;
  token?: string | null;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch(reset ? '/api/auth/reset' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          reset ? (token ? { token, password } : { email }) : { email, password, code },
        ),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      if (reset) {
        setMessage(body.data.message);
        setLink(body.data.demoResetLink ?? '');
      } else window.location.assign(body.data.destination);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to connect.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="auth-page">
      <aside className="auth-story">
        <Brand />
        <div>
          <div className="eyebrow" style={{ color: '#a9d9cf' }}>
            Every next step matters
          </div>
          <h1>
            Care continues
            <br />
            beyond the clinic.
          </h1>
          <p style={{ marginTop: 25, maxWidth: 430 }}>
            Your appointments, follow-ups, and referrals.
            <br />
            One connected workspace for the people who care.
          </p>
        </div>
        <p className="story-foot">Ghana first. Built around trusted health workers.</p>
      </aside>
      <section className="auth-form-area">
        <div className="auth-card">
          <div className="eyebrow">Your care workspace</div>
          <h1>
            {reset ? (token ? 'Choose a new password' : 'Reset your password') : 'Welcome back'}
          </h1>
          <p className="muted">
            {reset
              ? 'Recovery is simulated locally. Hosted demos use administrator recovery.'
              : 'Sign in to pick up where your care team left off.'}
          </p>
          <div className="notice" style={{ marginBottom: 24 }}>
            Synthetic demo only. Do not enter real patient details.
          </div>
          <form className="form-stack" onSubmit={submit}>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            {message && (
              <div className="notice" role="status">
                {message}
                {link && (
                  <>
                    <br />
                    <Link href={link}>Open local simulated recovery link</Link>
                  </>
                )}
              </div>
            )}
            {!token && (
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@clinic.example"
                />
              </label>
            )}
            {(!reset || token) && (
              <label>
                {token ? 'New password (at least 12 characters)' : 'Password'}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={token ? 12 : 1}
                  autoComplete={token ? 'new-password' : 'current-password'}
                />
              </label>
            )}
            {!reset && (
              <label>
                Authenticator code (if enabled)
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Optional for demo accounts"
                />
              </label>
            )}
            <button type="submit" disabled={busy}>
              {busy
                ? 'Please wait…'
                : reset
                  ? token
                    ? 'Change password'
                    : 'Request reset link'
                  : 'Sign in to workspace'}
            </button>
          </form>
          <div style={{ marginTop: 20 }}>
            <Link href={reset ? '/login' : '/reset'}>
              {reset ? '← Back to sign in' : 'Forgot your password?'}
            </Link>
          </div>
          {!reset && (
            <div className="auth-demo">
              <strong style={{ fontSize: 14, color: 'var(--navy)' }}>Explore a demo role</strong>
              <p className="muted" style={{ fontSize: 12, marginTop: 7 }}>
                Select an account, then enter the demo password from your local setup.
              </p>
              <div className="role-choices">
                {[
                  ['Health worker', 'worker@demo.nurturepath.test'],
                  ['Clinic coordinator', 'clinic@demo.nurturepath.test'],
                  ['Programme admin', 'admin@demo.nurturepath.test'],
                  ['Auditor', 'auditor@demo.nurturepath.test'],
                ].map(([name, address]) => (
                  <button
                    type="button"
                    className="secondary"
                    key={name}
                    onClick={() => setEmail(address)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="muted" style={{ marginTop: 30, fontSize: 12 }}>
            Care coordination only. <Link href="/safety">Safety & privacy boundaries</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
