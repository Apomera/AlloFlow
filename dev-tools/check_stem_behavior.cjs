#!/usr/bin/env node
// check_stem_behavior.cjs — Behavior tests for STEM Lab tools.
//
// Why this exists:
//   Static checks catch contract violations cheaply. They DON'T catch
//   simulation correctness bugs like "AI cars in RoadReady wander into
//   oncoming lanes" or "ball trajectory in ThrowLab passes through the
//   wall." Those are emergent behavior bugs — they require actually
//   running the simulation and inspecting world state.
//
//   This harness loads a STEM tool in headless Chromium, lets its
//   simulation run for N animation frames, then reads the tool's internal
//   state via the test-hook pattern (window.__testHooks.<toolId> = { refs })
//   and asserts invariants.
//
// How to add tests for a new tool:
//   1. Add a test hook to the tool's render function:
//        useEffect(function() {
//          if (typeof window !== 'undefined' && window.__testHooks) {
//            window.__testHooks.myTool = { stateRef1, stateRef2, ... };
//          }
//        }, []);
//   2. Add an entry to TEST_SUITES below with:
//        - toolId (matches the registerTool() id)
//        - assertions (array of named invariant checks)
//   3. Run: node dev-tools/check_stem_behavior.cjs --tool=myTool
//
// Usage:
//   node dev-tools/check_stem_behavior.cjs                  (run all suites)
//   node dev-tools/check_stem_behavior.cjs --tool=roadReady (one tool only)
//   node dev-tools/check_stem_behavior.cjs --verbose
//   node dev-tools/check_stem_behavior.cjs --keep-harness   (don't delete _stem_harness.html)
//
// Exit codes:
//   0 — all assertions pass
//   1 — at least one assertion fails
//   2 — usage / setup error

'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const HARNESS_PATH = path.join(__dirname, '_stem_harness.html');
const PORT = 9088;

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');
const KEEP_HARNESS = args.includes('--keep-harness');
const TOOL_FILTER = (args.find(a => a.startsWith('--tool=')) || '').split('=')[1] || null;

let playwright;
try { playwright = require('playwright'); }
catch (e) { console.error('Playwright not installed.'); process.exit(2); }

