import Link from 'next/link';
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="NurturePath AI home">
      <svg width="38" height="38" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path
          d="M24 39S6 28 6 16a10 10 0 0 1 18-6 10 10 0 0 1 18 6c0 12-18 23-18 23Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M9 23h9l4-8 5 16 4-8h8"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!compact && (
        <span>
          NurturePath<span className="brand-ai">AI</span>
        </span>
      )}
    </Link>
  );
}
