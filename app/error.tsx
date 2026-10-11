'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="legal">
      <h1>Your workspace needs a moment</h1>
      <p>The request could not be completed. Your saved records remain on the server.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
