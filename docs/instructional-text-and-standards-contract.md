# Instructional text and standards contract

This contract keeps four facts separate across direct generation, Full Pack,
Blueprint, Unit Path, Agent Core, persistence, audits, and exports:

1. the instructional grade and standards being taught;
2. the role a text plays in the lesson;
3. any internal prompt calibration used to counter model overshoot; and
4. evidence measured from the exact generated content.

The internal resource type `simplified` remains unchanged for compatibility. It
does not by itself mean that a text is a modification or a permissible primary
replacement.

## Canonical fields

Reading artifacts carry `instructionalText`:

```js
{
  schemaVersion: 1,
  role: 'primary' | 'supplemental' | 'unspecified',
  form: 'original' | 'same-text-supported' | 'adapted',
  sourceArtifactId: null | string,
  primaryArtifactId: null | string,
  designationSource: 'educator' | 'workflow-default' | 'legacy-inferred',
  replacementAuthorization: {
    authorized: boolean,
    source: 'none' | 'educator'
  },
  complexity: {
    requestedGrade: string,
    calibrationTarget: string,
    measuredGrade: null | number,
    method: string,
    status: string,
    contentFingerprint: string,
    measuredAt: string,
    language: string
  }
}
```

Runs and plans carry `instructionalContext`:

```js
{
  schemaVersion: 1,
  instructionalGrade: string,
  primaryTextPolicy: 'preserve-primary' | 'educator-directed',
  standardsContext: object | null,
  standardsFingerprint: string
}
```

`instructional_context_module.js` is the single normalization and complexity-
target implementation. Callers should tolerate missing metadata and use its
conservative legacy inference; they must never infer educator replacement
authorization.

## Invariants

- Grade aliases are normalized before prompts, snapshots, titles, and checks.
- The requested grade remains the educator-facing target. The lower source-
  generation prompt target is recorded only as `calibrationTarget`.
- Adapted text defaults to `supplemental` and links to its source/primary
  artifact when one is available.
- Only an explicit educator action can set an adapted text to `primary` with
  `replacementAuthorization.authorized === true`.
- Standards directives preserve required content, cognitive verbs, and evidence
  expectations even when language complexity changes.
- Checks and rewrites resolve grade, language, and standards from the artifact,
  not from settings that may have changed afterward.
- Readability evidence is valid only when its fingerprint matches the exact
  content. Every edit, undo/redo, slider rewrite, selection rewrite, and rigor
  rewrite remeasures safe English text or invalidates the evidence.
- English Flesch–Kincaid is not applied as a grade verdict to non-English or
  bilingual content.
- Full Pack preserves a primary-text policy. Under `preserve-primary`, adapted
  text is not forced into the plan. Before approval, educators may add or remove
  resources, change resource types and directives, reorder the run, or explicitly
  opt into a supplemental Adapted Text companion. Those edits retain stable row
  identities and update the generation/capacity estimate.
- Student-facing share/export paths preserve role metadata and warn when a
  supplemental adaptation is delivered without its linked primary. Warnings
  preserve educator control; they are not legal determinations.

## Standards constraints

`standards_context_module.js` may carry a sourced
`instructionalConstraints.textAccessExpectation` value. Constraints affect AI
planning only when preserved with source/basis metadata. They are planning
signals, not legal advice. Resource-specific directives distinguish primary
source writing, supplemental adaptation, and other standards-aligned resources.

## Compatibility and migration

- Keep `type: 'simplified'`; use `instructionalText` for instructional meaning.
- Preserve the full envelopes through history, Firestore, sharing, duplication,
  Blueprint/Full Pack run records, Agent Core artifacts, and export provenance.
- Legacy analysis artifacts may be inferred as primary originals. Legacy adapted
  artifacts remain `unspecified` unless an educator designates them.
- Existing `localStats` and `targetGradeLevel` fields remain readable during the
  migration, but canonical freshness and role decisions live in
  `instructionalText`.

## Verification expectations

Tests should cover grade aliases, prompt-calibration parity, direct/Full Pack/
Blueprint/Unit Path context propagation, role preservation, explicit educator
authorization, source linkage, content-hash freshness, language guards,
persistence round trips, role-aware audits, and student-delivery warnings.

`node dev-tools/evaluate_text_complexity_calibration.cjs` provides a checked-in,
offline regression corpus for grade aliases, calibration bands, readability,
fingerprints, status decisions, and provider/model dimensions. Generated-source
provenance records the configured provider and model so de-identified samples can
later be compared across model versions. The offline corpus verifies policy
mechanics; it does not prove that a particular undershoot target is optimal for a
live model, which requires repeated empirical samples.
