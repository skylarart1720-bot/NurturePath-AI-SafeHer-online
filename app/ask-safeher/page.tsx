import { SafeherPage } from '@/components/safeher-page';
import { AskSafeher } from '@/components/safeher-tools';
export default function Page() {
  return (
    <SafeherPage
      eyebrow="ASK. LEARN. CHOOSE."
      title="Every question is a starting point."
      intro="Plain-language information about your rights, health, relationships, and online safety. No account needed."
    >
      <div className="notice">
        Demonstration-reviewed resources. SafeHer does not diagnose, judge credibility, assess
        emergency risk, or send emergency help.
      </div>
      <AskSafeher />
    </SafeherPage>
  );
}
