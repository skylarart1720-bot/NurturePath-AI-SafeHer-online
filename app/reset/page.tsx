import { AuthForm } from '@/components/auth-form';
export default async function Reset({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return <AuthForm reset token={(await searchParams).token ?? null} />;
}
