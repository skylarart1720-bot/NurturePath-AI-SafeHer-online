# Know Your Rights: review and walkthrough

## Walkthrough

1. Open /learn. Choose “Start with this lesson” to open consent, or use Search lessons and the topic buttons together.
2. Read “What to know” and open the source reference. Check the displayed version, review scope and expiry.
3. In “Check your understanding”, choose “No. Ask separately before sharing”, then Check answer. The explanation confirms that permission is specific.
4. Guests receive completion feedback without persistent quiz progress. A signed-in learner can save completion to their optional account.
5. Choose Save for offline reading. Return to the learning hub and open the lesson under Saved resources. Anyone using the browser may see saved copies. Use Remove all downloads when finished on a shared device.
6. Use Keep learning to open a related published lesson, or Find support to explore organisations. Search terms are kept in component state, not put in the URL or saved to browser storage.

## Professional review handoff

The interface is an educational preview. This change does not grant clinical, legal or safeguarding approval. Existing publication and review expiry controls continue to apply.

Generate the lesson worksheets with `npx tsx scripts/prepare-learning-review.ts`. The generated packet includes repository wording, sources, intended quiz answers and a digest per lesson. Treat it as a working draft until reconciled against the exact database version.

For each lesson, assign a qualified reviewer for the subject: adolescent health, Ghanaian legal/protection context, safeguarding and youth accessibility as applicable. Record their name, qualifications, organisation, conflicts, evidence reference, decision, required changes and review dates. Leave fields unassigned until real evidence exists.

Review the source itself for support for every factual statement. Check whether the WHO/UNICEF reference is sufficiently specific for the paragraph and quiz. Record the exact supporting section and access date; replace broad references when needed. Check Ghana applicability, language, age appropriateness, confidentiality limits and support guidance. Do not introduce legal or medical claims without the relevant qualified reviewer.

Use consenting adult reviewers for a comprehension and accessibility walkthrough before any youth pilot; assess keyboard navigation, screen readers, small screens, slow connections and shared-device privacy. Record observed issues and resulting changes.

Apply accepted edits through /dashboard/content using the authorised reviewer account. Reconcile the final version against the signed review record. Follow the content version and review process in [operations](SAFEHER-OPERATIONS.md#content-and-translations); edits and restores require fresh review. Preserve evidence outside public pages in the operator-approved restricted system. Never place personal disclosures in the packet.

Only record pilot approval after the applicable qualified reviewers and release owner have supplied evidence for that exact version. Do not change demo flags merely to change the public label. Recheck expiry, withdrawal, offline reconciliation, and the [launch register](SAFEHER-LAUNCH-REGISTER.md) before publishing for real users.

## Release verification

Verify combined search/filter, no-results recovery, consent quiz retry and completion, saved resources, source/review metadata, related lessons, keyboard focus and mobile overflow. Confirm approved and unexpired lessons are the only public content and that no new guest progress is persisted. Run lint, typecheck and the relevant unit and browser checks. Record actual outcomes with the release evidence.
