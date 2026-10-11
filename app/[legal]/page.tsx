import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Brand } from '@/components/brand';
const pages: Record<string, { title: string; sections: { title: string; body: string }[] }> = {
  privacy: {
    title: 'Privacy, with care',
    sections: [
      {
        title: 'Synthetic demonstration',
        body: 'This release uses fictional adult records only. Do not enter real contact details, health histories, national identifiers, or exact locations. No real-patient pilot is enabled.',
      },
      {
        title: 'What the system records',
        body: 'A minimal name or alias, adult confirmation, care stage, optional due date, language choice, encrypted phone, consent receipts, appointments, follow-up outcomes, referral events, and access metadata. No diagnostic data is required.',
      },
      {
        title: 'Access and communication',
        body: 'Workers see their assigned records. Clinic coordinators work within their clinic. Programme administrators receive aggregate metrics and staff configuration; auditors receive metadata. Simulated reminders require active channel consent and approved neutral copy.',
      },
      {
        title: 'Offline storage',
        body: 'Pending changes are encrypted in IndexedDB using a key held in this browser tab’s session storage. Queues expire after 24 hours and are wiped at logout. This is a limited browser safeguard; closing the tab can make unsynced entries unrecoverable. Avoid shared or unmanaged devices.',
      },
      {
        title: 'Your choices and future pilots',
        body: 'Workers can record withdrawal of reminder consent or archive registration when consent is withdrawn. A real pilot requires a named data controller, a lawful basis, processor contracts, retention and rights procedures, legal review, and health-partner approval. No legal compliance is claimed.',
      },
    ],
  },
  safety: {
    title: 'Care coordination. Clear boundaries.',
    sections: [
      {
        title: 'Not an emergency service',
        body: 'For an urgent health concern, seek help directly from a qualified healthcare professional or your local emergency service. This prototype is not monitored for emergencies and cannot dispatch help.',
      },
      {
        title: 'No clinical decision-making',
        body: 'NurturePath does not diagnose, prescribe, assess pregnancy risk, or decide emergency severity. Referral reasons describe workflow coordination. Clinician-selected urgency must be entered by a clinic coordinator based on professional review.',
      },
      {
        title: 'Content and language review',
        body: 'The content assistant is a deterministic wording aid for approved sources. Drafts require human review. English demo templates are illustrative, not clinically validated. Twi, Ewe, and Dagbani translations are not enabled.',
      },
      {
        title: 'Demonstration metrics',
        body: 'All dashboard results describe fictional workflow activity. They do not show improved clinical outcomes or reduced maternal mortality.',
      },
    ],
  },
  terms: {
    title: 'Demonstration terms',
    sections: [
      {
        title: 'Permitted use',
        body: 'Use this prototype to evaluate follow-up workflows with fictional consenting adults. Keep real patient data and live messaging out of the demo.',
      },
      {
        title: 'Clinical responsibility',
        body: 'Healthcare professionals and partner organizations remain responsible for actual care, referral protocols, consent, and governance. This software offers no medical advice or guarantee of care completion.',
      },
      {
        title: 'Production agreements',
        body: 'Service ownership, support, hosting agreements, privacy terms, and legal obligations must be agreed in writing before any real-world pilot.',
      },
    ],
  },
  accessibility: {
    title: 'Built to be accessible',
    sections: [
      {
        title: 'Design goals',
        body: 'The interface aims for WCAG 2.2 AA with semantic forms, visible keyboard focus, text status labels, reduced motion, readable contrast, and touch controls of at least 44 pixels. Formal conformance is not yet independently certified.',
      },
      {
        title: 'Using the interface',
        body: 'Use Tab and Shift+Tab to move between controls, Enter to submit a form, and the Skip to content link to bypass navigation. Task lists use cards to avoid horizontal scrolling on small screens.',
      },
      {
        title: 'Feedback',
        body: 'During supervised usability testing, record the page, device, assistive technology, and barrier in the project issue tracker. A named public support channel is required before a patient pilot.',
      },
    ],
  },
  partners: {
    title: 'Prepare a responsible partnership',
    sections: [
      {
        title: 'The workflow to validate',
        body: 'Map enrolment, scheduling, contact outcomes, referrals, attendance, and closure with adult mothers, community health workers, midwives, and clinic coordinators using synthetic records.',
      },
      {
        title: 'What to bring',
        body: 'A clinic or NGO contact, an accountable operational owner, written authorization, a clinician reviewer, proposed country and hosting region, consent requirements, and a limited pilot protocol.',
      },
      {
        title: 'Required launch gates',
        body: 'Partner agreements; legal and privacy review; clinical content and workflow review; security assessment and backup restoration; support and incident ownership; and a monitored pilot protocol. All remain pending in this release.',
      },
      {
        title: 'Next step',
        body: 'Document your proposal in docs/PARTNER-ENQUIRY.md in the repository. No enquiry is transmitted from this prototype; contact details and a delivery provider must be verified before enabling an online enquiry channel.',
      },
    ],
  },
};
export function generateStaticParams() {
  return Object.keys(pages).map((legal) => ({ legal }));
}
export default async function Legal({ params }: { params: Promise<{ legal: string }> }) {
  const p = pages[(await params).legal];
  if (!p) notFound();
  return (
    <>
      <header className="public-header">
        <Brand />
        <Link href="/login" className="button secondary">
          Open demo
        </Link>
      </header>
      <main id="main" className="legal">
        <div className="eyebrow">NurturePath AI · Synthetic prototype</div>
        <h1>{p.title}</h1>
        {p.sections.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </section>
        ))}
        <Link href="/">← Back to home</Link>
      </main>
    </>
  );
}
