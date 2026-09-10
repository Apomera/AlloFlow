# Document preservation review

The **Preservation review** panel appears with a remediated document. It shows bounded rejection history from the content-preservation gates and offers an index of tables, cells, and images.

## Review a rejected suggestion

1. Expand **Review rejected suggestions** to read the reason, pass, section, and rejection phase. Rejection history records discarded suggestions; it does not imply that the final document contains those proposed changes.
2. Choose **Prepare Workbench review** to fill a targeted command. Review the command before running it.
3. Use **Acknowledge** to track which records you have read. Use **Acknowledged — undo** to restore an item to the pending list.

Acknowledgments do not resolve audit findings, declare a human accessibility assessment, change the document, or upgrade verification. They are separate from the existing human-judgment queue's review attestations. Project backups retain them, and the research JSON report includes them as preservation metadata.

The total count includes every recorded rejection; only the first 100 detail records are retained. Workbench's autonomous local fallback reports the same evidence, including when no HTML change is accepted or an audited pass is reverted. Stale commands cannot attach evidence to a different document revision.

## Inspect a document element

Choose **Inspect document references**, select a table, cell, or image, and use **Locate in preview**. The preview receives keyboard focus at the matched element. It is sandboxed without script execution.

The first use creates a separate index of the current document. Each reference has a stable ID, SHA-256 content fingerprint, bounded label, and structural coordinates. The index travels with project saves. It never injects identifiers into the remediated HTML or acts as verification evidence.

Matching tolerates changes such as table-header promotion and improved image alt text. Table values, cell spans, image source, and source-set changes cause the affected reference to become unavailable. Repeated identical structures always require manual inspection. Deleting or reordering one cannot make its old reference point to another surviving copy. An incomplete source or current index also prevents automatic location.

Rejection history usually identifies a remediation section; it does not identify an exact affected page, cell, or image. The interface does not infer those locations. The reference index is bounded to 700 entries, up to 100 tables and 200 images. It requires browser HTML parsing and SHA-256 support.

Reference preparation and location are cancellable: changing the selection, closing the preview, or loading another document retires pending results. Loading a different document resets the preview even when its HTML is identical. Delayed lookups leave keyboard focus where the reviewer moved it; failed preparation can be retried. Close the preview to return focus to Inspect document references.

This is a foundation for precise navigation and future incremental analysis. It does not implement incremental region audits or a complete canonical document model.


## Source-preserving repair

Automatic repairs and section re-fixes retain the original fragment when a proposal changes table values or cell spans, source numbers or signs, link destinations, or an image's relationship to surrounding content. Detected wording/order changes and unsupported added content are also rejected in strict repair. Rejected suggestions remain visible in Preservation review even when no proposed HTML is adopted; acknowledgment still only records that the item was read.

Descriptive link wording can improve while the destination remains fixed. Header promotion, language spans, explicit list-marker cleanup, and equivalent decimal/thousands formatting remain supported. Accessibility metadata has a separate bounded allowance, so a useful alt description on a small document is not rejected merely because it more than doubles the HTML size. These checks preserve source content; they do not determine whether an image description is accurate.

Intentional recovery of supplied missing source passages retains its separate recovery policy. Strict repair does not approve arbitrary table merges, new link destinations, or figure relocation. Those changes need targeted review rather than a general automatic accessibility fix.
## Semantic fidelity and review locations

The strict repair path now protects static content visibility, existing table header semantics, form state and label associations, and MathML structure. Selected rejections include a bounded position in the input for that attempt, such as a table/row/cell or form-control index. The position appears in preservation review and prepared Workbench instructions; it is not an automatic match to a later document revision.

See [the fidelity validation handoff](document-remediation-fidelity-validation.md) for regression scope, a human session matrix, and performance measurement boundaries.

## Inline mathematics and option groups

Strict repair preserves HTML superscripts and subscripts as well as MathML, including their kind, content, and attachment in the source reading order. Linked expressions and existing captions retain this protection. Existing caption text uses Unicode canonical normalization so an exponent such as `m²` cannot collapse into `m2`. Descriptive footnote links, newly supplied captions, and equivalent formatting remain supported within the existing source-preservation policy.

Select choices preserve their group membership, nonempty group labels, and effective disabled state, including inherited optgroup disabling. Missing group labels may be supplied, and equivalent disabled representations remain supported. These additions advance the acceptance policy to `20260909-4`.

The [post-export checks](document-export-at-acceptance.md) also report incomplete encoding or rendering dependencies, and [rendered comparison batches](rendered-document-fidelity.md) retain results when an individual pair or browser inspection fails. See the [implementation and validation record](../reports/document-remediation-resilience-2026-09-09/README.md).
