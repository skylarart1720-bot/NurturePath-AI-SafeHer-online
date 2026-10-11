import { dashboardPage } from '@/lib/dashboard-page';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ section?: string[] }> }) {
  return dashboardPage('clinic', (await params).section);
}
