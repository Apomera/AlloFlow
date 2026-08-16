# AlloFlow 10-Agent Fleet — Plan of Record

**Date:** 2026-08-16
**Coordinator:** Claude (11th agent, this session)
**Source:** Aaron's testing pass, 2026-08-16
**Repo:** `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`
**Branch:** `main`

---

## 0. Branch correction (done before planning)

The working tree was checked out on `agent/water-cycle-deep-link`, not `main`. That is the
confusion Aaron suspected.

- `main` was at `94569cd41` (= `origin/main`).
- `agent/water-cycle-deep-link` was at `71e5ebd61`, exactly one commit ahead, zero behind.
  That commit is ChatGPT's "Add Water Cycle Cloudflare deep link" and it edits
  `AlloFlowANTI.txt`, `_redirects`, and the built app in both `app/` and
  `desktop/web-app/public/app/`.

Action taken: verified `main` was a strict ancestor, fast-forwarded `main` to `71e5ebd61`,
and checked out `main`. No history was rewritten, no content churned, nothing was pushed.
`main` is now **1 commit ahead of `origin/main`, 0 behind**.

To undo: `git branch -f main 94569cd41`.

Why this mattered before starting: nearly every lane edits `AlloFlowANTI.txt`. Starting ten
agents on a base that was missing the water-cycle edits would have made that commit
unmergeable later without hand-resolving conflicts in a 55,000-line file.

**Live warning:** another session is editing this tree right now. `view_pdf_audit_source.jsx`,
`view_pdf_audit_module.js`, and `desktop/web-app/public/view_pdf_audit_module.js` changed
between two of my own commands. That file family is off-limits to all ten lanes. There are
also 49 untracked files in the tree from other sessions. Nobody stages, nobody commits.

**Staged-work hazard, for Aaron specifically.** Those three `view_pdf_audit` files are not
just modified, they are **already staged** in the index by the other session. That is the exact
setup that has swept another session's work into an unrelated commit before. When you come to
commit this fleet's output, commit **by explicit pathspec only** — never `git commit -a`, never
`git add -A`, never a bare `git commit` after a broad add. Run `git diff --cached --name-only`
as its own command and read the output before every commit. I left the index untouched rather
than unstaging someone else's work.

---

## 1. The core risk, and the mechanism that contains it

Ten agents share **one working tree**. Git cannot protect uncommitted work: if two agents
edit `AlloFlowANTI.txt` at the same moment, the Edit tool rewrites the whole file and the
second write silently discards the first agent's change. No error, no conflict marker.

Worktrees were rejected: the repo lives inside OneDrive, so ten checkouts would trigger a
sync storm, and prior sessions have been burned by junction-deletion during worktree cleanup.

Containment has three parts:

1. **Exclusive file ownership.** Each lane owns a disjoint set of source files. Ownership is
   listed in the lane's prompt and is the default answer to "can I edit this?" (No.)
2. **An advisory lock on the four hot files** that several lanes genuinely need:
   `AlloFlowANTI.txt`, `ui_strings.js`, `view_sidebar_panels_source.jsx`,
   `generate_dispatcher_source.jsx`. Implemented in `dev-tools/fleet_lock.cjs` (mkdir-atomic,
   locks stored in `C:\tmp\alloflow-fleet-locks`, outside the repo so they never touch git).
   Tested: acquire, contend, cross-lane release refusal, stale reclaim.
3. **No agent commits.** No `git add`, `commit`, `push`, `stash`, `reset`, branch switch, or
   deploy. Aaron batches commits. This follows the standing rules about staged files being
   swept by a concurrent session's commit and the pre-commit hook validating the whole tree.

---

## 2. Architecture the lanes must respect

- `AlloFlowANTI.txt` (55,094 lines) is the canonical React monolith. `build.js` compiles it
  to `desktop/web-app/src/App.jsx`. **Never edit App.jsx.**
- 139 `*_source.jsx` files compile to `*_module.js` through `_build_<name>_module.js`
  (146 builders at repo root). **Always edit the source, never the compiled module** — a
  build wipes manual module edits, and `dev-tools/check_source_freshness.cjs` flags it.
- Some modules are plain JS with **no** source pair and therefore *are* the source:
  `video_studio_module.js`, `math_fluency_module.js`, `student_analytics_module.js`,
  `export_handlers_module.js`, `kokoro_tts_loader.js`, `piper_tts_loader.js`, the
  `agent_core_*` family.
- Three source files are duplicated into `desktop/web-app/src/` and must stay byte-identical:
  `games_source.jsx`, `adventure_source.jsx`, `content_engine_source.jsx`. Guard:
  `node dev-tools/check_source_pair_drift.js`.
- `lang/*.js` packs are keyed against `ui_strings.js` + `help_strings.js`, and every `lang/`
  change mirrors to `desktop/web-app/public/lang/`. Regenerate the manifest with
  `node dev-tools/update_lang_manifest.cjs`.
- Aggregate gate: `npm run verify:gate`. Tests: `npx vitest run <path>`. Roughly 98 tests
  were already failing before this fleet started; only new regressions count.