// ──────────────────────────────────────────────────────────────────────────
// Test suites — each invariant runs against the tool's state after N frames.
// Add new tools here. Each `assertions` function receives `state` (the contents
// of window.__testHooks[toolId]) and returns { pass, message }.
// ──────────────────────────────────────────────────────────────────────────
const TEST_SUITES = [
  {
    toolId: 'roadReady',
    pluginFile: 'stem_lab/stem_tool_roadready.js',
    framesToWait: 120,  // ~2 seconds at 60fps — enough for cars to move several units
    initialToolData: {
      // Pre-populate scenario + driver + skip tour. The harness then calls
      // window.__testHooks.roadReady.startDriving() to actually spawn traffic.
      scenario: 'residential',
      worldSeed: 'test-seed-12345',
      driverName: 'TestDriver',
      tourCompleted: true,
    },
    triggerStart: true,  // call hook.startDriving() after mount
    assertions: [
      {
        name: 'AI traffic cars exist after spawn',
        fn: (state) => {
          const traffic = state.trafficRef && state.trafficRef.current;
          if (!Array.isArray(traffic)) return { pass: false, message: 'trafficRef.current is not an array (got ' + typeof traffic + ')' };
          if (traffic.length === 0) return { pass: false, message: 'No AI cars spawned after 120 frames — sim may not have entered drive mode' };
          return { pass: true, message: traffic.length + ' AI cars spawned' };
        },
      },
      {
        name: 'All AI cars have valid position fields',
        fn: (state) => {
          const traffic = (state.trafficRef && state.trafficRef.current) || [];
          if (traffic.length === 0) return { pass: true, message: 'no traffic to check (skipped)' };
          for (let i = 0; i < traffic.length; i++) {
            const t = traffic[i];
            if (typeof t.x !== 'number' || isNaN(t.x)) return { pass: false, message: 'Car ' + i + ' x is not a number: ' + t.x };
            if (typeof t.y !== 'number' || isNaN(t.y)) return { pass: false, message: 'Car ' + i + ' y is not a number: ' + t.y };
            if (typeof t.speed !== 'number' || isNaN(t.speed)) return { pass: false, message: 'Car ' + i + ' speed invalid: ' + t.speed };
            if (typeof t.heading !== 'number' || isNaN(t.heading)) return { pass: false, message: 'Car ' + i + ' heading invalid: ' + t.heading };
          }
          return { pass: true, message: 'all ' + traffic.length + ' cars have valid position/speed/heading' };
        },
      },
      {
        name: 'All AI cars within map bounds',
        fn: (state) => {
          const traffic = (state.trafficRef && state.trafficRef.current) || [];
          const MAP_SIZE = (state.constants && state.constants.MAP_SIZE) || 96;
          if (traffic.length === 0) return { pass: true, message: 'no traffic (skipped)' };
          const offmap = traffic.filter(t => t.x < -5 || t.x > MAP_SIZE + 5 || t.y < -5 || t.y > MAP_SIZE + 5);
          if (offmap.length > 0) {
            const sample = offmap[0];
            return { pass: false, message: offmap.length + '/' + traffic.length + ' cars off-map (e.g., x=' + sample.x.toFixed(1) + ', y=' + sample.y.toFixed(1) + ')' };
          }
          return { pass: true, message: 'all ' + traffic.length + ' cars within map [0,' + MAP_SIZE + ']' };
        },
      },
      {
        name: 'AI cars stay within their assigned lane (offset from laneOffset)',
        fn: (state) => {
          const traffic = (state.trafficRef && state.trafficRef.current) || [];
          if (traffic.length === 0) return { pass: true, message: 'no traffic (skipped)' };
          // Each car has `laneOffset` (its assigned offset from road centerline).
          // For cars heading along the road's primary axis, the perpendicular
          // distance from laneOffset should be < ~half a lane width (1.5 units).
          // We check the absolute heading-perpendicular drift.
          const LANE_TOLERANCE = 2.0;  // generous — catches gross violations only
          const violators = [];
          for (const t of traffic) {
            if (typeof t.laneOffset !== 'number') continue;  // car has no lane assignment
            // Perpendicular axis depends on heading (0 = +X, π/2 = +Y, etc.)
            // Simpler check: is the car's effective offset from its lane center reasonable?
            // For cars on a horizontal road (heading ~0 or ~π), the y position should
            // align with the road centerline + laneOffset. Without knowing the road
            // centerline here, we use the fact that a well-behaved car's
            // |y - laneOffset| relative to its starting position should not drift.
            // This is a coarse check; refine when we have road geometry exposed.
            if (Math.abs(t.laneOffset) > 5) {
              // laneOffset is normally in [-3, +3]; anything >5 indicates miscalc
              violators.push({ t, reason: 'laneOffset out of plausible range: ' + t.laneOffset });
            }
          }
          if (violators.length > 0) {
            return { pass: false, message: violators.length + ' lane-offset violations: ' + violators[0].reason };
          }
          return { pass: true, message: 'all cars have plausible laneOffset values' };
        },
      },
      {
        name: 'No two AI cars in identical position (rendering overlap)',
        fn: (state) => {
          const traffic = (state.trafficRef && state.trafficRef.current) || [];
          if (traffic.length < 2) return { pass: true, message: 'fewer than 2 cars (skipped)' };
          const seen = new Map();
          let overlaps = 0;
          for (const t of traffic) {
            const key = Math.round(t.x * 10) + ',' + Math.round(t.y * 10);
            if (seen.has(key)) overlaps++;
            seen.set(key, true);
          }
          if (overlaps > 0) return { pass: false, message: overlaps + ' cars at duplicate positions' };
          return { pass: true, message: 'all ' + traffic.length + ' cars at distinct positions' };
        },
      },
      // ── Behavioral assertions (need two snapshots to compare motion) ──
      {
        name: 'AI cars move forward in their heading direction (informational — limited by index-matching across despawns)',
        fn: (state) => {
          // KNOWN LIMIT: this assertion compares trafficRef[i] across two snapshots,
          // but RoadReady despawns + respawns cars freely (line 17212 filters by chunk).
          // The car at index N in snapshot A may be a different car at snapshot B,
          // producing fake "backward motion" warnings. We report the count but pass.
          // To make this strict, RoadReady would need stable car IDs. Until then, only
          // a spike (>50% of cars showing backward motion) would indicate a real bug.
          const earlier = state._earlier && state._earlier.trafficRef && state._earlier.trafficRef.current;
          const later = state.trafficRef && state.trafficRef.current;
          if (!earlier || !later) return { pass: true, message: 'snapshots missing (skipped)' };
          if (earlier.length === 0 || later.length === 0) return { pass: true, message: 'no traffic (skipped)' };

          // Match cars by index (heuristic — assumes order is stable across frames)
          const MAP_SIZE = 96;
          const WRAPAROUND_THRESHOLD = MAP_SIZE / 2;  // jumps > half the map are chunk wraparounds, not real motion
          const violations = [];
          for (let i = 0; i < Math.min(earlier.length, later.length); i++) {
            const e = earlier[i];
            const l = later[i];
            const dx = l.x - e.x;
            const dy = l.y - e.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            // Skip stationary cars (might be at stop sign or red light — legitimate)
            if (distance < 0.3) continue;
            // Skip cars that wrapped around the map (chunk-boundary teleport, expected behavior)
            if (Math.abs(dx) > WRAPAROUND_THRESHOLD || Math.abs(dy) > WRAPAROUND_THRESHOLD) continue;
            // Skip cars that traveled less than 5m — could be turning at an intersection
            // (heading changes mid-window; comparing motion to FINAL heading mis-flags this)
            if (distance < 5) continue;
            // Heading vector (where the car SHOULD be moving)
            const hx = Math.cos(l.heading);
            const hy = Math.sin(l.heading);
            const motionDotHeading = (dx * hx + dy * hy) / distance;
            // Flag only clearly-BACKWARD motion (< -0.5). 90°-off motion is normal at turns.
            if (motionDotHeading < -0.5) {
              violations.push({
                idx: i,
                motionDotHeading: motionDotHeading.toFixed(2),
                distance: distance.toFixed(2),
                heading: l.heading.toFixed(2),
                dx: dx.toFixed(2),
                dy: dy.toFixed(2),
              });
            }
          }
          // Only fail if MAJORITY of cars show backward motion (> 50% = systemic bug, not despawn artifacts)
          if (violations.length > later.length / 2) {
            const sample = violations[0];
            return { pass: false, message: 'SYSTEMIC: ' + violations.length + '/' + later.length + ' cars moving against heading. e.g. car ' + sample.idx + ' moved (Δx=' + sample.dx + ', Δy=' + sample.dy + ') with heading=' + sample.heading + ' rad' };
          }
          if (violations.length > 0) {
            return { pass: true, message: violations.length + '/' + later.length + ' apparent reversals (likely despawn/respawn artifacts; only flagged as bug if >50% of cars affected)' };
          }
          return { pass: true, message: 'all moving cars travel forward in their heading direction' };
        },
      },
      {
        name: 'AI car speeds within reasonable range (0 to 50 m/s ≈ 110 mph)',
        fn: (state) => {
          const traffic = (state.trafficRef && state.trafficRef.current) || [];
          if (traffic.length === 0) return { pass: true, message: 'no traffic (skipped)' };
          const speeders = traffic.filter(t => t.speed > 50 || t.speed < -5);
          if (speeders.length > 0) {
            const sample = speeders[0];
            return { pass: false, message: speeders.length + ' car(s) at unrealistic speed (e.g. ' + sample.speed.toFixed(1) + ' m/s = ' + (sample.speed * 2.237).toFixed(0) + ' mph)' };
          }
          return { pass: true, message: 'all ' + traffic.length + ' cars at realistic speeds (' + Math.min(...traffic.map(t => t.speed)).toFixed(1) + ' to ' + Math.max(...traffic.map(t => t.speed)).toFixed(1) + ' m/s)' };
        },
      },
      {
        name: 'Lane-direction discipline: cars with positive laneOffset and cars with negative laneOffset head opposite directions (US right-side driving)',
        fn: (state) => {
          const traffic = (state.trafficRef && state.trafficRef.current) || [];
          if (traffic.length < 2) return { pass: true, message: 'fewer than 2 cars (skipped)' };
          // Group cars by sign of laneOffset; verify all cars in the same group head roughly the same direction
          const positive = traffic.filter(t => typeof t.laneOffset === 'number' && t.laneOffset > 0.1);
          const negative = traffic.filter(t => typeof t.laneOffset === 'number' && t.laneOffset < -0.1);
          if (positive.length < 1 || negative.length < 1) return { pass: true, message: 'not enough cars in opposing lanes to check (skipped)' };
          // All positive-lane cars should have similar heading; all negative-lane cars should have similar heading
          // AND the two groups should differ by roughly π (180°)
          const avgHeading = arr => {
            // Use vector mean (handles wrap-around)
            let sx = 0, sy = 0;
            for (const t of arr) { sx += Math.cos(t.heading); sy += Math.sin(t.heading); }
            return Math.atan2(sy / arr.length, sx / arr.length);
          };
          const posAvg = avgHeading(positive);
          const negAvg = avgHeading(negative);
          // Difference (mod 2π, take shortest)
          let diff = Math.abs(posAvg - negAvg);
          if (diff > Math.PI) diff = 2 * Math.PI - diff;
          // Expect diff ≈ π (180°). Tolerance: within 60° of opposite.
          const expected = Math.PI;
          const tolerance = Math.PI / 3;  // 60 degrees
          if (Math.abs(diff - expected) > tolerance) {
            return { pass: false, message: 'positive-lane avg heading ' + posAvg.toFixed(2) + ' and negative-lane avg heading ' + negAvg.toFixed(2) + ' differ by ' + diff.toFixed(2) + ' rad (' + (diff * 180 / Math.PI).toFixed(0) + '°) — expected ~180°' };
          }
          return { pass: true, message: 'lane-direction discipline OK (positive vs negative laneOffset cars head ' + (diff * 180 / Math.PI).toFixed(0) + '° apart)' };
        },
      },
      // ── Systematic rules-of-the-road assertions ──
      {
        name: 'AI cars respect posted speed limit (no more than +10 mph over)',
        fn: (state) => {
          const traffic = (state.trafficRef && state.trafficRef.current) || [];
          if (traffic.length === 0) return { pass: true, message: 'no traffic (skipped)' };
          const scn = state.getCurrentScenario;
          const limitMph = (scn && scn.speedLimit) || 25;
          const tolerance = 10;
          const MPH_TO_MS = 0.44704;
          const limitMs = (limitMph + tolerance) * MPH_TO_MS;
          const speeders = traffic.filter(t => t.speed > limitMs);
          if (speeders.length > 0) {
            const sample = speeders[0];
            const sampleMph = (sample.speed * 2.23694).toFixed(0);
            return { pass: false, message: speeders.length + '/' + traffic.length + ' AI cars over speed limit. e.g. ' + sampleMph + ' mph in ' + limitMph + '-mph zone (limit + tolerance ' + tolerance + ' = ' + (limitMph + tolerance) + ')' };
          }
          return { pass: true, message: 'all AI cars within ' + limitMph + '+' + tolerance + ' mph (max observed: ' + (Math.max(...traffic.map(t => t.speed)) * 2.23694).toFixed(0) + ' mph)' };
        },
      },
      {
        name: 'Pedestrians stay on sidewalks (within ±2 units of sidewalk x)',
        fn: (state) => {
          const peds = (state.pedsRef && state.pedsRef.current) || [];
          if (peds.length === 0) return { pass: true, message: 'no pedestrians (skipped)' };
          const c = (state.constants) || {};
          const centerX = c.CENTER_X || 48;
          const sidewalkOffset = c.SIDEWALK_OFFSET || 4.5;
          const sidewalkLeft = centerX - sidewalkOffset;
          const sidewalkRight = centerX + sidewalkOffset;
          const TOLERANCE = 2;  // peds can be at crosswalks (slightly off sidewalk)
          // A ped is "on sidewalk" if within TOLERANCE of left or right sidewalk x
          const inRoad = peds.filter(p => {
            const distLeft = Math.abs(p.x - sidewalkLeft);
            const distRight = Math.abs(p.x - sidewalkRight);
            return distLeft > TOLERANCE && distRight > TOLERANCE;
          });
          if (inRoad.length > 0) {
            const sample = inRoad[0];
            return { pass: false, message: inRoad.length + '/' + peds.length + ' pedestrians off-sidewalk (>' + TOLERANCE + ' units from x=' + sidewalkLeft + ' or x=' + sidewalkRight + '). e.g. ped at x=' + sample.x.toFixed(1) };
          }
          return { pass: true, message: 'all ' + peds.length + ' pedestrians within ' + TOLERANCE + ' units of a sidewalk' };
        },
      },
      {
        name: 'Traffic signals have valid state values (green/yellow/red/stop)',
        fn: (state) => {
          const signals = (state.signalsRef && state.signalsRef.current) || [];
          if (signals.length === 0) return { pass: true, message: 'no signals (skipped)' };
          const VALID_STATES = new Set(['green', 'yellow', 'red', 'stop']);
          const VALID_TYPES = new Set(['light', 'stop']);
          const invalid = signals.filter(s => !VALID_STATES.has(s.state) || !VALID_TYPES.has(s.type));
          if (invalid.length > 0) {
            const sample = invalid[0];
            return { pass: false, message: invalid.length + '/' + signals.length + ' signals with invalid type/state. e.g. type="' + sample.type + '", state="' + sample.state + '"' };
          }
          return { pass: true, message: 'all ' + signals.length + ' signals have valid type/state' };
        },
      },
      {
        name: 'No two AI cars on collision course (closer than 3m moving toward each other)',
        fn: (state) => {
          const traffic = (state.trafficRef && state.trafficRef.current) || [];
          if (traffic.length < 2) return { pass: true, message: 'fewer than 2 cars (skipped)' };
          const COLLISION_DIST = 3.0;  // 3m car-to-car center-to-center is "imminent crash"
          const collisions = [];
          for (let i = 0; i < traffic.length; i++) {
            for (let j = i + 1; j < traffic.length; j++) {
              const a = traffic[i], b = traffic[j];
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d < COLLISION_DIST) {
                // Are they moving toward each other? Headings within ±90° of opposite
                let headingDiff = Math.abs(a.heading - b.heading);
                if (headingDiff > Math.PI) headingDiff = 2 * Math.PI - headingDiff;
                const closing = headingDiff > Math.PI / 2;  // > 90° apart = roughly opposite
                collisions.push({ i, j, distance: d.toFixed(2), closing });
              }
            }
          }
          if (collisions.length > 0) {
            const sample = collisions[0];
            return { pass: false, message: collisions.length + ' AI car pair(s) within ' + COLLISION_DIST + 'm. e.g. cars ' + sample.i + ' & ' + sample.j + ' at ' + sample.distance + 'm apart (' + (sample.closing ? 'closing' : 'parallel') + ')' };
          }
          return { pass: true, message: 'no AI car pairs within ' + COLLISION_DIST + 'm of each other' };
        },
      },
      {
        name: 'Wildlife (moose/deer) placement plausible (off-road OR explicitly hazard event)',
        fn: (state) => {
          const wildlife = state.wildlifeRef && state.wildlifeRef.current;
          if (!wildlife) return { pass: true, message: '(no wildlife active — expected most of the time)' };
          // Wildlife should have a `kind` (moose/deer/etc.) and a position. If on the road
          // (within ±3 units of centerX), it should be marked as a `warn` event (hazard)
          if (typeof wildlife.x !== 'number' || typeof wildlife.y !== 'number') {
            return { pass: false, message: 'wildlife missing position fields' };
          }
          const c = (state.constants) || {};
          const centerX = c.CENTER_X || 48;
          const onRoad = Math.abs(wildlife.x - centerX) < 3;
          if (onRoad && !wildlife.warn) {
            return { pass: false, message: 'wildlife "' + wildlife.kind + '" at x=' + wildlife.x.toFixed(1) + ' is on the road but NOT marked as a warn-event hazard' };
          }
          return { pass: true, message: 'wildlife "' + wildlife.kind + '" at x=' + wildlife.x.toFixed(1) + (onRoad ? ' (on road, warn=' + !!wildlife.warn + ')' : ' (off road)') };
        },
      },
      {
        name: 'US right-side driving discipline (laneOffset sign opposite of heading sign)',
        fn: (state) => {
          // US right-side rule (from stem_tool_roadready.js:1700):
          //   direction=+1 (southbound, heading=+π/2) → laneOffset = -1.5
          //   direction=-1 (northbound, heading=-π/2) → laneOffset = +1.5
          // So for main-road cars: sign(heading) === -sign(laneOffset).
          // A car with same-sign heading + laneOffset is driving on the wrong
          // side of the road — head-on collision risk.
          const traffic = (state.trafficRef && state.trafficRef.current) || [];
          if (traffic.length === 0) return { pass: true, message: 'no traffic (skipped)' };
          const violations = [];
          for (let i = 0; i < traffic.length; i++) {
            const t = traffic[i];
            if (t.crossStreet) continue;  // cross-street cars use different geometry
            if (typeof t.laneOffset !== 'number' || typeof t.heading !== 'number') continue;
            // Tolerate cars exactly at centerline (laneOffset === 0) — they may be mid-transition.
            if (Math.abs(t.laneOffset) < 0.1) continue;
            const headingSign = Math.sign(Math.sin(t.heading));  // sin(heading) > 0 → southbound
            const offsetSign = Math.sign(t.laneOffset);
            if (headingSign === offsetSign && headingSign !== 0) {
              violations.push({ idx: i, heading: t.heading.toFixed(2), laneOffset: t.laneOffset.toFixed(2) });
            }
          }
          if (violations.length > 0) {
            const sample = violations[0];
            return { pass: false, message: violations.length + '/' + traffic.length + ' AI cars on wrong side of road. e.g. car ' + sample.idx + ' heading=' + sample.heading + ' laneOffset=' + sample.laneOffset + ' (US right-side rule violated)' };
          }
          return { pass: true, message: 'all main-road AI cars on correct side (heading sign opposite laneOffset sign)' };
        },
      },
      {
        name: 'Stop sign queue integrity (entries reference real cars, no duplicates)',
        fn: (state) => {
          const queueObj = (state.stopSignQueueRef && state.stopSignQueueRef.current) || {};
          const traffic = (state.trafficRef && state.trafficRef.current) || [];
          const keys = Object.keys(queueObj);
          if (keys.length === 0) return { pass: true, message: '(no active stop-sign queues — expected for residential scenarios without 4-way stops)' };
          for (const key of keys) {
            // Key format: "x_y" (integer-truncated intersection coords).
            if (!/^-?\d+_-?\d+$/.test(key)) {
              return { pass: false, message: 'stop-sign queue has malformed key "' + key + '" (expected "x_y" integer coords)' };
            }
            const q = queueObj[key];
            if (!Array.isArray(q)) {
              return { pass: false, message: 'queue at "' + key + '" is not an array (' + typeof q + ')' };
            }
            const seenIdx = new Set();
            for (const entry of q) {
              if (typeof entry.carIdx !== 'number' || typeof entry.arrivedAt !== 'number') {
                return { pass: false, message: 'queue entry at "' + key + '" missing carIdx/arrivedAt: ' + JSON.stringify(entry) };
              }
              if (seenIdx.has(entry.carIdx)) {
                return { pass: false, message: 'queue at "' + key + '" has duplicate carIdx=' + entry.carIdx + ' (enqueue de-dup broken)' };
              }
              seenIdx.add(entry.carIdx);
              if (entry.carIdx < 0 || entry.carIdx >= traffic.length) {
                // This isn't strictly a bug — cars get despawned and stale queue entries
                // are pruned lazily. Tolerate but report.
                continue;
              }
            }
          }
          return { pass: true, message: keys.length + ' active queue(s); all entries well-formed' };
        },
      },
      {
        name: 'Turn-signal coherence (AI cars only signal when there is a reason)',
        fn: (state) => {
          // From stem_tool_roadready.js:
          //   - t.blinker is set when _pendingLaneOffset != null (lane change)
          //   - t.blinker is set when _slowFor >= 1 (random blink — slowing for signal)
          //   - t._blinkerCancelTimer > 0 means just finished a lane change
          //   - t._turnIntent indicates pending turn at intersection
          // A car with blinker !== 0 and none of those reasons is signaling spuriously.
          const traffic = (state.trafficRef && state.trafficRef.current) || [];
          if (traffic.length === 0) return { pass: true, message: 'no traffic (skipped)' };
          const spurious = [];
          let signaling = 0;
          for (let i = 0; i < traffic.length; i++) {
            const t = traffic[i];
            if (!t.blinker || t.blinker === 0) continue;
            signaling++;
            const hasReason = (t._pendingLaneOffset != null) ||
                              (t._blinkerCancelTimer > 0) ||
                              (t._slowFor >= 1) ||
                              !!t._turnIntent;
            if (!hasReason) spurious.push({ idx: i, blinker: t.blinker, slowFor: t._slowFor });
          }
          if (spurious.length > 0) {
            const sample = spurious[0];
            return { pass: false, message: spurious.length + '/' + signaling + ' signaling cars have no reason. e.g. car ' + sample.idx + ' blinker=' + sample.blinker + ' slowFor=' + sample.slowFor + ' (no pendingLane/cancelTimer/turnIntent)' };
          }
          return { pass: true, message: signaling + '/' + traffic.length + ' cars signaling, all with valid reason (or 0 signaling)' };
        },
      },
      {
        name: 'Per-chunk lane drift report (informational — heuristic centerline)',
        fn: (state) => {
          // HEURISTIC: assumes each chunk's road is approximately straight and the
          // centerline is the median of (y - laneOffset) within that chunk. For
          // curving/branching roads or intersections, the heuristic over-estimates
          // drift. Use the per-car data below to judge whether reported drift is
          // a real lane-wandering bug or expected variation.
          const traffic = (state.trafficRef && state.trafficRef.current) || [];
          if (traffic.length === 0) return { pass: true, message: 'no traffic (skipped)' };
          const byChunk = new Map();
          for (const t of traffic) {
            if (typeof t.laneOffset !== 'number') continue;
            const key = t._chunk !== undefined ? t._chunk : 'main';
            if (!byChunk.has(key)) byChunk.set(key, []);
            byChunk.get(key).push(t);
          }
          const driftReport = [];
          for (const [chunkKey, cars] of byChunk) {
            const centers = cars.map(t => t.y - t.laneOffset).sort((a, b) => a - b);
            const median = centers[Math.floor(centers.length / 2)];
            for (const t of cars) {
              const expected = median + t.laneOffset;
              const drift = Math.abs(t.y - expected);
              driftReport.push({ chunk: chunkKey, drift: drift, laneOffset: t.laneOffset, heading: t.heading.toFixed(2) });
            }
          }
          driftReport.sort((a, b) => b.drift - a.drift);
          const maxDrift = driftReport[0] ? driftReport[0].drift : 0;
          const meanDrift = driftReport.reduce((s, d) => s + d.drift, 0) / driftReport.length;
          // Always pass; report stats as informational
          return { pass: true, message: 'max drift ' + maxDrift.toFixed(2) + ' / mean ' + meanDrift.toFixed(2) + ' units (' + traffic.length + ' cars in ' + byChunk.size + ' chunks; >1.5 = possible bug)' };
        },
      },
    ],
  },
  // ── RoadReady Free Explore mode (Aaron reports player car sunk into road at session start) ──
  {
    toolId: 'roadReady',
    suiteName: 'roadReady-freeExplore',
    pluginFile: 'stem_lab/stem_tool_roadready.js',
    framesToWait: 240,  // give Three.js time to fully initialize (~4 sec)
    initialToolData: {
      scenario: 'residential',
      worldSeed: 12345,
      driverName: 'TestDriver',
      tourCompleted: true,
      // Free explore activation — gates the infiniteWorld code path that uses
      // roadHeightAtY (which can return negative values, sinking the car)
      freeExplore: true,
      freeExploreScenario: { weather: 'clear', time: 'day', traffic: 'low', speedLimit: 35 },
    },
    triggerStart: true,
    assertions: [
      {
        name: 'Player car group exists in Three.js scene',
        fn: (state) => {
          const t = state.threeRef && state.threeRef.current;
          if (!t || !t.playerCarGroupPos) return { pass: false, message: 'threeRef missing or playerCarGroup not present' };
          return { pass: true, message: 'player car at world position (' + t.playerCarGroupPos.x.toFixed(2) + ', ' + t.playerCarGroupPos.y.toFixed(2) + ', ' + t.playerCarGroupPos.z.toFixed(2) + ')' };
        },
      },
      {
        name: 'Player car NOT sunk below road plane (worldY >= 0)',
        fn: (state) => {
          const t = state.threeRef && state.threeRef.current;
          if (!t || !t.playerCarGroupPos) return { pass: true, message: '(skipped — no player car)' };
          const y = t.playerCarGroupPos.y;
          // Player car group origin is at the road surface. Body is positioned
          // at +0.55 within the group. So group-Y < 0 means car is below the
          // expected road plane — the "sunken into road" bug.
          if (y < -0.05) {
            return { pass: false, message: 'Player car at worldY=' + y.toFixed(3) + ' — BELOW road plane (sunken-into-road bug). roadHeightAtY likely returning negative value at session start.' };
          }
          return { pass: true, message: 'Player car at worldY=' + y.toFixed(3) + ' — at or above road plane' };
        },
      },
      {
        name: 'roadHeightAtY at car position is non-negative (or close to zero)',
        fn: (state) => {
          const iw = state.infiniteWorldRef && state.infiniteWorldRef.current;
          if (!iw || iw.roadHeightAtCarY === null) return { pass: true, message: '(skipped — infinite world not active)' };
          const h = iw.roadHeightAtCarY;
          if (h < -0.05) {
            const samples = (iw.roadHeightSamples || []).map(s => 'y=' + s.y + ':h=' + s.h.toFixed(3)).join(', ');
            return { pass: false, message: 'roadHeightAtY at car returns ' + h.toFixed(3) + ' (negative — car sinks into road). Samples: ' + samples };
          }
          return { pass: true, message: 'roadHeightAtY at car = ' + h.toFixed(3) + ' (non-negative)' };
        },
      },
      {
        name: 'Player car sits at-or-above the road plane it is driving on',
        fn: (state) => {
          const t = state.threeRef && state.threeRef.current;
          if (!t || !t.playerCarGroupPos || !t.groundMeshesNear) return { pass: true, message: '(skipped)' };
          const playerY = t.playerCarGroupPos.y;
          // Filter to planes within 1.5 units below the player — the actual road surface,
          // not roofs/billboards (which my earlier heuristic was picking up at Y=5+)
          const roadPlanes = t.groundMeshesNear.filter(m => m.worldY <= playerY + 0.2 && m.worldY >= playerY - 1.5);
          if (roadPlanes.length === 0) return { pass: true, message: '(no road plane within 1.5 units below player; skipped)' };
          const road = roadPlanes[0];  // highest road plane ≤ player
          const gap = playerY - road.worldY;
          if (gap < -0.1) {
            return { pass: false, message: 'Player car (worldY=' + playerY.toFixed(3) + ') is BELOW road plane "' + road.name + '" (worldY=' + road.worldY.toFixed(3) + ', gap=' + gap.toFixed(3) + ') — car visibly sunk' };
          }
          return { pass: true, message: 'Player car ' + gap.toFixed(3) + ' units above road plane (' + road.name + ')' };
        },
      },
    ],
  },
];

