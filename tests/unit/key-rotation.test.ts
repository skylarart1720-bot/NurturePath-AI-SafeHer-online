import { it, expect } from 'vitest';
import { encryptContact, decryptContact } from '../../lib/encryption';
it('decrypts prior versions while writing a new key ID', () => {
  const old = {
    key: process.env.CONTACT_ENCRYPTION_KEY,
    active: process.env.ACTIVE_CONTACT_KEY_ID,
    v2: process.env.CONTACT_ENCRYPTION_KEY_V2,
  };
  try {
    process.env.CONTACT_ENCRYPTION_KEY = '11'.repeat(32);
    process.env.ACTIVE_CONTACT_KEY_ID = 'v1';
    const legacy = encryptContact('fictional');
    process.env.CONTACT_ENCRYPTION_KEY_V2 = '22'.repeat(32);
    process.env.ACTIVE_CONTACT_KEY_ID = 'v2';
    const rotated = encryptContact(decryptContact(legacy));
    expect(rotated.startsWith('v2.')).toBe(true);
    expect(decryptContact(legacy)).toBe('fictional');
    expect(decryptContact(rotated)).toBe('fictional');
    delete process.env.CONTACT_ENCRYPTION_KEY_V2;
    expect(() => decryptContact(rotated)).toThrow();
  } finally {
    for (const [name, value] of Object.entries({
      CONTACT_ENCRYPTION_KEY: old.key,
      ACTIVE_CONTACT_KEY_ID: old.active,
      CONTACT_ENCRYPTION_KEY_V2: old.v2,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
