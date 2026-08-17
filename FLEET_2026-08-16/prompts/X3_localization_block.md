You are **Lane X3** of wave 3 in `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`, branch
`main`. Read `FLEET_2026-08-16/RULES.md`, `WAVE3_PLAN.md`, and — mandatory — the W1 report
(`reports/W1_report.md`), whose method sections are your operating manual: the t() fallback
finding (English-passthrough filling is WORSE than nothing), the delta-file pipeline
(`dev-tools/i18n/*_delta_hand_20260816*` + appliers), the placeholder-integrity validator
pattern, and the bless step (`bless_lang_sources.cjs`) that keeps the staleness ledger true.
Lane ID **X3**. You own `lang/**` (+ mirror), `dev-tools/i18n/**`; `ui_strings.js` under lock
only for reading anchors.

## Mission: translate the wave-1 UI into the packs

Wave 1 built major user-facing surfaces whose strings render English in all 63 languages
today (correct fallback, but a quality gap Aaron wants closed). Hand-translate, using W1's
delta-file pipeline (validator first, additive merge, never --overwrite, mirror both dirs,
regenerate the manifest, bless what you bring current).

## Priority order, by user traffic

1. **`guided.*`** (~337 keys) — Guided Mode is the recommended entry route for new teachers,
   which makes it the single highest-visibility English-only namespace for non-English users.
   This is most of your lane. If the volume forces triage inside it, the banner/step-flow
   strings outrank the Planning Studio's power-user strings; say what you deferred.
2. **`sidebar.tool_finder_*`** (~26) and **`hints.*`** (~9) — the renamed panel and Messages log.
3. **`storage.*`, `platform_diag.*`, `pdf_audit.return_pill*`, `canvas_settings.*`** — small
   blocks from L9/W1.
4. **`voice_control.*` + `bot.mic_*`** (10, with `{action}`/`{topic}` placeholders) and
   **`export_preview.*`** (9, long prose — the most expensive per key; do them last and only
   if the budget allows).
5. **Late sweep:** whatever new keys X5's extraction adds this wave (check X5's report before
   finishing) plus `shell_link.*` (4) and `ai_backend.guided_card_canvas_*` (4) from the
   coordinator — small and high-visibility, do these regardless.

## Standing rules

- Translation or nothing — never English passthrough (it freezes packs against future edits).
- Placeholders survive verbatim (`{action}`, `{topic}`, `{output}`, `{target}`, `{query}`,
  `{filter}`, `{size}`); the delta validator must enforce this before any write, W1-style.
- Brand names and surface names untranslated per house convention (verify against how
  existing packs handle `cmd.open_stem_lab`).
- `node dev-tools/check_lang_json.cjs` after every batch; packs are JSON.parsed and fail hard.
- Check `lang/*_HANDOFF.md` before touching human-owned partial packs.
- Bless every key you bring current so `check_lang_staleness`'s ledger drops honestly; report
  the before/after stale count.

Report → `FLEET_2026-08-16/reports/X3_report.md`: keys × languages landed, validator results,
staleness delta, and the honest remainder table.
