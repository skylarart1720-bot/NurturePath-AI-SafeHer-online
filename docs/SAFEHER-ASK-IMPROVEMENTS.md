# Ask SafeHer improvements

Ask SafeHer matches everyday phrases and common word forms against published learning lessons. It excludes broad words such as “help” or “no” from keyword-only matches, gives matched phrases more weight, and returns at most two relevant lessons. Answers remain exact paragraphs from those lessons. Existing urgent-support and restricted-request checks run before retrieval.

The response distinguishes `matched` learning content, `clarify` for questions without a supported topic, `unavailable` when no learning corpus can load, and `guidance` for static safety/boundary responses. Database outages do not become claims that a user's topic is unsupported.

Suggested follow-up buttons send complete, standalone questions. Suggestions are limited to topics present in the available corpus and are suppressed for unavailable and safety responses. This release does not add conversation history or inferred context between requests. Clear this answer removes the displayed answer and the retry question from page memory.

Matched answers can include up to three related support organisations selected from the hosted directory. Entries must be real, published, source-checked, current, and relevant to the matched topic's service categories. Only public provider names, categories, IDs and contact-page links are returned. A directory lookup failure leaves the sourced answer available and offers the directory page as a next step. External links open in the same tab and do not include the user's question.

Questions are not saved in application database records. No external model is enabled by this change; the existing reviewed-gateway controls remain in place. Feedback, saved chats, audio input, and translated answers are outside this release.

Verification covers paraphrases, unsupported questions, absent content, safety precedence, suggestions restricted to available lessons, exclusion of synthetic/expired contacts, contact lookup failure, desktop/mobile follow-up and retry flows, focus, same-tab links, and automated accessibility checks.
