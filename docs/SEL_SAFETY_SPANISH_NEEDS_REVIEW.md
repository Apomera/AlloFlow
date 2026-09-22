# The SEL crisis Spanish is a DRAFT and needs expert review

The 19 `sel.safety.*` Spanish strings were written by Claude and **have not
been reviewed by a qualified Spanish-speaking clinician or translator.** They
render today. They should be checked before anyone relies on them.

This is crisis copy: a student sees it at the moment a safety scanner flags
what they wrote. Wording that is merely *correct* is not the bar; it has to
land.

## What to check first

Three strings carry the most weight:

| Key | Draft |
|---|---|
| `banner_title` | Tú importas. Hay ayuda disponible. |
| `modal_title` | Escribiste algo que suena muy pesado. Quiero asegurarme de que estés bien. |
| `modal_trusted_adult` | Cuéntale ahora mismo a una persona adulta de confianza — tu mamá o tu papá, un maestro, un entrenador, alguien de la familia, o cualquier persona que te respalde. |

Specific things a reviewer should weigh:

* **"suena muy pesado"** for "sounds really heavy". Register is deliberately
  colloquial to match the English, which is not clinical. Is it right for the
  audience, and does it travel across dialects?
* **"no tienes que cargar con esto por tu cuenta"** for "you don't have to
  handle it alone". Phrased this way to avoid `solo` / `sola`, which would
  force a gender on the reader. An earlier draft said `solo` and was wrong.
* **"una persona adulta de confianza"** for "a trusted adult" — used
  consistently, and gender-neutral, but it is wordier than the English.
* **"tu mamá o tu papá"** for "a parent". Concrete rather than the more formal
  "un padre o una madre"; a reviewer may prefer the latter, or something that
  covers guardians.

## The open question I could not resolve

The SMS keyword is kept as English **HOME** ("manda HOME al 741741").

Crisis Text Line also publishes **AYUDA** for Spanish-language support, and
988 operates a dedicated Spanish line. Using `AYUDA` would plausibly route a
Spanish-speaking student to a Spanish-speaking counselor — which is very
likely what they need.

I did not change it, because changing a crisis routing keyword on inference
is not a call to make without checking the provider's current documentation.
**Someone should verify this against Crisis Text Line directly.** If `AYUDA`
is correct, three keys change: `banner_741741`, `footer_741741`,
`modal_741741`.

## Not yet covered by tests

An earlier draft of this note listed these as asserted. As committed
(2026-09-22) no test references `sel.safety.*`, `_sT` or `SelHub.t`, and
`tests/helpers/sel_tool_harness.js` never sets `window.SelHub.t`, so every SEL
test renders the English fallbacks only. Treat each line as a check to write:

* Every crisis number survives translation: **988, 741741, 1-866-488-7386**,
  including against digit swaps (988→998, 741741→741174).
* The **HOME** keyword survives. A text to 741741 without it may not open a
  conversation.
* The copy renders in **English** when the translator is absent, when it
  echoes the key (the hub's default), and when it throws. Crisis copy must
  never depend on i18n working. (`_sT` is written to do this; nothing pins it.)
* No raw key (`sel.safety.modal_title`) can reach a student.
* No value carries a literal escape. The first cut stored the em dash as its
  six-character JSON escape (backslash, u, 2, 0, 1, 4) in 2 English and 7
  Spanish values, which would have shown on the banner as text; fixed before
  commit.
* Five translated strings are joined into `innerHTML`. `sanitizeLanguagePack`
  strips executable tags and event handlers, but a pack can still carry
  markup, so "a pack cannot inject tags" is not a claim to make yet.

## Where it lives

* Keys: `sel.safety.*` in `ui_strings.js` (English) and
  `lang/spanish_latin_america.js` (Spanish), 19 keys.
* Wiring: `sel_hub/sel_safety_layer.js` via the `_sT(key, fallback)` helper.
* The hub publishes its translator as `window.SelHub.t`
  (`sel_hub/sel_hub_module.js`), because the layer's render functions take
  `(h, band)` and are called from ~103 sites across ~30 tools. No call site
  changed.
