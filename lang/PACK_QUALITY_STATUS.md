# Language Pack Quality Status

**Last updated:** 2026-05-26

This file tracks known quality issues across language packs that exist but
need improvement. Updated when meaningful cleanup happens.

## Polish — 56.6% Cyrillic contamination cleaned (12 commits)

**Original state:** Built via Russian → Polish substitution dictionary at
commit `cba41c51`. 83.7% of keys (8,339 of 9,965) contained mixed Russian
+ Polish text, with 214,954 stray Cyrillic characters.

**Current state:** Cleaned over 12 commits 2026-05-26 (861fd209 through 3fc863dc):
- Contaminated keys: 8,339 → 5,213 (37% fully cleaned)
- Cyrillic characters: 214,954 → 93,324 (56.6% removed)
- High-visibility surfaces (common, modals, help_mode) are clean.

**Approach taken:** Russian → Polish word dictionary (~1,200 mappings),
mixed-script suffix fixes (Polish stem + Russian inflection patterns
like `opisм` → `opisem`, `uczeńов` → `uczniów`), and 14 high-impact
stub-string rewrites covering ~895 keys at once.

**Remaining contamination is long-tail vocabulary** in tour body text,
behavior_lens/stem/adventure sections. Further cleanup is achievable
by continuing dictionary expansion in future sessions.

## Persian/Farsi/Dari — Arabic contamination cleaned (2 rounds, ~10K replacements)

**Original state:** Persian/Farsi/Dari were built via partial substitution
from Arabic. 16-26% of keys were byte-identical to Arabic. Identical
Arabic-word frequencies across all 3 packs confirmed shared contaminated
source.

**Current state (commits 882585ba, bac96f0a):**
- Farsi/Dari: 5,518 replacements applied per pack (88% identical packs)
- High-visibility UI: clean (e.g., common.save → ذخیره)
- Tour/toast body text: substantially cleaner but long-tail Arabic remains

Note: `lang/persian.js` does not exist — Persian is served via Farsi/Dari
slugs in the language matcher.

## Urdu — Arabic contamination cleaned (2 rounds, 4,347 replacements)

**Current state (commits 733e9521, add30889):**
- 2,648 round 1 + 1,699 round 2 = 4,347 replacements total
- Common buttons clean (محفوظ کریں, منسوخ کریں, تصدیق کریں)
- Toast/tour body text substantially cleaner (e.g., file_large now reads
  proper Urdu "براہ کرم اسے کمپریس کریں" instead of Arabic "يُرجى ضغطه")
- "ميجابايت" → "میگا بائٹ" (Urdu transliteration)

## Pashto — Arabic contamination cleaned (2 rounds, 3,851 replacements)

**Current state (commits c5629df8, 80876802):**
- 2,164 round 1 + 1,687 round 2 = 3,851 replacements total
- Common buttons clean (خوندي کول for save, لغوه کول for cancel)
- Body text now uses Pashto vocabulary (ټول for all, کولی شي for can,
  ډېر for very, لطفاً for please)

## Polish / Russian help_mode — stub saturation (structural, not contamination)

~85% of `help_mode.*` keys (715 of 796) collapse to 12 generic stub
strings ("Element interfejsu. Wskazówka z opisem funkcji.") repeated
for unrelated tooltips. Polish stubs are now in clean Polish; Russian
stubs are still proper Russian. Both are structurally stubs — same
generic text mapped to many different tooltips.

**Why this isn't easily fixable:** The source `help_strings.js` has NO
stub patterns — every English help_mode tooltip is unique content. The
715 keys in Russian/Polish help_mode that map to 12 generic strings need
actual translation work, not algorithmic substitution.

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

| Pack | Quality concern | Status |
|---|---|---|
| Polish | Russian contamination (12 rounds, 56.6% cleaned) | Ongoing — continue dictionary |
| Farsi/Dari | Arabic contamination (2 rounds) | Cleaner; long-tail remains |
| Urdu | Arabic contamination (2 rounds) | Cleaner; long-tail remains |
| Pashto | Arabic contamination (2 rounds) | Cleaner; long-tail remains |
| Russian | help_mode stubs (12 templates × 715 keys) | Structural; needs hand-translation |
| Hebrew/Arabic | Tour `###` sections dropped | Needs ~46K chars hand translation |
| Japanese | Help_mode single-sentence stubs | Needs hand translation |
| Chinese (Simp/Trad) | None — legitimate language compactness | ✓ |
| All other ~46 packs | Generally clean per cross-script audit | ✓ |
