# Circuit language and confirmation fixes

## Changes

- Resolve the Simple workbench translator from its current props on every render. The cached React component no longer closes over the first language.
- Pass the translator to Simple child components and include it in the 3D view memo dependencies.
- Pass the translator to the Mixed, Active, and Connected workbench roots. The shared helper also accepts `props.ctx.t` and retains the existing English fallback.
- Correct the Clear confirmation to explain that Undo restores the removed parts.

## Verification

`tests/circuit_localization.test.js` mounts each workbench and cycles EN → ES → FR → EN. It checks root and nested accessibility labels, including the memoized Simple 3D view. It also verifies that the same numeric editor DOM node, an unapplied value of 333, the original component data, and the prediction survive the language changes.

All four localization tests passed in the coordinating agent's recorded run: `workflow-tests.json`.

The existing confirmation interaction test now checks the corrected message, confirms Clear, and uses Undo to restore the two components. This check passed in the focused run. The initial combined run also encountered machine-load timeouts and the expected source/public parity failure before the coordinating agent synchronized the public copy.

No translation catalog entries were added. The coordinating agent owns public mirror synchronization.

## Independent solver review

Reviewed the new `circuitNetworkLinearOpAmps` helper and algebraic transient reuse without editing them. No concrete correctness defect found.

- The reduction cache key includes the full matrix, op-amp constraint positions, and sensing terms; the current right-hand side is solved separately.
- Grouping requires exact zero coupling, so small nonzero feedback paths remain connected.
- Singular, undetermined, conflicting, or multiple-output cases return to the full region search.
- The final full nodal solution rechecks every op-amp against its clamped law.
- Reusing the end-time solution applies only when there is no stored state or semiconductor iteration. Timed op-amps are included in the stateful set; midpoint samples and switching constraints remain intact.

This was a source-level independent review, not an additional claim of exhaustive numerical testing.
