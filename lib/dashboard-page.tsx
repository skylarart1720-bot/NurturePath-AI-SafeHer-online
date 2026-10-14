import { redirect, notFound } from 'next/navigation';
import { currentActor } from './auth';
import { Workspace } from '@/components/workspace';
export async function dashboardPage(role: string, section: string[] = []) {
  const actor = await currentActor();
  if (!actor) redirect('/login');
  if (['REGISTERED_USER', 'SUPPORT_PARTNER', 'CONTENT_REVIEWER'].includes(actor.role))
    redirect('/dashboard');
  const target =
    actor.role === 'HEALTH_WORKER' ? 'worker' : actor.role === 'CLINIC_ADMIN' ? 'clinic' : 'admin';
  if (target !== role) redirect('/' + target);
  const tab = section[0] ?? 'overview';
  const permitted =
    actor.role === 'HEALTH_WORKER'
      ? [
          'overview',
          'mothers',
          'register',
          'followups',
          'appointments',
          'referrals',
          'impact',
          'messages',
          'sync',
        ]
      : actor.role === 'CLINIC_ADMIN'
        ? [
            'overview',
            'mothers',
            'register',
            'followups',
            'appointments',
            'referrals',
            'impact',
            'messages',
            'sync',
            'team',
            'audit',
          ]
        : actor.role === 'AUDITOR'
          ? ['overview', 'impact', 'audit']
          : ['overview', 'impact', 'messages', 'team', 'audit'];
  if (
    ![...permitted, 'security'].includes(tab) ||
    section.length > 2 ||
    (section.length === 2 && tab !== 'mothers')
  )
    notFound();
  return <Workspace key={section.join('/')} actor={actor} section={tab} recordId={section[1]} />;
}