---

## 3. Issue register

Sixty-one issues from Aaron's pass, mapped to lanes. IDs are stable; lanes cite them in reports.

### Lane 1 — Glossary and word activities
| ID | Issue |
|----|-------|
| G1 | Not all glossary activities accept a non-English word list (bingo, others); crossword appears to but inconsistently |
| G2 | Non-Latin scripts (Arabic, Chinese, and other RTL/CJK) likely broken in crossword and other letter-grid activities |
| G3 | Rename "Glossary and Language Selection" to "Glossary" — it no longer selects language |
| G4 | Emoji enabled in Universal Settings corrupts Word Scramble (tofu boxes / question marks); activities must strip emoji from word tokens |
| G5 | Dark mode: matching worksheet text too dark, crossword too dark, glossary item hover turns white and swallows the text |
| G6 | Phantom empty state: "no words match search" appears with no search term entered |
| G7 | Printable coverage: crossword and other glossary activities should be printable like the rest |

### Lane 2 — Dark mode and the contrast bug class
| ID | Issue |
|----|-------|
| D1 | Typography settings panel: text invisible in dark mode (white on white) |
| D2 | Narrator voice dropdown and several other dropdowns: same failure |
| D3 | Find the whole bug class systematically, not one panel at a time; build a scanner and gate it |

### Lane 3 — Adapted text, cloze, and grade level
| ID | Issue |
|----|-------|
| L1 | Cloze in a non-English lesson: entering the correct English term displays the Spanish term. Should show English, or both |
| L3 | "Simplified" is inaccurate in user-facing copy; should read "Adapted text" (code identifiers stay) — e.g. the full-pack plan display |
| L4 | Consider making cloze mode printable |
| C1 | Reading level overshoot: a 5th grade request lands around 7th, worse with web research enabled |
| N7 | Standards finder uses the Universal Settings grade level instead of the grade level of the section the user is in |
| T3 | Lesson plan generation is inconsistent about honoring a non-English output language |

### Lane 4 — Translations architecture
| ID | Issue |
|----|-------|
| T1 | Add "Include translations" to Universal Settings: on by default, and language-agnostic rather than English-hardcoded |
| T2 | Audit what actually emits translations today, and whether it uses English or the app UI language (Aaron is unsure which) |
| T2b | Decide and implement the control shape: toggle plus target-language selector, defaulting sensibly without adding user burden |

### Lane 5 — Localization sweep and help strings
| ID | Issue |
|----|-------|
| S1 | Newer UI is not localized; sweep for hardcoded English and extract to `ui_strings.js` |
| S2 | `help_strings.js` coverage is stale (many new features), some entries are inaccurate, reading level is too high |
| S2b | Localize the new and corrected help strings across the language packs |

### Lane 6 — Voice and TTS core
| ID | Issue |
|----|-------|
| V1 | Kokoro loading screen takes over the whole screen, appears even when Kokoro is already downloaded, and fires without user action |
| V2 | Kokoro cold start: first attempt fails or does nothing; only works after a warm-up |
| V3 | Piper errors surface raw to users ("unexpected token E", "entry not found", "not valid JSON"), apparently on non-English |
| V4 | Browser TTS toggle off breaks Gemini non-English TTS in a way that looks unrelated |
| V5 | Kokoro missing from the voice list on iPhone |
| V6 | Browser TTS cannot be chosen as the primary voice, only as a fallback — it is the low-latency option and needs first-class selection |
| V9 | Explore open-source TTS faster than Kokoro for interactive use |
| V10 | Users cannot tell whether TTS is generating, downloading, or saved |
| L2 | Karaoke TTS for non-English does not appear to save (edit view shows no saved audio) |

### Lane 7 — AlloBot hands-free and commands
| ID | Issue |
|----|-------|
| A1 | Command matching dominates: free speech gets "no command recognized". Conversation must be the default, commands recognized opportunistically |
| A2 | "Build a lesson" wrongly opens Quick Start even when the user is past that stage |
| A3 | The AlloBot X button and the header toggle behave inconsistently; both should disable tips only, never TTS |
| A4 | No mic input feedback — the user cannot tell they are being heard |
| A5 | Recording states (red = recording, orange = standby) have no ARIA labeling; WCAG gap |
| V7 | Test Prep Hub hands-free is unreliable, likely latency; may need its own voice selection |

### Lane 8 — Exports, annotation, document builder
| ID | Issue |
|----|-------|
| E1 | Large text size in HTML/PDF export clips content; glossary is cut off |
| E2 | Consider a slider instead of a stepped button for export text size |
| E3 | HTML export offers far fewer fonts than the app |
| E4 | The difference between "Worksheet" export and "Save / Print PDF" is not clear; differentiate or explain |
| E5 | Annotate: the "Mind" tool does nothing visible; also add freehand Draw |
| E6 | Annotations float above the page instead of anchoring to the resource, and do not move with scroll |
| E7 | Expert Workbench does not surface in Document Builder (it exists in the remediation panel) |

