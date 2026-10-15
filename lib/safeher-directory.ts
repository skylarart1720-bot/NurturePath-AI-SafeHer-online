export type DirectoryEntry = {
  id: string;
  name: string;
  description: string;
  region: string;
  category: string;
  accessMethod: string;
  eligibility: string;
  hours: string | null;
  contactUrl: string | null;
  verificationSource: string | null;
  verifiedAt: string | Date | null;
  synthetic: boolean;
  referralInstructions: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  serviceCategories?: string[];
  accessMethods?: string[];
  verificationMethod?: string;
  reviewExpiresAt?: string | Date | null;
  accessibility?: string[];
  accessibilityConfirmedAt?: string | Date | null;
  publicationStatus?: string;
};
export const directoryReviewDays = 180;
export function currentDirectoryCheck(entry: DirectoryEntry, now = new Date()) {
  if (entry.publicationStatus && entry.publicationStatus !== 'PUBLISHED') return false;
  if (
    entry.reviewExpiresAt &&
    (!Number.isFinite(+new Date(entry.reviewExpiresAt)) || +new Date(entry.reviewExpiresAt) <= +now)
  )
    return false;
  if (entry.synthetic || !entry.verifiedAt || !entry.verificationSource || !entry.contactUrl)
    return false;
  const timestamp = +new Date(entry.verifiedAt);
  const age = +now - timestamp;
  return Number.isFinite(timestamp) && age >= 0 && age <= directoryReviewDays * 86400000;
}
export function entryCategories(entry: DirectoryEntry) {
  return [...new Set([entry.category, ...(entry.serviceCategories ?? [])])];
}
export function entryAccessMethods(entry: DirectoryEntry) {
  return [...new Set([entry.accessMethod, ...(entry.accessMethods ?? [])])];
}
export function filterDirectory(
  entries: DirectoryEntry[],
  filters: {
    query: string;
    region: string;
    category: string;
    access: string;
    includeExamples?: boolean;
    accessibility?: string;
  },
  now = new Date(),
) {
  return entries.filter((entry) => {
    if (entry.publicationStatus && entry.publicationStatus !== 'PUBLISHED') return false;
    if (!currentDirectoryCheck(entry, now)) return false;
    const search = [entry.name, entry.description, ...entryCategories(entry)]
      .join(' ')
      .toLowerCase();
    return (
      search.includes(filters.query.trim().toLowerCase()) &&
      (!filters.accessibility ||
        filters.accessibility === 'Any accessibility' ||
        (!!entry.accessibilityConfirmedAt &&
          (entry.accessibility ?? []).includes(filters.accessibility))) &&
      (filters.region === 'All regions' ||
        entry.region === filters.region ||
        entry.region === 'Ghana-wide enquiries') &&
      (filters.category === 'All services' || entryCategories(entry).includes(filters.category)) &&
      (filters.access === 'Any access' || entryAccessMethods(entry).includes(filters.access))
    );
  });
}
