# Language Pack Quality Status

**Last updated:** 2026-05-26

This file tracks known quality issues across language packs that exist but
need improvement. Updated when meaningful cleanup happens.

## Polish — 53.0% Cyrillic contamination cleaned (significant progress)

**Original state:** Built via Russian → Polish substitution dictionary at
commit `cba41c51`. 83.7% of keys (8,339 of 9,965) contained mixed Russian
+ Polish text, with 214,954 stray Cyrillic characters.

**Current state (after 10 cleanup commits 2026-05-26, ending at 36a27454):**
- Contaminated keys: 8,339 → 5,505 (34% fully cleaned)
- Cyrillic characters: 214,954 → 101,120 (53.0% removed)
- High-visibility surfaces (common, modals, help_mode) are clean.

**Approach taken:** Russian → Polish word dictionary (~800 mappings),
mixed-script suffix fixes (Polish stem + Russian inflection patterns
like `opisм` → `opisem`, `uczeńов` → `uczniów`), and 14 high-impact
stub-string rewrites covering ~895 keys at once.

**Sections still heavily contaminated (60%+ Cyrillic):**
- `baking.*` 91.6%, `stem.*` 89.5%, `a11y_lab.*` 84.9%
- `adventure.*` 79.8%, `pdf_audit.*` 74.7%
- `behavior_lens.*` 69.9% (largest single source by char count)
- `tour.*` 65.4%, `toasts.*` 66.9% (high visibility, still need work)

**Next steps:** Continue dictionary expansion focused on domain vocab in
the still-contaminated sections, or hand-translate the tour/toast keys
since they're the most user-visible.

## Pashto / Urdu / Dari / Farsi — Arabic-language contamination

Discovered 2026-05-26 via cross-pack similarity audit. All four packs
were built via partial substitution from the Arabic pack. Evidence:

- Identical Arabic-word frequencies across all 4 (359× إنشاء, 354×
  الذكاء, 240× جميع, 210× يمكن).
- Dari ↔ Farsi 88.1% byte-identical (same language, two regional names).
- 16-25% of keys are byte-identical to Arabic source.
- Smoking-gun samples: "شراوع کریں رحلة إنشاء درسك هنا" mixes Urdu
  (شراوع کریں = "start") with Arabic (رحلة إنشاء درسك هنا = "your lesson
  creation journey here").

**Why this is hard:** Same script makes detection harder than
Polish/Russian. Persian/Urdu/Pashto share extensive Arabic loanwords, so
not every Arabic word is a bug. Reliable cleanup requires bilingual
review and per-language target dictionaries (e.g., Persian "ایجاد" vs
Urdu "تخلیق" vs Pashto "جوړونه" for Arabic "إنشاء").

**Status:** Not auto-fixable in current session. Common UI buttons
(common.save = محفوظ کریں, common.cancel = منسوخ کریں) are clean per-pack,
but tour/toast/help_mode body text is contaminated. Needs human review.

## Polish / Russian help_mode — stub saturation (structural, not contamination)

~85% of `help_mode.*` keys (715 of 796) collapse to 12 generic stub
strings ("Element interfejsu. Wskazówka z opisem funkcji.") repeated
for unrelated tooltips. Polish stubs are now in clean Polish after the
2026-05-26 cleanup; Russian stubs are still proper Russian. Both are
structurally stubs — same generic text mapped to many different
tooltips. Would need 715 unique translations to fix.

## Hebrew / Arabic tour sections — content dropped

23 long `tour.*` keys per pack have the first paragraph well-translated
but lost all `### Section` structured content. Examples:

- `tour.input_panel_text`: source 1,483 chars → Hebrew 139 chars
  (kept opening paragraph, dropped 16 lines of bullet-list explanation)
- `tour.analysis_text`: source 1,173 chars → Arabic 136 chars

This is real translation work (no contamination), would need ~46,000
chars of structured Hebrew/Arabic content written.

## Japanese — help_mode single-sentence stubs

~712 `help_mode.*` keys reduced to single-sentence stubs that
abbreviate the source (e.g., "実行基準検索。" for 593 chars of source
content). Distinct from Polish/Russian (which use 12 templates) —
each Japanese stub is unique, just abbreviated. Distinguishable from
legitimate Chinese compactness because Chinese maintains 21-30% of
source length with full meaning, while Japanese stubs are at 1-9%.

## Cross-pack quality summary

| Pack | Quality concern | Auto-fixable? |
|---|---|---|
| Polish | Russian contamination (49.2% cleaned) | Yes, continue dictionary |
| Russian | help_mode stubs (12 templates × 715 keys) | No, structural |
| Pashto/Urdu/Dari/Farsi | Arabic contamination | No, needs bilingual review |
| Hebrew/Arabic | Tour `###` sections dropped | No, real translation work |
| Japanese | Help_mode single-sentence stubs | No, real translation work |
| Chinese (Simp/Trad) | None — legitimate language compactness | N/A |
| All other ~46 packs | Generally clean per cross-script audit | N/A |
