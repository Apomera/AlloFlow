# OpenAI media production guard

Date: 2026-07-15

Status: implemented as an additive, disabled foundation. It is not registered
with MCP, not wired into Gemini/Canvas, not part of the normal build, and has
not made a live paid request.

## What this phase adds

`agent_core_openai_media_production_guard_module.js` is the required outermost
boundary for any future production use of the disabled OpenAI image adapter.
It adds:

- a second `executionEnabled === true` gate;
- an explicit aggregate authorization callback;
- a provider/model-specific pricing policy with effective and expiration dates;
- refusal when the pricing policy is stale, premature, malformed, or missing;
- preauthorization of the maximum retry cost and alt-text cost;
- a maximum of three image attempts, with retries limited to network failures,
  HTTP 429, and HTTP 500/502/503/504;
- no retry for moderation/client failures such as HTTP 400 or 403;
- a decoded-response byte limit before base64 decoding or asset import;
- complete metered alt-text cost and operation accounting;
- aggregate actual-usage checks against the request budget; and
- serialized execution so per-run accounting cannot cross between concurrent
  requests.

The pricing numbers are deliberately **not hard-coded**. The official GPT Image
2 documentation describes the supported API and links to the current pricing
calculator, but pricing is operational data that can change. A district or
desktop runtime must inject a reviewed policy containing:

- `schemaVersion`, `provider`, and exact `model`;
- `effectiveAt` and `expiresAt` ISO timestamps;
- an official OpenAI documentation URL in `sourceUrl`; and
- `estimateImageCost(input)` and `calculateImageCost(input)` functions.

Review against the current official documentation before enabling a policy:

- <https://developers.openai.com/api/docs/models/gpt-image-2>
- <https://developers.openai.com/api/docs/guides/image-generation>
- <https://developers.openai.com/api/reference/resources/images/methods/generate>
- <https://developers.openai.com/api/reference/resources/images/methods/edit>

## Alt text

Accessible requests require an `altTextPolicy`. A metered provider must return:

```js
{
  text: 'Concise contextual alternative text.',
  actualCostUsd: 0.001,
  operations: 1
}
```

Returning only a string is rejected for metered alt text because it would hide
part of the user's cost. Included or local-resource policies may return a string
when their declared actual cost is zero.

## Live smoke harness

`dev-tools/openai_media_live_smoke.cjs` is an opt-in operator harness. A normal
invocation refuses immediately. It requires all of the following:

- the exact confirmation value
  `ALLOFLOW_OPENAI_MEDIA_LIVE_TEST=I_UNDERSTAND_THIS_MAKES_A_PAID_API_CALL`;
- `OPENAI_API_KEY` in the process environment;
- an explicit prompt and output path;
- a positive maximum cost; and
- a trusted local CommonJS pricing-policy module that is current at execution.

The API key remains in the operator's process. It is added by the runtime-owned
`fetchAuthorized` function and is never placed in a MediaRequest, MCP argument,
prompt, result, or managed asset.

The harness uses one attempt and no alt-text operation. It is intended only to
confirm provider connectivity and saved output after the deterministic suite
passes. It should not be placed in CI or a default package script.

## Verification

The focused suite covers disabled execution, stale pricing, aggregate preflight
budgets, transient retry behavior, non-retryable sanitized errors, response-size
rejection, and metered alt-text accounting. No test contains a credential or
makes an outbound request.

## Integration boundary

Future wiring should depend on this production guard, never directly on
`agent_core_openai_media_adapter_module.js`. Gemini behavior remains unchanged:
no existing provider selection, Canvas quota use, or Firebase/desktop route was
edited in this phase.
