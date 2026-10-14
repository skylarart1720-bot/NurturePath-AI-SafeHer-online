import { SafeherPage } from '@/components/safeher-page';
import { Directory } from '@/components/safeher-tools';
export default function Page() {
  return (
    <SafeherPage
      eyebrow="FIND SUPPORT · GHANA"
      title="A next step, when you are ready."
      intro="Explore service information and learn what to ask before reaching out. You decide what to share."
    >
      <Directory />
    </SafeherPage>
  );
}
