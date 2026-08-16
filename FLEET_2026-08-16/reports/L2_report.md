# Lane 2 — Dark mode and the contrast bug class

**Lane:** L2 · **Issues:** D1, D2, D3 (+ D3b, the generator fix) · **Status:** complete,
**one hand-off step pending** — see "The pending apply" at the end.

---

## The root cause, stated once

There are **two** independent mechanisms, and Aaron's two named panels were hit by both at once.

### Mechanism 1 — `dark:` follows the operating system, not the app

AlloFlow's theme is an explicit three-way app setting (`light` / `dark` / `contrast`), applied
as a class on a `<div>` **inside** the React tree:

- `AlloFlowANTI.txt:45291` — ``className={`... theme-${theme} ...`}``

Tailwind's `dark:` variant is a different mechanism. `desktop/web-app/tailwind.config.js`
declares no `darkMode` key, so Tailwind 3.4.19 falls back to its default strategy, `media`.
Every `dark:` utility compiles to `@media (prefers-color-scheme: dark)` and tracks the
**user's operating system**.

Verified against the shipped stylesheet, not inferred:

```
$ grep -c "prefers-color-scheme" app/static/css/main.d46f2539.css
1
$ grep -o "\.dark [^{]*{" app/static/css/main.d46f2539.css | head -5
(no output)
```

One `@media (prefers-color-scheme:dark)` block, 10,384 bytes, holding every `dark:*` utility
in the build. Zero `.dark` class rules. So:

| App theme | OS preference | `dark:` utilities | Result |
|---|---|---|---|
| dark | dark | active | looks fine — **by coincidence** |
| dark | light | **inert** | `bg-white dark:bg-slate-800` stays white under `text-white` → **invisible** |
| light | dark | **active** | the same class goes dark under `text-slate-800` → **invisible** |
| light | light | inert | fine |

This is the answer to "a lot of those dropdown menus seem to be impacted, although some are
fine." The fine ones branch in **JavaScript** on the `theme` prop
(`theme === 'light' ? 'bg-white text-slate-800' : 'bg-slate-800 text-white'`). The broken ones
branch in **CSS** via `dark:`. Same file, same panel, two mechanisms, one of which cannot see
the app's theme. It also explains why this read as intermittent to earlier passes: the outcome
depends on the tester's OS setting, which nobody records in a bug report.

### Mechanism 2 — portalled surfaces escape the themed subtree

`view_header_source.jsx:36-44` portals both settings panels to `document.body`:

```js
return window.ReactDOM.createPortal(node, document.body);
```

`theme-${theme}` and the `allo-docsuite` scope class both live on divs inside `#root`
(`AlloFlowANTI.txt:45291` and `:47108`). A portalled panel is a sibling of that entire tree.
The repo's own workaround for mechanism 1 — the generated remap in `app_styles_source.jsx:57+`,
`.theme-dark .allo-docsuite .bg-white { background-color:#1e293b !important }` — is a
descendant selector rooted at `.theme-dark`, so it cannot reach portalled content either.
Both panels lost both theme mechanisms and were left with only the JS ternary on their own
outermost container.

---

## D1 — Typography settings panel invisible in dark mode

**Found.** `view_header_source.jsx`, the `showTextSettings` portal. Container was correctly
theme-branched; every inner surface was not:

| line (pre-fix) | class | effect in app dark mode |
|---|---|---|
| 580 | `bg-white dark:bg-slate-800` on the font `<select>` | stays `#ffffff` |
| 586 | `bg-slate-50 dark:bg-slate-700` on the font preview | stays `#f8fafc` |
| 594 | `bg-slate-50 … dark:bg-slate-700 dark:text-slate-200` bionic toggle | stays `#f8fafc` |
| 597 | `bg-slate-200 … dark:bg-slate-600` icon chip | stays `#e2e8f0` |
| 612, 630, 643, 657 | `bg-slate-100 dark:bg-slate-700` value chips | stay `#f1f5f9` |
| 567, 627 | `border-slate-100 dark:border-slate-700` dividers | stay light |

The panel container sets `text-white`. Result: white text on white surfaces.

