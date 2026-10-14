'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from './safeher-tools';
export function SafeherLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const result = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, code }),
      });
      const body = await result.json();
      if (!result.ok) throw new Error(body.error?.message ?? 'Unable to sign in.');
      router.push('/dashboard');
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to connect.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="sh-question" onSubmit={submit}>
      <p>
        Accounts are optional. You can learn, ask questions, and explore support without signing in.
        Self-registration is disabled for this demonstration; synthetic accounts are provisioned by
        the seed command.
      </p>
      <label>
        Email address
        <input
          required
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Password
        <input
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label>
        Authenticator code (if enabled)
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      {message && (
        <p className="error" role="alert">
          {message}
        </p>
      )}
      <Link href="/learn">Continue without an account →</Link>
    </form>
  );
}
export function PrivacyControls() {
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    api('me')
      .then((me) => setSignedIn(!!me))
      .catch(() => {});
  }, []);
  async function remove(path: string) {
    try {
      await api(path, undefined, 'DELETE');
      setMessage(
        path === 'account'
          ? 'Your account and saved progress were deleted from the active database.'
          : 'Your account progress was removed.',
      );
      setConfirm(false);
      if (path === 'account') setSignedIn(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to complete deletion.');
    }
  }
  return (
    <section className="sh-saved">
      <h2>Your data controls</h2>
      <button
        className="secondary"
        onClick={() => {
          localStorage.removeItem('safeher-downloads');
          setMessage('Saved educational downloads removed from this browser.');
        }}
      >
        Remove this device’s downloads
      </button>
      {signedIn && (
        <div className="sh-actions">
          <button className="secondary" onClick={() => remove('progress')}>
            Delete account progress
          </button>
          <button className="secondary" onClick={() => setConfirm(true)}>
            Delete optional account
          </button>
        </div>
      )}
      {confirm && (
        <div className="notice">
          <p>
            Delete your optional account, sessions, and progress? This cannot be undone. Staff
            accounts require administrator removal.
          </p>
          <button onClick={() => remove('account')}>Confirm account deletion</button>{' '}
          <button className="secondary" onClick={() => setConfirm(false)}>
            Cancel
          </button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
