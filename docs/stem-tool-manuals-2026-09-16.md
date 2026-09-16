# Five STEM tool manuals (2026-09-16)

Aaron asked for five hand-written STEM tool manuals, teacher-facing, ~300-500 lines each.

## Which five, and why

Chosen for documentation depth and subject spread — five different STEM Lab areas:

| Manual | Area | Why this one |
|---|---|---|
| Coaster Lab | Physics & Chemistry | 17 prior review docs in `docs/`, and its internals were verified directly this session and last. |
| Water Cycle | Earth & Space Science | Five modes, six processes, a real experiment surface with 5 sliders and 6 presets. |
| EvoLab | Life Science & Genetics | 17 modules, 4 paths, 41 challenges, a 5-day curriculum guide and standards crosswalk already in the tool. |
| Solar System | Earth & Space Science | Six guided journeys, three lenses, and unusually explicit claims about what is evidence vs interpretation. |
| Kitchen Lab | Human Body, Health & Safety | 9 sections, USDA temperatures verified against the source, and it serves life-skills/FCS classrooms that have no other tool. |

## How they were written accurately

**Not from the tool descriptions.** Each tool was mounted in a real browser via `GlHarness`
and its rendered UI read out — tabs, buttons, select options, headings, sliders, and the
full visible text (`scratch/ui-<tool>.json`). Every control, mode name, module name,
preset and temperature in these manuals is a string the tool actually renders.

Two things this caught:

- **Water Cycle, EvoLab, Kitchen Lab and Solar System build their UI in JavaScript**, so a
  source-level HTML dump found nothing. Only a live mount shows the interface.
- **EvoLab renders no canvas at startup**, so the harness's default canvas wait timed out
  and read like a tool failure. It is not; `mount(..., { expectCanvas: false })` reads it.

**A false alarm worth recording.** Solar System's rendered text showed
`stem.solar_sys.mercury` instead of "Mercury" for all nine worlds. That is a *harness*
artifact, not a defect: the harness stubs `t: (k, fb) => fb || k` and the tool calls
`t('stem.solar_sys.mercury')` with no fallback, while the real app loads `ui_strings.js`
where all 44 of those keys are registered. Verified before reporting it.

## Structure (all five)

Nine sections each: the first ten minutes · the tool's own organising idea · a tour of the
real controls · three classroom walkthroughs with grade bands · the teacher/assessment
surfaces · what the tool deliberately does not do · accessibility and motion · a
troubleshooting FAQ written as real teacher questions.

Each carries the honest limits rather than marketing: Coaster Lab's preflight coach is
"not structural approval"; Kitchen Lab cannot teach knife handling or how hot a pan is;
Solar System's portraits are interpretive and its interiors are labelled models; EvoLab's
progress lives on the device so a different machine means a fresh start.

## Wiring

- `tool-manual.css` — shared, both themes, print styles, 44px targets, and a header
  comment recording that `.btn-primary` on a button-styled `<a>` is load-bearing.
- **Landing pages now link their manual** — `build_tool_pages.cjs` detects
  `manual-<slug>.html` on disk, so the "Is there a manual? Not yet." section becomes a
  "Teacher manual" section with a link. 5 of 125 pages link one; 120 still say not yet.
- **`manuals.html` has a new "STEM tool manuals" section** with 5 cards in the site's own
  card pattern, including `data-keywords` so the page's existing search finds them
  (verified: searching "coaster" narrows to exactly 1 card).
- **`sitemap.xml`**: 180 URLs, 5 manuals, 0 duplicates, parses as XML.

**One naming fix:** the manual was first written as `manual-evolab.html`, but EvoLab's
deep-link slug is `evo-lab`, so the landing page could not find it. Renamed to
`manual-evo-lab.html` — the convention is `manual-<slug>.html` where slug comes from
`_redirects`, never from the tool id.

## Verification

| Check | Result |
|---|---|
| All five in Chromium | correct titles/h1, button white-on-indigo, 9 working TOC anchors each, **0 broken TOC links**, no page errors |
| Horizontal scroll, desktop + phone (390px) | none, all five |
| Landing page → manual navigation | clicks through to the right `<h1>` |
| manuals.html | 5 cards present, page search finds them |
| Sitemap | 180 locs, parses, no dupes |
| 5 generator gates + `audit_promo_site` | all green (10 pages, 0/0) |
| Length | 297–368 lines each, 1,573 total |

Shots: `scratch/promo-shots/manual-*-desktop.png`, `manuals-stem-section.png`.

**Not committed, not pushed.** Pages serves `main`, so a push publishes these plus the 125
landing pages from yesterday's pass.

## What is left

120 tools still have no manual, and that remains 120 hand-written documents — see
`docs/tool-landing-pages-2026-09-16.md` for why no generator can produce them. The next
cheapest win is still the **16 tools with no description at all**, which are thin in the
tool finder and directory today and cannot get a landing page until someone writes one
sentence each. `node dev-tools/build_tool_pages.cjs --list` names them.
