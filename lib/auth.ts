import { cookies } from 'next/headers';
import { hashToken, createSessionRecord, tokenVersionCurrent } from './session';
export { hashToken } from './session';
import { db } from './db';
import { AppError, type Actor } from './permissions';
export const sessionCookie = 'np_session';
export async function currentActor(): Promise<Actor | null> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });
  if (
    !session ||
    session.expiresAt < new Date() ||
    session.user.status !== 'ACTIVE' ||
    !tokenVersionCurrent(token, session.user.sessionVersion)
  )
    return null;
  const { id, organizationId, clinicId, role, name, email } = session.user;
  return { id, organizationId, clinicId, role, name, email };
}
export async function requireActor() {
  const actor = await currentActor();
  if (!actor) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in again.');
  return actor;
}
export async function createSession(userId: string, expectedVersion?: number) {
  const { token, expiresAt } = await createSessionRecord(userId, expectedVersion);
  (await cookies()).set(sessionCookie, token, {
    httpOnly: true,
    secure: process.env.APP_URL?.startsWith('https://') ?? false,
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  });
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(process.env.APP_URL ?? 'http://localhost:3200').origin)
    throw new AppError(403, 'ORIGIN', 'Request origin is not allowed.');
}
export async function rateLimit(key: string, limit = 60) {
  const now = new Date();
  const rows = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateLimit" ("key","count","expiresAt") VALUES (${key},1,${new Date(+now + 60000)}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "RateLimit"."expiresAt" < ${now} THEN 1 ELSE "RateLimit"."count"+1 END, "expiresAt"=CASE WHEN "RateLimit"."expiresAt" < ${now} THEN ${new Date(+now + 60000)} ELSE "RateLimit"."expiresAt" END RETURNING "count"`;
  if (rows[0].count > limit)
    throw new AppError(429, 'RATE_LIMIT', 'Too many requests. Wait a minute and try again.');
}
