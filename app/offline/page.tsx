import { SafeherPage } from '@/components/safeher-page';
import { SavedResources } from '@/components/safeher-tools';
export default function Page() {
  return (
    <SafeherPage
      title="Learning, even with less connection."
      intro="Read resources you previously chose to download. The information assistant and live directory require internet access."
    >
      <SavedResources />
    </SafeherPage>
  );
}
