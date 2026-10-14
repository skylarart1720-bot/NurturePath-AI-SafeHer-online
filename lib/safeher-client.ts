export async function api(path: string, body?: unknown, method = body ? 'POST' : 'GET') {
  const result = await fetch('/api/safeher/' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const json = await result.json();
  if (!result.ok) throw new Error(json.error?.message ?? 'Unable to connect.');
  return json.data;
}
