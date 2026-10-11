import Link from 'next/link';
export default function NotFound() {
  return (
    <main id="main" className="legal">
      <h1>That path is unavailable</h1>
      <p>Return to the public site or sign in to your assigned workspace.</p>
      <Link href="/login" className="button">
        Go to sign in
      </Link>
    </main>
  );
}
