# Integrated baseline verification

Candidate: `C:/tmp/tyler_integration_candidate`.

All 46 assertions in the four baseline suites passed: Guided host wiring (27), post-session follow-up planner (6), roster session history (8), and roster wiring (5).

The initial run passed the first 33 assertions, but Vitest could not start workers for the two roster suites. A fresh run of those two suites passed all 13 assertions with exit code 0. These startup errors were runner failures; no product assertion failed.

No application files or test files were edited during this verification. The existing revised End session test compiles the real JSX button and invokes its callback. A scratch-file mutation disconnected that callback and correctly caused the test to fail. The live source was reread afterward and still contained `onClick={requestEndLiveSession}`; no override remained set.

## Commands

Executed from the candidate directory:

```powershell
node node_modules/vitest/vitest.mjs run tests/guided_host_wiring.test.js tests/post_session_follow_up_planner.test.js tests/roster_wiring.test.js tests/roster_session_history.test.js --maxWorkers=1 --pool=threads --no-cache --configLoader=runner --hookTimeout=60000 --testTimeout=30000 --reporter=default --reporter=json --outputFile.json=C:/tmp/tyler-integration-baseline-tests.json --silent

node node_modules/vitest/vitest.mjs run tests/roster_wiring.test.js tests/roster_session_history.test.js --maxWorkers=1 --pool=threads --no-cache --configLoader=runner --hookTimeout=60000 --testTimeout=30000 --reporter=default --reporter=json --outputFile.json=C:/tmp/tyler-integration-baseline-roster-tests.json --silent
```

Mutation: a scratch copy of `view_share_session_surfaces_source.jsx` replaced `onClick={requestEndLiveSession}` with `onClick={() => {}}`. The command below used the helper's override mechanism; it failed at `End session must open the shared preview`, as expected.

```powershell
$env:HOST_SOURCE_OVERRIDES = '{"view_share_session_surfaces_source.jsx":"C:/tmp/tyler-baseline-end-session-mutant.jsx"}'
node node_modules/vitest/vitest.mjs run tests/roster_session_history.test.js -t 'routes every teacher end surface through the shared preview' --maxWorkers=1 --pool=threads --no-cache --configLoader=runner --hookTimeout=60000 --testTimeout=30000 --reporter=default --reporter=json --outputFile.json=C:/tmp/tyler-integration-end-session-mutation.json --silent
```

The prior environment value was restored in a `finally` block. JSON evidence is copied alongside this note as `baseline-tests.json`, `baseline-roster-tests.json`, and `end-session-mutation.json`.
