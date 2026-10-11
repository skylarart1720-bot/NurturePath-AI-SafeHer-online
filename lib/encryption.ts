import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
function key(version = 'v1') {
  if (!/^v\d+$/.test(version)) throw new Error('Invalid encryption key version');
  const value =
    process.env['CONTACT_ENCRYPTION_KEY_' + version.toUpperCase()] ??
    (version === 'v1' ? process.env.CONTACT_ENCRYPTION_KEY : undefined);
  if (!value || !/^[a-f\d]{64}$/i.test(value))
    throw new Error('Configure a 32-byte hex key for contact version ' + version);
  return Buffer.from(value, 'hex');
}
export function encryptContact(value: string) {
  const version = process.env.ACTIVE_CONTACT_KEY_ID ?? 'v1';
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key(version), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [
    version,
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    encrypted.toString('base64'),
  ].join('.');
}
export function decryptContact(value: string) {
  const [version, iv, tag, data] = value.split('.');
  if (!/^v\d+$/.test(version) || !iv || !tag || !data) throw new Error('Invalid encrypted contact');
  const decipher = createDecipheriv('aes-256-gcm', key(version), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString(
    'utf8',
  );
}
