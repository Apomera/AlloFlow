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
checkpoint column introduced by migrations 0004/0005. It then starts a reserved
idle container and compares its runner protocol, checkpoint ABI, manifest,
runner bytes, model route, and checkpoint-engine identity with the Worker
release contract. A missing D1 column or runner mismatch returns 503 and the
deployment command fails instead of presenting the release as accepted.

Set `RELEASE_CANARY_SECRET` as both a Worker secret and a protected variable in
the deployment environment. It is used only as a bearer token for `/readyz`;
the canary never prints it. A failed post-deploy canary should halt admissions,
drain current Workflow attempts, and roll back Worker and container together;
never roll back only the Worker across a database/checkpoint schema change.
