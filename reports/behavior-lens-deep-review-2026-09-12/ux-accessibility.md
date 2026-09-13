# BehaviorLens UI, UX, and accessibility review

Date: 2026-09-12. Scope: canonical `behavior_lens_module.js`, workspace contract/tests, and isolated React component rendering. No product files changed. The coordinating reviewer performed separate Chromium checks; references to those checks below identify them explicitly.

## Confirmed findings

### UX-1 — P1: core ABC choices have indistinguishable accessible names

**Evidence:** `behavior_lens_module.js:811–819` gives each ABC category button `aria-label="Toggle value"`, overriding the meaningful visible option. The read-only SSR probe rendered **27 distinct ABC choices with the same accessible-name override** and no `aria-pressed`. The three Tool Wizard answers are all `aria-label="Select"` (`24629`), interval methods all `Toggle mode` (`2713`), hub filter chips all `Toggle active cat` (`28719`), and category accordions all `Toggle Cat` (`28862`). Accordions also omit `aria-expanded` and filter chips omit selected state. Header and related-tool controls repeat generic labels such as `Open Panel` (`30479`, `30496`, `30506`).

**Impact:** A screen reader or speech-control user cannot distinguish which behavior/trigger/consequence will be selected, or learn what is selected. The same problem blocks the discovery tools intended to reduce the 80+ tool catalog's complexity. This is a behavior defect, not simply a missing ARIA attribute: generic names actively replace useful visible text.

**Fix:** Use visible labels as the accessible name; group each ABC choice set with `fieldset`/`legend` and native radio inputs or correctly implemented radio groups. If retaining buttons, use the option text and expose `aria-pressed`. Use unique category names, `aria-expanded`/`aria-controls` for accordions, and destination-specific navigation names. Verify real computed accessible names and selected state rather than only checking that a source string contains an ARIA property.

### UX-2 — P1: custom and AI-filled ABC text is invisible in the entry editor

**Evidence:** The editor initializes `antecedent`, `behavior`, and `consequence` directly from the saved entry (`633–636`), but initializes `customA/B/C` as empty (`643–645`). `renderCategoryPicker` renders free text only when the value equals the literal `Other` (`823`). The normal saved form stores the actual custom narrative (`779–788`), not `Other`. The probe reopened a record containing three ordinary narrative values absent from the predefined chips; none appeared in rendered text or any input value. AI Quick Fill directly assigns freeform strings (`762–766`) and clears the original description (`770`), producing the same invisible state before Save.

**Reproduction:** Create an ABC entry with Other/custom text, save it, and reopen Edit. Alternatively, Quick Fill a narrative whose parsed fields are not exact preset strings. The category chips show no selection, no custom text field is visible, yet Save remains available. The hidden state can be saved or replaced without reviewing it.

**Fix:** Store category and narrative separately, or initialize unmatched strings into a visible Other/custom field. Always show the effective ABC text before Save, especially for AI results. Add a regression that edits a custom entry without losing or hiding its text and a Quick Fill review check.

### UX-3 — P1: mobile header puts Close outside the viewport

**Evidence:** Main header `29010–29200` uses an unwrapped horizontal flex row for the title, status badges, AI, Family/export, and Close. Coordinating review confirmed the Close button at x=385.4 to429.4 on a 390px viewport, and entirely outside a 320px viewport, using Chromium. See `hub-390.png` and the coordinating runtime evidence.

**Impact:** A basic exit control becomes almost or entirely unreachable by touch. Additional quality/storage/sync badges make this worse after real data is present.

**Fix:** Reserve a fixed-size Close area and let title and status controls wrap or use a narrow-screen overflow menu. Use `min-width: 0` on flexible text areas. Recheck 320/390px, 200% zoom, a long student name, and multiple status badges.

### UX-4 — P2: observation dialogs do not contain or restore keyboard focus

**Evidence:** Live Observation (`1820–1822`), Frequency Counter (`2434–2435`), and Interval Grid (`2640–2641`) only focus their dialog once. Their roots have modal semantics but no Tab trap. The parent explicitly returns when an event originates in a nested dialog (`25694–25698`), so the app's existing Tab handler cannot contain them. Their ordinary close callbacks only toggle visibility (`30516`, `30524`, `30532`, `30540`). Only the document Escape path calls `alloRestoreFocus` (`26961–26963`).

**Impact:** Tab can reach obscured hub/host controls; mouse-activated close and Save/unmount can leave keyboard focus on the document body. Choice Board uses multiple modal roots and should join the same shared solution.

**Fix:** Give these overlays a shared modal primitive with initial focus, bidirectional containment, background inertness, Escape handling, and opener restoration on every exit path. Test first/last interactive controls in actual Chromium, not only source presence.