**Verified before the fix** — Chromium, real shipped stylesheet, app theme `dark`, OS `light`,
computed styles plus a screenshot (`_dev_scratch/l2/probe_dark.mjs`,
`_dev_scratch/l2/panels-os-light.png`):

```
OS       probe                      color                background            ratio  verdict
light    text.select (font family)  rgb(255, 255, 255)   rgb(255, 255, 255)     1.00   FAIL
light    text.font preview          rgb(255, 255, 255)   rgb(248, 250, 252)     1.04   FAIL
light    text.bionic toggle         rgb(255, 255, 255)   rgb(248, 250, 252)     1.05   FAIL
light    text.size chip             rgb(255, 255, 255)   rgb(241, 245, 249)     1.10   FAIL
dark     text.select (font family)  rgb(255, 255, 255)   rgb(30, 41, 59)       14.63   AA
dark     text.font preview          rgb(255, 255, 255)   rgb(51, 65, 85)        6.04   AA
```

Contrast ratio **1.00** — literally white on white, exactly as Aaron described it — flipping
to 14.63 purely by changing the OS setting with no app change.

**Changed.** Added `_headerPanelSkin(theme)` at `view_header_source.jsx:45-118`: one function
returning the full colour set for `light` / `dark` / `contrast`, resolved in JS. Bound once
per render at `:191`. Every `dark:` utility in both panels replaced with a skin token. The
`contrast` theme now gets the black/yellow the header buttons already use, instead of quietly
falling into the dark branch as it did before.

## D2 — Narrator voice dropdown, and dropdowns generally

**Found.** Same file, the `showVoiceSettings` portal, same mechanism. `view_header_source.jsx:732`
(pre-fix) — the narrator `<select>` carried `bg-slate-50 dark:bg-slate-800`, measured at 1.05
contrast. The Kokoro model note and browser-TTS fallback note (`:779`, `:792`) used
`bg-slate-50 dark:bg-slate-700/50`; the non-English TTS card (`:814-821`) used
`bg-blue-50 dark:bg-blue-900/30` with `text-blue-800 dark:text-blue-200`.

**Checked in both directions, as asked.** The light-mode failure this codebase has hit before
(hardcoded dark + a theme variable → invisible in light) is *the same defect reflected*: with
app theme light and OS dark, `dark:` activates and drives these surfaces dark under
`text-slate-800`. The fix removes the OS dependency entirely rather than patching one
direction, which is why the verification below covers six combinations, not two.

**Changed.** All 32 `dark:` utilities removed from `view_header_source.jsx`; the file now has
zero. Container, divider, `<select>`, notes, labels, chips, reset and close controls all read
from `_skin`.

**Verified after the fix** — `_dev_scratch/l2/probe_fixed.mjs`. This lifts the real
`_headerPanelSkin` out of the **built** `view_header_module.js` via `vm`, so the palette under
test is the shipped one and not a hand copy. 15 probes × 3 app themes × 2 OS settings:

```
no FAIL rows in 90 measurements
WORST: 4.75  light/OS-light  tts head  rgb(37, 99, 235) on rgb(239, 246, 255)
```

Every measurement clears WCAG AA (4.5:1), worst case 4.75. Screenshots at
`_dev_scratch/l2/fixed-{light,dark,contrast}.png`; I looked at them.

Contrast **ratio** was matched across themes rather than luminance delta, as instructed:
the dark skin lands 6.0–14.6 and the light skin 4.75–13.9 on the same elements.

**Re-verified after Lane 6 edited the same file.** L6 rebuilt the voice `<select>` on top of
this work (see `CROSS_LANE_REQUESTS.md:26`). Re-ran the probe against their version: still
90/90, still worst-case 4.75, still zero `dark:` utilities.

## D3 — The bug class: scanner and gate

**Built:** `dev-tools/scan_dark_mode_contrast.cjs` (410 lines, heavily commented with the
measurements behind each rule).
**Runner:** `tests/dark_mode_contrast_gate.test.js` — three tests, all passing.
**Baseline:** `dev-tools/dark_mode_contrast_baseline.json` — 402 findings across 58 files.

