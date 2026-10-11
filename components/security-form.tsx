'use client';
import { useEffect, useState, type FormEvent } from 'react';
export function SecurityForm() {
  const [enabled, setEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch('/api/security')
      .then((r) => r.json())
      .then((b) => setEnabled(b.data?.enabled ?? false))
      .catch(() => setError('Unable to load account security.'));
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: secret ? 'enable' : 'setup',
          password,
          ...(secret ? { code } : {}),
        }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error?.message);
      if (b.data.enabled) {
        setEnabled(true);
        setSecret('');
        setPassword('');
        setCode('');
      } else {
        setSecret(b.data.secret);
        setUri(b.data.uri);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to configure authenticator.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel" style={{ maxWidth: 650 }}>
      <h2>Authenticator protection</h2>
      <p className="muted">
        Use an authenticator app for a second sign-in factor. Setup requires your current password
        and confirmation of a valid code. Shared demo accounts should remain available for testing.
      </p>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {enabled ? (
        <div className="notice">
          Authenticator enabled. Every new sign-in requires a fresh six-digit code. Recovery
          requires your designated administrator.
        </div>
      ) : (
        <form className="form-stack" onSubmit={submit}>
          <label>
            Current password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {secret && (
            <>
              <div className="notice warning">
                Add an account manually in your authenticator using this secret. Keep it private.
                <div className="content-preview" style={{ overflowWrap: 'anywhere' }}>
                  {secret}
                </div>
                <a href={uri}>Open compatible authenticator app</a>
              </div>
              <label>
                Six-digit authenticator code
                <input
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
            </>
          )}
          <button disabled={busy}>
            {busy
              ? 'Please wait…'
              : secret
                ? 'Confirm and enable authenticator'
                : 'Set up an authenticator'}
          </button>
        </form>
      )}
    </section>
  );
}
