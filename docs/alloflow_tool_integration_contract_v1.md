# AlloFlow Tool Integration Contract v1

The contract makes open-source tool captures self-describing, reviewable, and portable. It does not certify that a tool or result is scientifically valid. It records what AlloFlow needs to evaluate provenance and prompt learner review.

## Required contract fields

```js
{
  schemaVersion: 1,
  id: 'stable_lowercase_tool_id',
  name: 'Human-readable tool name',
  version: 'declared tool or adapter version',
  license: { name: 'license or terms description', spdx: 'optional SPDX id', url: 'optional URL' },
  citation: { text: 'citation guidance', url: 'optional canonical source' },
  supportedMethodPacks: ['scientific_investigation'],
  capabilities: { captureArtifact: true, rawDataIncluded: false },
  privacy: { learnerApprovalRequired: true },
  reproducibility: {
    requiredFields: ['softwareVersion', 'sourceRecordId', 'parameters', 'randomSeed', 'limitations']
  }
}
```

Supported method packs are `scientific_investigation`, `engineering_design`, `humanistic_interpretation`, `community_qualitative`, `civic_policy`, and `creative_cultural`.

## Registration and capture

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

Legacy and unregistered captures remain reviewable but are labeled as such. Portfolio export embeds the contract snapshot, reproducibility receipt, integration health, and argument/evidence audit so the record remains intelligible if the original tool changes.