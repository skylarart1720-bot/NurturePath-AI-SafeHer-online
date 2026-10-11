'use client';
import { useState, type FormEvent } from 'react';
type Payload = {
  name: string;
  phone: string;
  preferredLanguage: string;
  careStage: string;
  adultConfirmed: boolean;
  registrationConsent: boolean;
  smsConsent: boolean;
  whatsappConsent: boolean;
  estimatedDueDate: string;
  assignedWorkerId?: string;
};
export function Registration({
  save,
  workers = [],
  coordinator = false,
}: {
  save: (data: Payload) => Promise<boolean>;
  workers?: { id: string; name: string }[];
  coordinator?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Payload>({
    name: '',
    phone: '',
    preferredLanguage: 'en',
    careStage: 'ANTENATAL',
    adultConfirmed: false,
    registrationConsent: false,
    smsConsent: false,
    whatsappConsent: false,
    estimatedDueDate: '',
  });
  function set<K extends keyof Payload>(key: K, value: Payload[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      if (await save(data)) {
        setData({
          name: '',
          phone: '',
          preferredLanguage: 'en',
          careStage: 'ANTENATAL',
          adultConfirmed: false,
          registrationConsent: false,
          smsConsent: false,
          whatsappConsent: false,
          estimatedDueDate: '',
        });
        setStep(0);
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel" style={{ maxWidth: 820 }}>
      <div className="panel-header">
        <div>
          <h2>
            {['A little about her', 'Consent and contact choices', 'Review before enrolling'][step]}
          </h2>
          <p>Step {step + 1} of 3 · minimum information, clear choices</p>
        </div>
        <span className="badge">DEMO</span>
      </div>
      <div className="stepper" aria-label={`Step ${step + 1} of 3`}>
        {[0, 1, 2].map((i) => (
          <span className={i <= step ? 'done' : ''} key={i} />
        ))}
      </div>
      <form onSubmit={submit}>
        {step === 0 && (
          <div className="form-grid">
            <label className="full">
              Fictional name or alias
              <input
                required
                minLength={2}
                maxLength={80}
                autoComplete="off"
                value={data.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Demo Ama 21"
              />
            </label>
            <label>
              Care stage
              <select value={data.careStage} onChange={(e) => set('careStage', e.target.value)}>
                <option value="ANTENATAL">Antenatal</option>
                <option value="POSTNATAL">Postnatal</option>
              </select>
            </label>
            <label>
              Preferred language
              <select
                value={data.preferredLanguage}
                onChange={(e) => set('preferredLanguage', e.target.value)}
              >
                <option value="en">English · available</option>
                <option value="tw">Twi · human support required</option>
                <option value="ee">Ewe · human support required</option>
                <option value="dag">Dagbani · human support required</option>
              </select>
            </label>
            <label>
              Estimated due date (optional)
              <input
                type="date"
                value={data.estimatedDueDate}
                onChange={(e) => set('estimatedDueDate', e.target.value)}
              />
            </label>
            <label>
              Fictional phone number (optional)
              <input
                type="tel"
                pattern="\+?[0-9 ()\-]{7,20}"
                value={data.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="Synthetic contact only"
              />
            </label>
            {coordinator && (
              <label className="full">
                Assign health worker
                <select
                  required
                  value={data.assignedWorkerId ?? ''}
                  onChange={(e) => set('assignedWorkerId', e.target.value)}
                >
                  <option value="">Choose an active worker</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="checkbox full">
              <input
                required
                type="checkbox"
                checked={data.adultConfirmed}
                onChange={(e) => set('adultConfirmed', e.target.checked)}
              />
              This synthetic record represents an adult aged 18 or over.
            </label>
          </div>
        )}
        {step === 1 && (
          <div className="form-stack">
            <div className="notice">
              Explain the purpose of registration and each optional contact channel. Declining
              reminders does not prevent enrolment.
            </div>
            <label className="checkbox">
              <input
                type="checkbox"
                required
                checked={data.registrationConsent}
                onChange={(e) => set('registrationConsent', e.target.checked)}
              />
              Registration consent has been explained and granted for coordinating appointments,
              follow-up, and referrals.
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={data.smsConsent}
                onChange={(e) => set('smsConsent', e.target.checked)}
              />
              Opt in to neutral SMS reminders (simulated).
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={data.whatsappConsent}
                onChange={(e) => set('whatsappConsent', e.target.checked)}
              />
              Opt in to neutral WhatsApp reminders (simulated).
            </label>
            <p className="muted">
              Consent version: 2026-10-v1. Contact choices can be withdrawn later. Messages do not
              include pregnancy details.
            </p>
          </div>
        )}
        {step === 2 && (
          <>
            <dl className="info-grid">
              <div>
                <dt>Name / alias</dt>
                <dd>{data.name}</dd>
              </div>
              <div>
                <dt>Care stage</dt>
                <dd>{data.careStage.toLowerCase()}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>{data.phone || 'Not provided'}</dd>
              </div>
              <div>
                <dt>Language preference</dt>
                <dd>
                  {
                    {
                      en: 'English',
                      tw: 'Twi (review pending)',
                      ee: 'Ewe (review pending)',
                      dag: 'Dagbani (review pending)',
                    }[data.preferredLanguage]
                  }
                </dd>
              </div>
              <div>
                <dt>Registration</dt>
                <dd>Adult confirmed · consent recorded</dd>
              </div>
              <div>
                <dt>Reminder channels</dt>
                <dd>
                  {[data.smsConsent ? 'SMS' : null, data.whatsappConsent ? 'WhatsApp' : null]
                    .filter(Boolean)
                    .join(', ') || 'None'}
                </dd>
              </div>
            </dl>
            <div className="notice">
              When offline, the encrypted record stays pending on this device until you sign in and
              sync. Schedule a visit after enrolment is synchronized.
            </div>
          </>
        )}
        <div className="form-footer">
          <button
            type="button"
            className="secondary"
            disabled={step === 0 || busy}
            onClick={() => setStep(step - 1)}
          >
            Back
          </button>
          <button type="submit" disabled={busy}>
            {busy ? 'Saving…' : step === 2 ? 'Enroll fictional mother' : 'Continue'}
          </button>
        </div>
      </form>
    </section>
  );
}