Scope: every `*_source.jsx` at the repo root, `AlloFlowANTI.txt`, and the `*_module.js` files
with no source pair (so they *are* the source) — 367 files. Excluded with reasons in the
header: `desktop/web-app/**` (generated mirrors), paired `*_module.js` (same), `stem_lab/**`
(its own palette system, already covered by `scan_canvas_var_colors.cjs`), `view_pdf_audit_*`
(owned by a concurrent session).

### Rules, and the measurement behind each

| Rule | What it catches | Evidence |
|---|---|---|
| `DARK-VARIANT` / `DARK-VARIANT-PAIRED` | any `dark:` utility; *PAIRED* when the light-side counterpart sits beside it | the 1.00 measurement above |
| `STATE-LIGHT-BG` | a `hover:`/`focus:`/`active:` light background with **no base `bg-*`** on the element | measured below |
| `HALF-PAIR-FG` | a light foreground with no background, **inside a portal region** | the portal escape above |
| `PORTAL-ESCAPE` | `createPortal(…, document.body)`, resolved through one level of helper indirection | `_headerPortal` |
| `STYLE-LITERAL-VS-VAR` | inline style mixing `#fff`/`#000` with a `var(--…)` colour | the KitchenLab shape |
| `CSS-LITERAL-VS-VAR` | the same mix inside one CSS rule | the KitchenLab shape |
| `DARK-ONLY-DEF` | a colour defined only under `.theme-dark` / `.theme-contrast` / `[data-theme]` with no base rule | — |

Hover, focus, and active states are covered, as required.

**`STATE-LIGHT-BG` earned its precision by measurement, not by guessing.** The generated dark
remap emits `.bg-white`, which does not match the separate class `hover:bg-white`. I tested
five shapes in Chromium against the real stylesheet and the real remap
(`_dev_scratch/l2/probe_hover.mjs`), app theme dark:

```
case                                 rest bg          rest    hover bg          hover  verdict
A base+hover  bg-white hover:bg-slate-100   rgb(30,41,59)   13.35  rgb(30,41,59)     13.35  ok
B hover only  hover:bg-slate-100            transparent     19.17  rgb(241,245,249)   1.00  BROKEN
C hover only  hover:bg-white                transparent     17.03  rgb(255,255,255)   1.23  BROKEN
D base+hover  bg-slate-50 hover:bg-white    rgb(15,23,42)   14.48  rgb(15,23,42)     14.48  ok
E hover only  hover:bg-indigo-50            transparent     19.17  rgb(238,242,255)   1.02  BROKEN
```

Case B is **exactly 1.00**: the remapped light text lands on the un-remapped light hover
surface and the colours are identical. That is "swallows the text", reproduced. Cases A and D
are safe because the remap's `!important` on the *base* background outranks the non-important
hover rule. So the rule fires only when there is no base `bg-*` token — which is why it
reports 341 sites and not the ~800 a naive `hover:bg-white` grep would.

Two further precision decisions, both from measurement:
- **Alpha < 60 excluded.** `bg-white/10` is a translucent sheen the app uses constantly on its
  dark gradient header, not an opaque surface. Not an instance of the bug.
- **Tailwind-utility selectors excluded from `DARK-ONLY-DEF`.** Overriding `.bg-white` under
  `.theme-dark` is what the generated remap *is*. Without this the rule reported all 169 remap
  rules and was pure noise; with it, 13.

`HALF-PAIR-FG` was rewritten mid-build for the same reason: the first version asked "does this
file contain `createPortal`?", which flagged every `text-white` in the 1,500-line header even
though the header bar is an always-dark gradient. It now resolves the actual balanced-paren
span of each portal call and only fires inside one. That took it from 30 findings to 0 real
ones in that file.

### Guarding the premise

Zero findings is this scanner's passing state, and this repo has been burned by a clean scan
over a stubbed surface before. So the gate's third test writes a fixture tree containing one
deliberate instance of **every** rule and asserts the scanner goes red on all of them:

