# AlloFlow manual system

`manuals.html` is the single public catalog for user-facing AlloFlow documentation. `catalog.json` is the maintenance inventory behind it. The catalog distinguishes material that is available now from guide ideas that are planned, so future audience manuals can be added without scattering links across the promotional site.

## Audience model

Use one or more stable audience labels:

- `educators`: classroom teachers and instructional staff
- `families`: parents, caregivers, and home educators
- `multilingual`: multilingual learners and the adults supporting them
- `specialists`: clinicians, accessibility staff, counselors, and related-service staff
- `leaders`: school/district leaders and IT

An audience path can begin as a curated route through existing chapters. Create a standalone manual only when the audience has a distinct end-to-end workflow, vocabulary, safety context, or maintenance owner.

## Publication contract

Every public manual or guide must have:

1. A unique catalog ID and an `available` entry in `catalog.json`.
2. One card on `manuals.html` with the same ID, title, audience labels, format, and destination.
3. A visible way back to `manuals.html` from the guide.
4. One H1, a descriptive title and description, keyboard-visible focus, responsive/reflow behavior, and usable print behavior when printing is expected.
5. A canonical source, owner or review role, status, and `lastVerified` date.
6. A sitemap entry when the destination is a local public HTML page.
7. Current screenshots only when they teach a decision or workflow. Each screenshot needs descriptive alternative text or an adjacent explanation.
8. A verification run using `npm run verify:manuals`; generated Teacher Guide output also requires `npm run verify:teacher-guide`.

Planned manuals may appear in `catalog.json` without an `href`, but the public site must label them as future work rather than presenting a dead link.

## Quality and screenshot standard

Prefer a paired workflow example when a screenshot materially improves comprehension:

- the complete left-side setup panel, including Universal Settings context;
- the resulting resource view after generation;
- a caption that states the decision the image demonstrates;
- no toast, tooltip, modal, crop, loading state, error, or selected-text overlay obscuring the target;
- consistent browser scale and viewport within a workflow pair;
- no student names, API keys, private records, or unreviewed generated claims.

The current 22-resource capture assessment lives in `docs/teacher-guide/current-v1.2-generated-example-audit.md`; image-level accept/replace decisions live in `docs/teacher-guide/current-v1.2-screenshot-quality-audit.md`. Those audits are evidence for replacement work, not public manuals.

## Adding the next audience manual

1. Confirm that a curated path cannot meet the need.
2. Name the primary audience and the task they must complete.
3. Choose one canonical source format and generate other formats from it where practical.
4. Add status, scope boundaries, responsible-use language, and a review date near the beginning.
5. Add the catalog item and public card.
6. Add navigation, sitemap, structured metadata, and tests.
7. Review links and any policy, product, crisis, medical, clinical, or legal claim against current primary sources.
8. Publish only after accessibility, content, and screenshot review.
