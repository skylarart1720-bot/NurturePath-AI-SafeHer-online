import { SafeherPage } from '@/components/safeher-page';
import { DigitalSafetyCentre } from '@/components/safeher-digital-safety';
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
      eyebrow="DIGITAL SAFETY CENTRE"
      title="Your online world. Your boundaries."
      intro="Practical steps to protect your information and find support when online spaces feel unsafe."
    >
      <DigitalSafetyCentre items={items} unavailable={unavailable} />
    </SafeherPage>
  );
}
