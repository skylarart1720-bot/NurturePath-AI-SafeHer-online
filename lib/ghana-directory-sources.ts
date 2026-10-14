import type { DirectoryEntry } from './safeher-directory';
export const ghanaDirectoryCheckedAt = '2026-10-12T00:00:00.000Z';
// A dated human-readable evidence snapshot, not an automatic claim of live availability.
// Recheck original sources before advancing this date. No provider has been contacted.
export const ghanaDirectorySources: DirectoryEntry[] = [
  {
    id: 'safeher-gh-msi',
    name: 'MSI Reproductive Choices Ghana',
    description:
      'Reproductive health and family planning information, with a contact centre that can help you find a suitable service or clinic. Contact details are published by MSI Ghana.',
    region: 'Ghana-wide enquiries',
    category: 'Reproductive healthcare',
    serviceCategories: ['Pregnancy-options counselling'],
    accessMethod: 'Telephone',
    accessMethods: ['Telephone', 'Online'],
    eligibility:
      'Ask the provider about eligibility, age-related consent requirements, fees, and confidentiality before sharing personal information. Counselling here refers to pregnancy-options counselling, not a general mental-health crisis service.',
    hours: null,
    contactPhone: '0800208585',
    contactEmail: null,
    contactUrl: 'https://mariestopes.org.gh/contact-us/',
    verificationSource: 'https://mariestopes.org.gh/contact-us/',
    verifiedAt: ghanaDirectoryCheckedAt,
    verificationMethod: 'OFFICIAL_PUBLICATION',
    synthetic: false,
    referralInstructions:
      'Use the published contact centre or official contact page to ask about services and a suitable location. The provider notes that callers may wait during busy periods. Ask about confidentiality, costs, consent requirements, and what will be recorded. SafeHer has no referral agreement with this provider and does not send your information.',
  },
  {
    id: 'safeher-gh-ppag',
    name: 'Planned Parenthood Association of Ghana (PPAG)',
    description:
      'Sexual and reproductive health services and information. PPAG is listed by the International Planned Parenthood Federation; the listed number is an office contact for enquiries.',
    region: 'Ghana-wide enquiries',
    category: 'Reproductive healthcare',
    serviceCategories: [],
    accessMethod: 'Telephone',
    accessMethods: ['Telephone', 'Online'],
    eligibility:
      'Contact PPAG to confirm the relevant service centre, eligibility, fees, age-related consent requirements, and confidentiality. This listing does not guarantee a particular service or appointment.',
    hours: null,
    contactPhone: '+233302310369',
    contactEmail: null,
    contactUrl: 'https://www.ppag-gh.org/',
    verificationSource: 'https://www.ippf.org/about-us/member-associations/ghana',
    verifiedAt: ghanaDirectoryCheckedAt,
    verificationMethod: 'OFFICIAL_PUBLICATION',
    synthetic: false,
    referralInstructions:
      'Use the office number or PPAG website to ask for the appropriate service centre. The number is an enquiry contact, not a verified emergency line. Confirm current opening hours and eligibility before visiting. No details are sent by SafeHer and no partnership is implied.',
  },
  {
    id: 'safeher-gh-csa',
    name: 'Cyber Security Authority — CERT-GH',
    description:
      'Official Ghanaian contact points for cybersecurity and cybercrime reports, including online threats. Reports may be triaged and investigated by CERT-GH.',
    region: 'Ghana-wide enquiries',
    category: 'Digital safety',
    serviceCategories: [],
    accessMethod: 'Telephone',
    accessMethods: ['Telephone', 'Online'],
    eligibility:
      'For cybersecurity or cybercrime reporting in Ghana. This is an official reporting channel, not a private counselling service. The website form requests identifying information; consider what you want to share.',
    hours: null,
    contactPhone: '292',
    contactEmail: 'report@csa.gov.gh',
    contactUrl: 'https://www.csa.gov.gh/report',
    verificationSource: 'https://www.csa.gov.gh/report',
    verifiedAt: ghanaDirectoryCheckedAt,
    verificationMethod: 'OFFICIAL_PUBLICATION',
    synthetic: false,
    referralInstructions:
      'Review the official incident-reporting page before deciding whether to call 292 or submit a report yourself. The form asks for contact and incident information and sends it to CERT-GH for triage and investigation. Ask how your information will be handled. SafeHer does not submit reports or evidence on your behalf.',
  },
  {
    id: 'safeher-gh-helpline-of-hope',
    name: 'Helpline of Hope — Ministry of Gender, Children and Social Protection',
    description:
      'A government service for social-protection enquiries and complaints, including child abuse, trafficking, sexual harassment, and other issues affecting vulnerable people.',
    region: 'Ghana-wide enquiries',
    category: 'Child protection',
    serviceCategories: ['GBV response', 'Community support'],
    accessMethod: 'Telephone',
    accessMethods: ['Telephone', 'Online'],
    eligibility:
      'The Ministry describes support for citizens and vulnerable people. Ask about the appropriate service, safeguarding/reporting duties, confidentiality, and language availability. Case details may be recorded and directed to other organisations.',
    hours: null,
    contactPhone: '0800800800',
    contactEmail: null,
    contactUrl: 'https://www.mogcsp.gov.gh/projects/swces/',
    verificationSource: 'https://www.mogcsp.gov.gh/projects/swces/',
    verifiedAt: ghanaDirectoryCheckedAt,
    verificationMethod: 'OFFICIAL_PUBLICATION',
    synthetic: false,
    referralInstructions:
      'The Ministry publishes 0800800800 and an alternative number, 0800900900. Call only if it is safe for you. Its published process records cases and channels them to relevant programmes or organisations, so ask about this before sharing details. SafeHer has not confirmed response times and does not transmit referrals.',
  },
];
