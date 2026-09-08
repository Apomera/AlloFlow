# Document remediation benchmark

local mode; 2/2 trials; 2 passed.

| Case | Passed | Median ms | p95 ms | Readiness |
| --- | ---: | ---: | ---: | --- |
| education-table | 1/1 | 3653.375 | 3653.375 | review-required |
| education-worksheet | 1/1 | 4137.864 | 4137.864 | review-required |

Raw evidence:

- education-worksheet trial 1: [result](trials/education-worksheet/trial-01/result.json), [execution](trials/education-worksheet/trial-01/execution.json), [log](trials/education-worksheet/trial-01/stderr.log)
- education-table trial 1: [result](trials/education-table/trial-01/result.json), [execution](trials/education-table/trial-01/execution.json), [log](trials/education-table/trial-01/stderr.log)

- Trials are serial and cold-process; OS caches and load are not controlled.
- Median is the middle value (mean of middle pair); p95 is nearest rank. Small samples are smoke evidence, not performance guarantees.
- Failed and timeout durations remain in allTiming; completedTiming excludes transport failures and timeouts.
- Absent model/retry/rejection metrics are null and counted as missing, never inferred as zero.
- Portable token recall is plan-internal; scripted checks do not establish real-model quality. No independent human labels are supplied.
- Configured model identifiers and prompt/source hashes are recorded; providers may revise a model behind the same identifier.
- Raw local evidence and artifacts can contain document content. Live mode sends selected source documents through the existing configured provider.
