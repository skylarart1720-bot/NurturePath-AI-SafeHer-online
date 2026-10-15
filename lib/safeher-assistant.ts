import { retrieve, type Lesson } from './safeher-content';
import { answerSuggestions, supportCategories } from './safeher-question-matching';

export type GroundedAnswer = ReturnType<typeof retrieve> & {
  followUps: string[];
  supportCategories: string[];
};
export interface SafeherAdapter {
  answer(context: { excerpts: string; sources: GroundedAnswer['sources'] }): Promise<string>;
}
/** Provider adapters receive approved excerpts only, never the user's question or identity. */
export async function answerQuestion(
  question: string,
  corpus: Lesson[],
  adapter?: SafeherAdapter,
): Promise<GroundedAnswer> {
  const result = retrieve(question, corpus);
  const slugs = result.sources.map((source) => source.slug);
  const grounded = {
    ...result,
    followUps:
      result.status === 'guidance' || result.status === 'unavailable'
        ? []
        : answerSuggestions(slugs, corpus).filter(
            (suggestion) => suggestion.toLowerCase() !== question.trim().toLowerCase(),
          ),
    supportCategories: supportCategories(slugs),
  };
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
