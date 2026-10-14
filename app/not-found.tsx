import Link from 'next/link';
import { SafeherPage } from '@/components/safeher-page';
export default function NotFound() {
  return (
    <SafeherPage
      title="That path is unavailable."
      intro="This resource may be unpublished, or the page may have moved."
    >
      <Link href="/learn" className="button">
        Explore learning resources
      </Link>
    </SafeherPage>
  );
}
