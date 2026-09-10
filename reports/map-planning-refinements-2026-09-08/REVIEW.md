# Saved-map synchronization and planning provenance

Implemented September 8, 2026, following the approved refinements from the main-resource review.

## Saved organizers stay consistent

Static edits to main concepts, branch labels, subpoints, and translations now update their corresponding saved diagram nodes. Existing coordinates, node styling, custom nodes, and custom connections are retained.

Adding and removing concepts updates saved node identities and links together. Saved challenge answer edges follow those changes. Flow charts also retain correct terminal connections after structural edits. The synchronization supports the existing standard, structured-outline, flow/sequence, Venn, cause/effect, and problem/solution node formats, including legacy generated IDs without the new source-position metadata.

Reopening or initializing a saved diagram uses its saved layout instead of rebuilding it. Hydration responds to diagram content and identity, rather than every unrelated change to the resource object.

## Delayed layout work cannot replace newer map work

Layout requests now capture a stable resource, diagram, view, role, learner, and graph scope. Navigation, content changes, and manual graph edits invalidate obsolete results. Duplicate requests are suppressed, and obsolete responses do not trigger another repair request, success message, or sound.

Layout work has a map-specific busy state. Cancellation and an older request's completion cannot clear a newer map request or interfere with another resource's global generation state. The earlier finite-coordinate validation remains in place.

## Guides record the inputs supplied during generation

Both the sidebar and dispatcher now capture versioned input metadata before awaiting the provider. The active guide and its saved History record retain the same metadata.

The record distinguishes:

- Resource summaries actually supplied in the context: source/adapted excerpts, vocabulary terms, assessment counts, and the other existing planning summaries.
- The separate asset inventory supplied to teacher-plan generation.
- Teacher, study-guide, and family-guide modes.
- The shortened context actually supplied to a local model, including partial summaries and exclusion of material beyond the cutoff.

Full Pack history scopes remain isolated from unrelated current History. A precomputed inventory receives resource attribution only when its exact text still matches the recorded scope. Opaque custom inventories remain usable and are marked as untraced.

Records contain identities, original names, categories, consumed character counts, and available fingerprints, rather than another copy of source text. Existing prompt output is preserved by tracing, except that object-shaped Sequence Builder resources now correctly report their event count.

## Accessible saved-input disclosure

The previous attribution inferred from today's History has been replaced with a native disclosure labeled “Inputs supplied at generation time.”

It shows frozen names and mode, separates summaries from available assets, and explains partial local-model excerpts. Teacher links open current resources only when an ID resolves uniquely. Missing and ambiguous identities are identified without guessing replacements. Older or unsupported records remain usable and state that their input versions were not recorded.

Opening the disclosure makes no AI call and does not modify the plan. The wording describes inputs supplied to generation; it does not claim that the model used every asset or that the guide is accurate.

## Validation

**190/190 distinct checks passed across 10 files**, including **52 focused acceptance checks**. The new suite passes with the repository's normal test setup.

Coverage includes actual host mutation handlers and JSON save/reopen round trips; generated and legacy node identities; preserved coordinates/styles/custom links; canonical flow-chart terminal edges; challenge targets; delayed completion, dragging, navigation and duplicate requests; sidebar capture before an input changes in flight; dispatcher Full Pack/local/study/family/custom-inventory paths; and disclosure behavior.

Related suites cover instructional-text context, teaching-script integration, lesson-plan/studio presentation, resource persistence, organizer hardening, Venn/live-session contracts, and 3D remote-stop behavior.

**Nine Chromium cases passed** for teacher, family/local, and legacy displays at 1280px, 390px, and 320px. Enter/Space disclosure operation, resource-link actions, missing/ambiguous links, page errors, horizontal overflow, and configured axe WCAG checks were verified. No page errors, overflow, or reported violations remained. The 320px teacher screenshot was also visually inspected.

All five affected runtime modules match their desktop public copies. Their sources/runtime scripts and all three host files parse successfully. The shared catalog matches its desktop copy, cache versions are updated, and the affected diff passes the whitespace check.

Evidence: [final acceptance tests](behavior-default.json), [related regressions](related.json), [browser results](browser.json), [module/host integration](integration.json), [combined summary](validation.json), and [phone screenshot](teacher-320.png).

The regression work caught a mutable request-scope reference; copying the captured scope fixed the stale-result cases. Test harness setup was also adjusted to use the app's React dependency and compile JSX outside jsdom's incompatible typed-array realm. The final suite requires no special local-only configuration.

## Scope and remaining work

This delivery implements saved-diagram synchronization and generation-time attribution. The broader September 4 planning-input comparison and “mark versions reviewed” workflow remains scoped separately; it is not presented as implemented.

Validation used controlled providers and local browser fixtures. It did not include live model-quality evaluation, manual screen-reader sessions, every importer-specific ID-remapping path, or a full repository test run. A stale-result guard does not necessarily cancel provider-side generation.

No automatic plan regeneration, deployment, or commit was performed. Existing unrelated workspace changes were preserved.
