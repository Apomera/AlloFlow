# WCAG 2.2 AA Audit Handoff for Fable

Updated: 2026-07-19 evening (America/New_York) — continued by Fable

## Objective and working rules

Continue the comprehensive WCAG 2.2 AA audit and remediation across the app. The VPAT is useful background but may be outdated; verify the current implementation and newly added areas directly.

The repository is a shared worktree with other agents actively changing and committing unrelated files. Preserve all parallel work. Never reset, revert, stash, clean, or broadly stage the worktree. Inspect current state immediately before every write and commit only the exact files for one completed accessibility section. The user requires a separate commit after each completed section.

Workspace:

`C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

Current branch: `main`

The product files have a Windows deny-read ACL in the normal sandbox. The reliable pattern has been:

1. Attempt the direct product-file patch once; it normally fails with `apply deny-read ACLs`.
2. Create a guarded updater under `C:\tmp` with `apply_patch`.
3. Have the updater verify both deploy mirrors are identical, component markers/sentinels are unique, and expected legacy text is present before writing.
4. Run the updater with elevated permissions.
5. Syntax-check both mirrors and verify identical SHA-256 hashes.
6. Add focused source-contract and rendered jsdom interaction tests.
7. Run focused tests, the Learning Lab golden test, and the bounded full Learning Lab suite.
8. Run `git diff --check`, stage only a newly created test if needed, and use `git commit --only` with exact paths.

Do not use `--no-verify`. Do not deploy while other agents are actively working unless the user pauses them and explicitly returns to deployment.

## Completed and committed sections in this audit continuation

These sections were independently committed:

| Section | Commit |
|---|---|
| Reading Tracker | `988a084c0` |
| Self-Compassion | `967605869` |
| Progress Dashboard | `1f97c9612` |
| Optional Challenge or Practice Tracker | `e8e3326bc` |
| Optional Time Estimate Comparison | `efc9c1313` |
| Optional Attention Shift or Interruption Log | `0f7fe7951` |
| Search Selected Personal Toolkit Content | `69c575228` |
| Personal Reference Sheet Builder | `cffee2e98` |
| Optional Support Request Notes | `d3dd20d32` |
| Mindfulness Practice | `6598a8ad6` |
| Anxiety Toolkit | `876bb36f4` |
| Decision Maker | `4b9032eb8` |
| Vocabulary Builder | `ea486afd3` |
| Focus-timing stabilization (Concept Map + Notes Workbench) | `f398b40e3` |
| Crisis Plan | `2497cd068` |
| Disclosure Wizard (P0 crash fix + audit) | `1c513b558` |
| Free-focusById crash class, six components | `784de7477` |
| Class Roster | `af9d66ecc` |
| Mood Tracker (+ UTC-date fix) | `d7fc7b751` |
| UTC-date class (brain dump, flashcards, evening-fragile tests) | `cb9e7eb54` |
| Quote Collector | `df9a0a876` |
| Worry Time | `b746c083a` |
| Energy Tracker | `2bc049e1f` |
| Career Explorer | `418ce85d9` |
| Letters to Future Self | `6a62cc745` |
| Memory Palace | `85d6c9b8e` |
| Identity Map | `5b375c3cb` |
| Question Log | `5da6940cc` |
| Success Log | `175920ca7` |
| Teacher Email Builder | `f952f8178` |
| Parent Message Builder | `7c11d260f` |
| Race-proof suite gate runner | `3b6469390` |
| Body Awareness | `528e84ce6` |
| Achievement Wall | `deb110ec2` |
| Affirmation Library | `163e8ffdb` |
| Role Models | `7e3526e75` |
| Learning Reflection (Self Assessment) | `332389994` |
| Learning Contracts | `2932fcc13` |
| Emotion Check + Tools | `dce5a7881` |
| Timer-focus class: all 32 remaining sites | `ba6e1f784` |

The most recently completed section, Personal Reference Sheet Builder, passed:

- Focused source/render tests: 19/19
- Learning Lab golden test: passed
- Bounded full Learning Lab suite: 2,120/2,120 tests across 133 files

Its exact committed files were:

- `stem_lab/stem_tool_learning_lab.js`
- `desktop/web-app/public/stem_lab/stem_tool_learning_lab.js`
- `tests/learning_lab_cheat_sheets_a11y.test.js`
- `tests/learning_lab_cheat_sheets_render_a11y.test.js`

## Session notes (2026-07-19 evening, Fable)

Both sections above marked `d3dd20d32` and `6598a8ad6` are fully verified and committed. Nothing is in progress; the worktree is clean for this audit's scoped files. Current mirror SHA-256 after the Mindfulness commit: `CCCF225D2FF41D5B24ACACD301A6A53DA8C005FE767039FFAFEC994431771CF1`.

- Support Request Notes: focused tests 28/28 (`learning_lab_ask_tracker_a11y` rewritten, `learning_lab_ask_tracker_render_a11y` added), golden passed, bounded full suite 2,133/2,133.
- Mindfulness Practice: removed unsupported clinical effect claims (hedged, descriptive `about:` text replaces `research:`), added optional/local-save/non-communication guidance and a stop-if-uncomfortable note, converted `setTimeout` focus to render-synchronized `pendingFocusId` state, added `Array.isArray` guards for malformed session data (component and catalog `stat`), removed `aria-pressed` from the changing-label toggle, bumped 10px meta text to 12px. Focused tests 25/25, golden passed, bounded full suite 2,142/2,142.
- The deny-read ACL was NOT active this session: direct Edit-tool patches to both product mirrors worked. Try direct edits first before falling back to the elevated `C:\tmp` updater pattern.
- `tests/learning_lab_notes_workbench_render_a11y.test.js` flaked once under `--maxWorkers=4` (focus assertion) and passed in isolation and on full-suite rerun. If it fails again, treat as a concurrency flake first, not a regression.
- Two Codex-app zero-byte `.git/index.lock` files were removed after satisfying the staleness protocol (zero bytes, >3 min, unchanged, only read-only git processes observable).

Known follow-ups (not blocking, for a future section or the i18n lane):
- Both retained i18n keys `stem.learning_lab.ask_for_help_tracker` and `stem.learning_lab.log_every_help_ask_normalize_the_most_` still serve OLD translated strings ("Ask-for-Help Tracker", "Log every help ask…") in non-English packs, so localized UIs may still show the removed framing. Same pattern likely applies to `stem.learning_lab.mindfulness` descriptions. Fixing means minting new keys (falls back to the corrected English) or updating 63 packs.
- `formattedDate` in the support notes treats `time: null` or `time: ''` as epoch 0 and would render a 1970 date; only non-numeric garbage falls back to "Date not recorded". Exotic, not observed in real data.

## Session notes (2026-07-19 late evening, Fable — second continuation)

Four more sections completed and committed, all with the standard gate (focused contract + render tests, golden, bounded full suite green; hash-guarded pathspec commits). Mirror SHA-256 after `f398b40e3`: `C98E224E7B5267D25B883B1A2FB8017A0972CFDF16493CB392660EA8C978BB50`.

- **Anxiety Toolkit** `876bb36f4`: hedged "regulation circuits"/"reduces fusion" claims into attributions (ACT/DBT named, no effect claims), added optional/local-save/non-communication guidance, DBT cold-water opt-out caution, de-ranked "Most-used tools" → "Tools you have logged" (no sort, no ordinals, counts framed informational), added "Clear logged uses" with confirmation, pendingFocusId pattern, malformed-log guards, crisis aside text 11→12px. Crisis links (988 call/text/chat, Maine 1-888-568-1112, relay 711) verified present and kept.
- **Decision Maker** `4b9032eb8`: render-crash-class guards (options/criteria non-arrays, non-string names crashed `namedOptions` filter), Untitled fallbacks, pendingFocusId, weight input value clamped, local-only note, 10px→12px. **Shared `relDate()` now guards null/NaN → "date not recorded"** (was rendering "null days ago"/"NaN months ago" for malformed `createdAt` in every caller).
- **Vocabulary Builder** `ea486afd3`: same guard class (`wordsOf`, listedLists, textValue fallbacks), pendingFocusId, self-ratings-not-grades framing, catalog stat guards (mytkMind/mytkDec/mytkVocab all Array.isArray-guarded now).
- **Focus stabilization** `f398b40e3`: ROOT CAUSE of the notes-workbench and concept-map render-test flakes was those components' `setTimeout` focus racing the tests' microtask-only flush. Converted both to the pendingFocusId effect pattern; 6× stress runs deterministic. Do NOT patch the tests with timer flushes — that made it worse; fix the component. **3 `setTimeout`-focus sites remain in the file** (grep `setTimeout(function() { var target = document.getElementById`) — convert each as its section is audited, or proactively if its test flakes.
- Process note: when a cross-cutting fix lands mid-section, revert it temporarily (hash-verify against the section's verified state), commit the section, re-apply (hash-verify again), then commit the fix separately. Worked cleanly twice.

## Session notes (2026-07-19 night, Fable — third continuation)

- **Crisis Plan** `2497cd068`: guards for corrupt `plan` values (a corrupt string previously spread character-by-character into the object on save), explicit "saving does not send your plan to anyone" wording, humanized Stanley and Brown attribution (was "Stanley + Brown 2012" + shouting "YOUR"), 11→12px on crisis-critical small text. Resources verified current (988 call/text/chat, Maine 1-888-568-1112, Crisis Text Line 741741, 911).
- **P0 FOUND AND FIXED — free `focusById` ReferenceError crash class.** Seven components called `focusById(...)` with NO definition in scope (no module-level helper exists): Disclosure, QuoteCollector, CareerExplorer, MoodTracker, FutureSelf, WorryTime, EnergyTracker. Empirically confirmed via jsdom: submitting the Disclosure form threw `ReferenceError: focusById is not defined`. Every save/remove flow in those tools hit it. Disclosure fixed in its section commit `1c513b558` (which also removed a silent 10-entry history cap, added non-disclosure wording, and guarded "undefined out of 10" rendering); the other six fixed in `784de7477` with the pendingFocusId pattern. **`tests/learning_lab_focus_binding_a11y.test.js` now statically scans every component slice and fails if any focus call lacks a same-slice definition** — this gate prevents the whole class.
- Mirror SHA-256 after `784de7477`: `E486B1E246D59F7F74F84A11A706652A29AE2888E73D1EE0A296C179BC66943F`. Full suite 2,195/2,195.
- Concurrent-agent note: a deploy agent's `dd496abd3` ("Post-deploy: update CDN hash refs to @1c513b558") swept the deploy-mirror copy of the focus-class fix into its commit before `784de7477` landed the root file. Content converged correctly (HEAD root == HEAD mirror == disk == E486B1…), but the deployed CDN bundle was stamped @1c513b558 — verify whether the deployed artifact includes the focus-class fix (`git show` vs CDN) before assuming it is live.

## Session notes (2026-07-20, Fable — fourth continuation)

- **Class Roster** `af9d66ecc`: standard wave (pendingFocusId, isRecord/textValue guards incl. a real crash where `startEdit` on a legacy record with a non-string name blew up the next save, Untitled fallbacks, privacy guidance about naming other people, 10/11→12px). Mirror SHA-256 `131512308677CC702AB02A3E04A34C80153B8180BAC7CEF5EEB217351A6A4068` at that commit.
- **Mood Tracker** `d7fc7b751`: standard wave PLUS a real data-honesty bug — the 14-day chart derived dates via `toISOString().slice(0,10)` (UTC) while entries save with local `todayISO()`, so evening check-ins (US timezones) disappeared from the chart. Now built from local date parts; regression-tested. Removed silent 20-entry cap; `ratingOf` clamps malformed mood/energy; added optional/non-notification/no-target framing plus a gentle talk-to-someone nudge. Mirror SHA-256 after commit: `A617F60176899558D9DAE26B919188F4F69FDE7F1A4ED1EA44974E31F87E634E`. Full suite 2,212/2,212.
- **NEW BUG CLASS FLAGGED — UTC date derivation.** `grep "toISOString().slice(0, 10)"` still hits 5 sites (~lines 5355, 5975, 6419, 6910, 16994 — Focus Timer/Study Planner/Exam Prep/Habit Tracker regions and one later component). Each compares or buckets against local `todayISO()` dates, so the same evening-shift bug likely applies. Fix each as its section is audited (convert to local `getFullYear/getMonth/getDate` parts like todayISO), or as a dedicated class commit.

## Session notes (2026-07-20 evening, Fable — fifth continuation)

- **UTC-date class RESOLVED** `cb9e7eb54`: of the 5 flagged `toISOString().slice(0,10)` sites, 2 were real (brain dump relative dates; flashcard spaced-repetition `nextDue` — evening reviews scheduled a day late) — both now use the new shared `localISODate()` helper (`todayISO` delegates to it). The other 3 are verified-safe UTC round-trips on local ISO strings (isoFromDayNumber pairs, routine streak cursor) and a guard test in `learning_lab_toolkit_helpers_foundation_a11y` pins the count at exactly 3. ALSO: two TEST fixtures computed "today" in UTC (`challenge_board_render` failed every evening after ~8pm ET; `exam_prep_render` was noon-anchored/fragile) — both fixed to local date parts. **The suite now passes in the evening; before this it reliably failed 4 hours per day.**
- **Quote Collector** `df9a0a876`: standard wave (rawQuotes/isRecord/textValue guards — a non-array `quotes` value or a null entry crashed render/search; local-save guidance; 10px→12px; catalog stat guard).
- **Worry Time** `b746c083a`: standard wave; null entries crashed the open/resolved filters; removed silent 10-cap on processed worries; guarded the catalog "open worries" stat (crashed on null entries too); added "saving does not send them to or notify anyone." Full suite 2,228/2,228. Mirror SHA-256: `C06207A435FD3222490E94F64EDD8485012420308D68AC9F205B32348F5E8A74`.

## Session notes (2026-07-20 late evening, Fable — sixth continuation)

Three more sections with the standard wave, all gate-verified (full suite 2,250/2,250 after the last). Mirror SHA-256 after `6a62cc745`: `830DB864CF84102F963053D2FF9800E1D059D2B5223F2377EB888C3A7CED21A8`.

- **Energy Tracker** `2bc049e1f`: null entries crashed the hourly aggregation; `formatHour` of garbage rendered "NaN:00 PM" (now "an unrecorded time"); unclamped legacy levels (999) skewed averages (ratingOf-style clamp); removed silent 20-cap; 8/9px chart text → 10/11px; non-notification wording.
- **Career Explorer** `418ce85d9`: null entries in `saved` crashed the `.some()` lookups; removed `aria-pressed` from the changing-label save toggle (established anti-pattern); duplicate style key cleanup; local-only guidance. Content framing was already exemplary — kept verbatim.
- **Letters to Future Self** `6a62cc745`: null entries crashed the reading lookup; garbage `deliverOn` produced "about NaN days from now"; sealed/open state now derives from trimmed string dates; render test proves a sealed letter never leaks its body text.

## Session notes (2026-07-21 early morning, Fable — seventh continuation)

- **Memory Palace** `85d6c9b8e`: converted the remaining narrow-pattern `setTimeout` focus site to pendingFocusId; `lociOf`/`rawPalaces` guards (null palace/stop entries crashed the editor and walk); walk stops now render guarded text; Untitled fallbacks; local-only guidance; 10px→12px. Render test covers the full walk flow (progressbar semantics, next/complete focus recovery) and stop/palace deletion.
- **Identity Map** `5b375c3cb`: Crisis-Plan-style guards (corrupt `map` value would spread character-by-character on save; non-string field values now render empty instead of leaking); "saving does not send or show your map to anyone"; 11px→12px. Framing was already excellent — untouched.
- Full suite 2,263/2,263. Mirror SHA-256: `9C91D118760167E9D31B89E7A72DE040FD3382D3F9F2F374B653E79060FAF7F2`.
- **CORRECTION to the earlier "3 remaining setTimeout-focus sites" note:** that count used a narrow regex. The broader variant (`setTimeout(function() { if (typeof document === 'undefined') return; var tar…`) exists at ~28 sites in later components/regions of this file (SEL-adjacent tools etc.). Same conversion applies as each section is audited; the focus-binding gate only catches UNBOUND calls, not timer-based ones, so don't rely on it for this.

## Session notes (2026-07-21, Fable — eighth continuation)

- **Question Log** `5da6940cc`: standard wave — timer-focus → pendingFocusId, rawQuestions/isRecord guards (null entries crashed the open/answered filters), textValue fallbacks incl. "Untitled question", guarded catalog "N open" stat, non-notification wording, 11px→12px. Render test covers filters with live status, blank-question and blank-answer error paths, answer-and-move flow, and confirmed removal.
- **Success Log** `175920ca7`: same wave. NOTE: its 50-entry cap is explicitly disclosed in the UI ("Showing the 50 most recent entries out of N.") so it was KEPT — the convention forbids *silent* caps only. Null entries crashed `categoryFor`; bogus size/category ids fall back to defaults (render-tested).
- Full suite 2,277/2,277. Mirror SHA-256: `AFDAB149DBD60A77994C1E0BB175CAB9ACC4308809FABE4E98F9AFF77C69B86D`.
- Process tip that saved time twice this session: patch contract tests via a small Node script written to the scratchpad (PowerShell mangles quotes in inline `node -e` args).

## Session notes (2026-07-21 evening, Fable — ninth continuation)

- **Teacher Email Builder** `f952f8178`: already the strongest-built component in the tail (explicit "prepares text only — does not address, send, or submit" honesty, clipboard fallback with manual-copy selection, dirty-back confirmation, disclosed 10-draft cap — all kept). Fixed: timer-focus → pendingFocus with the select-text option preserved as `{ id, select }` state; null drafts crashed the saved list; textValue/date guards; 11px→12px; catalog stat guard. Render test covers live placeholder substitution, empty-body save/copy rejection, the clipboard-unavailable manual-copy path (deterministic in jsdom), discard-confirm, save-to-list, and removal.
- **CAUTION — Vitest JSON reporter races under load:** two consecutive `--reporter=json` full runs reported fewer passed than total with 0 failed plus a "tests are still running when generating the JSON report" warning. The default reporter run was definitive: 2,285/2,285 across 153 files. If the JSON gate ever shows passed < total with failed == 0 AND that warning, re-run with the default reporter before diagnosing — do not treat it as a regression. Mirror SHA-256: `E86053D9F87B50B8A35D4D5A63D07C5F5D81EBFA839CFAEF8361C234020E9740`.
- Teacher Email and Parent Message share near-identical helper code — Edit anchors needed template-body context to disambiguate. Expect the same when auditing **Parent Message** (it still has the timer focusById + `String(draft.body)` patterns; likely the same fix set applies nearly verbatim).

## Session notes (2026-07-21 late, Fable — tenth continuation)

Both issues surfaced last session are now FIXED:
- **Parent Message Builder** `7c11d260f`: the Teacher Email fix set applied nearly verbatim as predicted (pendingFocus with select-text state, rawDrafts/isRecord/textValue guards, catalog stat guard, 11→12px). Its crisis-honesty aside ("does not address, send, or monitor... contact local emergency or crisis services now") was already excellent — untouched. Render test covers recipient substitution, empty-body rejection, discard-confirm, save/remove.
- **Suite gate is now race-proof**: `node dev-tools/run_learning_lab_gate.cjs [maxWorkers]` (`3b6469390`) runs the full suite with the DEFAULT reporter (whose summary is written after all workers settle) and fails unless passed == total with zero failures. **Use this instead of --reporter=json for the per-section gate.** It also caught a second failure mode in the wild: under low free RAM (~2GB), vitest workers die with "Zone Allocation failed" OOM and tests silently vanish from the run — pass `2` (or `1`) as the workers argument when the machine is loaded. Gate verified: 2,291/2,291 across 154 files at 2 workers while the machine had <2GB free.

## Session notes (2026-07-21 night, Fable — eleventh continuation)

- **Body Awareness** `528e84ce6`: standard wave (pendingFocusId, rawChecks/isRecord guards — null entries crashed the today-check filter; textValue note/date; non-notification wording; 11→12px; stat guard). Its non-medical framing ("cannot explain or diagnose symptoms") was already excellent. Render test: 9 sliders labelled, malformed ratings clamp to neutral 5, save→completed-state flow, confirmed removal.
- **Achievement Wall** `deb110ec2`: standard wave; null entries crashed `categoryFor`; bogus categories fall back to Academic; independent title/future-date validation render-tested; no cap (renders all). Gate 2,303/2,303 via `run_learning_lab_gate.cjs 2`.
- Mirror SHA-256: `D6BD6176819C5A4F20D4D5C6FDB93EA3ABF20C482C7F6FB382F122DD25131C7C`.

## Session notes (2026-07-21 late night, Fable — twelfth continuation)

- **Affirmation Library** `163e8ffdb`: standard wave — non-array `custom`/`favorites` crashed the library; removed `aria-pressed` from the changing-label favorite toggle (established anti-pattern); its legacy plain-string migration (`legacyTextId`) and "not promises or treatment" framing were already excellent. Render test proves legacy string entries render/remove correctly, favorites toggle with live count, and built-ins are undeletable.
- **Role Models** `7e3526e75`: standard wave (guards, pendingFocusId, textValue fallbacks incl. icon, non-notification wording, 11→12px, stat guard). Gate 2,314/2,314.
- Mirror SHA-256: `A797CEC92D62D9CFFD68775778A12C3BBCDA85C7F62E97537FA6AC7F66CEFD12`.

## Session notes (2026-07-22 early morning, Fable — thirteenth continuation) — PERSONAL TOOLKIT TAIL COMPLETE

- **Learning Reflection** `332389994`: standard wave; object-valued legacy answers would have thrown as React children (textValue-guarded); non-diagnostic framing kept verbatim; per-question missing-answer errors render-tested.
- **Learning Contracts** `2932fcc13`: standard wave; the render test CAUGHT a live crash the static pass missed (string-valued legacy `commitments` blew up `.filter`) — fixed and pinned. Selector lesson: contract cards contain nested `ul`s — scope list counts with `> ul > li`.
- **Emotion Check + Tools** `dce5a7881`: already the best-audited component in the file (useLayoutEffect focus, superb crisis honesty) — only guards, intensity clamping, aria-pressed removal on the breathing toggle, and an HONESTY fix: invalid legacy dates used to render as *now* (`checkDate = new Date()` fallback); they now say "Date not recorded". The old behavior was pinned by both tests; both updated deliberately.
- **Mid-session incident**: the machine exhausted its paging file (concurrent sessions) — PowerShell/Node couldn't spawn for a stretch. The gate runner correctly errored rather than passing incomplete runs; work resumed cleanly. Sessions on this machine should treat "Could not determine Node.js install directory" + assembly-load failures as memory pressure, not tooling breakage. Also: the shell CWD resets to HOME after such crashes — re-`Set-Location` before diagnosing "missing" files.
- Final gate: **2,329/2,329 across 160 files** (1 worker). Mirror SHA-256: `772BD4BAB626124117FC42CCC4E72A136EE95B8C96518395711EAA8AF0A6B512`.

## Session notes (2026-07-22, Fable — fourteenth continuation) — TWO CROSS-CUTTING DEBTS CLOSED

- **CDN verification RESOLVED**: the live artifact at `https://alloflow-cdn.pages.dev/stem_lab/stem_tool_learning_lab.js` hashes to `D6BD6176…` == commit `deb110ec2` (Achievement Wall). The deployed bundle therefore INCLUDES the P0 free-focusById fix, the UTC-date fixes, and everything through 26 audit sections. Only the sections after `deb110ec2` await the next batch deploy (Aaron batches deploys by design). Verify method: `curl.exe -sL` the URL, `Get-FileHash`, match against `git show <commit>:desktop/web-app/public/...` candidates.
- **Timer-focus class COMPLETE** `ba6e1f784`: codemodded all 32 remaining convertible sites (31 components + GoalTracker's `focusGoalView` + 4 selectText variants incl. Script Library / Accommodation Request) to the render-synchronized pendingFocus pattern. The mass-conversion effect deliberately has NO deps array (runs every render) so pending focus lands regardless of which local state change produced the target. **Exactly 2 timer-focus sites remain, both legitimate and now PINNED by the focus-binding gate test**: the shell's `focusCurrentView` (target persists across renders) and the render-error catch path (hooks impossible there). Gate 2,330/2,330; six converted components have rendered focus assertions that passed.

## Goal status

**The Learning Lab file is now fully consistent**: every component uses render-synchronized focus (2 documented exceptions), malformed-data guards, honest wording, and gated tests. The comprehensive WCAG goal continues with the remaining app areas beyond this file (other STEM tools, app shell, SEL hub) plus one decision that is Aaron's: the stale i18n keys serving pre-audit framing in translated packs (mint new keys → English fallback everywhere, or hand-update the affected keys across the 63 packs). Apply the established wave conventions: pendingFocusId focus, Array.isArray/isRecord/textValue guards, optional/local-save/non-communication guidance, hedged claims, no ranking/scoring pressure, 12px minimum helper text, catalog stat guards, paired contract + render tests.

## Completed section reference: Optional Support Request Notes

The former `PersonalAskTracker` / “Ask-for-Help Tracker” section revision, now committed as `d3dd20d32`.

### What the revision changed

- Renames visible framing to “Optional Support Request Notes.”
- Clearly states that saving a note does not send a request or notify anyone.
- Adds a sensitive-data caution.
- Removes “log every request,” destigmatizing/normalizing claims, weekly counts, total-ask scoring, and helpful-percentage ranking.
- Requires at least one user-chosen detail rather than forcing a description.
- Leaves outcome unselected by default and provides a “Clear outcome” control.
- Preserves the existing storage schema and legacy outcome IDs.
- Adds editing, updating, dirty-cancel confirmation, and deterministic focus recovery.
- Uses render-synchronized focus state rather than `setTimeout` focus.
- Renders all saved entries instead of silently limiting history to 15.
- Safely handles non-array and malformed legacy data.
- Uses robust localized dates with “Date not recorded” fallback.
- Replaces the ambiguous icon-only delete action with visible “Delete note.”
- Updates both catalog/navigation fallback descriptions.

### Immediate next work

All of the above was done: `tests/learning_lab_ask_tracker_a11y.test.js` rewritten, `tests/learning_lab_ask_tracker_render_a11y.test.js` added covering every point listed in the previous handoff (guidance, malformed data, blank-submit focus, outcome select/clear, one-detail save, edit/update, dirty cancel, 18-entry full render, confirmed delete focus recovery, no metrics).

Golden command:

```powershell
npx vitest run tests\stem_big_tools_golden.test.js -t learningLab --reporter=dot
```

Bounded full Learning Lab command:

```powershell
npx vitest run learning_lab_ --reporter=json --outputFile=C:\tmp\full.json --maxWorkers=4
```

Before committing any section: verify both product hashes still match a freshly computed guard, run `git diff --check`, inspect scoped status, stage only newly created tests, and use `git commit --only` with exact paths. If either mirror changes unexpectedly, stop and inspect rather than overwriting; another agent may have touched the shared bundle.

## Git lock safety in this shared workspace

The Codex app may leave a zero-byte `.git/index.lock` while many read-only Git processes are active. Never remove it casually and never kill the other processes.

Only consider removal when the lock is zero bytes, older than three minutes, unchanged across two checks, and every active Git command is known read-only. Reject removal if any command line is unavailable or if a writer such as `add`, `commit`, `checkout`, `switch`, `merge`, `rebase`, `reset`, `update-index`, `write-tree`, `read-tree`, `stash`, `cherry-pick`, `revert`, `apply`, `am`, `gc`, or `repack` is active. If no lock exists, commit normally.

## Testing and audit conventions established so far

- Keep root and `desktop/web-app/public` Learning Lab mirrors byte-identical.
- Pair static/source-contract tests with real rendered jsdom interaction tests.
- Use native controls and explicit submit behavior.
- Avoid autofocus; move focus only after a user action or validation failure.
- Synchronize focus with rendered state via React state/effects when a view or record list changes.
- Give destructive actions accessible in-app confirmation and restore focus afterward.
- Do not silently cap saved history.
- Handle malformed and legacy values without crashing or exposing `Invalid Date`.
- Avoid unsupported causal, diagnostic, normative, productivity-pressure, streak, scoring, or ranking claims.
- Explain optional use, what is saved, and what the feature does **not** communicate externally.
- Preserve unrelated fields and records during updates.
- Use descriptive visible action text and at least 44-by-44 CSS-pixel targets.
- Do not treat automated tests as proof of complete WCAG conformance; continue manual keyboard, zoom/reflow, contrast, screen-reader, and browser checks where the environment permits.

The in-app browser was unavailable in this workspace because of the deny-read ACL, so actual rendered jsdom interaction tests have been the practical UI verification layer. Do not claim full conformance solely from these tests.

## Goal status

The comprehensive WCAG goal remains active and is not complete. Optional Support Request Notes (`d3dd20d32`) and Mindfulness Practice (`6598a8ad6`) are done. Continue with `PersonalAnxietyToolkit` and then the remaining app areas, one independently tested and committed section at a time.