```
=== probe.fixture.jsx  (7 new, 0 baselined)
   DARK-VARIANT-PAIRED   probe.fixture.jsx:4   bg-white dark:bg-slate-800 …
   HALF-PAIR-FG          probe.fixture.jsx:5   text-white … inside a portalled subtree
   STATE-LIGHT-BG        probe.fixture.jsx:6   hover:bg-slate-100 with no base bg-* …
   PORTAL-ESCAPE         probe.fixture.jsx:1   content portalled to document.body …
   STYLE-LITERAL-VS-VAR  probe.fixture.jsx:7   inline style mixes #fff/#000 with var(--…)
   CSS-LITERAL-VS-VAR    probe.fixture.jsx:10  .allo-probe-mix mixes …
   DARK-ONLY-DEF         probe.fixture.jsx:9   .allo-probe-only …
exit=1
```

A second test asserts the total finding count stays above 300, so a broken regex fails loudly
instead of degrading into a silent no-op that would also report "0 new".

### The baseline is by count, not by key

`{ file: { "RULE|token": count } }`. A key-set baseline would let a *second*
`hover:bg-slate-100` be added to a file that already has one — which is exactly how a class
grows to 402. Counts make every added instance fail while leaving the existing ones green.

### It is wired to a runner, and I confirmed it runs

```
$ npx vitest run tests/dark_mode_contrast_gate.test.js --maxWorkers=1
Test Files  1 passed (1)
     Tests  3 passed (3)
  Duration  47.12s
```

`package.json`'s `"test": "vitest run"` picks up `tests/**`, so it runs in the normal suite.
I did not add it to `verify:gate` because `package.json` is outside this lane's ownership —
see "For Aaron" below.

---

## Full findings list

402 findings, 58 files. `node dev-tools/scan_dark_mode_contrast.cjs --all` prints all of them.

| Rule | Count | Disposition |
|---|---|---|
| `STATE-LIGHT-BG` | 341 | baselined; the highest-value one is handed to L1 (below) |
| `DARK-ONLY-DEF` | 13 | baselined — all in `app_styles_source.jsx`, all `.theme-dark .prose` / `.theme-contrast h1` style overrides of base rules that live in Tailwind's own sheet |
| `DARK-VARIANT-PAIRED` | 5 | baselined — 4 in `AlloFlowANTI.txt`, 1 elsewhere |
| `PORTAL-ESCAPE` | 4 | baselined — `view_header_source.jsx:40` (now safe, skinned), `allohaven_module.js:29185/29186`, `accessibility_lab_module.js:3256` |
| `DARK-VARIANT` | 2 | baselined — `AlloFlowANTI.txt:48438`, `:54795` |
| header panel findings | 30 → 0 | **fixed** |

### Things I found and deliberately did not fix, with reasons

