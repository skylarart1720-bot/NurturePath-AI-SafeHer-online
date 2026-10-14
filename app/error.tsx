'use client';
import { SafeherPage } from '@/components/safeher-page';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <SafeherPage
      title="This page needs a moment."
      intro="The request could not be completed. Please try again when your connection is available."
    >
      <button onClick={reset}>Try again</button>
    </SafeherPage>
  );
}
