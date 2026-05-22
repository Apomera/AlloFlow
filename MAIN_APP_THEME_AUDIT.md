# Main App Dark/Contrast Mode Audit

**Generated**: 2026-05-19 (Claude Opus 4.7)
**Trigger**: Aaron noticed some buttons in main-app chrome aren't responsive to dark theme. Audit covers everything outside `stem_lab/` and `sel_hub/` subdirectories.
**Companion**: [STEM_LAB_THEME_AUDIT.md](STEM_LAB_THEME_AUDIT.md) for STEM tools; [DA_AUDIT.md](DA_AUDIT.md) for dynamic_assessment.

## TL;DR

Two distinct issues. They have very different fixes.

**Issue 1 (chrome — high priority, small fix)**: Chrome modules use Tailwind utility classes (good), but **93 of those classes have NO `.theme-dark` override**. Color families like `amber-*`, `emerald-*`, `cyan-*`, `sky-*`, `violet-*`, `fuchsia-*`, `lime-*` are entirely uncovered. Cards using `bg-amber-50` stay cream-colored in dark mode, looking out of place. Fix: extend the existing `.theme-dark .bg-X` CSS block in AlloFlowANTI.txt with ~93 new rules. One focused session.

**Issue 2 (tool internals — medium priority, larger lift)**: A handful of tools render heavy inline-style hex literals that bypass the `.theme-dark` override system entirely. Top offenders: `doc_pipeline` (235), `dynamic_assessment` (213), `symbol_studio` (190), `poet_tree` (97), `view_pdf_audit` (173). These need per-tool migration similar to STEM tools — either to Tailwind classes or to CSS variables.

## Issue 1 details — uncovered Tailwind classes

