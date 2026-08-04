# Blueprint / chat-guide pack translations (staging lane)

Hand-translated `blueprint.*` + `chat_guide.*` strings (101 keys per language —
the AI-guide chips, blueprint card, archive, templates, STOP/progress copy),
staged here as flat dotted-key JSON instead of being written straight into
`lang/<slug>.js`, because the packs were being actively edited by a concurrent
session when this lane started.

- Canonical English source: the `blueprint.*`/`chat_guide.*` keys in
  `ui_strings.js` (101 keys missing from packs as of 2026-08-03).
- One file per pack slug (same slugs as `desktop/web-app/public/lang/*.js`).
- `{placeholders}`, `**markdown**`, and `Ctrl+K` stay verbatim.
- `karen` and `chin_falam` are deliberately absent: their packs are served by
  the runtime-AI fallback, which an English/invented key would block.
- Merge with a byte-faithful anchored-text merge (model: `merge_cmd_keys.cjs`)
  once the packs settle — never a JSON parse→stringify round-trip, which
  reformats unrelated regions.

Translations are drafts for native-speaker review, same as every other pack
lane in this repo.