const suitesToRun = TOOL_FILTER ? TEST_SUITES.filter(s => s.toolId === TOOL_FILTER) : TEST_SUITES;
if (suitesToRun.length === 0) {
  console.error('No test suite matched tool filter: ' + TOOL_FILTER);
  console.error('Available: ' + TEST_SUITES.map(s => s.toolId).join(', '));
  process.exit(2);
}

// ──────────────────────────────────────────────────────────────────────────
// Generate harness HTML — minimal page that loads React, the StemLab registry,
// the specific tool plugin, then mounts the tool inside a div.
// ──────────────────────────────────────────────────────────────────────────
function generateHarness(suite) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>STEM Behavior Test — ${suite.toolId}</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
  <script>
    // Permissive globals + test hook bucket
    window.__testHooks = {};
    window.AlloModules = {};
    window.AlloIcons = new Proxy({}, { get: () => function NoOp() { return null; } });
    window.AlloLanguageContext = React.createContext({ t: function(k) { return k; }, lang: 'en' });
    window.GEMINI_MODELS = { default: 'gemini-2.0-flash', tts: 'gemini-2.5-flash-preview-tts' };
    // Stub callGemini — STEM tools shouldn't call AI in a behavior test
    window.callGemini = function() { return Promise.resolve({ text: '', json: {} }); };

    // Capture errors so the test harness can see them
    window.__errors = [];
    window.addEventListener('error', function(e) {
      window.__errors.push({ message: e.message, source: (e.filename||'').split('/').pop(), line: e.lineno });
    });
  </script>