The existing `.theme-dark` CSS at [AlloFlowANTI.txt:21849-21955](AlloFlowANTI.txt#L21849) covers:

✅ **Has dark override**: `bg-white`, `bg-slate-50/100/200/300/400`, `bg-indigo-50/100/700/800/900`, `bg-blue-50`, `bg-green-50`, `bg-red-50`, `bg-yellow-50`, `bg-purple-50`, `bg-teal-50`, `bg-rose-50/50/80`, `bg-cyan-50`, `bg-orange-50`

❌ **Used in chrome but has NO override**: 93 distinct classes including:

| Color family | Uncovered shades |
|---|---|
| `amber` | 50, 100, 200, 300, 400, 500, 600, 700, 900 |
| `blue` | 100, 200, 300, 400, 500, 600, 700, 800, 900 |
| `cyan` | 100, 500, 600, 700 |
| `emerald` | 50, 100, 200, 500, 600, 700 |
| `fuchsia` | (varies) |
| `green` | 100, 200, 300, 400, 500, 600, 700, 800, 900 (only 50 covered) |
| `indigo` | 200, 300, 400, 500, 600 (50, 100, 700-900 covered) |
| `lime` | all |
| `orange` | 100, 200, 300, 400, 500, 600, 700, 800, 900 (only 50 covered) |
| `pink` | most |
| `purple` | 100, 200, 300, 400, 500, 600, 700, 800, 900 (only 50 covered) |
| `rose` | 100, 200, 300, 400, 500, 600, 700, 800, 900 |
| `sky` | most |
| `slate` | 500, 600, 700, 800, 900 (50-400 covered) |
| `teal` | 100, 200, 300, 400, 500, 600, 700, 800, 900 |
| `violet` | most |
| `yellow` | 100, 200, 300, 400, 500, 600, 700, 800, 900 |

### Why this causes the "buttons aren't responsive" symptom

A button styled with `className="bg-emerald-500 text-white"`:
- **Light theme**: emerald-500 background (greenish), white text. Looks right.
- **Dark theme**: emerald-500 background (SAME greenish, because no `.theme-dark .bg-emerald-500` override exists), white text. The button stays bright emerald and pops awkwardly against the dark slate background.
- **Contrast theme**: covered by the blanket `.theme-contrast button` rule, so it becomes black-with-green-border. OK.

The fix isn't to force every button to flip — saturated mid-shade buttons (bg-blue-500, bg-emerald-500) often *should* stay their color even in dark mode. The fix is to:
- **Override soft shades (bg-X-50, bg-X-100)** so they tint dark instead of staying cream/pastel. Pattern from existing covered families: `rgba(<X-900>, 0.4)` for background, `<X-700>` for border.
- **Audit mid-shades case-by-case**: most should keep their saturated color. A few (like `bg-slate-500` used as a card background) might need a darker variant.

## Issue 1 proposed fix — extend the `.theme-dark` block

Add CSS rules mirroring the existing pattern at AlloFlowANTI.txt:21849+:

```css
/* Newly covered light-shade families */
.theme-dark .bg-amber-50 { background-color: rgba(120, 53, 15, 0.4) !important; border-color: #a16207 !important; }
.theme-dark .bg-amber-100 { background-color: rgba(146, 64, 14, 0.55) !important; border-color: #b45309 !important; }
.theme-dark .bg-emerald-50 { background-color: rgba(6, 78, 59, 0.4) !important; border-color: #047857 !important; }
.theme-dark .bg-emerald-100 { background-color: rgba(6, 95, 70, 0.55) !important; border-color: #065f46 !important; }
.theme-dark .bg-cyan-100 { background-color: rgba(14, 116, 144, 0.55) !important; border-color: #0e7490 !important; }
.theme-dark .bg-sky-50 { background-color: rgba(7, 89, 133, 0.4) !important; border-color: #0369a1 !important; }
.theme-dark .bg-sky-100 { background-color: rgba(7, 89, 133, 0.55) !important; border-color: #0284c7 !important; }
.theme-dark .bg-violet-50 { background-color: rgba(91, 33, 182, 0.4) !important; border-color: #6d28d9 !important; }
.theme-dark .bg-violet-100 { background-color: rgba(109, 40, 217, 0.55) !important; border-color: #7c3aed !important; }
.theme-dark .bg-fuchsia-50 { background-color: rgba(134, 25, 143, 0.4) !important; border-color: #a21caf !important; }
.theme-dark .bg-lime-50 { background-color: rgba(63, 98, 18, 0.4) !important; border-color: #4d7c0f !important; }
.theme-dark .bg-orange-100 { background-color: rgba(154, 52, 18, 0.55) !important; border-color: #c2410c !important; }
.theme-dark .bg-rose-100 { background-color: rgba(159, 18, 57, 0.55) !important; border-color: #be123c !important; }
.theme-dark .bg-pink-50 { background-color: rgba(131, 24, 67, 0.4) !important; border-color: #9d174d !important; }
.theme-dark .bg-pink-100 { background-color: rgba(157, 23, 77, 0.55) !important; border-color: #be185d !important; }
.theme-dark .bg-yellow-100 { background-color: rgba(133, 77, 14, 0.55) !important; border-color: #a16207 !important; }
.theme-dark .bg-purple-100 { background-color: rgba(107, 33, 168, 0.55) !important; border-color: #7e22ce !important; }
.theme-dark .bg-green-100 { background-color: rgba(22, 101, 52, 0.55) !important; border-color: #15803d !important; }
.theme-dark .bg-teal-100 { background-color: rgba(15, 118, 110, 0.55) !important; border-color: #0f766e !important; }
.theme-dark .bg-blue-100 { background-color: rgba(30, 64, 175, 0.55) !important; border-color: #1e40af !important; }
.theme-dark .bg-blue-200 { background-color: rgba(29, 78, 216, 0.6) !important; border-color: #2563eb !important; }
.theme-dark .bg-indigo-200 { background-color: rgba(67, 56, 202, 0.6) !important; border-color: #4338ca !important; }

/* Mid-shade overrides for cases where saturation needs to soften in dark */
.theme-dark .bg-slate-500 { background-color: #475569 !important; }
.theme-dark .bg-slate-600 { background-color: #334155 !important; }
.theme-dark .bg-slate-700 { background-color: #1e293b !important; }
```

**Scope**: ~80 new CSS rules. ~150 lines of CSS appended to the existing block. One focused session including manual verification.

## Issue 1 same treatment for `.theme-contrast`

The blanket `.theme-contrast [class*="bg-"] { background-color: #000000 !important; }` at line 22023 catches everything by attribute selector. So in contrast mode all bg-X classes flip to black already. **No additional contrast rules needed for Issue 1.** ✓

## Issue 2 details — inline-style heavy modules

Files using `style={{ background: '#xxx' }}` inline literals (these bypass `.theme-dark .bg-X` CSS overrides entirely):

| File | Inline-bg count | Category |
|---|---|---|
| `doc_pipeline_module.js` | 235 | PDF accessibility tool |
| `dynamic_assessment_module.js` | 213 | Clinical tool (already partly audited in DA_AUDIT.md) |
| `symbol_studio_module.js` | 190 | AAC platform |
| `poet_tree_module.js` | 97 | Poetry tool |
| `view_pdf_audit_module.js` + source | 173 (combined) | PDF audit view |
| `allohaven_module.js` | 31 | Cozy room game |
| `student_analytics_module.js` | 31 | RTI dashboard |
| `story_stage_module.js` | 30 | Story tool |
| `view_submission_inbox` + source | 56 (combined) | Submission queue |
| `story_forge_module.js` | 25 | Creative writing |
| `behavior_lens_module.js` | 25 | FBA/BIP clinical |
| `math_fluency_module.js` | 20 | Math drills |

These are **not main-app chrome** — they're individual tools like the STEM Lab tools, each with their own design. They have the same architectural issue: inline styles bypass the `.theme-dark` system. Fix is same approach as STEM Lab migration:

1. Define theme-aware CSS variables (could reuse the `--allo-stem-*` ones, or define a separate `--allo-tool-*` set if the dark palette should differ)
2. Migrate inline hex literals to `var(--allo-tool-canvas)` etc.
3. Preserve any content-driven dark regions (e.g., a clinical-report preview that should print white-on-white regardless of theme)

**Scope**: roughly 1,300 inline backgrounds across the heavy modules. ~3-5 sessions for full migration if done carefully, or ~2 sessions covering doc_pipeline + symbol_studio + view_pdf_audit (~600 occurrences) for the highest-impact 50%.

## AlloFlowANTI.txt inline backgrounds — 11 total, mostly fine

I checked. They live in:
- Print-output HTML templates (lines 8269, 8276, 14239, 15173) — print stylesheets shouldn't flip
- Loading screen progress bar (line 21594) — `#1e293b` is part of a loading splash that shows briefly before the app renders. Worth flipping but low priority.
- Floating debug/feedback buttons (lines 24457, 24484) — `#1e3a8a` and `#9f1239`. These could become `var(--allo-stem-button-bg)` or similar.
- A "NOW" badge in a list view (line 24614) — `#eef2ff` (indigo-50-ish); should flip in dark.
- Avatar/role badges (lines 25802, 25806) — `#7c3aed` and `#dc2626` purple/red. These encode role; might stay saturated.
- Fatal-error fallback HTML (line 25867) — `#0f172a` background for the error page. Could stay dark.

**Verdict**: the monolith's 11 inline backgrounds are mostly intentional/peripheral. Not the cause of the "buttons not responsive" symptom.

## Priorities for fixes

**Priority 1 (high impact, small lift) — Extend `.theme-dark` CSS for uncovered light shades**

- ~80 new CSS rules in AlloFlowANTI.txt
- Covers cards/panels/badges that currently stay cream/pastel in dark mode
- Single focused session
- After this, most "missing dark mode" complaints in the chrome should resolve

**Priority 2 (medium impact, medium lift) — Migrate top inline-heavy tools**

- doc_pipeline (235), symbol_studio (190), view_pdf_audit (173) first → ~600 of 1,300 inline backgrounds
- Use the same `--allo-stem-*` variables already defined (or define `--allo-tool-*` if needed)
- Per-tool visual verification in 3 themes
- ~2 sessions for top-3, ~3-4 more for the rest

**Priority 3 (low impact, surgical) — Monolith inline backgrounds**

- Loading screen progress bar
- Floating debug buttons
- "NOW" badge
- Total ~5 small edits
- Maybe 20 minutes in any future session as cleanup

## What this audit deliberately does NOT cover

- **STEM Lab tools** — separate audit in [STEM_LAB_THEME_AUDIT.md](STEM_LAB_THEME_AUDIT.md)
- **SEL Hub tools** — would need their own audit; lower priority
- **dynamic_assessment internals** — already covered in [DA_AUDIT.md](DA_AUDIT.md) (the 213 inline backgrounds there should migrate via CSS variables in the next DA work session)
- **Print-output HTML templates** — these intentionally don't flip with theme; they're for paper output
- **Canvas-drawn graphics** — `ctx.fillStyle = '#xxx'` doesn't accept CSS variables; needs different approach if theme-responsive canvas is desired (rarely is)

## Recommendation

Start with **Priority 1**. It's a contained CSS-only change that addresses the most-visible symptom (cards and badges in chrome staying light-colored in dark mode). After it deploys, you'll see whether the remaining "not responsive" cases are still significant — if so, those will likely all be in Priority 2 heavy tools, and we can prioritize from there based on what's most user-visible.
