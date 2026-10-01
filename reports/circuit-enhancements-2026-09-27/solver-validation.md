# Circuit solver changes and validation

## Changes

- Compute the small overdamped RLC coefficient directly, avoiding subtraction of nearly equal values. The reviewed 12 V series voltmeter / 1 mH / 10000 µF example now starts at zero current with 12 V across the inductor.
- For linear networks containing two to four op-amps, calculate the relation between amplifier outputs and differential inputs. Check all output regions in that smaller system. Exactly independent groups can be checked separately; no small coupling is discarded.
- Cache that linear relation only within one transient run, using the complete matrix, output positions, and input terms as its identity. Step-size, topology, or control changes invalidate it.
- Recover final readings with the full nodal solver and verify the clamped amplifier law. Nonlinear devices, incompatible reductions, unknown values, and multiple-equilibrium candidates use the existing exhaustive search.
- Compare both input and output differences when checking distinct equilibria, including very close output limits with a large dependent-source gain.
- Reuse the already calculated end-time result in algebraic transient networks without semiconductors. Stored-state and nonlinear integrations retain their original three solves.

## Tests

The first targeted run passed all 77 tests in these four files:

```text
node node_modules/vitest/vitest.mjs run tests/circuit_network_opamp_reduction.test.js tests/circuit_network_opamp.test.js tests/circuit_network_opamp_timing.test.js tests/circuit_passive_time.test.js --maxWorkers=1 --pool=forks --testTimeout=30000 --hookTimeout=30000 --reporter=dot
```

After tightening the input/output uniqueness comparison, the expanded reduction file passed all 12 tests. The parent task runs the final affected tests after synchronizing the deployment mirror.

The new differential tests bypass the optimization to compare against the established exhaustive MNA algorithm. Cases cover four independent followers; coupled negative and positive feedback; 24 deterministic feedback networks; floating and unknown inputs; ideal-output conflicts; controlled-current sources; diode fallback; timed op-amps and capacitors; cache invalidation on time-step, switch, and control changes; and matching transient timestamps and switch sides. An additional passive test checks the extreme-overdamping starting conditions and early response.

## Browser benchmark

`solver-browser-benchmark.cjs` loads both algorithms into the same Chromium page and records synchronous main-thread model calculation. The final measured four-follower example improved from **1562.9 ms to 134.8 ms**, approximately **11.6 times faster**. It retains 384 steps and 769 frames. Region checks per solve fall from 81 to 12.

Exact timings, Chromium version, method, and source SHA-256 are in `solver-benchmark.json`. Absolute times depend on machine load. The solver still runs synchronously; this change does not move general nonlinear or reactive analysis into a worker.
