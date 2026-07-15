# AlloFlow MCP live-client findings

**Date:** 2026-07-14
**Client:** Claude Code 2.1.207 (VS Code extension native client)
**Server:** local stdio `alloflow-agent-core` 0.1.0

## Outcome

Task A succeeded. Claude Code registered the project-local AlloFlow server, reported it healthy, and called each of the three read-only tools exactly once with synthetic data. There were no permission denials, no student information, no generation request, and no AlloFlow write operation.

The run also exposed important Blueprint schema friction: Claude invented `step` as the plan-item discriminator, while the contract requires `tool`. The transport call succeeded but contract validation returned `empty-plan`, which did not explain that supplied items had an unrecognized shape.

## Tool results

| Tool | Transport | Contract/result | Finding |
|---|---|---|---|
| `capabilities` | Success | Default `desktop-local` manifest returned | All AI modalities and catalog capabilities were honestly unavailable. Permissions included `artifact:read` and `artifact:draft`. |
| `blueprint_validate` | Success | `ok: false`; `empty-plan`; normalized value `null` | Claude sent two plan items using `step` rather than `tool`. No `requiredCapabilities` can be returned when normalization fails. |
| `artifact_validate` | Success | `ok: true`; zero errors and warnings | The synthetic quiz envelope normalized successfully and gained `provenance: {}`. An empty `questions` array is accepted because this validator checks the envelope, not pedagogical completeness. |

## Root cause and description quality

The MCP input schema advertises `blueprint` only as a generic object described as "A schemaVersion 1.0 Blueprint object." It does not declare Blueprint fields, required fields, or the `plan[].tool` discriminator. The tool description explains the result but not the input shape. This makes a plausible model-authored `step` field likely.

The resulting `empty-plan` error is technically consistent with normalization but misleading: the caller supplied two items. A better contract error would identify each unrecognized plan item and say that `tool` is required.

`artifact_validate` likewise advertises a generic object. Its current description can be read as validating the educational resource itself, while it presently validates only the artifact envelope and safety constraints.

## Recommended usability patch before Task B

1. Expand the two MCP `inputSchema` definitions with their actual nested fields, required keys, enums, and `additionalProperties` policy. At minimum, declare `plan` items as `{ tool, directive }` and require `tool`.
2. Add an `invalid-plan-item` error when a non-empty supplied plan contains entries without a recognized tool discriminator; reserve `empty-plan` for a genuinely empty array.
3. Clarify that `artifact_validate` performs structural, size, provenance, and safety validation, not content-quality or pedagogical validation.
4. Revisit whether the honest-empty first-slice manifest should advertise `artifact:draft` when this connector exposes no draft-writing tool.
5. Keep the revised privacy language: this run used a cloud Claude model, so local stdio transport did not mean local inference.

## Implemented follow-up

The schema-usability recommendations above were implemented after this review:

- `blueprint_validate` now advertises the canonical nested Blueprint schema, including required `plan[].tool` values drawn from the shared contract catalog.
- `artifact_validate` now advertises its structural envelope schema and explicitly disclaims content-quality and pedagogical-completeness assessment.
- Malformed supplied plan entries now return `invalid-plan-item`; `empty-plan` is reserved for an actually empty array, and a non-array plan returns `bad-plan`.
- Focused automated verification now covers what the client sees through `tools/list`. A second cloud-model run was intentionally not spent because the first run exposed a deterministic schema/diagnostic issue that local protocol tests can pin directly.

The separate question of whether an honest-empty connector should advertise `artifact:draft` remains open for the later permission-model review.

## Operational observations

- MCP health check: `alloflow: node desktop/mcp/alloflow-mcp-stdio.cjs - Connected`.
- End-to-end Claude session: approximately 54.5 seconds and five turns.
- Claude reported an estimated session cost of `$0.683498` with substantial cached workspace context. This may not equal a subscription charge, but it is a meaningful quota/cost signal for demos and library-population workflows.
- Claude warned that the workspace trust dialog had not been accepted. The test did not change or bypass that trust setting; workspace permission allowlists and additional-directory settings remained ignored.
- The AlloFlow MCP registration persists in Claude Code project-local configuration for this repository.

## Acceptance decision

Task A is complete. The connector is interoperable with a real agent client and all three tools are callable. The schema-friction findings should be reviewed before beginning Task B, as required by the staged roadmap.
