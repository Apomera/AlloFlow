# Learning Commons v1.11.0 export profile

Profiled on 2026-08-01 from the pinned public JSONL files. The source files remain in temporary storage and are not committed to the repository.

## Source integrity

| File | Bytes | SHA-256 | Last modified |
| --- | ---: | --- | --- |
| `nodes.jsonl` | 292,652,341 | `FFC142F72450C9692A9E547207CBA3E0CD4012EB00C1D1BE6AACED165C4139C5` | 2026-07-09T21:56:05Z |
| `relationships.jsonl` | 520,406,049 | `74389D5E438E7A7F23E1128539827533AE08ACACC73C9F3E4C81CC07A8916B21` | 2026-07-09T21:56:05Z |

These values are recorded in `dev-tools/learning_commons_snapshot_manifest.json` and can be enforced with the importer’s `--verify-source` option.

## Corpus profile

- 247,786 total nodes, including 214 framework nodes and 222,865 academic-standard-item nodes.
- `isCurrent` is absent on all 222,865 academic-standard items. The importer must preserve this as unknown rather than claiming that every item is current.
- Normalized statement types: 150,536 `Standard`, 54,632 `Standard Grouping`, 16,180 `Other`, and 1,517 missing.
- Academic subjects: English Language Arts 70,670; Science 64,121; Mathematics 46,319; Social Studies 41,755.
- Grade values include PK, K, and 1–12. Massachusetts contributes 5,797 academic-standard items.
- CASE UUID, CASE URI, description, jurisdiction, academic subject, and grade coverage are effectively complete. Statement-code coverage is 160,536 of 222,865 items (72.03%).
- 456,620 relationships were profiled. All relationship endpoints resolve to known nodes; 248,219 edges connect two `StandardsFrameworkItem` nodes.
- There are 223,462 `hasChild` edges, 214 framework roots, 223,049 reachable hierarchy nodes, and an observed maximum depth of 8. The corrected profiler found no `hasChild` cycles.

## Massachusetts Science Grade 5 pilot

The verified importer generated two temporary pilot variants:

- Standards-only: 25 resolvable standards and 0 direct relationships.
- Structural: 44 records: 25 standards, 18 groups, and 1 framework, connected by 43 `hasChild` relationships.

The structural pilot preserves the actual framework identity:

```text
Massachusetts Science and Technology/Engineering Framework
frameworkId: 38542f25-9335-4099-bc86-19c23f23b4c4
```

The zero-edge standards-only result is expected: the source hierarchy runs through grouping nodes. The structural variant is therefore the appropriate input for an Alignment Map, while `resolvable: false` keeps those grouping/framework records out of teacher-facing standard resolution.

## Decisions from the profile

1. Do not use `isCurrent` as a default filter for this export because it is not populated.
2. Keep `statementCode` optional at ingestion; preserve CASE UUID and CASE URI as stable identity/source evidence.
3. Preserve framework ancestry and names in generated records.
4. Use the structural variant for graph visualization and audit context, while exposing only normative standards to lesson targeting.
5. Treat the 25-record Massachusetts Science Grade 5 structural subset as a review candidate, not yet as an ordinary-user default.
