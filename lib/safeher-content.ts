import { rankLessons } from './safeher-question-matching';
export type Lesson = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  paragraphs: string[];
  keywords: string[];
  source: string;
  sourceName: string;
  question: string;
  answers: string[];
  correct: number;
  explanation: string;
  review?: { version: number; reviewedAt: string; expiresAt: string; scope: string };
};
const who = 'https://www.who.int/news-room/fact-sheets/detail/comprehensive-sexuality-education';
const unicef = 'https://www.unicef.org/stories/how-to-stop-cyberbullying';
export const lessons: Lesson[] = [
  {
    slug: 'cyberbullying',
    title: 'Understand cyberbullying',
    category: 'Digital safety',
    summary: 'Recognize repeated online harm and consider support.',
    paragraphs: [
      'Cyberbullying uses digital tools to repeatedly frighten or shame someone. Hurtful messages, impersonation, and unwanted images can be examples.',
      'Consider speaking with a trusted adult or counsellor. If safe, explore platform blocking and reporting tools. Do not upload private evidence or identifying details to SafeHer.',
    ],
    keywords: ['cyberbullying', 'impersonation', 'bullying'],
    source: unicef,
    sourceName: 'UNICEF · Cyberbullying',
    question: 'Who could help when online bullying feels difficult to handle?',
    answers: ['A trusted adult or counsellor', 'Someone demanding your password'],
    correct: 0,
    explanation: 'A trusted person can help you consider support and safer options.',
  },
  {
    slug: 'supporting-a-friend',
    title: 'Support a friend online',
    category: 'Relationships',
    summary: 'Offer care while respecting privacy and choices.',
    paragraphs: [
      'If a friend is being bullied online, listen and consider helping them reach a trusted adult or qualified counsellor.',
      'Ask before sharing their messages or images. SafeHer cannot investigate or send help. If there is immediate danger, seek local emergency assistance if safe.',
    ],
    keywords: ['friend', 'bystander', 'listen'],
    source: unicef,
    sourceName: 'UNICEF · Supporting someone experiencing cyberbullying',
    question: 'Should you post your friend’s private messages without asking?',
    answers: ['Yes', 'No'],
    correct: 1,
    explanation: 'Respect their privacy and ask before sharing information.',
  },
  {
    slug: 'consent',
    title: 'Consent is your choice',
    category: 'Your rights',
    summary: 'Understand boundaries, respect, and the freedom to say no.',
    paragraphs: [
      'Consent means a freely made choice. Pressure, threats, or fear take away that freedom. You can change your mind, and agreeing to one thing does not mean agreeing to everything.',
      'Ask before touching someone or sharing their image. Listen to their answer. Silence is not permission. A respectful relationship makes room for boundaries.',
      'If someone ignores your boundaries, consider talking with a trusted adult or qualified support professional. You do not need to share identifying details here.',
    ],
    keywords: ['consent', 'permission', 'no', 'boundaries'],
    source: who,
    sourceName: 'WHO · Comprehensive sexuality education',
    question: 'Someone agrees to a photo. Does that give permission to post it?',
    answers: ['Yes, always', 'No. Ask separately before sharing'],
    correct: 1,
    explanation: 'Permission is specific. Sharing requires a separate freely made choice.',
  },
  {
    slug: 'bodily-autonomy',
    title: 'Your body, your boundaries',
    category: 'Your rights',
    summary: 'Learn how to express and respect personal boundaries.',
    paragraphs: [
      'Bodily autonomy means having a voice in decisions about your body. You deserve respect and clear, understandable information.',
      'You can ask a healthcare professional what a procedure involves and what choices are available. Local rules about consent and confidential care may differ; ask the provider to explain them.',
    ],
    keywords: ['body', 'autonomy', 'touch'],
    source: who,
    sourceName: 'WHO · Comprehensive sexuality education',
    question: 'Can you ask a healthcare professional to explain a procedure?',
    answers: ['Yes', 'No'],
    correct: 0,
    explanation: 'You deserve understandable information and the opportunity to ask questions.',
  },
  {
    slug: 'reproductive-health',
    title: 'Get to know your health',
    category: 'Health & wellbeing',
    summary: 'A welcoming starting point for reproductive health questions.',
    paragraphs: [
      'Sexual and reproductive health includes learning about your body, preventing infections, understanding pregnancy prevention, and accessing appropriate care.',
      'A qualified healthcare professional can discuss contraception and sexual health services with you. Ask about confidentiality, costs, and who can access your records before sharing personal information.',
      'SafeHer cannot diagnose symptoms or choose treatment for you. If you feel unwell or have a health concern, seek qualified care.',
    ],
    keywords: ['health', 'pregnancy', 'contraception', 'infection', 'reproductive'],
    source:
      'https://www.who.int/news-room/questions-and-answers/item/adolescent-sexual-and-reproductive-health',
    sourceName: 'WHO · Adolescent sexual and reproductive health',
    question: 'Who can help you choose care for a health concern?',
    answers: ['An online quiz', 'A qualified healthcare professional'],
    correct: 1,
    explanation: 'General educational information cannot replace individual professional care.',
  },
  {
    slug: 'menstrual-health',
    title: 'Periods without the stigma',
    category: 'Health & wellbeing',
    summary: 'Understand menstruation and when to ask for support.',
    paragraphs: [
      'Menstruation is a normal part of development for many people. You deserve accurate information, suitable menstrual products, privacy, and access to care.',
      'Use products according to their instructions and wash your hands when changing them. A healthcare professional can help if bleeding, pain, or other symptoms worry you.',
    ],
    keywords: ['period', 'menstrual', 'menstruation', 'bleeding'],
    source: who,
    sourceName: 'WHO · Comprehensive sexuality education',
    question: 'Is it okay to ask for help with period concerns?',
    answers: ['Yes', 'No'],
    correct: 0,
    explanation: 'You deserve support without shame.',
  },
  {
    slug: 'child-marriage',
    title: 'A future you can choose',
    category: 'Your rights',
    summary: 'Understand child marriage and pathways to trusted support.',
    paragraphs: [
      'Child marriage is a marriage or union involving a person under 18. It can interrupt education and limit health, safety, and future opportunities.',
      'If you feel pressured into marriage, consider seeking a trusted adult, child protection professional, or legal support organization. Think about whether a device or conversation is safe before reaching out.',
      'SafeHer does not decide your legal case. Local protection and legal professionals can explain your options.',
    ],
    keywords: ['marriage', 'married', 'child', 'forced'],
    source: 'https://www.unicef.org/protection/child-marriage',
    sourceName: 'UNICEF · Child marriage',
    question: 'Can child marriage affect access to education?',
    answers: ['Yes', 'No'],
    correct: 0,
    explanation: 'Child marriage can interrupt schooling and future opportunities.',
  },
  {
    slug: 'online-harassment',
    title: 'When online spaces feel unsafe',
    category: 'Digital safety',
    summary: 'Find practical options for bullying and harassment.',
    paragraphs: [
      'Online harassment can include hurtful messages, threats, or unwanted sharing. You deserve support. Consider speaking with someone you trust.',
      'If safe for you, use platform tools to mute, block, or report an account. Think about whether an action could alert the other person or increase risk before taking it.',
      'Do not upload private messages or evidence to SafeHer. If you choose to keep a record, consider the safety of your device and get guidance from a trusted professional.',
    ],
    keywords: [
      'online',
      'harassment',
      'bullying',
      'cyberbullying',
      'blackmail',
      'threat',
      'grooming',
    ],
    source: unicef,
    sourceName: 'UNICEF · Cyberbullying',
    question: 'Should you upload private evidence to SafeHer?',
    answers: ['Yes', 'No'],
    correct: 1,
    explanation: 'SafeHer does not collect evidence or abuse disclosures.',
  },
  {
    slug: 'digital-privacy',
    title: 'Small steps, stronger privacy',
    category: 'Digital safety',
    summary: 'Protect accounts and decide what you share.',
    paragraphs: [
      'Use a unique password for each account and enable two-step verification where available. Keep recovery codes somewhere safe.',
      'Review who can see your posts and location. Do not share passwords or verification codes, even with someone who claims to be support staff.',
      'If someone monitors your device, changing settings may be noticed. Consider a safer device and professional guidance. Quick Exit does not erase history or network records.',
    ],
    keywords: [
      'privacy',
      'password',
      'account',
      'security',
      'blackmail',
      'grooming',
      'digital',
      'location',
    ],
    source: unicef,
    sourceName: 'UNICEF · Cyberbullying and online safety',
    question: 'Should you share a verification code with someone who asks?',
    answers: ['No', 'Yes'],
    correct: 0,
    explanation: 'Verification codes can provide access to your account.',
  },
  {
    slug: 'coercion',
    title: 'Recognize pressure and control',
    category: 'Relationships',
    summary: 'Learn about pressure, manipulation, and support options.',
    paragraphs: [
      'Pressure, threats, isolation, and demands for passwords can be signs of controlling behavior. You deserve relationships that respect your choices.',
      'You do not have to prove what happened to ask for support. SafeHer cannot determine whether abuse occurred or judge anyone’s credibility. A qualified support professional can help you explore options safely.',
    ],
    keywords: ['coercion', 'pressure', 'control', 'exploitation', 'abuse', 'grooming'],
    source: who,
    sourceName: 'WHO · Comprehensive sexuality education',
    question: 'Do you have to prove what happened to ask for support?',
    answers: ['Yes', 'No'],
    correct: 1,
    explanation: 'You can ask for support without sharing proof here.',
  },
  {
    slug: 'healthy-relationships',
    title: 'Relationships built on respect',
    category: 'Relationships',
    summary: 'Make room for trust, boundaries, and your own goals.',
    paragraphs: [
      'Healthy relationships allow each person to have friendships, goals, and boundaries. Respect includes listening, disagreeing without threats, and accepting a change of mind.',
      'Someone who cares for you should not demand your passwords or pressure you into sharing intimate images. Consider talking with a trusted person if you feel uncomfortable.',
    ],
    keywords: ['relationship', 'partner', 'respect', 'dating', 'friend'],
    source: who,
    sourceName: 'WHO · Comprehensive sexuality education',
    question: 'Does respect include accepting someone’s boundaries?',
    answers: ['Yes', 'No'],
    correct: 0,
    explanation: 'Boundaries and freely made choices are part of respectful relationships.',
  },
  {
    slug: 'trusted-support',
    title: 'Take a step toward support',
    category: 'Health & wellbeing',
    summary: 'Prepare to speak with someone you trust.',
    paragraphs: [
      'You can seek support from a qualified healthcare professional, counsellor, child protection professional, or legal adviser. A trusted person may help you prepare.',
      'Before sharing details, ask about confidentiality, any safeguarding reporting duties, fees, eligibility, and response times. Share only what you choose and what the service needs.',
      'SafeHer is not an emergency service and cannot send help. If you are in immediate danger, seek local emergency assistance if safe. The directory lists real organisations with public-source checks. Confirm availability and confidentiality directly; SafeHer does not send referrals.',
    ],
    keywords: [
      'support',
      'help',
      'counselling',
      'mental',
      'wellbeing',
      'emergency',
      'suicide',
      'hurt',
    ],
    source: unicef,
    sourceName: 'UNICEF · Getting support',
    question: 'What should you ask before sharing sensitive details?',
    answers: ['Confidentiality and who receives the information', 'Nothing'],
    correct: 0,
    explanation: 'Understanding how information is handled helps you make an informed choice.',
  },
];
function safetyAnswer(question: string) {
  const normalized = question.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (/kill myself|end my life|suicid|self[- ]?harm|hurt myself|overdose/i.test(normalized))
    return {
      text: 'You deserve support now. If you may hurt yourself or have taken something harmful, seek local emergency assistance or urgent healthcare if safe. Consider reaching a trusted person who can stay with you. SafeHer cannot send help or monitor this conversation. You do not need to share identifying details here.',
      sources: [],
      found: false,
    };
  if (
    /immediate danger|attacking me|weapon|kill me|bleeding heavily|heavy bleeding|severe.*pain|pregnan.*emergency|cannot breathe/i.test(
      normalized,
    )
  )
    return {
      text: 'If you are in immediate danger or have a serious health concern, seek local emergency assistance or urgent healthcare if safe. A trusted person may help you reach support. SafeHer cannot assess your emergency, diagnose symptoms, or send help. Do not wait for an online answer.',
      sources: [],
      found: false,
    };
  if (
    /(?:i am|i.m|aged|under)\s*(?:[1-9]|1[0-7])\b.*(?:abuse|sex|touch|forced)|(?:child|minor).*(?:abuse|sexual|exploitation)/i.test(
      normalized,
    )
  )
    return {
      text: 'You deserve safety and support. Consider a trusted adult who is not involved, or a qualified child protection professional. If there is immediate danger, seek local emergency assistance if safe. Ask about confidentiality and safeguarding reporting duties before sharing details. SafeHer cannot investigate, make a report, or send help. Do not share names, images, or identifying details here.',
      sources: [],
      found: false,
    };
  if (
    /system prompt|ignore.*(?:instruction|rule)|developer message|bypass|jailbreak|(?:show|extract|reveal|list).*(?:password|secret|address|medical record|user data)|legal verdict|win.*court/i.test(
      normalized,
    )
  )
    return {
      text: 'I cannot reveal private information, follow instructions to bypass safeguards, or determine a legal case. Ask a general educational question without identifying details. Qualified local professionals can explain individual legal or care options.',
      sources: [],
      found: false,
    };
  if (
    /diagnos|dosage|prescri|am i pregnant|prove.*abuse|credib|risk score|ignore.*instruction|system prompt/i.test(
      normalized,
    )
  )
    return {
      text: 'I cannot diagnose, prescribe, determine whether abuse occurred, or assess credibility or emergency risk. A qualified healthcare or support professional can help with individual concerns.',
      sources: [],
      found: false,
    };
  return null;
}
export function retrieve(question: string, approved: Lesson[]) {
  const safety = safetyAnswer(question);
  if (safety) return { ...safety, status: 'guidance' as const };
  if (!approved.length)
    return {
      text: 'Learning information is temporarily unavailable. Please try again shortly, or explore Find Support for published service contacts. SafeHer cannot send emergency help.',
      sources: [],
      found: false,
      status: 'unavailable' as const,
    };
  const candidates = rankLessons(question, approved);
  const ranked = candidates.filter((item) => item.score >= candidates[0].score * 0.65).slice(0, 2);
  if (!ranked.length)
    return {
      text: 'I do not have approved information to answer that question yet. Are you asking about your rights, relationships, health, online safety, or finding support? Choose a suggested question below, or rephrase your question without personal details.',
      sources: [],
      found: false,
      status: 'clarify' as const,
    };
  return {
    text: ranked.map((x) => x.lesson.paragraphs.join('\n\n')).join('\n\n'),
    sources: ranked.map((x) => ({
      title: x.lesson.sourceName,
      url: x.lesson.source,
      slug: x.lesson.slug,
      review: x.lesson.review,
    })),
    found: true,
    status: 'matched' as const,
  };
}
