# Guided lesson to Document Builder - 2026-09-04

Implemented locally; no production deployment or production app bundle was created.

## Changes

The Guided Mode Document Builder action previously used the same unscoped History export as the general document menu. It now passes the current Guided-created resource IDs to the Builder.

- The Builder selects those resources without modifying History. Its settings show the number of selected lesson resources.
- Missing or empty selections stop the handoff with a message. A missing resource after opening cannot silently broaden the preview or download to all of History.
- HTML/worksheet preview generation, the download handler, slide previews, and PowerPoint downloads use the same selection. Unsupported resource notices and the Builder's alternate-export resource lists are also scoped.
- Ordinary History exports remain unscoped. Opening the general Builder after a scoped session resets the selection.
- Edited Builder documents keep their selected IDs alongside the existing encoded project draft. A restored scoped draft reopens with its selected materials on the first open. Legacy drafts remain unscoped; a scoped draft with missing resources is rejected.
- The direct editable-deck handoff to AlloStudio is omitted for scoped Builder sessions because that separate route currently reads the full workspace. PowerPoint download remains available for the selected lesson.

## Validation

- The combined Builder and Guided regression run passed 188 tests across 13 files, including scope selection, missing resources, ordinary History behavior, saved edited documents, actual slide generation, download handoff, draft codecs, and existing accessibility checks.
- An additional real-HTML-generation test was added and run with the handoff suite. Evidence: reports/classroom-review-2026-09-04/builder-html-regression.json. Combined-run evidence: builder-handoff-regression.json.
- The real document generator and slide generator are checked for inclusion of the current lesson marker and exclusion of the other lesson marker.
- The development shell build completed. Source and generated App JSX pass syntax checks. Export modules and English UI strings match their public mirrors. Scoped diff whitespace checks passed.

The development build also performs the repository's normal public-asset synchronization. Existing unrelated edits were retained. This validation does not constitute a full live-AI-to-export classroom test or a new browser accessibility audit of the complete Builder. New UI text uses English and the existing localization fallback.