### Lane 9 — Shell UX: guided mode, tour, toasts, storage
| ID | Issue |
|----|-------|
| N1 | Guided mode presents too much at once; it should reduce cognitive load, not add it. Wants a clear next step, possibly a pulse cue |
| N2 | Guided mode traps focus: clicking History does not go to History, and the user cannot tell they must exit guided mode |
| N3 | The tour predates the current Create Resource panel and is out of date |
| N4 | "Create Resource" actually filters resources; rename, and revisit floating vs fixed, collapse, and dismissal |
| N5 | AI settings "Manage local storage" opens an obsolete diagnostics view instead of the resource pack history |
| N6 | Analyze Source Material sits after Universal Settings, which does not apply to it |
| D4 | Toasts moved to bottom-left and sit under the cursor during generation; also, they vanish before slow readers finish |
| D5 | "Saved to device" chip is permanent; should auto-dismiss |
| D6 | The cached-remediation chip covers the student tools bar; make it dismissible and reachable from Manage Local Storage |
| D7 | The decorative "You write it" pill in assignment directions looks clickable but is not; an arrow would be better |

### Lane 10 — Modes, structure, and naming
| ID | Issue |
|----|-------|
| C2 | Language deck practice mode marks a correct answer wrong (audio says right, UI says wrong) |
| C3 | Educator evaluation mode reads as a local-only prototype; the secondary QR path is unclear; it should be usable from the app |
| C4 | Adventure mode always shows in the student panel; it should appear only when the lesson includes it, and stale "resume" can pull students into an old lesson |
| C4b | Student view mode generally is overdue for a review |
| C5 | STEM Lab has outgrown being a mode of the math tool; math fluency is buried and undiscoverable |
| C6 | Video Studio still carries the IT helper demo now that it is standalone, and its UI is overloaded |
| C7 | "Visual Support" is an umbrella term for what is really image generation; rename |
| N8 | Family mode has not been audited against recent features |

### Lane 11 — Teacher manual (added 2026-08-16, after fleet launch)
| ID | Issue |
|----|-------|
| M1 | Accuracy audit: every chapter claim verified against the current app |
| M2 | Coverage audit vs FEATURE_INVENTORY; close teacher-first gaps; COVERAGE.md |
| M3 | Final sweep absorbing all L1-L10 user-facing changes before finishing |
| M4 | Readability pass (~8th grade), editorial rules |
| M5 | Builder health: reproducible rebuild, search index, propose --check mode |
| M6 | End-to-end read of the consolidated manual as a distribution artifact |

Lane 11 owns `docs/teacher-guide/**`, `dev-tools/build_teacher_guide.cjs`, and the generated
`guide/**` + `AlloFlow Complete User Manual.md` (rebuild only). Near-zero contention: it needs
no hot-file lock, treats `tool-catalog-data.js` as read-only, and is sequenced to finish after
the other lanes so the manual documents the post-fleet app.

### Coordinator (me, not delegated)
| ID | Issue |
|----|-------|
| C8 | Standalone STEM tool deep links for distribution (water cycle is the pilot; ~130 tools). Strategy question, and the tail of Aaron's message was truncated, so I need his input before scoping this |
| V9b | Whether to adopt a faster TTS engine is a build-vs-buy call for Aaron; Lane 6 researches, Aaron decides |

---

## 4. Contention map

Files touched by more than one lane, and how that is resolved.

| File | Lanes | Resolution |
|------|-------|-----------|
| `AlloFlowANTI.txt` | most | `fleet_lock.cjs`, Edit only, never Write |
| `ui_strings.js` | 1, 3, 5, 9, 10 | `fleet_lock.cjs`; Lane 5 owns structure and translation propagation, others add keys under lock |
| `view_sidebar_panels_source.jsx` | 2, 4, 9 | `fleet_lock.cjs` |
| `generate_dispatcher_source.jsx` | 3, 4 | `fleet_lock.cjs`; Lane 3 owns grade/reading-level directives, Lane 4 owns translation directives |
| `games_source.jsx` dark mode | 1, 2 | Lane 1 fixes it; Lane 2 diagnoses and hands findings over |
| `help_strings.js` | 5 only | exclusive |
| `app_styles_source.jsx` | 2 only | exclusive |
| `view_pdf_audit_*` | none | another session owns it; off-limits |

Anything a lane needs outside its ownership goes into `CROSS_LANE_REQUESTS.md` as an
append-only bullet, not an edit.

---

## 5. Sequencing

All ten start immediately; none blocks another. Two soft dependencies, handled by ordering
within the lane rather than by waiting:

- **Lane 5** does its extraction sweep continuously but should run its final translation
  propagation late, after other lanes have added their new keys. Its prompt says so.
- **Lane 4** defines the translation setting; **Lane 3** consumes it for lesson plans. Lane 3
  is told to code against the setting's contract and to note the dependency rather than stall.

---

## 6. What each lane returns

`FLEET_2026-08-16/reports/L<N>_report.md`, written incrementally: per issue, what was found,
what changed with `file:line`, what was verified and how, and anything deliberately left for
Aaron. Product-judgment calls are made by the lane and recorded, not escalated mid-run.
