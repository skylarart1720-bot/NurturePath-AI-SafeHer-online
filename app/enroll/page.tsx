import { SafeherPage } from '@/components/safeher-page';
import { SafeherEnrollment } from '@/components/safeher-enrollment';
export default function Page() {
  return (
    <SafeherPage
      title="Set up your invited account"
      intro="Invitation-only account and authenticator enrollment."
    >
      <SafeherEnrollment />
    </SafeherPage>
  );
}
