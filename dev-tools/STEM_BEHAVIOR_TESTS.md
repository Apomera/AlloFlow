# STEM Lab Behavior Tests

How to add automated behavior tests for STEM Lab tools — the kind that catch
"AI cars wander into oncoming lanes" or "ball physics pass through walls"
bugs that static checks can't see.

## What this is

`dev-tools/check_stem_behavior.cjs` is a Playwright-based harness that:
1. Loads a STEM tool in real headless Chromium (with WebGL for Three.js tools)
2. Mounts it via the same `StemPluginBridge` pattern production uses
3. Lets the simulation run for N animation frames
4. Reads the tool's internal state via a test-hook pattern
5. Asserts invariants on the live state

Run with: `npm run verify:stem`
Or one tool at a time: `node dev-tools/check_stem_behavior.cjs --tool=roadReady`

## When to write a behavior test

Write one when:
- You've noticed a specific tool has recurring simulation bugs
- The bug class is "emergent behavior" (invariant violations across frames), not contract violations
- The tool's internal state is inspectable via refs/local React state

Don't write speculative behavior tests. They cost more to maintain than static checks because tool internals refactor frequently.

## How to add a test for a new tool — 3 steps

### Step 1: Add a test hook to the tool's source file

Inside the tool's `render: function(ctx)`, after the relevant `useRef`s are declared, add a `useEffect` that exposes them when test mode is active:

```js
// ── Test hook (no overhead unless window.__testHooks is set by a test harness) ──
useEffect(function() {
  if (typeof window !== 'undefined' && window.__testHooks) {
    window.__testHooks.myTool = {
      stateRef1: someRef,
      stateRef2: anotherRef,
      // If the tool has a "Start" function only callable via UI button, expose
      // it via a ref so the test can trigger it without clicking. Use a
      // fallback ref pattern since useCallback is declared later:
      startSimulation: function() {
        if (_testStartRef.current) return _testStartRef.current();
      },
    };
  }
}, []);
```

After the relevant `useCallback` is declared:
```js
_testStartRef.current = startSimulation;  // wire the ref to the actual function
```

Real example: see `stem_tool_roadready.js` — the test hook is at line ~3636, and the `_testStartDrivingRef.current = startDriving;` wiring is at ~4490.

### Step 2: Add a test suite to `check_stem_behavior.cjs`

Add an entry to the `TEST_SUITES` array:

```js
{
  toolId: 'myTool',
  pluginFile: 'stem_lab/stem_tool_mytool.js',
  framesToWait: 120,  // ~2 sec at 60fps; adjust for the simulation's settling time
  initialToolData: {
    // Pre-populate any state the tool reads from ctx.toolData on first render
    // (skips menus, configures the simulation directly into testable state)
    scenario: 'default',
    tourCompleted: true,
  },
  triggerStart: true,  // calls hook.startSimulation() after mount (if exposed)
  assertions: [
    {
      name: 'Invariant 1 description',
      fn: (state) => {
        const refValue = state.stateRef1.current;
        // assert; return { pass: bool, message: string }
        if (someCondition) return { pass: false, message: 'why it failed' };
        return { pass: true, message: 'why it passed' };
      },
    },
    // ... more assertions ...
  ],
},
```

### Step 3: Run the test

```bash
node dev-tools/check_stem_behavior.cjs --tool=myTool
```

If the boot fails ("test hook never set"), the most common causes are:
- The tool's render function threw (run with `--verbose --keep-harness` to see browser errors)
- The tool requires a ctx field your harness doesn't provide (look at `stem_lab_module.js` for the production ctx shape)
- The tool has an early-return path that skips the useEffect with the hook

## Real example: RoadReady

`stem_tool_roadready.js` ships with a test hook that exposes:
- `trafficRef` — array of AI cars (`{ x, y, heading, speed, laneOffset, ... }`)
- `carRef` — player car
- `pedsRef`, `signalsRef`, `cyclistsRef`, `mapRef` — other simulation state
- `startDriving(scenarioId, vehicleId)` — triggers the sim without UI clicks

The 5 default assertions verify:
1. AI cars exist after spawn
2. All cars have valid `x`, `y`, `speed`, `heading` (not NaN)
3. All cars within map bounds [0, MAP_SIZE]
4. All cars have plausible `laneOffset` (within [-5, +5])
5. No two cars at identical position (rendering overlap)

These catch the bug class Aaron flagged: "cars don't follow rules of the road / stay in correct lanes."

## Limits

This harness can NOT catch:
- Bugs that only manifest on user input (key presses, button clicks) — would need Playwright's `page.keyboard` API + tool-specific scenarios
- Bugs in the rendered visual (color, layout, text) — that's visual regression territory
- Bugs that take longer than ~30 sec of sim time to manifest — boot timeout limits

For more sophisticated behavior tests (multi-step user flows, screenshot comparisons, etc.), build on this harness — it has all the Playwright + ctx wiring already.

## Adding to the orchestrator

`verify:stem` is NOT included in `npm run verify` by default — it's heavier than the static checks (15-30 sec per tool because of browser launch + animation frame waits). Run it on demand or before major releases.

To include it in `verify:all`, add to `dev-tools/verify_all.cjs` under the `--all` flag conditional.
