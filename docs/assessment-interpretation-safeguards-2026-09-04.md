# Assessment interpretation safeguards — September 4, 2026

The Assessment Center now treats built-in and legacy probe records as descriptive practice data unless reference compatibility is explicitly established. Recorded scores, individual goals and progress data remain available. A reference comparison never assigns an intervention tier.

## Changes

- Corrected the active ORF reference to the **2017** Hasbrouck–Tindal 50th-percentile table. The previous table was labeled 2017 but used older values. First-grade fall is unavailable, not a zero benchmark.
- Removed the unverified NWF, LNF and generic math tables from the active reference set. AlloFlow's own practice forms are not the standardized instruments from which external norms were obtained.
- Missing-number, quantity-discrimination and generic items-correct results are not interpreted as digits correct per minute. Readers preserve explicit DCPM, correct-letter-sound scores and genuine zeros. Legacy raw counts remain descriptive with their own units.
- Missing grades/seasons, invalid numeric scores, unsupported measures, interrupted attempts, decodable passages and incompatible metadata cannot produce a reference comparison.
- The remaining ORF comparison describes position relative to a median, carries its source, and explicitly says that percentage of a median is neither a percentile rank nor a service tier.
- Automatic activity-threshold groups are labeled **practice-data review groups**. Their numeric keys remain for compatibility; they are not validated screening classifications or service placements. Team decision forms remain available.
- Screens, printed summaries, CSV, AlloSheet metadata, report-writer sections and the Report Writer import summary reflect these boundaries. Unavailable reference explanations are visible rather than silently omitted.

## Reference comparison contract

`interpretProbeResult(probeType, score, grade, season, record)` accepts the original arguments plus an optional source record. Without compatible evidence it returns `tier: 0`, `comparisonAvailable: false`, `benchmark50: null`, `reviewRequired: true`, and a reason.

The configured comparison is English ORF in WCPM against Hasbrouck–Tindal 2017 for grades 1–6. A reviewed external record can carry:

```json
{
  "activity": "orf",
  "grade": "3",
  "wcpm": 40,
  "timestamp": 1768910400000,
  "benchmarkContext": {
    "referenceId": "hasbrouck-tindal-2017-orf",
    "measure": "orf",
    "unit": "wcpm",
    "grade": "3",
    "season": "winter",
    "language": "en",
    "durationSeconds": 60,
    "material": "unpracticed-grade-level",
    "scoring": "standardized",
    "reviewedByEducator": true,
    "formId": "actual-reviewed-form-identifier"
  }
}
```

This is an educator attestation of compatibility, not automatic validation or certification of an instrument. Do not add it to generated/practiced/decodable passages or copy it onto historical records to force comparisons. The current practice UI does not automatically set these fields; external record integrations must supply reviewed evidence. No data migration is performed.

A compatible comparison still returns `tier: 0` (no tier assignment), alongside `comparisonAvailable: true`, the reference median, provenance and review guidance. `getRTITier` retains its legacy method name and structure, but its new `reviewRequired` / `isServicePlacement` fields and `perProbe` details must be respected. Report Writer no longer labels such a payload “RTI tier 0.”

## Evidence and limits

The author-attributed [2017 ORF table and administration explanation](https://www.readingrockets.org/topics/fluency/articles/fluency-norms-chart-2017-update) distinguish the updated values from the 2006 table. The [University of Oregon DIBELS materials](https://dibels.uoregon.edu/materials/dibels) provide instrument-specific administration and benchmark resources; they do not validate AlloFlow-generated forms.

Regression coverage exercises the shipped code: all updated ORF values, missing/zero references, mismatched context fields, invalid scores, raw-score preservation, visible unavailable feedback, history-to-report round trips, goal preservation and reference provenance. Existing accessibility, record lifecycle and privacy-transfer tests also run.

This is a software safeguard, not psychometric validation. The separate Math Fluency module and other specialist assessment tools retain their own scoring systems; this change scopes the Assessment Center's interpretation and its downstream exports. Re-enabling any normative comparison requires an independently reviewed measure/form/unit/administration contract. Team judgment and independent evidence are still required for instructional and service decisions.