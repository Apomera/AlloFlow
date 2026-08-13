# Institution pilot operations

The pilot emits structured Workers Logs and a fixed Workers Analytics Engine
record for remediation liveness, retry, checkpoint, cleanup, and release
events. No document content is emitted. Opaque job and attempt IDs appear only
in Workers Logs for incident correlation; they are not Analytics Engine
dimensions.

## Metric layout

The `PILOT_METRICS` dataset uses one sampling index (`index1`, the opaque
institution ID). Its stable columns are:

| Column | Meaning |
| --- | --- |
| `blob1` | event |
| `blob2` | outcome |
| `blob3` | stage |
| `blob4` | Worker release ID |
| `double1` | count |
| `double2` | duration milliseconds |
| `double3` | bytes |
| `double4` | queue age milliseconds |
| `double5` | lease slack milliseconds |
| `double6` | provider retry delay milliseconds |
| `double7` | checkpoint sequence |
| `double8` | remaining budget |

`npm run alerts:check` queries the last 15 minutes through Cloudflare's
Analytics Engine SQL API and exits `2` when a checked alert threshold fires.
Run it every five minutes from the institution's existing monitor and route a
non-zero result to its normal notification channel. It requires:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ANALYTICS_TOKEN` with only Account Analytics Read

The default gates are intentionally conservative for the small staging pilot:
any failed operation, fatal lease expiry, or unavailable durable-checkpoint
pointer read is critical; three deferred lease renewals or ten throttles in 15
minutes is a warning. Review thresholds after the first two weeks of
representative traffic.

Workers Logs are configured at full custom-log sampling with invocation logs
disabled. Failure metrics use error severity and degraded/throttled metrics use
warning severity, so the same events are directly filterable in the Workers
Observability dashboard during an incident.

The checked R2 policy in `config/r2-lifecycle.json` is an independent privacy
backstop: all `tenant/` objects expire after two days and incomplete multipart
uploads abort after one day. Both staging deploy paths apply this exact policy
before deploying Worker code.

## Release canary

Both deployment paths run the real runner checkpoint-resume integration test
before deployment, then call the authenticated `/readyz` endpoint afterward.
The endpoint first queries the live D1 `jobs` table for every lease and
checkpoint, throttle-wait, and verification column introduced by migrations
0004/0005/0006, plus the real singleton gate introduced by migration 0007.
Apply migration 0007 before using the checked deploy command; readiness fails
closed if the row is absent or malformed. An intentional pause remains healthy
and is reported as `database.admissionsOpen: false`. The canary then starts a reserved
idle container and compares its runner protocol, checkpoint ABI, manifest,
runner bytes, model route, and checkpoint-engine identity with the Worker
release contract. A missing D1 column or runner mismatch returns 503 and the
deployment command fails instead of presenting the release as accepted.

Set `RELEASE_CANARY_SECRET` as both a Worker secret and a protected variable in
the deployment environment. It is used only as a bearer token for `/readyz`;
the canary never prints it. A failed post-deploy canary should halt admissions,
drain current Workflow attempts, and roll back Worker and container together;
never roll back only the Worker across a database/checkpoint schema change.

Container rollout uses `[10, 100]` staged replacement with a 1,800-second
active-instance grace, covering the 25-minute remediation wall plus finalization
cushion. This protects active instances during rollout; it is not a race-free
global admission drain, so operators must still halt new admissions before a
breaking release. The checked deploy wrapper requires the bounded operator or
CI identity in `ALLOFLOW_RELEASE_OPERATOR`, then performs its own admission
pause, bounded D1 drain, and conditional `finally` resume attempt. It only
resumes after the pause command completed successfully. A failed resume prints
`npm run admission:resume:staging` as the loud recovery command.
The wrapper acquires the pause only from the open state with a unique local
release token, rechecks that token before every release step, and clears the
pause only when the token, operator, and acquire reason still match. An
existing incident pause or an operator change during release is never
overwritten. The recovery command is an explicit `--force` operator override;
inspect the current incident state before using it. A standalone
`admission:pause:staging` prints its local pause token so a deliberate fenced
release can identify the pause it owns. Do not place pause tokens in Worker
configuration, telemetry, or logs.

Lifecycle application is not considered successful merely because the PUT
returned successfully. The deployment process requires protected
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` values; the token must be
authorized for the target account and bucket lifecycle API. The script reads
the rules back and requires an exact normalized match before deployment
continues.
