import { createHash, timingSafeEqual } from 'node:crypto';
import { maintainSafeher } from '@/lib/safeher-maintenance';
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization') ?? '';
  const digest = (value: string) => createHash('sha256').update(value).digest();
  if (
    !secret ||
    secret.length < 32 ||
    !timingSafeEqual(digest('Bearer ' + secret), digest(supplied))
  )
    return Response.json({ error: { message: 'Unauthorized.' } }, { status: 401 });
  try {
    return Response.json(
      { data: { completedAt: new Date().toISOString(), ...(await maintainSafeher()) } },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { error: { message: 'Maintenance failed; operator review required.' } },
      { status: 503 },
    );
  }
}
