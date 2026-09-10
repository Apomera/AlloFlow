# Residual live-candidate review

Read-only review of policy `20260909-5`. Six synthetic probes reproduced three additional false-acceptance classes and retained three equivalent-content controls. No application code changed. All three harmful candidates were accepted by `acceptFixedHtmlDetailed` with `strictContent: true, mode: 'faithful'`; `aiFixChunked` returned those candidates with model transport mocked. Native Chromium accessibility snapshots independently establish the observable differences. These results do not assert a downstream export or human screen-reader outcome.

Evidence: [probe source](probe.cjs), [full JSON results](results.json). Run from the repository root with `node reports/document-remediation-residual-review-2026-09-09/live/probe.cjs`. The script refuses to overwrite its existing evidence. Source SHA-256 was unchanged during execution; the exact checksum is in the results.

## 1. [P1] Image alternatives inside native labels do not participate in source-name preservation

The source has `<label for="student"><img alt="Student name" ...></label><input id="student" value="Ada">`. Adding `aria-label="Teacher name"` to the input passes the gate. Chromium changes the textbox name from **Student name** to **Teacher name**. The image and source label remain present, so no visible source text needs to change.

[doc_pipeline_source.jsx:10236](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10236) collects native labels using `textContent`, which is empty for an image-only label. [Lines 10256 and 10276](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10256) therefore treat this already-named source control as unnamed and allow the conflicting ARIA name as a new label. This remains after the prior text-label override fix; that fix's direct `input type="image"` handling does not cover images nested inside labels.

Probe: `image-label-overridden`. Valid control `image-label-equivalent-control` adds `aria-label="Student name"`; both the gate and browser retain the same meaning.

Suggested refinement: resolve native label content alternatives, including descendant image alternatives, before deciding whether the source is unnamed. Keep equivalent-name repair valid, and add a regression for image-only labels.

## 2. [P2] Table-level role changes can remove table semantics

Changing a native `<table>` to `<table role="list">` is accepted with all rows, headers, scopes, and values unchanged. Chromium exposes the candidate root as a **list**, where the source root is a **table**. This disrupts the table semantic structure even though individual row and header nodes remain in the accessibility tree.

[doc_pipeline_source.jsx:10191](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10191) guards only exact `none`/`presentation` role strings at table level. The recognized-role resolution added immediately below applies to header cells, leaving a table's other overriding roles unchecked.

Probe: `table-role-list`. Valid control `table-explicit-role-control` adds the equivalent `role="table"` and preserves Chromium's table role.

Suggested refinement: resolve effective roles for tables as well as headers and reject loss of a source table role, while preserving explicitly equivalent roles and defined repair cases.

## 3. [P2] Caption superscripts can move to a different base

An existing figure caption `Compare x<sup>2</sup> plus y2.` can become `Compare x2 plus y<sup>2</sup>.` The gate accepts the changed expression. Native Chromium snapshots show the superscript moving from the text after `x` to the text after `y`.

[doc_pipeline_source.jsx:10398](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10398) checks each caption's script state, but [the helper at 10375](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10375) captures attachment only for scripts inside links. For this caption both script signatures are `["SUP", "2", null]`, and flattened caption text remains identical. [Line 10403](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10403) then removes captions before the document-wide positional markers can catch the change.

Probe: `caption-exponent-base-moved`. Valid control `caption-inline-wrapper-control` adds harmless spans around the base and exponent; the name and script-position snapshots remain equivalent.

Suggested refinement: preserve script attachment within each existing caption before removing captions for prose comparison, using a representation tolerant of inline wrappers. Figure captions were reproduced; the same shared helper also processes table captions, but a separate table-caption case was not run.
