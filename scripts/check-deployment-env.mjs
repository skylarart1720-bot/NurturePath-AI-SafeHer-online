// Validate a deployment environment without printing credentials or contacting its database.
const errors = [];
const required = (name, test, description) => {
  const value = process.env[name] ?? '';
  if (!test(value)) errors.push(`${name}: ${description}`);
};
required(
  'DATABASE_URL',
  (value) => {
    try {
      const url = new URL(value);
      return (
        ['postgres:', 'postgresql:'].includes(url.protocol) &&
        !['localhost', '127.0.0.1', '[::1]', 'db'].includes(url.hostname) &&
        Boolean(url.hostname && url.username && url.pathname.length > 1)
      );
    } catch {
      return false;
    }
  },
  'use a hosted PostgreSQL runtime connection, with provider-required TLS and pooling.',
);
required(
  'APP_URL',
  (value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.origin === value;
    } catch {
      return false;
    }
  },
  'use the exact HTTPS site origin, without a trailing slash or path.',
);
for (const name of ['AUTH_SECRET', 'CRON_SECRET']) {
  required(
    name,
    (value) => value.length >= 32 && !/replace-with/i.test(value),
    'set an independent random secret of at least 32 characters.',
  );
}
for (const name of ['CONTACT_ENCRYPTION_KEY', 'BACKUP_ENCRYPTION_KEY']) {
  required(
    name,
    (value) => /^[a-f0-9]{64}$/i.test(value),
    'set an independent random 64-character hexadecimal key.',
  );
}
if (
  process.env.CONTACT_ENCRYPTION_KEY &&
  process.env.CONTACT_ENCRYPTION_KEY === process.env.BACKUP_ENCRYPTION_KEY
) {
  errors.push('BACKUP_ENCRYPTION_KEY: must differ from CONTACT_ENCRYPTION_KEY.');
}
required(
  'DEMO_MODE',
  (value) => ['true', 'false'].includes(value),
  'explicitly choose true for a synthetic demo or false for real-user production.',
);
if (process.env.DEMO_MODE === 'true') {
  required(
    'SAFEHER_DEMO_PASSWORD',
    (value) => value.length >= 12 && !/replace-with/i.test(value),
    'set a private synthetic account password of at least 12 characters.',
  );
}
for (const name of ['ALLOW_DEMO_RESET', 'SAFEHER_RESTORE_REPLAY']) {
  if (process.env[name] === 'true') errors.push(`${name}: disable for normal hosting.`);
}
if (process.env.SAFEHER_BOOTSTRAP_SECRET)
  errors.push('SAFEHER_BOOTSTRAP_SECRET: remove after workstation bootstrap.');
if (errors.length) {
  console.error(
    'Deployment environment needs attention:\n' + errors.map((error) => `- ${error}`).join('\n'),
  );
  process.exitCode = 1;
} else {
  console.log(
    'Deployment environment shape checks passed. Database connectivity, TLS, review gates, and hosted behavior still require verification.',
  );
}