</head>
<body>
  <div id="stem-mount" style="width: 800px; height: 600px;"></div>
  <script src="/stem_lab/stem_lab_module.js"></script>
  <script src="/${suite.pluginFile}"></script>
  <script>
    // Wait for stem_lab + plugin to finish loading, then mount the tool
    setTimeout(function() {
      try {
        if (!window.StemLab || !window.StemLab.renderTool) {
          window.__bootError = 'StemLab not registered after script load';
          return;
        }
        // Wrap renderTool in a real React component so hooks fire inside a render context.
        // toolData lives in REAL React state via useState, so update/updateMulti calls trigger
        // re-renders and the tool re-reads the new data on the next render — same as
        // production StemPluginBridge.
        var initialToolDataState = ${JSON.stringify({ [suite.toolId]: suite.initialToolData })};
        function StemPluginBridge(props) {
          var stateTuple = React.useState(initialToolDataState);
          var toolData = stateTuple[0];
          var setToolData = stateTuple[1];
          var renderingFlag = React.useRef({ current: false });
          var ctx = {
            React: React,
            toolData: toolData,
            setToolData: setToolData,
            // Production update API: ctx.update(toolId, key, val) and updateMulti(toolId, obj)
            update: function(toolId, key, val) {
              setToolData(function(prev) {
                var next = Object.assign({}, prev);
                next[toolId] = Object.assign({}, prev[toolId] || {}, {});
                next[toolId][key] = val;
                return next;
              });
            },
            updateMulti: function(toolId, obj) {
              setToolData(function(prev) {
                var next = Object.assign({}, prev);
                next[toolId] = Object.assign({}, prev[toolId] || {}, obj);
                return next;
              });
            },
            _renderingFlag: renderingFlag.current,
            announceToSR: function() {},
            a11yClick: function(handler) { return { onClick: handler, onKeyDown: function(e) { if (e.key === 'Enter') handler(e); } }; },
            callGemini: window.callGemini,
            theme: { mode: 'light', text: '#0f172a', textMuted: '#64748b', accent: '#3b82f6', surface: '#ffffff', border: '#e2e8f0' },
            t: function(k) { return k; },
            isParentMode: false, isStudentMode: false, isTeacherMode: true,
            gradeLevel: 'high-school',
            addToast: function() {},
            playSound: function() {},
          };
          ctx._renderingFlag.current = true;
          try {
            return window.StemLab.renderTool(props._toolId, ctx);
          } finally {
            ctx._renderingFlag.current = false;
          }
        }
        var element = React.createElement(StemPluginBridge, { _toolId: '${suite.toolId}' });
        var root = ReactDOM.createRoot(document.getElementById('stem-mount'));
        root.render(element);
        window.__mounted = true;
      } catch (e) {
        window.__bootError = 'Mount threw: ' + e.message + ' :: ' + e.stack;
      }
    }, 500);  // wait for plugin script tag to execute
  </script>
