# X3 report — localization of the wave-1/wave-3 surfaces (wave 3)

**Status: gate-critical and high-visibility sets DONE; guided.* deferred honestly.**
2026-08-17 · run inline by the coordinator.

## Landed (keys × languages)

| Delta | Keys | Languages | Values | Pipeline |
|---|---|---|---|---|
| cmd palette (X6's six new commands) | 18 | 63 | **1,134** | `cmd_delta_hand_20260817_part{1,2,3}.cjs` → `apply_cmd_delta_20260817.cjs` (validates: 63 langs, 18 slots, no blanks, no em/en dashes, brand names survive) → `merge_cmd_keys.cjs` (additive, never --overwrite) |
| ui_strings (deep-link banner ×4, Canvas card ×4, family dashboard ×1, AI-setup notice ×2) | 11 | 63 | **693** (×2 dirs = 1,386 writes) | `ui_delta_hand_20260817_part{A,B}.cjs` → `apply_ui_delta_20260817.cjs` (same validator shape + per-slot brand-token checks: AlloFlow, Gemini Canvas, gemini.google.com URLs verbatim) |

- **check_cmd_i18n: exit 0 again** (it was red after X6 added the commands; 63/63 packs complete).
- **cmd value-staleness gate: still 13,066** — all 1,134 new values are genuine translations,
  zero English passthrough (the X4 gate proves it: no pack grew).
- All 11 ui keys **blessed** (`bless_lang_sources --key …`), so the staleness ledger starts
  true for them; `--gate-guarded` green. (The 18 cmd keys are outside the ui bless baseline
  by design — cmd staleness is X4's value-level checker's job.)
- `check_lang_json`: 63/63 valid after every write; packs mirrored to
  `desktop/web-app/public/lang/`.

## Translation quality notes (honest)

- House rules held: brand/surface names untranslated per the `cmd.open_stem_lab` convention
  ("Document Builder" translates, "STEM Lab"/"AlloFlow"/"Gemini Canvas" do not); "jigsaw"
  borrowed where the language has no established pedagogy term; no em dashes anywhere
  (validated mechanically, not just intended).
- **Flag for native review** (lowest confidence, in order): acholi, chin_falam, chin_hakha,
  karen, maay_maay, marshallese, tigrinya, hmong, lingala, kirundi. These are careful but
  non-native renderings; the delta files make per-language re-review trivial.

## Deferred, with sizing

- **`guided.*` (~337 keys × 63 ≈ 21k values)** — the prompt's priority 1. Not attempted
  tonight: at hand-translation quality this is multiple sessions of work on its own, and a
  rushed pass would violate the translation-or-nothing rule at scale. The banner/step-flow
  subset (~40 keys) is the right first bite for a dedicated lane.
- `sidebar.tool_finder_*` (~26), `hints.*` (~9), `storage.*`/`platform_diag.*` blocks,
  `voice_control.*`, `export_preview.*` — untouched, as is the X5 extraction inventory
  (190 keys; the FERPA-tagged subset in X5's report needs REVIEWED translation only).
- X4's cmd value-staleness worklist (13,066 identical values) — the standing backlog register.
