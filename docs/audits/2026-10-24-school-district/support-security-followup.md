# Support reporting security improvements

October 24, 2026. These local changes address accidental disclosure through diagnostics and feedback, unbounded bug-report intake, and indefinite retention of newly submitted reports. They require a coordinated application and Worker release before affecting the live service or existing Canvas copies.

## Changes

The diagnostic reporter now shows an editable copy of every report field and its destination. Sending requires confirmation of that copy. New errors do not silently enter an already opened draft; Update report explicitly captures a fresh copy and requires review again. Editing a field, changing the destination policy, or removing additional credentials invalidates the confirmation. Editing a report does not alter the captured diagnostic log.

Credential removal runs before persistence and length caps and again on reporting and clipboard paths. Coverage includes authorization headers, API keys, tokens, cookies, session IDs, private keys, URL user information, sensitive query parameters, fragments, and supported escaped JSON or encoded/nested URLs. It does not guarantee detection of arbitrary obfuscation, personal information, or every credential format. Users must review free text and contextual details before sharing.

Two regex scans were also changed to avoid quadratic work on long diagnostic strings. Oversized individual values are omitted whole before expensive parsing, rather than truncated into possible credential fragments. An isolated synthetic 20,000-character check fell from approximately 2,535 ms to 0.96 ms; the corresponding broad diagnostic integration case fell from 3,604 ms to 158 ms. These observations establish a regression improvement, not a latency guarantee for every device or payload.

The support request omits browser credentials and referrers, disables caching, and refuses redirects that could forward a reviewed POST body to another destination. Network failure does not automatically open a fallback form. When the fallback is permitted, an explicit button rechecks policy and opens an empty form; captured diagnostics are not placed in that form's URL. Receipts continue to distinguish storage confirmation from human review or uncertain delivery.

Project Settings no longer opens the public form when a managed policy is configured and the policy-aware reporter is unavailable. Translation and item-correction feedback are separate community contribution routes: any configured support policy blocks their independent developer POSTs, optional remote source lookup, and Google Form fallback. Their normal unmanaged metadata now contains only the page origin, rather than a private Canvas link, URL path, query, fragment, or embedded credentials. A failed popup leaves the suggestion draft and current page intact.

The built-in Worker limits actual streamed `/submitBug` input to 1 MiB before parsing, regardless of the declared size. It validates the JSON media type and UTF-8 and returns private, content-free errors. New reports receive a server-owned expiry and 30-day KV expiration. Newly appended review notes expire no later than their parent report, with a 30-day cap; notes for legacy reports receive a bounded window too. A note cannot renew the report's lifetime.

Existing reports and review events are not migrated or deleted. Custom support endpoints, Google Forms, exports, platform logs, and provider copies need their own retention controls. Anonymous bug-report intake remains available; the changes do not create verified district identity or comprehensive spam prevention.

## Deployment configuration

Set this deployment-owned value before loading the reporter to keep diagnostics local:

```javascript
window.ALLOFLOW_SUPPORT_REPORTING_POLICY = {
  version: 1,
  enabled: false
};
```

To approve a particular support service:

```javascript
window.ALLOFLOW_SUPPORT_REPORTING_POLICY = {
  version: 1,
  enabled: true,
  endpoint: 'https://district.example/support/report',
  allowGoogleFormFallback: false
};
```

The endpoint must be an absolute HTTPS URL without embedded credentials, a query, or a fragment. Unknown fields, wrong types, unsupported versions, and malformed values disable external reporting. An explicitly assigned `undefined` value is malformed; complete absence of the property retains the existing default destination and optional form behavior. A configured policy defaults Google Form fallback to off unless explicitly enabled. Local diagnostics and deliberate credential-scrubbed copying remain available.

The endpoint must implement the reporter's JSON request and save-confirmation contract. Custom destinations are not assumed to provide private storage. See [the reporter](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/error_reporter_module.js) and [Worker documentation](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/catalog/cloudflare-worker/README.md).

This browser configuration is a deployment convenience, not an authorization boundary against modified page code. District network and service controls must enforce approved destinations. It does not govern every external community publishing feature or other network request in the application.

## Validation

Tests use synthetic credentials, stubbed transports, and local storage implementations. They cover policy changes, missing/older reporter fallbacks, exact reviewed payloads, unchanged logs, clipboard fallbacks, encoded credential forms, truncation boundaries, redirects, streamed byte limits, invalid encoding, server-controlled retention, and preservation of receipt, inbox, review, digest, and AlloBot diagnostic behavior.

Final validation passed 41 reporter privacy tests, 72 existing reporter/AlloBot checks, 186 Worker delivery/review/inbox/digest checks, 39 community feedback checks, and 25 settings/project-save checks. Syntax and scoped whitespace checks pass. All four affected application/public module pairs match byte-for-byte. Source hashes and validation groups are recorded in [support-security-validation.json](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/docs/audits/2026-10-24-school-district/support-security-validation.json).

Offline headless Edge checks used synthetic content with intercepted navigation and a stubbed reporting service. They verified no sending before review, credential removal from the local buffer, exact approved destination/options, managed-policy blocking, and mobile horizontal overflow. Desktop and mobile previews were visually inspected. Evidence is in [browser checks](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/docs/audits/2026-10-24-school-district/support-review-browser-checks.json), [desktop preview](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/docs/audits/2026-10-24-school-district/support-review-desktop.png), and [mobile preview](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/docs/audits/2026-10-24-school-district/support-review-mobile.png).

Before release, refresh the affected module references from the reviewed commit, verify application/public mirrors and the exact Worker bundle, then validate the approved PPS Canvas workflow. No production configuration, live record, sharing permission, or remote deployment was changed in this work.

The design follows sensitive-data minimization in [OWASP's logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), bounded input handling in [Cloudflare's Workers guidance](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), and the documented [KV expiration options](https://developers.cloudflare.com/kv/api/write-key-value-pairs/).
