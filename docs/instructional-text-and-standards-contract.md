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

## Generation identity and plan matrices

`generation_matrix_module.js` is the shared, pure policy used by Full Pack and
Blueprint. Every planned output cell has a deterministic `generationIdentity`
derived from the source fingerprint, resource type, relevant frozen context,
grade, output language, and—only for repeatable resource types—a purposeful
variant key. Generated artifacts preserve that identity at the top level and/or
in their configuration snapshot; consumers tolerate both shapes during legacy
migration.

Reviewed rows carry `generationVariants`. Each cell records one of four actions:

- `reuse`: link the exact existing artifact and make no AI call;
- `generate`: create a resource type that does not yet exist for this source and
  context;
- `variant`: create a distinct, permitted purpose/mode of a repeatable type; or
- `refresh`: replace intentionally changed or explicitly rebuilt work.

Analyze Source is a source-global singleton. Other singleton policies allow one
canonical resource per relevant source context. Repeatable types may have
multiple copies only when a directive, mode, grade, or language makes them
meaningfully distinct. Exact duplicate identities are suppressed. New resource
types are prioritized before extra variants, while dependency ordering keeps
analysis first and synthesis resources such as Lesson Plan last.

Differentiation and output-language settings form an explicit cross-product only
for resource types that support those axes. A row eligible for three grades and
three languages therefore contains nine cells; reuse is decided independently
for each cell. Translation policy remains part of the frozen generation context
and is distinct from an output-language cell.

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
- Full Pack and Blueprint show the same frozen grade-by-language matrix before
  approval, re-resolve it after plan edits, execute exactly its non-reuse cells,
  and link its reuse cells without calling the model. Rebuild is an explicit
  refresh, never an accidental duplicate.
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
