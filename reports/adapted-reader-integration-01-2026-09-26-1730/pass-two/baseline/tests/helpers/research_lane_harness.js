// Per-lane golden-master harness for the Research Hub lanes.
//
// PURPOSE: pin the PURE assessment-integrity invariants inside each lane —
// the numbers and guards that define whether the tool measures what it claims
// (Pareto domination, the physical-safety override, the scholar-name
// prohibition, the structural NO-AI Stage-5 sentinel, output validators). The
// 2026-06-07 review found these were entirely unpinned, so a refactor flipping
// a comparison or moving a threshold would silently weaken them. Several were
// just fixed (hasUnmetSafety enforcement, scholarNameSuspected mononym guard);
// these tests lock those fixes in.
//
// HOW IT WORKS (zero changes to the live module on disk — read-only):
//   * setupHub() first, so window.ResearchHub exists with .registerLane and
//     .helpers (real tokenJaccard / isPlausibleProse the lanes pull off H).
//   * read research_lane_<name>_module.js, splice ONE read-only capture line
//     just before the trailing `console.log("[CDN] ResearchLane<X> registered`
//     so the lane's closure-private top-level functions are reachable.
//   * execute with new Function(src).call(window). The lane self-registers, so
//     the rendered config is also reachable via window.ResearchHub._lanes[name].
//
// SCOPE: pure functions + structural gates. Full React render is out of scope
// (covered by the render-crash detector + the smoke-test checklists); a
// lightweight no-throw render-smoke can be layered later via _lanes[name].render.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setupHub, internals as hubInternals } from './research_hub_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));

let _server;
function reactServer() {
  if (!_server) _server = require(resolve(MODULES_DIR, 'react-dom/server.js'));
  return _server;
}

// Minimal stand-in for the hub-provided primitives (SuggestionBadge,
// ExemplarPair, VoiceNoteBlock, CostMeter). Render-smoke exercises the LANE's
// own stage render code, not these hub components (covered elsewhere), so a
// valid no-op component is enough to keep renderToString happy.
function StubPrimitive(props) {
  return React.createElement('div', { 'data-stub-primitive': true }, props && props.children);
}

// name → { file, sentinel, capture[] }. capture[] must be EXACT top-level
// declaration names in that lane's source (the splice ReferenceErrors otherwise).
const LANES = {
  engineering: {
    file: 'research_lane_engineering_module.js',
    sentinel: '"[CDN] ResearchLaneEngineering registered',
    capture: ['devFloors', 'hardConstraints', 'hasUnmetSafety', 'stakeholderTranslatorGate', 'computeParetoDominated'],
  },
  humanities: {
    file: 'research_lane_humanities_module.js',
    sentinel: '"[CDN] ResearchLaneHumanities registered',
    capture: ['scholarNameSuspected', 'sourceLateralProbeValidate', 'counterFramingVoicerValidate', 'noAiStageSentinelGate', 'contentTokens'],
  },
  scientific: {
    file: 'research_lane_scientific_module.js',
    sentinel: '"[CDN] ResearchLaneScientific registered',
    capture: ['steelmanSecondPassGate', 'steelmanValidate', 'honestUncertaintyValidate'],
  },
};

const _loaded = {};

export function setupLane(name) {
  if (_loaded[name]) return;
  const cfg = LANES[name];
  if (!cfg) throw new Error('Unknown lane: ' + name);

  setupHub(); // window.ResearchHub (+ .registerLane + .helpers) must exist first
  globalThis.window.React = React;

  let src = readFileSync(resolve(process.cwd(), cfg.file), 'utf8');
  const sentinelCall = 'console.log(' + cfg.sentinel;
  if (src.indexOf(sentinelCall) === -1) {
    throw new Error(
      'Could not find the trailing registration console.log for ' + name +
      ' (looked for ' + cfg.sentinel + '). Did the lane rename it? Update the harness.',
    );
  }

  const fields = cfg.capture
    .map((fn) => fn + ': (typeof ' + fn + " !== 'undefined' ? " + fn + ' : undefined)')
    .join(', ');
  const capture =
    '\n  if (typeof globalThis !== "undefined") {' +
    ' globalThis.__laneInternals = globalThis.__laneInternals || {};' +
    ' globalThis.__laneInternals[' + JSON.stringify(name) + '] = { ' + fields + ' };' +
    ' }\n  ';
  src = src.replace(sentinelCall, capture + sentinelCall);

  // eslint-disable-next-line no-new-func
  new Function(src).call(globalThis.window);

  const captured = globalThis.__laneInternals && globalThis.__laneInternals[name];
  if (!captured) {
    throw new Error('Internals capture failed for ' + name + ' — module did not reach the splice point (registration guard?).');
  }
  // Surface any capture names that came back undefined early, with a clear message.
  for (const fn of cfg.capture) {
    if (typeof captured[fn] !== 'function') {
      throw new Error('Lane ' + name + ' did not expose ' + fn + ' as a function — name may have changed in source.');
    }
  }
  _loaded[name] = true;
}

export function laneInternals(name) {
  const got = globalThis.__laneInternals && globalThis.__laneInternals[name];
  if (!got) throw new Error('Call setupLane(' + JSON.stringify(name) + ') first.');
  return got;
}

// The lane's registered config (label, stages, touchpoints, render) as stored
// by the real hub's registerLane.
export function laneConfig(name) {
  const hub = globalThis.window && globalThis.window.ResearchHub;
  const lane = hub && hub._lanes && hub._lanes[name];
  if (!lane) throw new Error('Lane ' + name + ' not registered — call setupLane first.');
  return lane;
}

// The lane's stage keys, in order, from its registered config.
export function laneStageKeys(name) {
  setupLane(name);
  return (laneConfig(name).stages || []).map((s) => s.key);
}

// Render-smoke: SSR-render one stage of a lane against a FRESH emptyJournal-
// backed ctx (mirrors the ctx the hub builds in ActiveLaneView), and return the
// HTML string. Throws if the stage's render code throws — that is the bug class
// (undefined-field reads / .map on missing arrays on first visit) this catches.
export function renderLaneStage(name, stageKey, journalOverrides) {
  setupLane(name);
  const lane = laneConfig(name);
  const journal = Object.assign(
    hubInternals().emptyJournal(),
    { activeLane: name, activeStage: stageKey },
    journalOverrides || {},
  );
  const ctx = {
    t: () => '', // empty → every t('key')||'English' falls back to its English string
    lane,
    journal,
    setJournal: () => {},
    ask: async () => ({}),
    addToast: () => {},
    primitives: {
      SuggestionBadge: StubPrimitive,
      ExemplarPair: StubPrimitive,
      VoiceNoteBlock: StubPrimitive,
      CostMeter: StubPrimitive,
    },
    constants: { MAX_AI_CALLS_PER_SESSION: 8, ANSWER_HARD_CAP: 1200, VOICE_NOTE_MAX_SECONDS: 60 },
    onExitLane: () => {},
  };
  return reactServer().renderToString(lane.render(ctx));
}
