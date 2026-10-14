import { SafeherPage } from '@/components/safeher-page';
import { SafeherAdmin } from '@/components/safeher-admin';
export default function Page() {
  return (
    <SafeherPage
      eyebrow="AUTHORIZED WORKSPACE"
      title="Careful information starts here."
      intro="Optional learning progress and role-controlled content, directory, and aggregate reporting."
    >
      <SafeherAdmin />
    </SafeherPage>
  );
}