1. **`view_glossary_source.jsx:1122` — the glossary row hover (Aaron's G5).** Confirmed and
   measured; filed to L1, who owns the glossary dark-mode fixes, with the mechanism, the
   numbers, and two *disproven* fixes so they do not waste the attempt. See below.

2. **The five `STATE-LIGHT-BG` sites in `view_misc_panels_source.jsx`, which I own**
   (`:628`, `:1041`, `:1154`, `:1344`, `:2244`). I read all five: every one sits inside a
   hard-coded `bg-white` modal or panel that the remap never touches, so the text stays dark
   and the hover stays legible. These are "this surface ignores dark mode", not invisibility.
   Fixing them means either plumbing `theme` into three more components (whose call sites are
   in `AlloFlowANTI.txt`, a locked hot file, mid-fleet) or adding new colour tokens (which
   deepens an existing generated-theme staleness — see item 4). Neither is worth it for a
   legibility problem that does not exist. Recorded, not churned.

3. **The header export menu, `view_header_source.jsx:1210` and its 7 hover items.** A
   hard-coded `bg-white` dropdown with dark accent text. It is one of the "dropdown menus
   impacted" Aaron mentions, but it is *legible* — a light menu in a dark app, not invisible
   text. Reskinning it means picking dark-mode values for six accent families
   (green/indigo/orange/cyan/teal/yellow) and verifying each; that is a visual design pass, not
   a defect fix, and I would rather Aaron decide than guess. Baselined and recorded.

4. **`node dev-tools/gen_docsuite_theme.cjs --check` reports the generated theme CSS in
   `app_styles_source.jsx` is STALE.** Not mine — I made no colour-token change to any
   `view_*` file. It is stale because other lanes edited `view_*_source.jsx` files this run.
   I did **not** regenerate it: doing so would sweep other lanes' in-flight tokens into
   `app_styles_source.jsx`, which I own, and mix their uncommitted work into my file. Whoever
   finishes last should run `node dev-tools/_apply_docsuite_theme.cjs`.

5. **`desktop/web-app/tailwind.config.js` has no `darkMode` key.** This is the root cause and
   a one-line change would fix ~50 remaining `dark:` utilities repo-wide. I did not make it —
   reasoning in `CROSS_LANE_REQUESTS.md`, summarised under "For Aaron".

---

## What the scanner cannot see

Stated plainly, because a gate people over-trust is worse than none.

- **Static text only.** A colour computed at runtime, injected by a third-party control's
  shadow DOM or a UA stylesheet, or assembled from template parts (`` bg-${x}-50 ``) is invisible
  to it.
- **It does not measure contrast.** It reports *mechanisms known to produce* the failure. Every
  contrast number in this report came from Chromium, not from the scanner.
- **`STATE-LIGHT-BG` cannot resolve DOM ancestry, and this is its sharpest limit.** The failure
  needs the remap in play: light text (remapped) on a light hover surface (not remapped).
  Whether it is in play depends on whether the element sits under an `allo-docsuite` ancestor,
  which is runtime ancestry across files. A reported site is therefore either a real
  invisibility (the glossary shape) *or* legible-but-off-theme (item 2 above). The scanner
  flags the mechanism; a human decides which. That is why the rule is baselined rather than
  enforced retroactively.
- **Contrast-theme coverage is thinner.** `theme-contrast` has global `!important` overrides
  that a static read cannot fully simulate. I verified the two fixed panels in `contrast` by
  rendering them (all 13.71:1), but the scanner does not reason about that theme.
- **The baseline was captured mid-fleet**, in a live shared tree, so it already contains other
  lanes' in-flight edits. If the gate goes red on a later lane's work, that is the gate doing
  its job.

---

## Verification log

| Command / observation | Result |
|---|---|
| `node --check` on `view_header_module.js`, `dev-tools/scan_dark_mode_contrast.cjs` | pass |
| `node _build_view_header_module.js` | built, 1387 lines |
| `diff view_header_module.js desktop/web-app/public/view_header_module.js` | identical (mirror OK) |
| `node dev-tools/scan_dark_mode_contrast.cjs --quiet` | exit 0. Baselined at 402; a later run in the live tree read 400 as another lane removed two sites. The gate fails only on *growth*, so a count that drops is green by design. |
| `npx vitest run tests/dark_mode_contrast_gate.test.js` | 3/3 pass |
| `npx vitest run tests/header_popovers_a11y.test.js tests/header_controls_a11y.test.js tests/header_compact.test.js` | 25/25 pass |
| `npx vitest run tests/view_header_reflow_a11y.test.js` | 3 fail — **pre-existing**, see below |
| `node _dev_scratch/l2/probe_fixed.mjs` | 90 measurements, 0 FAIL, worst 4.75 |
| Screenshots `_dev_scratch/l2/panels-os-light.png` (before), `fixed-{light,dark,contrast}.png` (after) | rendered and inspected |
| `npm run verify:gate` | fails at `check_cmd_i18n` — **not mine**, see below |

**`view_header_reflow_a11y.test.js` (3 failures) is pre-existing, not mine.** The test anchors
on the literal string `<div className="flex flex-wrap items-center gap-2">`; that string is
absent from `git show HEAD:view_header_source.jsx` as well as from the working copy, so the
assertions fail identically at HEAD. Part of the ~98 tests already red before this fleet.

**`npm run verify:gate` fails at `check_cmd_i18n`**, reporting 21 `cmd.*` keys new in source
and missing from the manifest (`cmd.describe_current_media*`, `cmd.open_learning_web_explorer*`,
`cmd.read_media_descriptions*`, …). Those come from `allo_commands_source.jsx`, which Lane 7 is
editing. I touched no command keys. Per RULES section 4 I reported it rather than fixing or
bypassing it — filed to L7. It is the gate's *first* failure, so it currently masks every
check after it for all lanes.

---

## Files changed

| File | Change |
|---|---|
| `view_header_source.jsx` | `_headerPanelSkin(theme)` added at `:45-118`; bound at `:191`; all 32 `dark:` utilities in both portalled panels replaced with skin tokens |
| `view_header_module.js` + `desktop/web-app/public/view_header_module.js` | rebuilt from source (builder mirrors automatically) |
| `dev-tools/scan_dark_mode_contrast.cjs` | **new** — the scanner |
| `dev-tools/dark_mode_contrast_baseline.json` | **new** — 402 findings, 58 files, by count |
| `tests/dark_mode_contrast_gate.test.js` | **new** — the runner, incl. the negative control |
| `FLEET_2026-08-16/CROSS_LANE_REQUESTS.md` | 5 entries appended |
| `_dev_scratch/l2/*` | probe harnesses + screenshots (gitignored scratch) |

`app_styles_source.jsx` and `view_misc_panels_source.jsx`, both mine, are **unchanged** —
reasons in items 2 and 4 above. No file was written with the Write tool; no builds, commits,
pushes, or deploys were run. No lock was needed: nothing I changed is a hot file.

---

## For Aaron

**A decision I made on your behalf.** The `contrast` theme previously fell through to the dark
skin in these two panels. I gave it a real black/yellow branch matching the header buttons
beside it. Measured 13.71:1 throughout. If you would rather it stay slate-dark, it is one
branch in `_headerPanelSkin`.

**The one call I did not make, and why.** `desktop/web-app/tailwind.config.js` sets no
`darkMode`. Setting `darkMode: ['class', '.theme-dark']` would make every remaining `dark:`
utility in the repo finally track your theme toggle instead of the user's OS. I left it alone
for three reasons, and I think all three hold:

1. The file is outside every lane's ownership in this fleet.
2. It would **not** have fixed the two panels you reported. `.theme-dark` sits on a div inside
   `#root`, and both panels portal to `document.body`, outside it. The JS skin was needed
   regardless.
3. Gemini Canvas, which you treat as the primary environment, does not use this config at all,
   so a config-only fix would work in the deployed web app and not in Canvas.

It is still worth doing as cleanup, on top of the JS fix rather than instead of it. Your call.

**Two follow-ups worth a decision:**

- The header **export menu** is a hard-coded white dropdown in dark mode (legible, but
  off-theme). Reskinning it needs dark values chosen for six accent families. Say the word and
  it is a contained job.
- **`npm run verify:gate` is currently red at its first check** because of Lane 7's new command
  keys. Until that is re-extracted, no lane can get a clean gate run.

**What is now protected.** `tests/dark_mode_contrast_gate.test.js` runs in the normal `npm test`
suite. You may want `node dev-tools/scan_dark_mode_contrast.cjs --quiet` added to the
`verify:gate` chain in `package.json` as well; I did not edit `package.json` because it is
outside this lane. It takes about 4 seconds.

---

# D3b — Fixing the class at the generator (second pass)

After the report above was written, Lane 1 filed `[L1 -> L2]` confirming the same mechanism
from their side with independently measured numbers, and pointed at the actual root: the
generator, not the call sites. That is the "kill the class, not its instances" version of D3,
so I took it.

## What was wrong with the generator

`dev-tools/gen_docsuite_theme.cjs` emitted **base selectors only**:
`.theme-dark .allo-docsuite .bg-slate-50`. Tailwind compiles `hover:bg-slate-50` into a
separate class with a `:hover` selector, which that rule can never match.

The blind spot was invisible from inside the tool. `TOKEN_RE`'s leading word boundary matches
after the colon, so scanning `hover:bg-slate-50` yielded the token `bg-slate-50` — **the
generator recorded the token as covered while emitting a selector that could not reach it.**
That is why grepping for "hover" over 1,044 lines of generated CSS returned one hit, and that
one was unrelated.

And `tests/docsuite_theme_contrast.test.js`, which enforces a full worst-case WCAG matrix, only
ever looked at resting colours. Resting states measured 9-13:1. Nothing looked at a state
variant, so nothing failed.

## Changed

**`dev-tools/gen_docsuite_theme.cjs`**

- `VARIANT_SEL` — the variant prefixes expressible as a pseudo-class (`hover`, `focus`,
  `focus-visible`, `focus-within`, `active`, `disabled`, `checked`) or a group/peer
  relationship (`group-hover`, `group-focus`, `peer-hover`, `peer-checked`).
- `scanVariantTokens` / `allVariantTokens` — scan the same files for prefixed colour
  utilities. **540 tokens** are remapped; **23 are not**, and those are reported by
  `node dev-tools/gen_docsuite_theme.cjs --unsupported` rather than silently dropped. All 23
  are deliberate skips: `print:` (printing on black is not the goal), `placeholder:`,
  `selection:`, `marker:`, `prose-*` (pseudo-elements needing their own mapping decision), and
  two `sm:border-*`. `dark:` is excluded on purpose — mapping it would entrench the very
  mechanism this layer exists to work around.
- `buildVariantRules` / `selForVariant` — emit the second layer, reusing `darkFor` /
  `contrastFor` on the bare token so no new colour value is introduced.
- `APPSUITE_EXTRA` — `games_source.jsx` added to the appsuite scan. The filter was
  `view_*_source.jsx` only, so games were never scanned despite rendering inside
  `<main class="allo-docsuite">` (L1's finding: 9 unmapped colour tokens in MemoryGame, 2 in
  BingoGame, 2 in StudentBingoGame).

**The selector form is load-bearing.** Every variant rule uses
`[class~="hover:bg-slate-50"]:hover`, never a backslash-escaped class selector. This CSS is
pasted inside a **JSX template literal**, where a backslash is an escape character and would be
eaten before the browser ever parsed the selector — producing a rule that silently matches
nothing, with no error anywhere. It is the same reason slash tokens already used the attribute
form.

## Verified

**Real pixels, `_dev_scratch/l2/probe_v3.mjs`.** Eight class strings taken verbatim from the
files L1 and I measured, rendered against the shipped Tailwind bundle plus each remap layer,
with the state actually applied and the surface read from a **screenshot pixel**, not a
computed style:

```
theme  layer  case                                     surface px        ratio  verdict
dark   v1     glossary row      view_glossary:1122     rgb(248,250,252)   1.05   FAIL
dark   v1     glossary chip     view_glossary:1053     rgb(241,245,249)   1.00   FAIL
dark   v1     glossary phonics  view_glossary:1132     rgb(236,253,245)   1.04   FAIL
dark   v1     games row         games_source:477       rgb(241,245,249)   1.00   FAIL
dark   v1     games card        games_source:1166      rgb(238,242,255)   1.02   FAIL
dark   v1     menu item         hover:bg-green-50      rgb(240,253,244)   1.05   FAIL
dark   v3     glossary row      view_glossary:1122     rgb(15,23,42)     16.30   AA
dark   v3     glossary chip     view_glossary:1053     rgb(30,41,59)     13.35   AA
dark   v3     glossary phonics  view_glossary:1132     rgb(2,44,34)       9.94   AA
dark   v3     games row         games_source:477       rgb(30,41,59)     13.35   AA
dark   v3     games card        games_source:1166      rgb(30,27,75)     14.59   AA
dark   v3     menu item         hover:bg-green-50      rgb(5,46,22)      13.61   AA

below AA:  v1 = 6 / 16    v3 = 0 / 16
```

**Light mode is byte-identical between v1 and v3**, row for row — the variant layer only adds
`.theme-dark` and `.theme-contrast` scoped rules, and a test asserts that no variant selector
can be emitted unscoped. That is the property that makes this safe to apply at all.

The glossary row goes **1.05 to 16.30 with no edit to `view_glossary_source.jsx`.** That is the
class fixed at its source rather than one element at a time.

**Payload.** 91.5 KB to 166.6 KB raw, but **8.1 KB to 13.6 KB gzipped** and 5.7 to 9.4 KB
brotli. The selectors are highly repetitive, so the over-the-wire cost is about 5 KB.

**A real bug this pass caught in itself.** My first version of the generator's header comment
contained backticks. Those reached the output and would have **terminated the JSX template
literal and broken the entire AppStyles module** on the next build — a syntax error nowhere
near its cause. The existing "no backslash" assertion did not catch it, because a backtick is
not a backslash. Found by `_dev_scratch/l2/paste_safety.cjs` before anything was applied; the
generator no longer emits backticks, and there is now a test for all three hazards (backtick,
dollar-brace, closing style tag).

## The gate that missed it, extended

`tests/docsuite_theme_contrast.test.js`: **41 tests, 40 passing.** Seven new ones:

| Test | What it pins |
|---|---|
| variant inventory is real | more than 400 supported tokens; `hover:bg-slate-50` present |
| every mappable variant token gets a rule | the actual regression — see below |
| attribute-selector form, never a backslash | the JSX-template-literal hazard |
| nothing terminates the template literal | backtick / dollar-brace / closing style tag |
| every variant rule is theme-scoped | light mode cannot be touched |
| group/peer map to an ancestor, not the element | `.group:hover [class~="group-hover:..."]` |
| variants introduce no colour outside the audited matrix | the WCAG matrix stays complete |
| unsupported list stays small and known | a new responsive colour variant gets noticed |

Plus one in the existing block asserting `games_source.jsx` is in the scanned scope.

**Premise guarded.** Running the new assertions against the **pre-fix** CSS currently in
`app_styles_source.jsx`:

```
v1 (pre-fix)    unmapped variant tokens:  389   canonical hover rule present: false
v3 (post-fix)   unmapped variant tokens:    0   canonical hover rule present: true
```

The gate goes red on exactly the bug it was written for.

## The scanner now reads the shipped CSS

`scan_dark_mode_contrast.cjs`'s `STATE-LIGHT-BG` rule no longer assumes the remap misses every
variant. It reads the `[class~="..."]` selectors out of `app_styles_source.jsx` and skips any
variant token the shipped layer already covers.

Deliberately it reads the **shipped** CSS, not the generator's potential output: while that
block is stale, those sites really are still broken and must still be reported. So the scanner
is self-correcting — the moment the apply below runs, the covered sites stop being findings on
their own, and the baseline should be regenerated to match (expect a large drop from 398).

## The pending apply — the one thing left, and why I did not do it

`node dev-tools/_apply_docsuite_theme.cjs` re-pastes the generated block into
`app_styles_source.jsx`. **Nothing above is live until that runs.** I held it deliberately:

```
$ date;  ls -lt view_*_source.jsx games_source.jsx AlloFlowANTI.txt | head -4
Sun Aug 16 11:01:54 EDT 2026
10:59:55  games_source.jsx
10:57:39  view_project_settings_source.jsx
10:57:03  AlloFlowANTI.txt
```

Other lanes were writing to scanned files **two minutes** before I checked. The generated block
is a snapshot of the token union across all of them, so applying now would (a) go stale again
within minutes and (b) sweep other lanes' uncommitted tokens into `app_styles_source.jsx`, a
file I own — mixing their in-flight work into mine. `gen_docsuite_theme.cjs --check` was
**already** reporting stale before I touched anything, from those same edits.

**Run this once the fleet is quiet, in this order:**

```bash
node dev-tools/_apply_docsuite_theme.cjs                       # paste the fresh block
node dev-tools/gen_docsuite_theme.cjs --check                  # expect: current
node _build_app_styles_module.js                               # rebuild the module
npx vitest run tests/docsuite_theme_contrast.test.js           # expect 41/41
node dev-tools/scan_dark_mode_contrast.cjs --update-baseline   # expect a large drop
npx vitest run tests/dark_mode_contrast_gate.test.js           # expect 3/3
```

It is verified end to end except for that paste: the output is generated, parse-safe, measured
in a browser, and covered by 40 passing tests. The only assertion that fails today is the drift
check, which is what "not yet applied" is supposed to look like.

## Files changed in this second pass

| File | Change |
|---|---|
| `dev-tools/gen_docsuite_theme.cjs` | v3 state-variant layer; `games_source.jsx` added to appsuite scope; `--unsupported` reporting |
| `tests/docsuite_theme_contrast.test.js` | 8 new tests covering variants, selector form, paste safety, scope |
| `dev-tools/scan_dark_mode_contrast.cjs` | `STATE-LIGHT-BG` now reads the shipped remap and skips covered tokens |
| `_dev_scratch/l2/probe_v3.mjs`, `paste_safety.cjs`, `theme_v3.css` | evidence (gitignored scratch) |

`app_styles_source.jsx` is still **unchanged** — that is the pending apply, by design.
