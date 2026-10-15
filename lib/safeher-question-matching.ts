import type { Lesson } from './safeher-content';

const topics: Record<string, { phrases: RegExp; questions: string[]; categories: string[] }> = {
  consent: {
    phrases:
      /\b(?:say(?:ing)? no|change my mind|without (?:my )?permission|agree(?:ment)?|consent)\b/,
    questions: [
      'Can I change my mind about consent?',
      'What does consent mean when sharing a photo?',
    ],
    categories: ['GBV response'],
  },
  'bodily-autonomy': {
    phrases: /\b(?:my body|body boundaries|personal boundaries|unwanted touch)\b/,
    questions: ['What does bodily autonomy mean?', 'How can I express personal boundaries?'],
    categories: [],
  },
  'online-harassment': {
    phrases:
      /\b(?:threaten(?:s|ed|ing)?|harass(?:es|ed|ing|ment)?|blackmail(?:s|ed|ing)?|sextortion|unwanted messages)\b|\b(?:block(?:ing)?|report(?:ing)?|mut(?:e|ing))\b.*\bonline\b/,
    questions: [
      'How can I handle online harassment?',
      'What should I consider before blocking someone online?',
    ],
    categories: ['Digital safety'],
  },
  cyberbullying: {
    phrases:
      /\b(?:cyber ?bully(?:ing)?|bull(?:y|ying|ied)|mean messages|fake account|impersonat(?:e|ing|ion))\b/,
    questions: ['What is cyberbullying?', 'Who can help with online bullying?'],
    categories: ['Digital safety'],
  },
  'digital-privacy': {
    phrases:
      /\b(?:hack(?:ed|ing)?|two (?:step|factor)|2fa|verification code|protect my account|track(?:s|ed|ing)? (?:my |me|phone)|location sharing|passwords?)\b/,
    questions: ['How do I protect my account?', 'Should I share my verification code?'],
    categories: ['Digital safety'],
  },
  'child-marriage': {
    phrases: /\b(?:marry|marrying|wedding|marriage|married)\b/,
    questions: [
      'What is child marriage?',
      'Where can someone pressured into marriage find support?',
    ],
    categories: ['Child protection', 'Legal assistance'],
  },
  'reproductive-health': {
    phrases:
      /\b(?:birth control|family planning|contracepti(?:on|ve)|sexual health|reproductive|clinic|sti|std)\b/,
    questions: [
      'Where can I ask about reproductive healthcare?',
      'What should I ask about confidentiality at a clinic?',
    ],
    categories: ['Reproductive healthcare'],
  },
  'menstrual-health': {
    phrases: /\b(?:periods?|menstrual|menstruation|sanitary pads?|tampons?)\b/,
    questions: ['What is menstrual health?', 'Who can help with period concerns?'],
    categories: ['Reproductive healthcare'],
  },
  coercion: {
    phrases:
      /\b(?:controlling|manipulat(?:e|ing|ion)|pressur(?:e|es|ed|ing)|isolat(?:e|ed|ing)|forced into sex)\b/,
    questions: [
      'How can I recognize pressure and control?',
      'Can I ask for support without proof of abuse?',
    ],
    categories: ['GBV response'],
  },
  'healthy-relationships': {
    phrases: /\b(?:healthy relationship|dating|boyfriend|girlfriend|respectful relationship)\b/,
    questions: ['What makes a relationship respectful?', 'How do boundaries help a relationship?'],
    categories: [],
  },
  'supporting-a-friend': {
    phrases:
      /\b(?:help|support|listen to) (?:my |a )?friend\b|\bfriends?\b.*\b(?:private messages|bull(?:y|ying|ied))\b/,
    questions: [
      'How can I support a friend who is being bullied?',
      'Should I share a friend’s private messages?',
    ],
    categories: [],
  },
  'trusted-support': {
    phrases:
      /\b(?:find (?:trusted )?(?:support|help)|speak (?:with|to)|talk (?:with|to)|counsell?ing|counsell?or|mental health|confidentiality|personal details|support service)\b/,
    questions: [
      'How can I find trusted support?',
      'What should I ask before sharing personal details with a service?',
    ],
    categories: ['Community support'],
  },
};

export function normalizeQuestion(question: string) {
  return question
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[-]/g, ' ');
}
const stem = (word: string) =>
  word.endsWith('ies')
    ? word.slice(0, -3) + 'y'
    : word.length > 4 && word.endsWith('s')
      ? word.slice(0, -1)
      : word;
const generic = new Set([
  'no',
  'help',
  'support',
  'health',
  'child',
  'body',
  'online',
  'digital',
  'hurt',
  'friend',
]);

export function rankLessons(question: string, corpus: Lesson[]) {
  const normalized = normalizeQuestion(question);
  const words = new Set((normalized.match(/[a-z0-9]+/g) ?? []).map(stem));
  return corpus
    .map((lesson) => {
      const keywordScore = lesson.keywords.reduce((score, keyword) => {
        const key = normalizeQuestion(keyword);
        if (generic.has(key)) return score;
        const matches = key.includes(' ') ? normalized.includes(key) : words.has(stem(key));
        return score + (matches ? 2 : 0);
      }, 0);
      return {
        lesson,
        score: keywordScore + (topics[lesson.slug]?.phrases.test(normalized) ? 4 : 0),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.lesson.slug.localeCompare(b.lesson.slug));
}

export function answerSuggestions(slugs: string[], corpus: Lesson[]) {
  const available = new Set(corpus.map((lesson) => lesson.slug));
  const preferred = [...slugs, 'consent', 'digital-privacy', 'trusted-support'];
  return [
    ...new Set(
      preferred
        .filter((slug) => available.has(slug))
        .flatMap((slug) => topics[slug]?.questions ?? []),
    ),
  ].slice(0, 3);
}
export function supportCategories(slugs: string[]) {
  return [...new Set(slugs.flatMap((slug) => topics[slug]?.categories ?? []))];
}
