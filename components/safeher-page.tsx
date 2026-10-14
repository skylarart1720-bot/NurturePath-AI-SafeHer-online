import { SafeherShell } from './safeher-shell';
export function SafeherPage({
  title,
  intro,
  eyebrow = 'NURTUREPATH AI — SAFEHER',
  children,
}: {
  title: string;
  intro: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <SafeherShell>
      <main id="main" className="sh-page">
        <header className="sh-page-heading">
          <div className="sh-eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{intro}</p>
        </header>
        {children}
      </main>
    </SafeherShell>
  );
}
