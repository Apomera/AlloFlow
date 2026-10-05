# CircuitTool phone grid attempt: superseded after visual review

This intermediate layout gave planning prompts the full card width on phones. Its twelve handoff tests and six automated browser views passed on source e81cf1cb. The pixel review found that doubled headings still split words beside their numbered markers, so visual approval was withheld.

The [final wrapping layout](../circuit-investigation-reading-wrap-2026-10-03/README.md) lets enlarged headings move below their markers and supersedes this attempt.

The [retained visual finding](visual-review-before-heading-fix.json) pins all six intermediate screenshots. The [RTL measurement correction](harness-correction.json) preserves the first browser attempt and changes only line counting: bidirectional punctuation fragments on the same row count as one rendered line. Every raw rectangle remains available.

This directory has no final validation result. The validator file is an unrun draft. The successful test receipts, browser measurements, source preservation and independent static review remain as evidence of this intermediate attempt.