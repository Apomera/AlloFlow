# Pass 5: optional outside evidence and live evaluation preparation

Added **Find outside evidence** to Explore, reusing the existing search provider. Learners submit a focused query, inspect links and snippets, and explicitly add a reference to an evidence row marked **Needs checking**. Drafts, lesson facts, and teacher review status remain under their existing ownership rules.

The complete rationale, implementation boundaries, live search findings, and AI evaluation instructions are in [SEARCH-AND-EVALUATION.md](SEARCH-AND-EVALUATION.md).

## Validation

- **71/71 tests passed across six suites**: search behavior and evaluation preparation, learner interactions, generation, exports, backup recovery, and the existing search-query contract. See [pass5-tests-recheck.json](pass5-tests-recheck.json).
- The first run encountered two test timeouts and three Windows worker-start failures. The serial thread-worker recheck passed all six suites. The original record remains in `pass5-tests.json`.
- Desktop **1280px**, mobile **390px**, and narrow mobile **320px** browser checks passed. Zero page errors, zero horizontal overflow, and zero axe violations in the three searched states. Source selection sent no AI request, preserved the draft and lesson, and focused the new blank claim.
- A real browser download and restore preserved the selected URL, the **Needs checking** status, and learner writing. Offline search controls were disabled with an explanation.
- Mobile search layout visually inspected. Screenshots: `pass5-search-{1280,390,320}.png` and `pass5-reference-{1280,390,320}.png`. Browser evidence: [pass5-browser-results.json](pass5-browser-results.json).
- One live query through the existing production search provider returned three results via Serper. This was a real retrieval check, separate from the preview’s authored search fixture.
- Ten live-AI cases prepared from production prompts. **Zero model calls**: provider readiness reported `missing-credential`, and the checked local model endpoints were unreachable. All semantic reviews remain pending.

Preview: [current-preview.html](current-preview.html?pass=5). The preview explicitly uses an authored scenario, mocked AI/search, and no real learner data. Changes are local; this pass does not deploy the application.
