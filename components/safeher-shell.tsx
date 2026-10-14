'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ShieldCheck, LogOut, Menu, WifiOff } from 'lucide-react';
export function SafeherShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    queueMicrotask(update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const links = [
    ['/ask-safeher', 'Ask SafeHer'],
    ['/learn', 'Know your rights'],
    ['/digital-safety', 'Digital safety'],
    ['/find-support', 'Find support'],
  ];
  return (
    <div className="sh">
      <div className="sh-top">
        <span>
          <ShieldCheck size={14} /> A space for your questions. A choice in your next steps.
        </span>
        <Link href="/safety">
          Your safety comes first <ArrowUpRight size={13} />
        </Link>
      </div>
      <header className="sh-header">
        <Link href="/" className="sh-brand" aria-label="NurturePath AI SafeHer home">
          <svg viewBox="0 0 48 48" width="42" height="42" aria-hidden="true">
            <path
              d="M24 3 42 11v14c0 10-18 20-18 20S6 35 6 25V11Z"
              fill="#e9f7f4"
              stroke="#087e83"
              strokeWidth="2"
            />
            <path
              d="M16 31c0-9 16-4 16-15M24 20c-8-10-15 1 0 9 15-8 8-19 0-9"
              fill="none"
              stroke="#087e83"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <span>
            NurturePath AI
            <strong>
              SafeHer<span className="sh-brand-dot">.</span>
            </strong>
          </span>
        </Link>
        <button
          className="sh-menu secondary"
          aria-expanded={open}
          aria-controls="sh-navigation"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
        >
          <Menu />
        </button>
        <nav
          id="sh-navigation"
          className={open ? 'sh-nav is-open' : 'sh-nav'}
          aria-label="Main navigation"
        >
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <a
          className="sh-exit"
          href="https://www.wikipedia.org/"
          onClick={(event) => {
            event.preventDefault();
            window.location.replace('https://www.wikipedia.org/');
          }}
        >
          <LogOut size={16} /> Quick Exit
        </a>
      </header>
      {offline && (
        <div className="sh-offline" role="status">
          <WifiOff size={18} /> You are offline. Open saved resources below. Ask SafeHer needs an
          internet connection.
        </div>
      )}
      {children}
      <footer className="sh-footer">
        <div>
          <Link className="sh-footer-title" href="/">
            NurturePath AI — SafeHer
          </Link>
          <p>Safe information. Safe choices. Safer futures.</p>
          <small>Ghana first. Designed for a safer, more informed future.</small>
        </div>
        <div>
          <Link href="/about">About SafeHer</Link>
          <Link href="/privacy">Privacy & data</Link>
          <Link href="/safety">Safety & limitations</Link>
          <Link href="/contact">Feedback</Link>
          <Link href="/login">Optional account</Link>
        </div>
        <p className="sh-footer-note">
          Educational information, not medical or legal advice. Quick Exit changes the page; it does
          not erase browser history, network records, or screenshots. Educational preview · English
        </p>
      </footer>
    </div>
  );
}
