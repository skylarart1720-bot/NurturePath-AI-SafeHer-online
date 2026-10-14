import { retrieve, type Lesson } from './safeher-content';

export type GroundedAnswer = ReturnType<typeof retrieve>;
export interface SafeherAdapter {
  answer(context: { excerpts: string; sources: GroundedAnswer['sources'] }): Promise<string>;
}
/** Provider adapters receive approved excerpts only, never the user's question or identity. */
export async function answerQuestion(
  question: string,
  corpus: Lesson[],
  adapter?: SafeherAdapter,
): Promise<GroundedAnswer> {
  const grounded = retrieve(question, corpus);
  if (!grounded.found || !adapter || process.env.SAFEHER_AI_VENDOR_APPROVED !== 'true')
    return grounded;
  try {
    const text = await adapter.answer({ excerpts: grounded.text, sources: grounded.sources });
    // An optional adapter can select exact approved paragraphs, not introduce unsupported claims.
    const allowed = new Set(grounded.text.split('\n\n'));
    if (
      !text ||
      text.length > grounded.text.length ||
      text.split('\n\n').some((p) => !allowed.has(p))
    )
      return grounded;
    return { ...grounded, text };
  } catch {
    return grounded;
  }
}
