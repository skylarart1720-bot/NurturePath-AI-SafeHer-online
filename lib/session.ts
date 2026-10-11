import { randomBytes, createHash } from 'node:crypto';
import { db } from './db';
import { AppError } from './permissions';
export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
export function tokenVersionCurrent(token: string, version: number) {
  return /^\d+\.[A-Za-z0-9_-]{43}$/.test(token) && Number(token.split('.')[0]) === version;
}
export async function createSessionRecord(userId: string, expectedVersion?: number) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { status: true, sessionVersion: true },
  });
  if (
    !user ||
    user.status !== 'ACTIVE' ||
    (expectedVersion !== undefined && expectedVersion !== user.sessionVersion)
  )
    throw new AppError(401, 'SESSION_REVOKED', 'Account security changed. Sign in again.');
  const version = expectedVersion ?? user.sessionVersion;
  // Hashing the whole token binds the revocation version to a 256-bit unpredictable nonce.
  const token = version + '.' + randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 8 * 3600000);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}