### UX-5 — P2: dismissing a live observation discards unsaved work immediately

**Evidence:** Live Observation and Frequency Counter use component-local state for timing/tallies (`1754–1768`, `2428–2433`). Their X controls directly call `onClose` (`1869–1872`, `2518`); Escape closes all overlay booleans directly (`26961–26963`). Nothing in those close paths saves or asks what to do. Counter removal/reset already have loss confirmations (`2477–2488`, `2606–2613`), so ordinary exit is less protected than resetting the same data.

**Reproduction:** Add a tally or record an episode, then press Escape or X and reopen. The session is gone, with no history entry or recoverable draft.

**Fix:** On a recording with data, offer Save / Keep draft / Discard. Keep an in-progress observation draft across overlay dismissal and refresh where practical. Distinguish successful Save exit from cancel/discard exit.

### UX-6 — P2: panel changes can focus an unrelated host heading

**Evidence:** `openPanel` queries `document.querySelector('h2, h3')` (`26346–26349`). This is document-wide and does not target the newly opened panel. In the isolated app it selects the main BehaviorLens title; in a host containing an earlier heading it can move focus outside the modal. Announcements use raw panel IDs such as `nlabc` or `scdmanager` (`26345`).

**Fix:** Scope focus to a content ref and mark/focus the destination panel heading. Announce the displayed tool title. Include a host heading preceding the module in a navigation regression test.

### UX-7 — P2: zero-event frequency sessions cannot be saved

**Evidence:** FrequencyCounter `handleSave` returns on `totalCount === 0` (`2493`), while the Save button remains enabled (`2526`). A timed observation with no occurrences receives no feedback and cannot become an observation record. The Live Observation frequency path uses elapsed time as the condition (`1830`) and can save the same meaningful zero-event observation.

**Fix:** Allow Save when observation time is positive, including zero occurrences. If no observation has started, disable Save with an explanation. This also improves exposure denominators and the visibility of progress; coordinate with analytics findings.

## Additional product opportunities

- **Separate occurrence from entry time.** ABC entry has no occurrence date/time control; new records use `now` for `timestamp` and `occurredAt` (`781–785`). Teachers logging earlier incidents cannot correct when they happened, which affects time/day patterns. Add an editable occurrence date/time with a clear timezone while retaining immutable recorded time.
- **Make intensity deliberate.** Editor initializes missing ratings to 3 (`637`) and only offers 1–5 (`951–955`), although the workspace supports missing intensity. Offer “Not rated” and short rating anchors so an untouched default is not mistaken for an observed rating.
- **Explain disabled tools precisely and consistently.** Cards use the generic “Unavailable until required data is selected” (`28614`), while quick launch, favorites, onboarding, and the wizard apply different or no prerequisites (`28586–28587`, `28751–28754`, `28765–28772`, `28644–28656`). Centralize tool metadata: required student/data, why unavailable, and next action. Route a fresh user to student selection without losing the desired destination.
- **Make the first-use path task-based.** The role welcome is embedded amid the student/sandbox configuration, clinical quick-launch bar, profiles, recommendations, and catalog. Introduce a simple path: choose/create student → define behavior → capture observation → review. Family Mode currently filters cards (`28179`) but retains specialist quick launch; family-specific primary actions and language should apply across the whole hub.
- **Finish semantic/contrast coverage.** Coordinating Chromium axe scan found an unnamed progressbar and three low-contrast sandbox labels. Source contains additional unnamed progress bars (`9516`, `9837`, `11402`, `13304`, etc.). Provide meaningful names and text summaries. Audit actual rendered states and contrast; the existing source-presence tests cannot establish usability or color contrast.
- **Scope injected CSS.** Mobile and accessibility rules are injected permanently at module load (`113–220`) and broadly match `.fixed.inset-0`, affecting unrelated host dialogs after BehaviorLens closes. Add a dedicated BehaviorLens root selector and narrow every override, rather than changing host-wide Tailwind classes.

## Evidence and limits

`ux-source-probe.cjs` loads the production source into JSDOM and exposes internal components **only in memory**, then renders with the installed React version. `ux-source-probe-results.json` captures the repeated labels and invisible custom narratives. Command: `node reports/behavior-lens-deep-review-2026-09-12/ux-source-probe.cjs`.

SSR proves emitted DOM/content, not browser focus traversal, layout, assistive-technology behavior, or cloud integration. Focus findings combine concrete source paths with the coordinating Chromium review. No real student data was used. This review reports current findings; it does not claim every one of the 80+ panels was interactively exercised.