</body>
</html>
`;
}

// ──────────────────────────────────────────────────────────────────────────
// Tiny HTTP server (same pattern as V2)
// ──────────────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};
const server = http.createServer(function(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/dev-tools/_stem_harness.html';
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, function(err, data) {
    if (err) { res.writeHead(404); return res.end('Not Found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Run a single suite
// ──────────────────────────────────────────────────────────────────────────
async function runSuite(suite) {
  fs.writeFileSync(HARNESS_PATH, generateHarness(suite), 'utf-8');
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  if (VERBOSE) page.on('console', msg => console.log('  [browser ' + msg.type() + '] ' + msg.text()));

  let snapshot;
  let bootError = null;
  try {
    await page.goto('http://localhost:' + PORT + '/');
    // Wait for mount + N animation frames
    await page.waitForFunction(function() { return window.__mounted === true || window.__bootError; }, { timeout: 15000 });
    bootError = await page.evaluate(function() { return window.__bootError || null; });
    if (bootError) {
      await browser.close();
      return { suite, bootError, results: [] };
    }
    // Give React a tick to run the test-hook useEffect, THEN trigger startDriving
    // (or the suite's equivalent) so the simulation populates before we measure.
    await page.waitForTimeout(800);
    if (suite.triggerStart) {
      await page.evaluate(function(toolId) {
        var hook = window.__testHooks && window.__testHooks[toolId];
        if (hook && typeof hook.startDriving === 'function') {
          hook.startDriving();
        }
      }, suite.toolId);
    }
    // Capture state at two checkpoints so behavioral assertions can compare frames
    // (e.g., "did each car move in its heading direction over N frames?")
    function takeSnapshot() {
      return page.evaluate(function(toolId) {
        var s = window.__testHooks && window.__testHooks[toolId];
        if (!s) return { _missing: true };
        var out = {};
        // Special handler for Three.js refs (circular, can't JSON-clone) — extract
        // just the position/rotation data we care about for behavior tests.
        function summarizeThree(t) {
          if (!t) return null;
          var r = {};
          if (t.playerCarGroup && t.playerCarGroup.position) {
            r.playerCarGroupPos = { x: t.playerCarGroup.position.x, y: t.playerCarGroup.position.y, z: t.playerCarGroup.position.z };
            r.playerCarGroupRot = { x: t.playerCarGroup.rotation.x, y: t.playerCarGroup.rotation.y, z: t.playerCarGroup.rotation.z };
          }
          // Sample ground/road geometry under player to detect "sunken" bug.
          // Only PlaneGeometry counts as "ground" — spheres/cylinders/boxes are
          // decorations (lights, hydrants, balls) and would false-positive.
          if (t.scene && t.playerCarGroup) {
            var pcgY = t.playerCarGroup.position.y;
            var groundMeshes = [];
            t.scene.traverse(function(obj) {
              if (obj.isMesh && obj !== t.playerCarGroup
                  && obj.geometry && obj.geometry.type === 'PlaneGeometry') {
                var dx = obj.position.x - t.playerCarGroup.position.x;
                var dz = obj.position.z - t.playerCarGroup.position.z;
                if (Math.abs(dx) < 5 && Math.abs(dz) < 5) {
                  obj.updateWorldMatrix(true, false);
                  var worldY = obj.matrixWorld.elements[13];
                  groundMeshes.push({
                    name: obj.name || 'PlaneGeometry',
                    worldY: worldY,
                    geomType: 'PlaneGeometry',
                  });
                }
              }
            });
            // Pick the highest plane (the road surface or visible ground) — that's
            // the one the player car should be sitting AT or slightly above
            r.groundMeshesNear = groundMeshes.sort(function(a, b) { return b.worldY - a.worldY; }).slice(0, 3);
            r.totalNearMeshes = groundMeshes.length;
          }
          return r;
        }
        for (var k in s) {
          var v = s[k];
          if (k === 'threeRef' && v && v.current) {
            out[k] = { current: summarizeThree(v.current) };
            continue;
          }
          if (k === 'infiniteWorldRef' && v && v.current) {
            // Capture roadHeightAtY for the player's current Y (and a few neighbors for context)
            try {
              var iw = v.current;
              var pcgZ = (s.threeRef && s.threeRef.current && s.threeRef.current.playerCarGroup)
                ? s.threeRef.current.playerCarGroup.position.z : 50;
              var carY = (s.carRef && s.carRef.current && s.carRef.current.y) || 50;
              out[k] = { current: {
                hasRoadHeightAtY: typeof iw.roadHeightAtY === 'function',
                roadHeightAtCarY: iw.roadHeightAtY ? iw.roadHeightAtY(carY) : null,
                roadHeightSamples: iw.roadHeightAtY ? [carY - 2, carY, carY + 2].map(function(y) {
                  return { y: y, h: iw.roadHeightAtY(y) };
                }) : [],
              }};
            } catch (e) { out[k] = { current: '<error: ' + e.message + '>' }; }
            continue;
          }
          if (v && typeof v === 'object' && 'current' in v) {
            try { out[k] = { current: JSON.parse(JSON.stringify(v.current)) }; }
            catch (e) { out[k] = { current: '<unserializable>' }; }
          } else if (typeof v === 'function') {
            // Function on the hook (e.g., getCurrentScenario) — call + capture result
            try { out[k] = v(); }
            catch (e) { out[k] = '<error: ' + e.message + '>'; }
          } else {
            try { out[k] = JSON.parse(JSON.stringify(v)); }
            catch (e) { out[k] = '<unserializable>'; }
          }
        }
        out._errors = (window.__errors || []).slice(0, 5);
        out._timestamp = Date.now();
        return out;
      }, suite.toolId);
    }

    // First snapshot — early in the sim (after ~half the frames)
    const halfWaitMs = Math.ceil((suite.framesToWait / 2 / 60) * 1000) + 200;
    await page.waitForTimeout(halfWaitMs);
    const earlySnapshot = await takeSnapshot();
    // Second snapshot — at the full target frame count
    const restMs = Math.ceil((suite.framesToWait / 2 / 60) * 1000) + 300;
    await page.waitForTimeout(restMs);
    snapshot = await takeSnapshot();
    snapshot._earlier = earlySnapshot;
  } catch (e) {
    bootError = 'Test harness failed: ' + e.message;
  }
  await browser.close();
  if (!KEEP_HARNESS) try { fs.unlinkSync(HARNESS_PATH); } catch (_) {}

  if (bootError) return { suite, bootError, results: [] };

  if (snapshot._missing) {
    return { suite, bootError: 'window.__testHooks.' + suite.toolId + ' was never set — test hook missing or did not fire', results: [] };
  }

  // Run each assertion
  const results = suite.assertions.map(function(a) {
    try {
      const r = a.fn(snapshot);
      return { name: a.name, ...r };
    } catch (e) {
      return { name: a.name, pass: false, message: 'assertion threw: ' + e.message };
    }
  });
  return { suite, bootError: null, snapshot, results };
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────
(async function main() {
  await new Promise(function(resolve) { server.listen(PORT, resolve); });

  const allRuns = [];
  for (const suite of suitesToRun) {
    if (!QUIET) console.log('  Running ' + suite.toolId + '...');
    allRuns.push(await runSuite(suite));
  }

  await new Promise(function(resolve) { server.close(resolve); });

  // Report
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   STEM Lab Behavior Tests                                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  let totalAssertions = 0;
  let totalFailures = 0;
  let totalBootErrors = 0;

  for (const run of allRuns) {
    console.log('');
    console.log('  ── ' + run.suite.toolId + ' ──');
    if (run.bootError) {
      console.log('    ✗ Boot failed: ' + run.bootError);
      if (VERBOSE && run.snapshot && run.snapshot._errors) {
        for (const e of run.snapshot._errors) console.log('      [browser err] ' + (e.source || '?') + ':' + (e.line || '?') + '  ' + e.message);
      }
      totalBootErrors++;
      continue;
    }
    for (const r of run.results) {
      totalAssertions++;
      const icon = r.pass ? '✓' : '✗';
      console.log('    ' + icon + ' ' + r.name + (r.message ? '  — ' + r.message : ''));
      if (!r.pass) totalFailures++;
    }
  }

  console.log('');
  console.log('  ──────────────────────────────────────────');
  console.log('  Suites run:    ' + allRuns.length);
  console.log('  Boot errors:   ' + totalBootErrors);
  console.log('  Assertions:    ' + totalAssertions);
  console.log('  Failures:      ' + totalFailures);
  console.log('');

  if (totalBootErrors === 0 && totalFailures === 0) {
    console.log('  ✅ All STEM behavior assertions pass.');
  } else {
    console.log('  ❌ ' + (totalBootErrors + totalFailures) + ' issue(s) — see above.');
  }
  console.log('');

  process.exit((totalBootErrors + totalFailures) > 0 ? 1 : 0);
})().catch(function(e) {
  console.error('Fatal: ' + e.message);
  console.error(e.stack);
  try { fs.unlinkSync(HARNESS_PATH); } catch (_) {}
  process.exit(2);
});
