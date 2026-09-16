# Per-tool landing pages, and what a STEM manual would actually cost (2026-09-16)

Aaron asked to start Option C (a page per tool on the promo site) and raised making a
manual for each STEM tool, noting Educator Evaluation already has one.

## The measurement that justifies Option C

`/app/index.html` — the document every one of the 149 tool slugs resolves to — emits:

```
<title>AlloFlow | Adaptive UDL Platform</title>
<meta name="description" content="AlloFlow - Adaptive Levels, Layers, & Outputs...">
```

One title, one description, for all 149 URLs. The `?tool=` query is read client-side, so
to a crawler every tool deep link is the *same document*. That confirms two things:

- **Option A (a sitemap on the CDN host) was worth nothing.** Declaring 149 URLs that
  serve one page invites exactly the duplicate-content pattern I warned about. Good thing
  we didn't do it.
- **Option C is the only version that can work**, because a static page per tool on the
  Pages host is genuinely distinct: its own title, description, canonical and JSON-LD.

## What was built

`dev-tools/build_tool_pages.cjs` → `tool-<slug>.html` at the repo root (Pages serves the
root), plus a generated block in `sitemap.xml`.

**125 pages, not 149.** A tool gets a page only if it has a deep-link slug *and* a
description of at least 60 characters. The other **24 are deliberately skipped**: 16 have
**no description at all** in `tool_index.json` and 8 have under 60 characters. A page whose
only content is a tool's name is precisely the thin page search engines discount, so the
generator refuses to write it and reports why.

Each page carries: breadcrumb (home → Find a Tool → section → tool), the tool's label and
description, a primary "Open <tool>" button to its deep link, the shareable URL as
copyable text, where it sits in the STEM Lab, and an honest "Is there a manual for this
tool? Not yet." section. `SoftwareApplication` JSON-LD with `isAccessibleForFree`.

The directory on `tools.html` now shows an **"About"** link beside each of the 125, so the
indexable pages are reachable by a visitor and a crawler, not only listed in the sitemap.
Visible text is just "About"; the full name rides on `aria-label` so the accessible name
stays specific (no hidden-text span — this site defines no visually-hidden class).

## Two defects a screenshot caught that passing tests did not

1. **The primary button was invisible.** `shared.css:179` styles
   `main p a:not(.btn-primary):not(.btn-secondary) { color: var(--indigo) }`. The open
   button is an `<a>` in a `<p>` in `<main>`, so its label computed to
   `rgb(55,48,163)` on its own `rgb(55,48,163)` fill — **1:1 contrast**. The render test
   passed (title, href, target size, no page errors all fine). Fixed by adding the site's
   own `.btn-primary` opt-out class to the markup. My first attempt — raising specificity
   to `.tool-page .tool-page-open` — did **not** work, because the shared.css selector is
   more specific still; that dead end is recorded in the CSS comment.
2. **Every "About" link wrapped under the wrong tool.** `.tool-directory-list` is a CSS
   grid; each `<li>` is one cell, and its two anchors stacked, pushing "About" onto a
   second row beneath a *different* tool name. Again invisible to assertions: 125 links,
   all with `aria-label`, all 44px. Fixed by making each `<li>` a wrapping flex row.

Both were found by looking at `scratch/promo-shots/`. Numbers said pass; the pictures
said otherwise.

## Manuals for each STEM tool: what I found before starting

I looked for existing per-tool prose to build on. There is almost none:

| Source | What it holds |
|---|---|
| `tool_index.json` | label, section, desc, topics, keywords for all 149 — **harvested from source, not written for readers**. `topics` is raw UI text (cloud names in waterCycle, image captions in zoomGallery, emoji in some) and **capped at 14**, so it is a truncated scrape. |
| `help_strings.js` | 1,037 strings, median 487 chars — but **0 of 149 STEM tool ids** appear as keys. It covers the main app's workflows, not the STEM tools. |
| In-tool guides | **1 of 149** has a real quick-guide panel (Coaster Lab). 12 more have some `TUTORIAL` content. So ~136 have nothing beyond a one-line description. |

And `educator-evaluation-manual.html` — the model Aaron named — is **1,159 lines of
hand-written prose** with 20+ sections specific to that tool's actual workflow. Nothing in
the repo can generate that.

**So a manual per STEM tool is 149 hand-written documents, not a generator run.** That is
a genuine content project. What I would suggest instead, in order:

1. **Fill the 16 missing descriptions** (listed by `--list`). They are thin *today* in the
   tool finder and the directory, not just here, and one good sentence each unlocks their
   landing pages too. Cheapest, highest value.
2. **Write manuals for the tools that carry a unit**, not all 149 — the handful teachers
   actually spend a week in. Each landing page already says "Not yet" and the generator has
   a place to link one when it exists.
3. Leave the rest to the on-screen instructions the tools already carry.

## Verification

| Check | Result |
|---|---|
| `build_tool_pages.cjs --check` | OK; and **proven by mutation** — tampering with one page's `<h1>` made it FAIL, naming the file |
| Pages written | 125 (24 correctly refused) |
| `sitemap.xml` | parses as XML, 175 `<loc>`, 125 tool pages, 0 duplicates |
| Open button contrast | white on indigo after the fix (was 1:1) |
| Directory About links | 125, each with a specific `aria-label`, 44px targets, aligned one per row |
| Page errors, desktop + phone | none; no horizontal scroll |
| `build_promo_tool_directory --check`, inventory counts, tool index, deep links | all OK |

Shots: `scratch/promo-shots/` — `tool-page-desktop.png`, `tool-page-phone.png`,
`tool-page-button.png`, `directory-about.png`.

**Not committed, not pushed.** This adds 125 files to the repo root and 125 URLs to the
sitemap; Pages serves `main`, so a push publishes all of it at once. Aaron's call.
