# Live-session automatic recovery — 2026-09-04

This extends the [live-session reliability fixes](LIVE_SESSION_RELIABILITY_REVIEW_2026-09-04.md) so a failed mailbox publication can recover without another teacher edit.

## Delivered

- Automatic publishing retains its 1.5-second debounce. A failed cycle, partial resource delivery, or failed hosted-pack reference schedules up to three follow-up attempts, waiting 2, 5, and 10 seconds after each completed failure. A successful cycle leaves no periodic retry timer running.
- Network return and restoration from the browser back-forward cache trigger recovery. Repeated wake events during an active publication become one pending wake. Ordinary page-show events do not trigger another publication.
- Publications are serialized per mailbox endpoint, application, and session code through the existing live-resource queue helper. The current snapshot supersedes prior work; publications cannot overwrite the same hosted pack concurrently through this automatic path.
- Effect cleanup cancels pending retry timers and removes network listeners. Current-snapshot checks stop obsolete work between resource sends and between chunks, and after an upload completes. An already-issued network request may finish, but its completion cannot confirm obsolete fingerprints or publish a subsequent pack reference.
- A successful retry of the hosted-pack reference clears the dashboard's earlier delivery warning. Partial resource failures remain failures for retry purposes.

## Implementation boundaries

The host owns debounce, recovery scheduling, queue lifetime, and session cleanup. SessionTransport owns publication results and cancellation checks around its delivery steps. The existing resource serializers, mailbox API, WebRTC sender, and hosted-pack format are reused.

The manual Share full resource pack action retains its existing behavior; the new controller is attached to automatic publication. Retries are bounded, and the change does not introduce a background polling service or alter learner answers.

## Validation

Tests use fake clocks and deferred operations against the actual host controller and transport implementation. Additional cases extract the current host effect and chunk sender to check their wiring. They cover backoff, retry exhaustion, network recovery, wake coalescing, cleanup, partial delivery, reference-write failures, serialized snapshot changes, cancellation during uploads/removals, and stopping both WebRTC and mailbox chunks.

Changes are local. No hosted classroom session was opened and nothing was deployed.

## Final results

- 173 selected regression tests have passing results across eleven suites. The combined run passed 172; one older source assertion expected the sender without a cancellation guard. After updating it to require the guard, its full 37-test suite passed.
- The local two-browser regression injected one temporary resource-send failure. Automatic recovery completed on the second attempt without changing the lesson. Both resources then arrived, duplicate chunks remained harmless, writing survived reload, saved audio played with AI disabled, and teacher submissions remained bounded. No browser page errors occurred.
- The retry controller and mailbox effect match in all three host files. Host syntax, both affected runtime mirrors, and dashboard source freshness checks pass.


Follow-up: [Learner recovery](LIVE_SESSION_LEARNER_RECOVERY_2026-09-04.md) guards delayed downloads, shares in-flight requests, and retries interrupted mailbox hydration.
