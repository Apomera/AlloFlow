# AlloFlow Tool Integration SDK

The framework-neutral `tool_integration_sdk.js` helper turns a tool-specific result into a bounded Research Hub artifact. It validates the integration contract, stamps source identity, checks the reproducibility receipt, invokes a tool sanitizer, and locates `ResearchHub.captureArtifact` in the current window or a same-origin opener.

## Adapter shape

```js
const adapter = AlloFlowToolIntegration.createAdapter({
  contract,
  buildCapture(payload) {
    return {
      title: payload.title,
      summary: payload.summary,
      data: payload.derivedData,
      reproducibilityReceipt: {
        softwareVersion: contract.version,
        sourceRecordId: payload.sourceRecordId,
        parameters: payload.parameters,
        randomSeed: 'not applicable; deterministic analysis',
        limitations: payload.limitations
      }
    };
  },
  sanitizeCapture(capture) {
    delete capture.data.fullText;
    return capture;
  }
});
```

Call `adapter.prepare(payload)` in tests or previews, `adapter.capture(payload)` after explicit learner approval, and `adapter.download(payload)` when the Research Hub is unavailable. A tool must never treat `prepare` as learner consent.

## Required workflow

1. Copy `docs/tool-integration-template/` and replace the example identity.
2. Declare license, citation guidance, supported method packs, privacy policy, review dates, and reproducibility fields.
3. Keep raw/private inputs out of the capture builder; sanitizer hooks are defense in depth, not permission to collect sensitive data.
4. Add one representative capture fixture and the source/deploy adapter paths to `tool_integrations_manifest.json`.
5. Run `npm run build:tool-integrations` and `npm run verify:tool-integrations`.

The CI checker rejects stale reviews, missing receipt fields, adapter drift, missing SDK tokens, unpinned third-party assets, and privacy fixtures that expose raw text or sequence fields.

## Humanistic rigor

The Text Inquiry Studio reference adapter demonstrates that a computational pattern is evidence for interpretation, not an interpretation by itself. Its approval gate requires a pattern claim, a counter-reading or exception, and a limitation/context note. Captures include derived counts and short concordance excerpts, never the full pasted text.
