# Document remediation benchmark

local mode; 12/12 trials; 10 passed.

| Case | Passed | Median ms | p95 ms | Readiness |
| --- | ---: | ---: | ---: | --- |
| education-figure | 2/2 | 3436.093 | 4863.454 | review-required |
| education-form | 2/2 | 1778.635 | 2203.355 | blocked |
| education-reading | 2/2 | 12894.825 | 24917.84 | review-required |
| education-scan | 2/2 | 6859.762 | 10156.679 | review-required |
| education-table | 1/2 | 19232.809 | 37452.136 | review-required, unavailable |
| education-worksheet | 0/1 | 3942.045 | 3942.045 | review-required |
| education-worksheet | 1/1 | 10783.667 | 10783.667 | review-required |

Raw evidence:

- education-worksheet trial 1: [result](trials/education-worksheet/trial-01/result.json), [execution](trials/education-worksheet/trial-01/execution.json), [log](trials/education-worksheet/trial-01/stderr.log)
- education-reading trial 1: [result](trials/education-reading/trial-01/result.json), [execution](trials/education-reading/trial-01/execution.json), [log](trials/education-reading/trial-01/stderr.log)
- education-table trial 1: [result](trials/education-table/trial-01/result.json), [execution](trials/education-table/trial-01/execution.json), [log](trials/education-table/trial-01/stderr.log)
- education-scan trial 1: [result](trials/education-scan/trial-01/result.json), [execution](trials/education-scan/trial-01/execution.json), [log](trials/education-scan/trial-01/stderr.log)
- education-form trial 1: [result](trials/education-form/trial-01/result.json), [execution](trials/education-form/trial-01/execution.json), [log](trials/education-form/trial-01/stderr.log)
- education-figure trial 1: [result](trials/education-figure/trial-01/result.json), [execution](trials/education-figure/trial-01/execution.json), [log](trials/education-figure/trial-01/stderr.log)
- education-worksheet trial 2: [result](trials/education-worksheet/trial-02/result.json), [execution](trials/education-worksheet/trial-02/execution.json), [log](trials/education-worksheet/trial-02/stderr.log)
- education-reading trial 2: [result](trials/education-reading/trial-02/result.json), [execution](trials/education-reading/trial-02/execution.json), [log](trials/education-reading/trial-02/stderr.log)
- education-table trial 2: [result](trials/education-table/trial-02/result.json), [execution](trials/education-table/trial-02/execution.json), [log](trials/education-table/trial-02/stderr.log)
- education-scan trial 2: [result](trials/education-scan/trial-02/result.json), [execution](trials/education-scan/trial-02/execution.json), [log](trials/education-scan/trial-02/stderr.log)
- education-form trial 2: [result](trials/education-form/trial-02/result.json), [execution](trials/education-form/trial-02/execution.json), [log](trials/education-form/trial-02/stderr.log)
- education-figure trial 2: [result](trials/education-figure/trial-02/result.json), [execution](trials/education-figure/trial-02/execution.json), [log](trials/education-figure/trial-02/stderr.log)

- Trials are serial and cold-process; OS caches and load are not controlled.
- Median is the middle value (mean of middle pair); p95 is nearest rank. Small samples are smoke evidence, not performance guarantees.
- Failed and timeout durations remain in allTiming; completedTiming excludes transport failures and timeouts.
- Absent model/retry/rejection metrics are null and counted as missing, never inferred as zero.
- Portable token recall is plan-internal; scripted checks do not establish real-model quality. No independent human labels are supplied.
- Configured model identifiers and prompt/source hashes are recorded; providers may revise a model behind the same identifier.
- Raw local evidence and artifacts can contain document content. Live mode sends selected source documents through the existing configured provider.
