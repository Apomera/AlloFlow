# Making the 149 tool deep links findable on the promo site (2026-09-15)

Aaron asked whether every STEM tool has a deep link and whether the promo site features
them. Both were already true on paper: 149 tool files, 149 registered ids, 149 slugs in
`_redirects`, and all 149 linked from the generated directory on `tools.html` with zero
links that would 404. The follow-up question was the real one — **how would a visitor
find them?**

## What was wrong

`tools.html` is 944 lines. The interactive tool finder (search, filters, 33 curated
cards) occupies lines ~380 to 632. The complete 149-link directory starts at line 633.
Nothing on the page or anywhere on the site pointed at it: no "on this page" strip, no
link to `#directory-heading`, and all inbound links from the other seven pages land at
the top of the page, at the finder. The 17 group headings had carried `id`s since the
block was first generated, but nothing linked to them either.

So a teacher wanting a shareable link for any of the 116 tools without a finder card had
to scroll past a search that would not find it.

## Changes

1. **Hero cue** (`tools.html`, hand-edited outside the generated block). Under the search
   box, above the fold at 1280x900: "Looking for a link to share instead? See all 149
   STEM tools with shareable links". Measured at y=552 with the viewport 900 tall.
2. **Jump-to-a-subject nav** (in `build_promo_tool_directory.cjs`, so it regenerates).
   17 links to the existing group anchors, each with its tool count. One `groupId()`
   helper now feeds both the nav and the headings, so a renamed section cannot leave the
   nav pointing at a dead anchor.
3. **`scroll-margin-top: 88px`** on `#directory-heading` and the group headings, because
   the navbar is `position: fixed`. Verified in Chromium: heading top 568 vs nav bottom
   65 after following the cue; 114 vs 65 after a group jump.
4. **`.sr-only` defined** (`promo-accessibility-overrides.css`) — see below.

The homepage already carries `Browse the full tool finder →` under its own search, which
now leads to a page that points at the directory, so no third edit was needed there.

## A live defect found on the way

`index.html` line 269 labels the homepage tool search with `<label class="sr-only">`, and
**`.sr-only` was not defined in any of the site's eight stylesheets**. So "Search AlloFlow
tools" rendered as visible text inside the search box, crowding the placeholder — measured
99x63px in Chromium, screenshot `scratch/promo-shots/index-sronly.png`. This is unrelated
to the deep-link question; it was caught because I nearly shipped the same mistake (my
first jump nav used an `aria-hidden` span paired with an `.sr-only` one, which would have
rendered the alternate text visibly).

Fixed by **defining** the class, not by editing the markup: the label is the input's
accessible name, so deleting it would leave the search unlabelled. Now 1x1px and clipped,
still exposed to assistive technology.

## Still open: the sitemap has no tool URLs

`sitemap.xml` lists 50 promo pages and **zero** of the 149 tool deep links, so no tool is
independently discoverable to a search engine or AI crawler. It is also hand-maintained,
unlike every other artifact here, so it will drift as tools are added.

**This needs a decision, not a script.** The sitemap's canonical base is
`https://apomera.github.io/AlloFlow/` (GitHub Pages), but the tool slugs are served by
Cloudflare from `alloflow-cdn.pages.dev` via `_redirects` — and that host has no
`sitemap.xml` or `robots.txt` of its own. So publishing the 149 URLs means choosing which
host should be indexed for tool traffic. Left for Aaron. Once chosen, generate them from
`_redirects` the way the directory is generated, and add a `--check` so the set cannot rot.

## Verification

| Check | Result |
|---|---|
| `build_promo_tool_directory.cjs --check` | OK, 149 tools in 17 groups |
| `sync_promo_inventory_counts.cjs --check` | OK, every count matches |
| `build_tool_index.cjs --check` | current, 149 |
| `build_stem_deep_links.cjs --check` | current, 149 |
| `audit_promo_site.cjs` | 10 pages, 0 warnings, 0 errors |
| Chromium: cue above fold, 17 jump links, anchors clear of nav | pass |
| `.sr-only` after fix | 1x1px, clipped |
| Deploy mirror | 0 drifted |

Shots: `scratch/promo-shots/` (`tools-hero.png`, `tools-directory.png`, `tools-jumped.png`,
`index-sronly.png`).

**Not committed, not pushed.** The promo site is GitHub Pages serving `main`, so pushing
`tools.html` publishes immediately.
