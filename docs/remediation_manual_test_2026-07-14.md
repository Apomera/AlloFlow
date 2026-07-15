# Manual remediation test pass

Use this pass after commit `4731c6517`. It is designed to exercise different risks instead of repeatedly testing one familiar PDF.

## Before you start

1. Load the current build containing commit `4731c6517`.
2. Keep the browser developer console open if convenient, but the test does not require developer tools.
3. For every case, record the source filename, downloaded filename, visible warning or verification message, and whether the output opens successfully.
4. Do not distribute the synthetic active-content source or an advanced-preserve output. It is deliberately inert-looking but contains a document-open JavaScript action.

## Case 1: normal multi-column control

Source: `test-assets/multi-column-sample.pdf`

1. Upload the source and run the accessibility audit.
2. Start the normal Make Accessible / Fix & Verify flow.
3. Download the normal tagged PDF.
4. Open it and read through both columns.

Expected:

- The main download is not forced into the clean-active-content path.
- Text reads down the first column and then down the second column.
- The saved-byte verification result is shown. If validation cannot run in the environment, the result must be explicitly marked unverified rather than silently presented as verified.
- The PDF opens and the visible content is complete.

## Case 2: scrambled reading-order stress test

Source: `test-assets/multi-column-scrambled.pdf`

1. Upload, audit, and run the same remediation flow.
2. Pay special attention to any reading-order warning or caution.
3. Download and inspect the result with a screen reader, Acrobat reading-order view, or text selection if available.

Expected:

- The tool reports the reading-order concern instead of hiding it.
- The rebuilt output follows the intended visual order as closely as possible.
- A severe validation failure must withhold the normal verified download; a missing validator must produce a clearly marked unverified result.

## Case 3: executable active content and attachment

Source: `test-assets/manual-remediation/active-content-actions.pdf`

1. Upload and audit the source.
2. Confirm the warning reports executable action content and an attachment.
3. Confirm the primary action is labelled **Clean tagged PDF (recommended)**.
4. Confirm Quick baseline and original-layout fillable delivery are blocked for this source.
5. Choose the recommended clean action and download the result.
6. Open the output. If your PDF reader exposes JavaScript or attachments panels, inspect them too.

Expected:

- The clean output filename ends in `-tagged-clean.pdf`.
- Opening the clean output does not show the fixture alert.
- The clean output has no embedded `safety-fixture.txt` attachment.
- The saved-byte verification panel reports success before the normal download is offered.
- An advanced **Preserve source actions** option may be visible, but it must be clearly warned. It is optional and should only be tested locally; its output is expected to retain the active content.

The absence of an alert by itself is not proof that the action was removed because some readers disable JavaScript. The AlloFlow warning, clean filename, attachment removal, and saved-byte verification together are the useful evidence.

## Optional Case 4: your usual real PDF

Run your familiar document last as a regression control. This answers a different question: whether the safety changes preserved the behavior you already rely on. If possible, also add one real scanned or image-only PDF, because the repository fixtures do not currently cover a realistic OCR-heavy document.

## What to send back

For any failure, send:

- source and downloaded filenames;
- a screenshot of the final remediation panel;
- the exact warning, toast, or error text;
- whether the result opened and whether content/order looked correct;
- browser and PDF reader names.
