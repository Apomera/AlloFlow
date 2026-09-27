# Document research and web search fixes

Completed and verified locally on September 26, 2026.

The original screenshot mixed up saved documents and included documents. The shared Lumen library could also feed app-generated reading material into research. The research helper now filters those reading entries from a copy of the project, preserving the underlying readings and notes. Saved and included counts are displayed separately, and document controls occupy their own card.

Document retrieval starts independently of web research and has a bounded timeout. Document references remain separate from web citation numbers. Imports and document mutations are serialized, stale opening reads cannot overwrite newer changes, and failed saves do not appear successful.

The continuation also fixed Quick Start advancing during an import, a late opening count hiding an imported file, and a missing FileText icon binding that crashed Quick Start when its document toggle appeared. The quotation comparison now describes only matches against document passages; it does not label unmatched web quotations or dialogue as possible inventions.

Validation:

- The resumed regression run passed 154 tests across 14 files (`tests.json`).
- After the final changes, all 52 targeted follow-up tests passed across five files (`final-followup-tests.json`), including the new Quick Start import and mixed-quotation tests.
- The isolated Chromium check passed with the real TXT extraction adapter and local storage: import and retrieval, Include/Exclude, independent document/web toggles, removal confirmation, and preservation of the hidden study reading (`browser-result.json`). No page errors occurred.
- Changed module and source mirrors matched byte-for-byte; `git diff --check` passed.

The tests use synthetic documents and mocked AI responses. No live AI-provider request or deployment was performed in this continuation. Generated app modules were rebuilt and synchronized locally.

The browser check is reproducible with `node reports/own-source-research-fix-2026-09-25/browser-check.cjs` from the repository root. `excluded-document.png` shows the corrected saved-versus-included state.
