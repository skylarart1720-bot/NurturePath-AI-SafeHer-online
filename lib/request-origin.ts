import { AppError } from './permissions';

export function checkOrigin(request: Request) {
  const allowed = new Set<string>();
  const add = (value: string | undefined) => {
    if (!value) return;
    try {
      const url = new URL(value);
      if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password)
        allowed.add(url.origin);
    } catch {
      // Invalid configuration never permits a request origin.
    }
  };
  add(process.env.APP_URL);
  if (process.env.VERCEL === '1') {
    // These are server-side platform values, never request Host/forwarded headers.
    for (const hostname of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
      if (hostname && /^[a-z0-9.-]+$/i.test(hostname)) add(`https://${hostname}`);
    }
    if (process.env.VERCEL_ENV === 'production') {
      const hostname = process.env.VERCEL_PROJECT_PRODUCTION_URL;
      if (hostname && /^[a-z0-9.-]+$/i.test(hostname)) add(`https://${hostname}`);
    }
  } else if (!process.env.APP_URL) {
    add('http://localhost:3200');
  }
  const origin = request.headers.get('origin');
  if (!origin || !allowed.has(origin))
    throw new AppError(403, 'ORIGIN', 'Request origin is not allowed.');
}
