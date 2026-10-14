import type { SafeherAdapter } from './safeher-assistant';

/** Optional server-only adapter contract for an operator-reviewed HTTPS gateway. */
export function configuredAdapter(): SafeherAdapter | undefined {
  if (
    process.env.SAFEHER_AI_ENABLED !== 'true' ||
    process.env.SAFEHER_AI_VENDOR_APPROVED !== 'true'
  )
    return;
  const endpoint = process.env.SAFEHER_AI_ENDPOINT;
  const key = process.env.SAFEHER_AI_KEY;
  if (!endpoint || !key) return;
  try {
    if (new URL(endpoint).protocol !== 'https:') return;
  } catch {
    return;
  }
  return {
    async answer(context) {
      const result = await fetch(endpoint, {
        method: 'POST',
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          task: 'Select exact supplied paragraphs without adding claims.',
          ...context,
        }),
      });
      if (!result.ok) throw new Error('Assistant gateway unavailable');
      const { readJson } = await import('./request-body');
      // Reuse streaming bounds for untrusted gateway responses.
      const value = (await readJson(
        new Request('https://gateway-response.invalid', {
          method: 'POST',
          body: result.body,
          duplex: 'half',
        } as RequestInit),
        20000,
      )) as { text?: unknown };
      if (typeof value.text !== 'string') throw new Error('Invalid gateway answer');
      return value.text;
    },
  };
}
