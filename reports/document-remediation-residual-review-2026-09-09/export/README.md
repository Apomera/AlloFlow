# Residual baseline export review

Read-only review of `dev-tools/document_export_at_acceptance.cjs` after the 13-finding fix batch. Five local Chromium probes completed; the two valid controls pass. No application code changed. The results retain the implementation hash and verify it remained unchanged during the run.

## 1. [P2] Hidden data rows still satisfy the table acceptance contract

The new exposure check requires the exact table and required header cells to remain exposed, but does not require the expected data cells to remain exposed. A normal table with two headers and one data row passes all checks with complete coverage after the data row gains `aria-hidden="true"`. Chromium exposes the table and both headers but **zero data cells**; its accessibility snapshot omits `Ada / 95` entirely. Reading-order anchors still pass because visible `innerText` includes the hidden-from-AT row.

Observed data values come from DOM `textContent` at [line 73](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/dev-tools/document_export_at_acceptance.cjs:73). The incomplete exposure predicate is at [line 98](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/dev-tools/document_export_at_acceptance.cjs:98). Extend the contract observation to verify the exact expected data cells and their content remain exposed, including cells hidden by a row or ancestor.

Probe: `table-hidden-data-row`. Positive control: `table-valid-control` exposes the expected two cells and passes.

## 2. [P2] Table-header accessible names can differ from the expected cell value

Changing `<th scope="col">Student</th>` to `<th scope="col" aria-label="Teacher">Student</th>` also passes every baseline check with complete coverage. The tag, scope, and DOM value match, and the header still has a `columnheader` role, but Chromium exposes its name as **Teacher**. The expected **Student** column header has no match in the native role query.

The [header exposure collection at line 87](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/dev-tools/document_export_at_acceptance.cjs:87) verifies role and identity only; the [table comparison at line 100](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/dev-tools/document_export_at_acceptance.cjs:100) uses DOM cell text rather than the exposed name. Compare the actual table/header semantics with the source-authored contract, preserving identity binding so unrelated matching headers cannot satisfy it.

Probe: `table-header-name-overridden`. The same positive table control exposes **Student** and passes. Findings 1 and 2 are related residual gaps in table semantic coverage, demonstrated by independent mutations.

## 3. [P3] Canonically equivalent heading text is falsely rejected

The source-authored heading contract contains decomposed `Cafe\u0301`. An identical decomposed heading passes; changing only its encoding to precomposed `Caf\u00e9` fails `html.heading-navigation-semantics`, although both heading texts are equal under NFC and the reading-order check passes. This can reject harmless Unicode normalization during export.

Both the [exact native role/name lookup and JSON comparison at lines 79–80](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/dev-tools/document_export_at_acceptance.cjs:79) omit the NFC treatment used for table cells and reading anchors. Normalize both expected and observed heading text, including the name-matching portion. Retain negative controls for materially changed accents and compatibility characters. Similar unnormalized expected-heading comparison exists in the PDF path at line 272, but this review reproduced the HTML behavior only.

Probe: `heading-canonical-equivalent`. Positive control: `heading-decomposed-control`.

## Evidence and scope

- [Executable synthetic probes](probes.cjs)
- [All five results, full fixture HTML, native accessibility snapshots, check statuses, and implementation hash](results.json)
- Reproduce from the repository root: `node reports/document-remediation-residual-review-2026-09-09/export/probes.cjs` using a new output path; the saved script refuses to overwrite its existing result.

These findings concern the optional baseline export checker. They do not claim that the live remediation gate accepts the same mutations or establish downstream production delivery behavior. No live model, network document dependency, deployment, or human screen-reader session was involved.
