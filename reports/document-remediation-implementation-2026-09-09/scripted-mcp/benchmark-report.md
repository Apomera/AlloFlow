# Document remediation benchmark

local mode; 1/1 trials; 1 passed.

| Case | Passed | Median ms | p95 ms | Readiness |
| --- | ---: | ---: | ---: | --- |
| scripted-pipeline | 1/1 | 44752.733 | 44752.733 | unavailable |

Raw evidence:

- scripted-pipeline trial 1: [result](trials/scripted-pipeline/trial-01/result.json), [execution](trials/scripted-pipeline/trial-01/execution.json), [log](trials/scripted-pipeline/trial-01/stderr.log)

- Trials are serial and cold-process; OS caches and load are not controlled.
- Median is the middle value (mean of middle pair); p95 is nearest rank. Small samples are smoke evidence, not performance guarantees.
- Failed and timeout durations remain in allTiming; completedTiming excludes transport failures and timeouts.
- Absent model/retry/rejection metrics are null and counted as missing, never inferred as zero.
- Portable token recall is plan-internal; scripted checks do not establish real-model quality. No independent human labels are supplied.
- Configured model identifiers and prompt/source hashes are recorded; providers may revise a model behind the same identifier.
- Raw local evidence and artifacts can contain document content. Live mode sends selected source documents through the existing configured provider.
