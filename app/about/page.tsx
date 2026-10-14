import { SafeherPage } from '@/components/safeher-page';
export default function Page() {
  return (
    <SafeherPage
      eyebrow="OUR MISSION"
      title="Safer information. More informed choices."
      intro="NurturePath AI — SafeHer is a Ghana-first information space for young women, with learning resources and public-source-checked support contacts."
    >
      <article className="sh-reading">
        <h2>Built around choice and dignity</h2>
        <p>
          SafeHer helps adolescent girls and young women learn about their rights, reproductive
          health, consent, relationships, and digital safety. Educational access does not require
          registration or disclosure of age, identity, or location.
        </p>
        <h2>Our approach</h2>
        <p>
          We retrieve information from published educational resources with source references and
          visible review status. We do not diagnose, assess victim credibility, score emergencies,
          or transmit referrals. The assistant uses deterministic extractive retrieval; no external
          language model receives questions.
        </p>
        <h2>Team and partnerships</h2>
        <p>
          This is a project demonstration for the SafeTech Africa HackLab brief. Team names and
          partner agreements have not been confirmed. WHO, UNICEF, UNFPA, and the event organizers
          are not represented as partners or endorsers.
        </p>
        <h2>Before a real pilot</h2>
        <p>
          Professional content review, local-language review, safeguarding procedures,
          data-protection review, independently verified provider details, and partner authorization
          are required. The directory includes real organisations with publicly checked contact
          details. A listing does not imply a partnership, confirmed availability, or a referral
          agreement. Synthetic examples are available separately for evaluation.
        </p>
      </article>
    </SafeherPage>
  );
}
