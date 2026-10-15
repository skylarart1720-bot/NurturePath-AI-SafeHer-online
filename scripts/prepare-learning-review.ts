import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { lessons } from '../lib/safeher-content';

const sections = lessons.map((lesson) => {
  const digest = createHash('sha256').update(JSON.stringify(lesson)).digest('hex');
  return `## ${lesson.title}

Slug: \`${lesson.slug}\` · Topic: ${lesson.category}

Source: [${lesson.sourceName}](${lesson.source})

Repository content SHA-256: \`${digest}\`

${lesson.summary}

${lesson.paragraphs.join('\n\n')}

**Reflection:** ${lesson.question}

${lesson.answers.map((answer, index) => `${index + 1}. ${answer}${index === lesson.correct ? ' (intended answer)' : ''}`).join('\n')}

**Explanation:** ${lesson.explanation}

Reviewer / qualification / organisation: __________

Decision (revise / reject / recommend approval): __________

Evidence reference and source sections checked: __________

Ghana-specific applicability, age and safeguarding concerns: __________

Required wording changes and explanation: __________

Exact database version checked / review date / expiry: __________
`;
});
writeFileSync(
  'docs/SAFEHER-LEARNING-REVIEW-PACKET.md',
  `# Know Your Rights: content review packet

Status: prepared for review; no professional approval recorded by this packet.

This packet reproduces the repository lesson definitions in lib/safeher-content.ts. Hosted database content may differ. Before signing off, export and compare the exact version in /dashboard/content, including source attribution, quiz answers and explanations. The digest identifies repository wording only; it is not a signature or approval.

Use the process in [the review handoff](SAFEHER-LEARNING-REVIEW.md). Do not treat a source link as an endorsement or a substitute for checking its support for each claim.

${sections.join('\n---\n\n')}`,
  'utf8',
);
console.log(`Prepared review worksheets for ${lessons.length} repository lessons.`);
