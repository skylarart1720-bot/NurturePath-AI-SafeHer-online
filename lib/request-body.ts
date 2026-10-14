import { AppError } from './permissions';

/** Bound bytes while reading, including chunked requests without Content-Length. */
export async function readJson(request: Request, limit = 20000): Promise<unknown> {
  const declared = Number(request.headers.get('content-length'));
  if (declared > limit) throw new AppError(413, 'SIZE', 'Request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, 'JSON', 'Enter valid JSON.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new AppError(413, 'SIZE', 'Request is too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new AppError(400, 'JSON', 'Enter valid JSON.');
  }
}
