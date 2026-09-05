# Live-session connection refinements — September 4, 2026

Learners now see persistent connection status when the session listener terminates. Temporary failures schedule up to three reattachments after 2, 5, and 10 seconds. The retry budget survives listener replacement, resets after a successful snapshot, and can be restarted by an explicit reconnect or network return. Permission, sign-in, and other non-retryable failures require an explicit attempt; network return does not automatically retry denied access.

The Reconnect control coalesces repeated clicks and cancels any pending automatic attempt. Listener failure invalidates pending resource downloads immediately. Cleanup disposes the recovery controller and its timer, so leaving a session prevents late callbacks from restarting it. Existing resources remain available. Connection, resource-download, and teacher-presence banners are gated to avoid overlapping recovery messages.

Teacher sync indicators use the session document path captured by each write/publication operation. Events from another class or app, and old events without session identity, cannot establish a successful sync for the current class. Before the first successful sync, the indicator uses neutral styling and the existing “no sync yet” label. Current-session failures and subsequent recovery remain visible in trace order.

English, Latin American Spanish, French, and Arabic connection messages were added. Source and desktop host copies were updated; the live-dock module was rebuilt and its loader hash refreshed.

Validation covers retry timing and exhaustion, manual and online recovery, access-denied behavior, disposal, late downloads, rendered reconnect controls, and neutral/success/failure/recovery dashboard states. Broader live-session regression results are recorded in the local test log at .tmp/live-connection-final.log. Host syntax, changed-section mirror consistency, generated dashboard freshness, and locale JSON/mirror checks were also run.

Hosted classroom-network testing and manual screen-reader testing remain outstanding. These changes are local and have not been deployed.

Final result: all 193 selected regression checks have passing results. The broader run passed 192 checks; its one failure was a newly added parameterized UI fixture passing an event object instead of an array. After correcting that fixture, all 21 connection/banner/dashboard checks passed in .tmp/live-connection-rendered-check.log. No application-code change was needed for that correction.
