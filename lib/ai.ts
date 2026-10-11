import { AppError } from './permissions';
// Only stored, versioned source content enters this adapter. No patient or free-text prompt input.
export function simplifyApprovedContent(
  source: { id: string; body: string; approvedAt: Date | null; locale: string },
  locale: string,
) {
  if (!source.approvedAt)
    throw new AppError(400, 'UNAPPROVED_SOURCE', 'Choose an approved source.');
  if (locale !== 'en')
    throw new AppError(
      422,
      'REVIEW_REQUIRED',
      'Local-language translations require a qualified human translator.',
    );
  return {
    body: source.body
      .replace(/approximately/gi, 'about')
      .replace(/contact your healthcare facility/gi, 'contact your clinic'),
    sourceId: source.id,
    modelVersion: 'deterministic-copy-assistant-v1',
    approvalRequired: true,
  };
}
