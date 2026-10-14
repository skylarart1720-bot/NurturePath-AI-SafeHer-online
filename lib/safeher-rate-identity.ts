import { db } from './db';
import { hashToken, tokenVersionCurrent } from './session';
export async function requestRateIdentity(request: Request) {
  const token = request.headers
    .get('cookie')
    ?.match(/(?:^|;\s*)np_session=(\d+\.[A-Za-z0-9_-]{43})(?:;|$)/)?.[1];
  if (token) {
    const session = await db.session.findUnique({
      where: { id: hashToken(token) },
      include: { user: true },
    });
    if (
      session &&
      session.expiresAt > new Date() &&
      session.user.status === 'ACTIVE' &&
      tokenVersionCurrent(token, session.user.sessionVersion)
    )
      return { identity: hashToken(token), identified: true };
  }
  const address =
    process.env.TRUST_PROXY === 'true'
      ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      : null;
  return { identity: address ?? 'public-unidentified', identified: !!address };
}
