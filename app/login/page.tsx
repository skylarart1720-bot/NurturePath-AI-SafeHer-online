import { SafeherPage } from '@/components/safeher-page';
import { SafeherLogin } from '@/components/safeher-account';
export default function Page() {
  return (
    <SafeherPage
      title="Welcome back, on your terms."
      intro="An optional account for saving learning progress. Information and support resources are available without signing in."
    >
      <SafeherLogin />
    </SafeherPage>
  );
}
