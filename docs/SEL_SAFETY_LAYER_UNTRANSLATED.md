# The SEL crisis safety layer is English-only for every language

`sel_hub/sel_safety_layer.js` is 852 lines with **zero** `ctx.t` / `__alloT`
calls. Every string it renders is English for every reader, in every SEL
tool, regardless of the selected language.

## Why this is worse than an ordinary i18n gap

It is the crisis surface. It renders:

* the standing banner: "You're not alone. If you need help, reach out:"
  with 988, Crisis Text Line (741741) and Trevor (1-866-488-7386);
* the crisis modal raised by `scanForCrisis`, with its own resource list and
  action buttons;
* the grade-band variants of the crisis copy (`isYoung` branches at 313, 383).

A Spanish-reading student who types something the scanner flags gets a modal
they may not be able to read, at the moment it matters most. The phone
numbers are legible, but the instructions, the reassurance and the
"what happens next" are not.

## Why no gate reports it

`check_sel_i18n_coverage` counts wired TOOLS and their keys. The safety layer
is not a tool; it is a shared layer loaded beside them, so it is outside what
that gate walks. `check_i18n_fallback` only looks for fallback-dropping
declarations, and a file with no translator calls at all has none. Both pass.

This is the same shape as the note in memory: an English fallback is not a
registered string, and it renders fine in English forever.

## How it surfaced

A verifier for the EMOTION_STRATEGIES Spanish reported two survivors --
`strat_fear_high_conn1_step0` and `strat_hopelessness_conn2_step0`, both
"Text HOME to 741741". Both were in fact correctly translated. The English on
screen was coming from the safety layer's banner rendering above the tool.
The false positive was the only reason anyone looked.

## Scope

**17 rendered prose strings**, 7 of which carry a crisis number.

An earlier revision of this file said "~355 candidate prose strings". That
was wrong: the regex behind it counted code fragments (`use strict`, operator
pieces split across concatenations) and, in a second pass, AI-prompt text and
HTML report templates that no student ever sees. Counting only what is passed
to `h(...)` as a child, assigned to `textContent`, or used as an
`aria-label` / `title` / `placeholder` gives 17.

The gap is real but small and tractable -- roughly an hour of wiring, not a
translation project. What makes it serious is placement, not volume.

Not attempted here: it needs its own key namespace (`sel.safety.*`), and
crisis copy should be reviewed by someone who can sign off on the clinical
wording in Spanish rather than accepted from a translation pass.

Numbers that must survive any translation of this file, verbatim:
988, 741741, 911, 1-866-488-7386 (Trevor Project).
