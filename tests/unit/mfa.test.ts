import { expect, it } from 'vitest';
import { base32, totp, verifyTotp } from '../../lib/mfa';
it('matches RFC 6238 SHA1 vectors', () => {
  const secret = base32(Buffer.from('12345678901234567890'));
  expect(totp(secret, Math.floor(59 / 30), 8)).toBe('94287082');
  expect(totp(secret, Math.floor(1111111109 / 30), 8)).toBe('07081804');
  expect(totp(secret, Math.floor(20000000000 / 30), 8)).toBe('65353130');
});
it('accepts bounded clock drift and rejects reuse', () => {
  const secret = base32(Buffer.from('12345678901234567890')),
    counter = 123456,
    now = counter * 30000;
  const code = totp(secret, counter);
  expect(verifyTotp(secret, code, null, now)).toBe(counter);
  expect(verifyTotp(secret, code, counter, now)).toBeNull();
  expect(verifyTotp(secret, totp(secret, counter - 1), null, now)).toBe(counter - 1);
  expect(verifyTotp(secret, totp(secret, counter - 3), null, now)).toBeNull();
  expect(verifyTotp(secret, 'invalid', null, now)).toBeNull();
});
