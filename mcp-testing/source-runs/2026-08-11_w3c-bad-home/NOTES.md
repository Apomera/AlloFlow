# Source run — W3C BAD "CityLights" inaccessible home page (2026-08-11)

First real-world run of the source-remediation pathway, on the best-calibrated
target available: the W3C WAI **Before/After Demonstration**
(https://www.w3.org/WAI/demos/bad/), a page W3C built to be inaccessible, with
W3C's own accessible rebuild as published ground truth. Fetched copies live in
`mcp-testing/source-corpus/w3c-bad/` (gitignored; MANIFEST.json carries URLs +
SHA-256). This run drove the skill **0.1.0 → 0.2.0** (occurrence-indexed
patches, byte-exact application, the ported two-model verification) and went
through THREE verification-driven plan revisions. That iteration record is the
point, not a blemish.

## Final scoreboard (plan v4: 56 patches, 14 occurrence-indexed)

| Measure | Before | After (56 surgical patches) | W3C's official rebuild |
| --- | --- | --- | --- |
| axe violation classes | 7 | **1** (region ×12, disclosed) | 2 (landmark-one-main, region ×14) |
| Images without alt | 33 | **0** | 0 |
| Keyboard-unreachable interactive elements | **42 of 56** | **0** | 0 |
| Unlabeled controls / `lang` | 1 / absent | 0 / `en` | 0 / `en` |
| Wrong pre-existing alt (hotline number) | ships to users | **corrected** | (W3C's rebuild rewrote the section) |
| Compare verdict | — | `improved`, 0 introduced, text changes declared | reference only |

## The verification loop's three rounds (the headline of this run)

- **Round 1 (11 discrepancy-class items caught as 6 notes): the fresh reader
  rejected five of six meaningful image descriptions.** The plan author (the
  AI) had written alt text from FILENAMES and story context without viewing
  pixels: a concert stage labeled "Penguins at the city zoo", a white crocus
  labeled "A green city park", a man in a cardboard sun visor labeled "A panda
  eating bamboo", a cased violin labeled as being played, and a jar invented
  for a brain photo. Exit 9 stamped (`verification-report-round1.json`,
  `verify-worksheet-round1.json` preserved). All six re-authored from direct
  viewing.
- **Round 2 (56/57): the completeness sweep found a barrier NOBODY had
  patched** — the hotline image's pre-existing alt tells screen-reader users
  "1234 56789" while the pixels show "(1) 269 C-H-O-K-E": different phone
  numbers for different users on a line whose prose says "call the number
  below". Also caught: `alt="bullet"` noise ×2, and 389 phantom CR bytes —
  the engine's apply was rewriting LF files as CRLF (**E-SRC-3**, fixed:
  `newline=''` everywhere, bytes now round-trip).
- **Round 3:** see the appended result below.

The pattern to keep: **every round's discrepancies were real** — fabricated
alt text is the single most dangerous defect class in accessibility
remediation, and the two-model rule caught it on its first outing in the code
pathway, exactly as it caught engine gaps in the documents pathway.

## Engine changes this run motivated (skill 0.2.0)

- **E-SRC-1** occurrence-indexed patches: byte-identical repeated markup
  (7 spacer GIFs etc.) is targetable by 1-based occurrence; all positions
  located in the ORIGINAL bound bytes and applied by descending span, so
  indices never shift and overlaps are refused. (v1 REFUSED these 14 nodes
  with a disclosed note; that refusal is preserved in git history as the
  motivating record.)
- **E-SRC-2** audit violations carry node `targets` (a count you cannot
  locate from is homework, not evidence).
- **E-SRC-3** byte-exact application (line endings preserved).
- **verify-init / verify-check ported** from the documents pathway: worksheet
  per patch (+4 globals: behavior, completeness, review notes, keyboard),
  sha256 binding of plan + both audits, attestation required, exit 9 on
  discrepancies.

## Honest remainders

- `region` ×12: the table-based chrome outside landmarks needs structural
  rework beyond surgical scope (disclosed in review notes; W3C's own rebuild
  retains region ×14).
- The QUICKMENU select still auto-navigates on change (3.2.2): a behavior
  change that belongs to the page owner.
- nav_*.gif images are not in the local corpus; their four alt texts were
  verified from href/id/context, not pixels, and the worksheets say so.
