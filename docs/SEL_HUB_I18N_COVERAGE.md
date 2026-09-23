# SEL Hub i18n coverage: 3 tools of 72, and none of the shell

Measured 2026-09-23. This is scope information, not a defect report — but the
shape of it is easy to misread from the key counts alone.

## What exists

| Namespace | Keys | What it covers |
|---|---:|---|
| `sel.emotions` | 3157 | one tool (Emotion Explorer) |
| `sel.safety` | 99 | the crisis layer + a boundaries lesson |
| `sel.crisiscompanion` | 28 | one tool |

**That is the entire SEL translation surface.** 69 of the 72 tool modules have
no keys, and `sel_hub_module.js` — the shell those tools open inside — has
**zero** `t()` / `__alloT` calls in 6,300 lines.

## Why the totals mislead

`check_sel_i18n_coverage` reports "3 wired tool(s), all shims healthy, none
regressed" and passes. That is accurate and it is also the whole problem: the
gate tracks tools that HAVE been wired, so 69 unwired tools and an unwired
shell are invisible to it. It reports them as "tracked, not blocking".

A large key count in one namespace can read as "the SEL Hub is translated".
`sel.emotions` alone holds 3,157 keys — more than 95% of all SEL keys — for
one tool out of 72.

## What a Spanish-reading student actually sees

* Opens the hub → **English**: every heading, filter, search placeholder,
  empty state, pathway and station label. 201 distinct rendered strings.
* Opens Emotion Explorer → **Spanish**, thoroughly.
* Opens any of the other 69 tools → **English**.
* Hits the crisis banner → **Spanish** (as of `51547dfad`), though that
  Spanish is a draft awaiting expert review; see
  `SEL_SAFETY_SPANISH_NEEDS_REVIEW.md`.

So the experience is inconsistent in a way that is worse than uniform English:
the shell and the tool disagree about what language the product is in.

## Sizing

The shell's 201 strings were counted by what REACHES A SCREEN — passed to
`h(...)` as a child, or used as `aria-label` / `title` / `placeholder` — not
by counting quoted strings. That distinction matters: a naive count on
`sel_safety_layer.js` gave ~355 where the real figure was 17.

Median string is 21 characters; the longest is 237. Much of it is short UI
furniture rather than prose.

## Not attempted here

Wiring the shell is mechanical but not small, and it should be one deliberate
piece of work with its own namespace (`sel.hub.*`) rather than a side effect
of a card-grid fix. The 69 unwired tools are a much larger programme again —
`EMOTION_VOCAB` alone, inside the one wired tool, still has ~4,000
untranslated strings.

One string was added to the shell by the card-grid work: the pathway button's
`" (not available)"` suffix. It is English like everything else around it, and
will be picked up whenever the shell is wired.
