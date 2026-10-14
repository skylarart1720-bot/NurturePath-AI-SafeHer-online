import { SafeherPage } from '@/components/safeher-page';
import { Feedback } from '@/components/safeher-tools';
export default function Page() {
  return (
    <SafeherPage
      title="Help make this space more useful."
      intro="Give non-identifying feedback about accessibility, content clarity, service information, or privacy."
    >
      <Feedback />
      <p className="sh-small">
        No monitored support contact is configured in this demonstration. Do not use feedback to
        request emergency assistance.
      </p>
    </SafeherPage>
  );
}
