# Remaining native form submission preservation gaps

Read-only evidence from the actual strict source gate and actual aiFixChunked with mocked transport, plus native Chromium FormData. No application/test files changed. Browser 148.0.7778.96; source SHA-256 d776f87988d0a5cd0a1be053ce4d79e6b3663175dea9136aa73f3d180813899b; unchanged during probe: true.

## P2: direction companion fields can be removed or renamed

Source fragment:

`<form><label>Student response<input name="answer" dirname="answer.dir" dir="rtl" value="مرحبا"></label></form>`

Candidate removes `dirname="answer.dir"` (or changes its value to `ignored.dir`). Both strict acceptance and the mocked AI-fix pipeline accept/ship the candidate. Native source FormData contains `[["answer","مرحبا"],["answer.dir","rtl"]]`; removal returns only `[["answer","مرحبا"]]`; renaming returns `[["answer","مرحبا"],["ignored.dir","rtl"]]`.

The preserved attribute inventory at doc_pipeline_source.jsx:10938 and state comparison at :10986 omit dirname, so the visible value/name are identical while an existing submitted data field disappears or changes identity. Preserve effective direction companion field semantics on applicable controls; include valid controls for inert attributes and equivalent markup.

## P2: hard-wrapped text can silently change in the submitted payload

Source fragment:

`<form><label>Student response<textarea name="answer" cols="10" wrap="hard">abcdefghijklmnopqrstuvwxyz</textarea></label></form>`

Candidate changes `wrap="hard"` to `wrap="soft"` or changes `cols="10"` to `cols="20"` while retaining hard wrap. Both strict acceptance and the mocked AI-fix pipeline accept/ship the candidate. Every native textarea value remains the exact original alphabet string. Native FormData for the source contains `abcdefghijkl\nmnopqrstuvwx\nyz`, soft wrap contains `abcdefghijklmnopqrstuvwxyz`, and hard wrap with cols20 contains `abcdefghijklmnopqrstuv\nwxyz`.

The state array at doc_pipeline_source.jsx:10986 records textarea.value but omits wrap and effective hard-wrap geometry. Preserve the source hard-wrap submission behavior. A column change under soft wrapping remains a valid presentational change and should not be rejected: its payload is unchanged in the control probe. A neutral wrapper around the source is also accepted with identical payload.

Exact full source/candidate strings, gate decisions, pipeline outcomes, pass evidence, native observations, and code identity are in [results.json](./results.json). Run the local reproduction with `node reports/document-remediation-opportunities-2026-09-19/form-gaps/probe.cjs` after moving/renaming the existing result, because the script intentionally refuses to overwrite review evidence.
