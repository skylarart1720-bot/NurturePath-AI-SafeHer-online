import { SafeherPage } from '@/components/safeher-page';
export default function Page() {
  return (
    <SafeherPage
      title="Your safety comes first."
      intro="Understand the limits of this information space before deciding what to do next."
    >
      <article className="sh-reading">
        <h2>Quick Exit has limits</h2>
        <p>
          Quick Exit immediately navigates to Wikipedia using replacement navigation. It does not
          erase earlier browser history, network records, screenshots, downloaded resources, or
          other traces. Consider whether your device and connection are safe.
        </p>
        <h2>No emergency response</h2>
        <p>
          SafeHer cannot send emergency assistance or guarantee a response. If you are in immediate
          danger, seek local emergency assistance if it is safe. No emergency phone numbers are
          supplied because contact details have not been independently verified for this demo.
        </p>
        <h2>Information, with honest limits</h2>
        <p>
          SafeHer does not diagnose, prescribe treatment, decide legal cases, determine whether
          abuse occurred, judge credibility, or score risk. Questions outside reviewed content
          receive an uncertainty response and guidance to qualified support.
        </p>
        <h2>Protect personal details</h2>
        <p>
          Do not enter names, precise locations, medical records, intimate images, evidence, or
          private messages. No referral transmission is enabled. Manual contact with a real provider
          should follow informed choice about what will be shared and any confidentiality limits.
        </p>
        <h2>Children and safeguarding</h2>
        <p>
          Content avoids collecting age or identity. If you need support, a safe trusted adult or
          qualified child-protection professional may help. A real pilot requires trained
          safeguarding staff, clear reporting and escalation procedures, appropriate
          child-protection review, and reviewed partner arrangements.
        </p>
      </article>
    </SafeherPage>
  );
}
