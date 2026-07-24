# AlloFlow Tool Integration Contract v1

The contract makes open-source tool captures self-describing, reviewable, and portable. It does not certify that a tool or result is scientifically valid. It records what AlloFlow needs to evaluate provenance and prompt learner review.

## Required contract fields

```js
{
  schemaVersion: 1,
  id: 'stable_lowercase_tool_id',
  name: 'Human-readable tool name',
  version: 'declared tool or adapter version',
  reviewedAt: 'YYYY-MM-DD',
  reviewAfter: 'YYYY-MM-DD',
  license: { name: 'license or terms description', spdx: 'optional SPDX id', url: 'optional URL' },
  citation: { text: 'citation guidance', url: 'optional canonical source' },
  supportedMethodPacks: ['scientific_investigation'],
  capabilities: { captureArtifact: true, rawDataIncluded: false },
  privacy: { learnerApprovalRequired: true, directIdentifiersAllowed: false, sequenceLikeTextAllowed: false, sanitizerId: 'stable_sanitizer_id', sanitizerRequired: false },
  reproducibility: {
    requiredFields: ['softwareVersion', 'sourceRecordId', 'parameters', 'randomSeed', 'limitations']
  }
}
```

Supported method packs are `scientific_investigation`, `engineering_design`, `humanistic_interpretation`, `community_qualitative`, `civic_policy`, and `creative_cultural`.

## Registration and capture

New companion tools should use `tool_integration_sdk.js` so contract validation, receipt checks, sanitizer application, Research Hub discovery, and fallback JSON download follow one path. Start with `docs/tool-integration-template/` and the implementation guide in `docs/tool_integration_sdk.md`; direct registration remains supported for older adapters.

```js
const registration = window.ResearchHub.registerToolIntegration(contract);
if (!registration.ok) throw new Error(registration.issues.join('; '));

window.ResearchHub.captureArtifact({
  sourceToolId: contract.id,
  sourceToolName: contract.name,
  sourceToolVersion: contract.version,
  integrationContract: contract,
  artifactKind: 'tool_observation',
  title: 'Short learner-facing title',
  summary: 'Small, privacy-reviewed summary rather than a raw file',
  sourceRecordId: 'stable record identifier',
  generatedAt: new Date().toISOString(),
  privacy: 'What is included, omitted, or redacted',
  reproducibility: {
    softwareName: contract.name,
    softwareVersion: contract.version,
    sourceRecordId: 'stable record identifier',
    sourceDatabase: 'database or corpus name',
    datasetVersion: 'when known',
    parameters: {},
    randomSeed: 'not applicable',
    transformations: [],
    limitations: ['What this output cannot establish']
  },
  data: { summaryFieldsOnly: true }
});
```

Captures enter a local review inbox. Nothing joins the Inquiry Portfolio until the learner adds an interpretation and explicitly approves it. Integrations should not include raw files, credentials, direct identifiers, identifiable interviews, or restricted cultural material.

## Health meanings

- `healthy`: the contract validates, the receipt is complete, and learner interpretation plus uncertainty are present.
- `needs_review`: usable, but metadata, reproducibility, or uncertainty documentation is incomplete.
- `action_needed`: invalid/missing required metadata or an approved output lacks learner interpretation.

Legacy and unregistered captures remain reviewable but are labeled as such. Learners may attach clearly labeled context without reconstructing unknown provenance, or download an artifact archive before removing local copies. Portfolio export embeds the contract snapshot, reproducibility receipt, integration health, and argument/evidence audit so the record remains intelligible if the original tool changes.

## Conformance and freshness

The canonical catalog is `tool_integrations_manifest.json`; the machine-readable contract is `docs/alloflow_tool_integration_contract_v1.schema.json`. Run:

```sh
npm run verify:tool-integrations
```

The check rejects duplicate ids, invalid method or receipt fields, missing licenses/citations, overdue `reviewAfter` dates, missing adapter files, embedded-contract drift, and source/deploy mirror drift. Runtime capture also blocks common credential patterns and direct identifiers when prohibited, redacts long sequence-like strings unless explicitly allowed, limits each tool to five queued captures per minute, and rejects duplicate or overflow captures.