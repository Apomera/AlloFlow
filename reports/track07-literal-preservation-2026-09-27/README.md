# Track 07: literal vocabulary preservation

Fixed two reproduced contract gaps and strengthened fence boundaries.

- Comment-like text inside a displayed inline code span is now kept literal during validation. Previously, removing that text could invent a match for a phrase the learner never saw. The same scanner is used by source readiness, Preview, Apply and pane-completeness checks.
- Fenced payloads stay excluded until a matching fence of sufficient length closes. Comments inside payloads cannot hide surrounding reading; shorter inner fences cannot expose payload vocabulary. Unclosed syntax remains unverified and retains the source.
- Feedback fetches its translated template before inserting values once, using only explicit parameters. Literal terms such as {terms}, {constructor}, {__proto__} and dollar replacement symbols remain unchanged.

## Evidence and scope

Current-source baseline: a63e347b7d193cbc95b5fc3a9fec844322f1f455. The existing isolated worktree was reused and refreshed from shared helper source. No additional nonempty AGENTS.md applied. The initial 16-case reproduction had 10 failures and six existing protections passing. After fixes, 224 tests across 10 files passed, including 30 new literal/boundary cases. Six new and 29 existing Chromium scenarios passed with network blocked and fixture-only state. Browser checks were repeated against reader module 8f2dd725 after concurrent reader work moved the first captured baseline.

The shared helpers were rebuilt and byte-compared with the validated isolated outputs. Both root/public module pairs match. Only their two loader pins were changed in each host; current reader/compiler/catalog work was preserved. Track 05 commit acknowledgement and stale-request controls remain covered. The reader owner released its current write window. No application packaging, push or deployment was performed. These results do not establish deployed behavior or real screen-reader/provider behavior.

Relevant implementation: text_pipeline_helpers_source.jsx codeSpan/readingBody, generation_helpers_source.jsx preservedVocabulary.feedback. Regression entry points: tests/preserved_vocabulary_literal_text.test.js and tests/track07-literal-browser.cjs. The browser fixture uses the assembled reader and exercises rejected source, Preview and Apply, successful literal preservation, fence exclusion and Spanish feedback.

Detailed local evidence: integration.json, track07-literal-before.json, track07-literal-tests.json, track07-literal-browser-results.json, track07-completeness-browser-results.json and track07-literal.patch. The portable counts and fingerprints are in validation-summary.json. Normal Git hooks are required for the scoped commit; the commit receipt is recorded locally and in the chat.
