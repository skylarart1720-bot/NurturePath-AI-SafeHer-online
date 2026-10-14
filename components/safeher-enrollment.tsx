'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
export function SafeherEnrollment() {
  const [token, setToken] = useState('');
  const [secret, setSecret] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const value = new URLSearchParams(location.hash.slice(1)).get('token');
    if (value) {
      queueMicrotask(() => setToken(value));
      history.replaceState(null, '', location.pathname);
    }
  }, []);
  async function submit(action: 'setup' | 'complete') {
    setBusy(true);
    setMessage('');
    try {
      const result = await fetch('/api/auth/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action,
          ...(action === 'complete' ? { password, code } : {}),
        }),
      });
      const json = await result.json();
      if (!result.ok) throw new Error(json.error.message);
      if (action === 'setup') setSecret(json.data.secret);
      else {
        setDone(true);
        setSecret('');
        setToken('');
        setPassword('');
        setCode('');
        setMessage('Enrollment complete. Use a fresh authenticator code to sign in.');
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to enroll.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="sh-question"
      onSubmit={(e) => {
        e.preventDefault();
        submit(secret ? 'complete' : 'setup');
      }}
    >
      {!done && (
        <>
          <p>Use your private, time-limited invitation. Store the authenticator key securely.</p>
          <label>
            Invitation token
            <input
              required
              value={token}
              autoComplete="off"
              onChange={(e) => setToken(e.target.value)}
            />
          </label>
          {secret && (
            <>
              <p>
                Enter this setup key into your authenticator: <code>{secret}</code>
              </p>
              <label>
                New password
                <input
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <label>
                Authenticator code
                <input
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
            </>
          )}
          <button disabled={busy}>
            {busy ? 'Working…' : secret ? 'Complete secure enrollment' : 'Set up authenticator'}
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
      <Link href="/login">Sign in</Link>
    </form>
  );
}
