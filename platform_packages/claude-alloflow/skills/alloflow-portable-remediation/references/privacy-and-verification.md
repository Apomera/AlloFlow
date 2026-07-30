# Privacy and verification boundary

## Data path

The intended path is:

```text
user attachment -> active Claude/ChatGPT sandbox -> local scripts -> local artifacts
```

The scripts contain no HTTP client and make no model, MCP, Cloudflare, Gemini,
analytics, or telemetry calls. The optional Chromium renderer blocks page
network requests and embeds local images as data URLs before rendering.

This keeps AlloFlow and its operator outside the document data path. It does not
change the user's relationship with Claude or ChatGPT. An institution must
still approve its chosen provider, account, configuration, and permitted data.

## Verification levels

The report distinguishes independent capabilities:

- `semantic_html`: deterministic rendering from the validated repair plan.
- `static_html_audit`: structural checks performed without a browser or model.
- `tagged_pdf_generation`: Chromium output requested with tagged-PDF support.
- `pdf_structural_smoke`: markers such as `/StructTreeRoot` found in the PDF.
- `pdf_ua_validation`: offline veraPDF execution through local Java.
- `source_binding`: the repair plan's SHA-256 matches the exact source PDF bytes.
- `plan_internal_token_recall`: compares host-supplied `source_pages` with the
  output blocks. It can flag internal omissions but does not independently
  verify the host's extraction against the PDF.
- `human_source_comparison`: always required and never automated here.

One capability must never stand in for another. In particular, generating a
tagged PDF is not proof of PDF/UA conformance, and a clean static HTML audit is
not proof that the reading order or alt text is meaningful.

## Institutional responsibility

An institution processing its own authorized records in an institution-managed
environment retains its ordinary FERPA, security, retention, access-control,
records-management, and incident-response responsibilities. That is different
from operating a remediation service for unrelated outside users.

Do not configure a university or school deployment as a public document service
for outsiders without separate legal authority, contracts, governance, and a
security/privacy review.

## Output handling

- Never overwrite the source PDF.
- Keep output names collision-safe.
- Do not print document text to logs.
- Reports may include a source basename and SHA-256 digest, but never an
  absolute source path or document content.
- Delete sandbox artifacts when the user asks or when the host session's normal
  retention policy requires it.
