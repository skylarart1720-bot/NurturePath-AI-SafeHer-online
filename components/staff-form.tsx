'use client';
import { useState, type FormEvent } from 'react';
export function StaffForm({
  clinics,
  onSaved,
}: {
  clinics: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.get('name'),
          email: f.get('email'),
          role: f.get('role'),
          clinicId: f.get('clinicId') || undefined,
          password: f.get('password'),
        }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error?.message);
      form.reset();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create account.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Add a synthetic staff account</h2>
      <p className="muted">
        Share the initial password through an approved channel. Care staff must be assigned to a
        facility in this organization.
      </p>
      <form onSubmit={submit} className="form-grid">
        {error && (
          <div className="error full" role="alert">
            {error}
          </div>
        )}
        <label>
          Name
          <input name="name" required minLength={2} maxLength={80} />
        </label>
        <label>
          Email
          <input name="email" type="email" required maxLength={200} />
        </label>
        <label>
          Role
          <select name="role">
            <option value="HEALTH_WORKER">Health worker</option>
            <option value="CLINIC_ADMIN">Clinic coordinator</option>
            <option value="AUDITOR">Auditor</option>
          </select>
        </label>
        <label>
          Facility
          <select name="clinicId">
            <option value="">Choose a facility (optional for auditor)</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="full">
          Initial password (at least 12 characters)
          <input
            type="password"
            name="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </section>
  );
}
