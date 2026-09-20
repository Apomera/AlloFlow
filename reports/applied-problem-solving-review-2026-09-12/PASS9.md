# Pass 9: keep sources separate from reasoning

Implemented locally September 19, 2026. No deployment was performed.

## Learner experience

- **Saved outside sources.** Search results now save citation records separately from evidence prose. Adding a link preserves the full space available for the learner's explanation and never copies a search snippet into that explanation. Existing saved citation text remains readable and unchanged.
- **A source-check notebook.** Each source has a note about what the learner checked, its relevance, and remaining uncertainty. Optional citation fields include title, author or organization, publication/update date, and an evidence-row connection. The search date is explicitly distinguished from the publication date. A recorded note is not presented as claim verification.
- **Manual links without search.** Learners can paste a safe http/https link they already have, including when AI/search is unavailable or the organizer is off. This does not request the page or run a search. Unknown dates stay blank. Unfinished manual-link drafts survive stage navigation and clear when the workspace/profile changes.
- **Recovery and connections.** Removing a source offers Undo and restores its note and connection. Removing an evidence row preserves its sources and allows reassignment. Duplicate connections and full lists are handled without truncating writing; saved sources are limited to 24.
- **Review and reuse.** Final review includes source notes, directs learners to notes they have not recorded, and returns editing focus to the correct source. Learners can explicitly point to an existing source-check note as the location of their reasoning; later note, link, connection, or connected-claim changes require rechecking that reference.

## Saving, export, and AI feedback

- Source records survive the shared learner-response boundary, text backup/restore, and typed submission. The response sanitizer excludes unsupported fields and unsafe links even when the Applied Challenge module is absent.
- Response and teacher copies include safe citations and source notes. Blank task/paper copies omit them. Full HTML includes a readable source list, including the module-free export fallback; private teacher source excerpts are excluded.
- Feedback receives the source domain, citation fields, and learner-written note within the existing bounded context. The app does not fetch links or include their paths as source-record metadata in the prompt. Source changes invalidate advice tied to an earlier draft. Coverage reports now count saved source records. Source-check notes remain explicitly distinct from verified claims.

## Validation

- **184 passing tests across 15 suites**, using the latest result for each suite. The broad run passed 183 of 184 tests; its remaining assertion selected the first URL input, which is now the manual source field in the all-steps view. The final recheck targets the artifact field by its stable ID and verifies the complete interaction suite. Includes source bounds, safe links, legacy citation compatibility, reference freshness, backup, typed submission, export escaping/privacy, feedback context, manual capture, citation editing, orphaned connections, Undo, profile scoping, and review navigation.
- **10 browser states** across 1280px, 390px, and 320px widths: empty Explore, saved-source notebook, final review, and manual capture with search unavailable. Zero page errors, horizontal overflow, or axe violations in the inspected states. This is automated accessibility coverage, not a full accessibility certification.
- Visually inspected the phone-width source notebook. Browser checks exercise the actual built component and shared response boundary with authored fictional data and mocked search/AI. Backup and export round-trips preserve the source note and author.
- Generated Applied Challenge modules passed the freshness check; all four root/public asset pairs match. No live provider calls or learner trials were performed, so those outcomes are not established by this pass.

## Preview and evidence

- [Current preview](current-preview.html?pass=9)
- [Phone-width source notebook](pass9-sources-390.png)
- [Phone-width final review](pass9-review-390.png)
- [Manual source capture](pass9-manual-390.png)
- [Broad regression results](pass9-regression.json)
- [Final interaction recheck](pass9-final-recheck.json)
- [Browser results](pass9-browser-results.json)
- [Validation summary](pass9-validation-summary.json)
