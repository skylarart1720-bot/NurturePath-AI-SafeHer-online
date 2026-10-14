import { currentActor } from './auth';
import { redirect } from 'next/navigation';
import { SafeherPage } from '@/components/safeher-page';
import { SafeherAdmin } from '@/components/safeher-admin';

export type Workspace = 'content' | 'partners' | 'metrics';
export async function SafeherWorkspace({ section }: { section: Workspace }) {
  const actor = await currentActor();
  if (!actor) redirect('/login');
  const allowed =
    section === 'content'
      ? ['PLATFORM_ADMIN', 'CONTENT_REVIEWER']
      : section === 'partners'
        ? ['PLATFORM_ADMIN', 'SUPPORT_PARTNER']
        : ['PLATFORM_ADMIN'];
  if (!allowed.includes(actor.role))
    return (
      <SafeherPage
        title="Access restricted"
        intro="Your account does not have access to this workspace."
      >
        <p>Return to your authorized dashboard.</p>
      </SafeherPage>
    );
  return (
    <SafeherPage
      eyebrow="AUTHORIZED WORKSPACE"
      title={
        {
          content: 'Content review',
          partners: 'Service directory review',
          metrics: 'Aggregate reporting',
        }[section]
      }
      intro="Changes require the permissions and review checks associated with your account."
    >
      <SafeherAdmin section={section} />
    </SafeherPage>
  );
}
