# Learner live-session recovery — 2026-09-04

This continues the [automatic publishing recovery](LIVE_SESSION_AUTOMATIC_RECOVERY_2026-09-04.md) work on the receiving side.

## Improvements

- Only the newest session snapshot can apply a completed resource download. An older success or failure cannot overwrite a newer resource list, replace its ready status, or schedule recovery for obsolete material.
- Roster and presence updates reuse an in-flight download of the same resource version. They do not start duplicate fetches or consume additional retry attempts.
- Leaving a session, receiving its ended marker, or cleaning up the listener invalidates pending work. Mailbox downloads check cancellation between parts. Listener errors delivered after cleanup are ignored.
- Mailbox downloads now schedule recovery after transient failures, matching the existing learner retry approach for Firebase resources. There are at most three fetch attempts per resource version before the existing manual retry control is needed. Network return resets that budget and reconnects the listener. A successful download resets the budget for a later interruption.
- Mailbox cache identity includes the session, application, pack id, access key, and version timestamp. Firebase and mailbox success invalidate the other transport's cache marker so a later switch cannot reuse the wrong resource list.
- Missing data or inconsistent part counts fail before history changes. Valid empty assignments still clear removed resources; malformed assignments preserve existing history.

## Verification approach

The regression harness executes the current host hydration branches, retry scheduling, terminal-state handling, listener error handling, and cleanup. Deferred promises deliberately complete requests in the wrong order; fake clocks verify retries and cancellation. It also checks both Firebase and mailbox download paths, changed pack keys, transport switches, and malformed multipart responses.

No new user controls or translation strings were required. The existing learner loading/error/retry interface is reused. Changes are local; no hosted classroom was contacted and nothing was deployed.

## Final results

- 126 selected regression checks have passing results across eight suites. The broader run passed 123 checks; the final learner/reliability rerun passed 28, including three added terminal/error cases.
- The learner recovery suite contains 20 cases covering asynchronous ordering, request reuse, retry limits, session cleanup, cache identity, and pack completeness.
- All three host files parse. The hydration coordinator and complete session snapshot effect match across the source and both generated hosts.
- Hosted-network and manual assistive-technology checks remain outside this local verification.
