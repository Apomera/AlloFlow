# X2 report — documents/printing e2e (wave 3)

**Status: journeys 1–2 pinned (two consecutive green runs each); 3–4 recorded remainder.**
2026-08-17 · run inline by the coordinator.

## Shipped specs

**`tests/e2e/45-print-stays-light.spec.ts`** — the CLASS fix pinned, not one tool. Real built
`games_module.js` + the SHIPPED `app/static/css/main.*.css` + the generated docsuite remap read
from `app_styles_source.jsx`, reproducing the app's real nesting (`theme-dark` ancestor,
`allo-docsuite` main — W2 7b's harness pattern). Under `emulateMedia print` with app-dark:
crossword letter squares luminance > 0.85 bg / < 0.35 ink, a plain `.section` card the same
(the generator-level rule), and the modal header `display:none`. Self-contained by design —
the claim is about CSS the repo ships, so no CDN dependency. Runtimes ~1s.

**`tests/e2e/46-cloze-worksheet-rendered.spec.ts`** — the worksheet at the RENDERED level: the
real built `doc_pipeline_module.js` driven through the same injected-state seam the unit suite
uses, then the export HTML actually loaded in the browser. Asserts what a student would see:
3 blanks with visible >30px underlines, word bank in passage language ("célula (cell)"),
the answer-key section present with entries in blank order, no `data-ka-readable` on the cloze
passage, and the blanked words genuinely absent from the student prose.

## Findings while writing (test-harness lessons, no product bugs)

- Inline `<script>${module}</script>` truncates: the pipeline source contains `</script>`
  sequences — `addScriptTag` is the correct loader (noted in the spec for the next person).
- The answer key renders its numbering as list markers, invisible to innerText — the spec
  asserts entry order, not a literal "1" (the unit test pins the `>1</span>` markup form).

## Honest remainder (journeys 3–4)

- **Handout reader tools** (A+ ceiling, overflow walk at 1280/390, 9 offline fonts, zero
  network requests) and **annotation anchoring drift ≤ 8px** need a full generated HTML
  export with the reader-tools chrome as a fixture. W2's measurements stand as the evidence;
  building the export fixture generator is the first task of the next documents lane. Not
  half-pinned tonight rather than weakly pinned.
