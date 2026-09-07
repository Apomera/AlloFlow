# Story Forge improvements implemented

September 7, 2026. Changes are local to the workspace; the Story Forge module has been rebuilt and synchronized to `desktop/web-app/public`. No deployment was performed.

**Writing preservation and AI plans**

- Generated scene/panel plans now require a preview and an explicit Apply action.
- Response validation rejects empty, malformed, oversized, and invalid plan sections.
- Applying a plan saves a project checkpoint first, preserves every authored section, and matches existing sections by ID. It changes planning prompts rather than replacing student text, dialogue, directions, or artwork.
- Late responses and proposals for an edited draft are discarded with an explanation. Loading state is released even when the result is stale.
- Missing AI capabilities are explained, with manual writing and self-check available.

**Review, comics, and recovery**

- Skipping self-assessment retains an explicit Return to self-check action. Get Feedback is disabled when its AI capability is unavailable.
- Missing review is now a required publishing item in the shared readiness report, removing the contradictory Ready to export message.
- Main grading, vocabulary coverage, word counts, and section statistics use authored comic captions, speech, thoughts, and sound effects. Scaffold prompts do not count as authored writing.
- Dialogue-only comic drafts can progress and restore to their saved, reviewed phase.
- Fixed an additional browser-discovered crash: comic export proof referenced an undefined gutter side after a speech bubble was entered. Gutter checks now calculate the value for each page.

**UI and accessibility**

- Mobile uses a compact step selector with an expandable checklist and a compact footer.
- At 390 × 844, the Draft work region increased from 329 to 602 pixels, an 83% increase. Review increased from 313 to 586 pixels.
- Story/Comic selection appears before title and genre. Genre is collapsible and selection state is exposed to assistive technology.
- Focus on writing is available beside the main Draft controls. The duplicated writing-view picker now exposes its pressed state.
- Writing analytics and frequency information are grouped in a disclosure.
- Reading complexity is labeled as approximate, restricted to English drafts of at least 100 words, and separated from judgments of writing quality. English word-frequency heuristics are also restricted to English.
- Output guidance distinguishes a finished story from an editable backup.
- Corrected low-contrast labels, the Revise Draft button, and frequency counts identified in the comic browser check.
- New copy uses the host's English fallback translation namespace in both English string files.

**Validation**

- Full Story Forge suite: **144 passed, 0 failed, 0 skipped** across 20 test files. Nine new regression cases cover plan validation/preservation, shared comic content, required review, gutter proof, and dialogue-only restoration.
- Fixed the existing Windows newline-sensitive assertions and updated the lettering fixture to record a completed review.
- Browser verification passes for all six prose phases, skipped-review recovery without AI, short-response preservation, and edits made during an outstanding AI request.
- Comic browser verification passes for speech and thought content in grading prompts, bubble-only vocabulary recognition, and review progression.
- No JavaScript errors in those browser flows. Automated axe checks reported no violations on the tested comic Review surface after final contrast corrections.
- Generated root and desktop modules match. Diff whitespace checks pass.

The browser checks use synthetic content, stubbed AI responses, repository styling, and an isolated component. They do not certify the full host shell, real AI services, microphone hardware, physical-device keyboards, or all exported file formats. The screenshot harness omits the host icon provider.

The original audit's longer-term project library, stable identity migration, expanded eight-section limit, and large architectural extraction remain future work. Existing storage identity and project format were retained to avoid an unplanned migration of saved student projects.

**Evidence:** `after/final-tests.json`, `after/functional-results.json`, `after/initial-results.json`, and `after/comic-results.json`. Reproducible browser checks: `verify.cjs` and `verify-comic.cjs`. The `after/` folder contains final desktop and mobile screenshots.
