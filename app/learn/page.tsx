import { SafeherPage } from '@/components/safeher-page';
import { LearningHub } from '@/components/safeher-tools';
import { approvedLessons } from '@/lib/safeher';
export const dynamic = 'force-dynamic';
export default async function Page() {
  let items: Awaited<ReturnType<typeof approvedLessons>> = [];
  let unavailable = false;
  try {
    items = await approvedLessons();
  } catch {
    unavailable = true;
  }
  return (
    <SafeherPage
      eyebrow="KNOW YOUR RIGHTS"
      title="Knowledge that puts you first."
      intro="Short lessons. Clear explanations. Your own pace. Explore what matters to you, with no account required."
    >
      {unavailable && (
        <p className="error" role="alert">
          Learning resources are temporarily unavailable. Saved resources below remain available on
          this device.
        </p>
      )}
      <LearningHub items={items} />
    </SafeherPage>
  );
}
