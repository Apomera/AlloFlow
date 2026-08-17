# Open items analysis — W1 session, 2026-08-16 (evening)

Everything left open by this session's knowledge-graph and i18n work, with options, trade-offs
and a recommendation each. Items marked **[Aaron]** need a product or policy decision; items
marked **[agent]** can be executed on request without further input.

Effort scale: S = under an hour · M = one focused session · L = multiple sessions.

---

## A. Knowledge graph / standards data

### A1. `hasStandardAlignment` crosswalk (25,113 cross-framework edges) — **[Aaron]**, M

The one path to serving non-CCSS states without ingesting each state separately.

| Option | Pros | Cons |
|---|---|---|
| A: partners `resolvable: true` | Zero provider work; searchable immediately | A "CCSS Math" snapshot returns other states' standards in ordinary search; code collisions (`5.3B` exists in several frameworks); partners arrive shallow, without their own hierarchy |
| B: partners `resolvable: false`, nothing else | No pollution | Inert: `getRelatedStandards` skips non-resolvable records, so the data ships and nothing ever shows it. Worst trade |
| C: `resolvable: false` + a dedicated `getAlignedStandards()` accessor | No search pollution; crosswalk visible where labelled as correspondence; reuses the `includeUnresolvable` mechanism already built and tested for components | Needs a new provider method AND a UI surface; teacher still cannot work *in* the partner framework (correct: that wants that state's own snapshot) |

**Recommendation: C, but sequenced.** (1) Measure the partner count for the CCSS scopes first —
one streaming pass next time the corpus is downloaded; CCSS is the most-aligned-to framework, so
the pull-in could be large and it lands on the CDN budget. (2) Implement the accessor when the
Phase 2 Standards Finder drawer exists to display it; before then, option C degenerates into
option B with extra code. **DECIDED 2026-08-17 (Aaron): the pilot (Maine) is CCSS-focused, so
the crosswalk waits for the Phase 2 Standards Finder drawer.** Measured cost when it lands:
21,492 external partner standards for ccss-math, 2,388 for ccss-ela.

### A2. Snapshot size after the components rebuild — **[Aaron]**, S

`ccss-math.js` went 1.22 MB → 2.49 MB (×2 with the mirror, plus build-time copies).

| Option | Pros | Cons |
|---|---|---|
| Ship as-is | Zero work; Cloudflare serves compressed, so wire cost is far below 2.49 MB; Pages limit is file COUNT (20,000), not size | Repo and checkout weight; every future snapshot with components doubles similarly |
| Slim the component records (drop the always-empty `framework`/`jurisdiction`/`grade`/`sourceUrl` fields on `kind:'component'`) | ~10-15% smaller; mechanical builder change | Touches the record shape the provider validates; digest churn; small win |
| Revert the rebuild | Back to 1.22 MB | Loses the 1,797-component feature; pre-change bytes are in git HEAD anyway (`git checkout` recovers them, the scratchpad backups are redundant) |

**Recommendation: ship as-is.** Revisit only if the CDN deploy actually complains. Reverting is
one git command if the size bothers you at commit time.

### A3. Do ELA / science standards have `supports` components upstream? — **[agent]**, S

Unknown. The corpus has 137,380 `supports` edges; the math scope pulled only 1,797, so ~135k
attach to standards in OTHER frameworks — some may be ELA or state-science. If yes, rebuilding
`ccss-ela` with `--include-components` is the same proven procedure and a real feature win; if
no, we say "not available" honestly, as with prerequisites.

**Recommendation:** piggyback this measurement on the next corpus download (same pass as A1's
partner count). Never download the 800 MB for one question; batch the questions.

### A4. "Surprise Me" naming collision — **[Aaron]**, S

`cmd.surprise_me_contextually` (shipped, translated into 63 languages today) vs the Phase 5
graph-grounded discovery feature (unbuilt) share a name.

| Option | Pros | Cons |
|---|---|---|
| Rename the shipped palette command | Frees the name for the bigger feature | Re-translation churn across 63 packs; users relearn a shipped label |
| Name Phase 5 something else | Zero cost now; nothing shipped changes | The doc's working name has momentum |

**Recommendation: name Phase 5 something else.** It does not exist yet; renaming the unbuilt
thing is free. Product naming is Aaron's call; the doc note already flags it so Phase 5 cannot
start without hitting it.

### A5. Stale builder test (`__ALLO_LOCAL_STANDARDS_SNAPSHOT__` singular) — **[agent]**, S

Verified this session: `standards_provider_module.js:995-996` drains BOTH the singular and the
plural global, so the builder emitting the plural is correct at runtime and the test assertion
is drift, not a bug. One-line test fix.

**Recommendation: fix the assertion** next time anyone touches that test file; it is red noise
that makes real regressions harder to spot. Pre-existing, so it was left alone under fleet
rules this session.

---

## B. i18n

### B1. `check_lang_staleness` gate policy — **[Aaron]**, S-M

The tool works and named every wrong-text bug found this session; it is warn-only, so the
backlog grew to 23,364 unwatched.

| Option | Pros | Cons |
|---|---|---|
| Leave warn-only | Zero work | Proven failure mode: it printed the answer for months while 189 stale values shipped |
| Full `--gate` | Maximal protection | Impossible today: 23,364 failures block every commit |
| Namespace denylist gate (`sidebar.*`, `tools.*`, `glossary.*`, `visuals.*`, `universal.*`, `launch_pad.*`) | Deployable today; protects exactly the surface-name class that bit twice; small script change | Long tail stays unguarded; list needs curating |
| Ratchet gate (fail only if the stale count EXCEEDS a recorded high-water mark) | Stops growth everywhere without fixing the backlog; no list to curate | A fix in one namespace masks a new regression in another within the same run; needs the watermark checked in |

**Recommendation: denylist + ratchet together.** Denylist for the high-visibility class, ratchet
for everything else. Both are additive to `verify:gate` and cheap; the namespace list is the
only part needing Aaron's sign-off.

### B2. The 23,364 stale-translation backlog — **[agent]**, L

Users of 62 languages see translations of superseded English. Not a fallback situation — stale
text actively displays.

**Recommendation: burn down by namespace, highest-traffic first** (`tour.*`, `launch_pad.*`,
`toasts.*` lead the staleness report), using the delta pipeline proven today (hand files +
validating applier + bless). Multi-session; each session should bless what it fixes so the
count monotonically falls. Do not attempt in bulk; the glossary-rename lesson is that value
correctness needs per-key attention.

### B3. `concept_graph_engine_module.js` — 11 teacher-visible strings, 0 translator calls — **[Aaron]** then **[agent]**, M

Axis/grouping labels (`causes → effect`, `Cognitive depth...`). The engine is deliberately
translator-free.

| Option | Pros | Cons |
|---|---|---|
| Engine returns stable label KEYS; views translate | Correct layering; engine stays pure | Contract change across every consumer of the engine; each view needs the key map |
| Inject `t()` into the engine | Quick | Wrong direction; couples a data engine to the UI locale; the kind of shortcut later sessions curse |
| Leave | Zero work | 11 strings untranslatable forever; also contain `→` arrows (borderline vs the dash rule) |

**Recommendation: keys-not-strings, in a dedicated session** that owns the engine and all its
consumers at once. Not urgent: English fallback is acceptable here short-term, and a partial
migration would be worse than none.

### B4. Remaining 10 `mind_map` strings — **[agent]**, S

Eight are toolbar `title`s inside component scope (plain wraps, `t` already bound); two are
module-level constants (`EDGE_STYLES` labels, `Ungrouped`) needing a resolve-at-render-time
touch. **Recommendation: do the eight cheap ones in the next i18n pass; take the two constants
in the same edit** since the pattern (label key resolved in the render path) is the same one B3
will establish.

### B5. Repo-wide em-dash debt — **[Aaron ruled]**, no action

463 non-stem `ui_strings.js` values, 12,584 in pack `help_mode` sections. Aaron already ruled
report-only for W4, and the pack figure is largely legitimate typography in other languages
(dash conventions differ per language; the RULES sentence is best read as an English-source
rule). **Recommendation: honour the ruling.** If ever revisited, the proven splitter from
`fix_help_dashes_20260816.cjs` applies to the English source only, under lock.

### B6. cmd palette: 213/567 values English-identical — **[agent]**, M-L

Behind a green `check_cmd_i18n` (presence-only). Includes the whole `palette.ctx.*` namespace
(deliberately kept English for consistency) and the Learning Web: Unit Path command group.
**Recommendation: one delta batch for the high-use command groups after W3 lands the
`palette.ctx` em-dash fix and re-runs the extractor** — translating before that means
re-translating. The keep-English decision for `palette.ctx.*` itself stands unless Aaron wants
that namespace localized as a set.

### B7. PPS-cluster policy tension — **[Aaron]**, S

`PACK_QUALITY_STATUS.md` records 7 packs (acholi, karen, chin_hakha, chin_falam, marshallese,
lao, maay_maay) as intentional English passthrough. Today's deltas hand-translated all 63,
including those 7. The two positions should be reconciled: either the passthrough policy is
retired (the packs have grown real content since June) or future deltas should skip those 7 and
let `t()` fall back. **Recommendation: retire the policy note** — the packs demonstrably carry
substantial native content now — but that is a quality-bar call only Aaron can make.

---

## C. Extraction sweep (S1 remainder)

### C1. `AlloFlowANTI.txt`: 621 hardcoded strings — **[agent]**, L

Cluster map (measured via `--csv`, which matters — console output truncates):

| Cluster | Count | Note |
|---|---|---|
| Class Mailbox / live session / FERPA (47000-47500) | 120 | One coherent feature; the FERPA/privacy copy is compliance language, translate with care |
| Saved-work encryption / recovery keys (35500-36500) | 72 | Security-sensitive wording |
| Storage & recovery manager remainder (45500-46000) | 38 | Two cards done this session; panel is started, finish it first |
| AlloHaven (51500-52000) | 34 | |
| Long tail | ~357 | |

**Recommendation: storage panel remainder first** (finish what is started, 38 strings), **then
the Class Mailbox cluster as its own session** (biggest single win, needs the most care).

### C2. `story_forge_source.jsx` (+351 findings) — **not W1's**

Added to the scanner targets by another session mid-evening; presumably being worked. Total
moved 890 → 1,241 with zero code change. **Recommendation: none from this lane** beyond the
baseline-comparability note already filed.

### C3. `help_strings.js` legacy layer — **[agent]**, L

990 entries; 5 verified-and-fixed this session, and one of those described controls that do not
exist. The rest of the legacy layer is unaudited. **Recommendation: verify opportunistically**
(whenever a feature changes, its help entry gets checked against the JSX) rather than a
dedicated sweep; a full verification pass is a multi-session grind with diminishing returns.

---

## D. For Aaron's commit/deploy checkpoint

Not "open items" but live facts for the next deploy:

1. **`?v=` pin restamp** — `AlloFlowANTI.txt:11906-11908` pins all three snapshot loaders at
   `v=e805fe3c7`; the rebuilt `ccss-math.js` will not reach clients until the usual restamp.
2. **Snapshot size** — see A2; revert is `git checkout -- standards_snapshots/ccss-math.*` plus
   the mirror copies if you want the old data back.
3. **Gate state** — `verify:gate` passes end to end as of this session (`check_iife_lazy_lookup`
   fixed by W5); the one flicker seen was `check_aria_handler` on a stem_lab file another
   session had mid-edit.
4. **Pathspec commits only**, per the wave-2 plan; ~570 modified files in the shared tree
   belong to many lanes.

---

## Priority order, if the next session gets one instruction

1. **B1** (staleness gate, denylist + ratchet) — cheapest structural fix; prevents the class of
   bug that consumed the most cleanup time today. Needs only the namespace list approved.
2. **C1 storage-panel remainder** (38 strings) — finishes a started surface.
3. **A1+A3 measurement pass** (one corpus download, both questions) — converts two decisions
   from guesses into numbers, and A3 may unlock ELA components for the price of a rebuild.
4. **B2 first burn-down batch** (`tour.*` + `launch_pad.*`) — visible quality win in 62
   languages.

Everything else is either blocked on a decision (A1 implementation, A4, B3, B7), deliberately
deferred (B5, B6), or long-grind (B2 full, C1 full, C3).
