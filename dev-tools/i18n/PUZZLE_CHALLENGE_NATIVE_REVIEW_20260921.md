# Puzzle Challenge rename — native-review handoff, 2026-09-21

On 2026-09-13 (`b4d7ed714`) the quiz tool was renamed from **Escape Room** to
**Puzzle Challenge** in `ui_strings.js`, freeing the name "Escape Room" for the
separate connected/investigation tool. The English changed; the language packs
did not. Every pack kept the retired name, either as untranslated English or
embedded as a proper noun inside an otherwise translated sentence
(`"Начать Escape Room"`, `"Starten Escape Room"`, `"เริ่ม Escape Room"`).

Aaron confirmed the new name is **translatable**, not a brand name to be kept in
English. All 62 translatable packs now carry a translated rendering.

## What needs a native reviewer

Twelve packs were translated to a standard intended to ship as-is:

> dutch, german, italian, polish, russian, ukrainian, romanian, indonesian,
> tagalog, swahili, greek, latin

The remaining **28 packs are complete editing drafts, not confirmed
translations.** They are in the tree so a reviewer edits real wording rather than
stale English, and so no user sees a retired product name. They should be read by
a speaker before anyone calls them done:

> thai, urdu, pashto, dari, marathi, bengali, hindi, gujarati, punjabi, nepali,
> tamil, telugu, khmer, burmese, amharic, tigrinya, kirundi, hausa, yoruba, igbo,
> hmong, lao, acholi, lingala, marshallese, karen, chin_falam, chin_hakha

Six of those — acholi, chin_falam, chin_hakha, karen, lingala, marshallese — are
already on the repo's standing native-review hold in
`merge_stale_translations.cjs`. The drafts here do not lift that hold.

`maay_maay` was deliberately **not** touched: `lang_src_lib.cjs` excludes it
because a human judged the pack to be the wrong language entirely. Adding correct
strings to a pack with the wrong language would hide that problem.

## The twelve keys

| key | English |
|---|---|
| `title` | Puzzle Challenge |
| `start` | Start Puzzle Challenge |
| `reset` | Reset Challenge |
| `generating` | Creating your Puzzle Challenge... |
| `preview_desc` | Review the Puzzle Challenge before launching. |
| `preview_confirmed` | ✅ Puzzle Challenge ready to play! |
| `config_saved` | Puzzle Challenge saved! Load it anytime from settings. |
| `loaded_saved` | Saved Puzzle Challenge loaded! Review and launch when ready. |
| `no_saved` | No saved Puzzle Challenge found |
| `end_game_confirm` | End the Puzzle Challenge for all students? |
| `launch_live_tooltip` | Start a collaborative Puzzle Challenge with your class |
| `stats_restored` | Previous Puzzle Challenge: +{xp} XP |

Not every pack has all twelve — only keys whose value still carried the retired
wording were rewritten, so a pack with six stale values received six.

## Meaning that must survive editing

- This is a **teacher-facing** set of strings for a puzzle-based quiz activity a
  teacher generates, previews, saves and launches to a class. It is not an escape
  room, a locked room, or a physical space. If a language has a natural phrase for
  "puzzle challenge" or "quiz challenge", prefer it over a transliteration.
- `stats_restored` **must keep `{xp}` exactly**. It is substituted at runtime; a
  translated or reordered placeholder breaks the string. A guard checks this.
- `preview_confirmed` keeps its leading ✅.
- `end_game_confirm` is a confirmation prompt shown to a teacher before ending the
  activity for a whole class. It must read as a question.
- `launch_live_tooltip` describes starting the activity **together with a class**,
  not multiplayer in a gaming sense. Several packs previously said "multiplayer";
  the English now says "collaborative".

## Where the work is recorded

Each value is entered in `lang_pack_review_baseline.json` with a reason:

- `hand-translated-puzzle-challenge-rename` — the twelve intended to ship
- `hand-draft-puzzle-challenge-rename-awaiting-native-review` — the 28 drafts

The ledger stores both the English hash and the translation hash, so editing
either side re-enters the normal stale worklist. A reviewer who rewrites a draft
does **not** need to clear anything by hand; the edit itself marks it changed.

## Checking a pack after editing

```bash
node dev-tools/i18n/check_lang_staleness.cjs --quiet
node dev-tools/check_lang_duplicate_keys.cjs
```

Both root `lang/<slug>.js` and `desktop/web-app/public/lang/<slug>.js` must stay
byte-identical; edit the root copy and mirror it.
