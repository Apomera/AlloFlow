// Dino Lab golden-master harness.
//
// PURPOSE: a characterization (golden master) baseline for stem_tool_dinolab.js
// — a ~5k-line, 332-species paleontology tool registered via
// window.StemLab.registerTool. It pins (a) the tool's render output for every
// tab under a fixed deterministic state, and (b) the curated species/feature
// data contract, so the tool can be edited or decomposed with a safety net: any
// change to what a student sees, or to the data, surfaces as a snapshot diff.
//
// HOW IT WORKS (zero changes to the live module — read-only):
//   * load stem_lab/stem_tool_dinolab.js into the vitest+jsdom window via the
//     same new Function(src)() pattern as tests/setup.js, with a stubbed
//     window.StemLab that captures the registered tool config.
//   * to also assert the closure-private data tables, the harness splices ONE
//     read-only capture line (globalThis.__dinoInternals = {...}) right before
//     the registerTool call. The file on disk is never modified.
//   * render each tab's element tree (tool.render(ctx)) with REAL React 18 +
//     renderToStaticMarkup — this exercises the RENDER phase but not event
//     handlers, so there is no click/state nondeterminism.
//   * the tool uses a SEEDED rng (mulberry32) and no Date.now / Math.random, so
//     snapshots are byte-stable without freezing anything.
//
// SCOPE / HONEST LIMITS: pins the render phase under a fixed prop/state env, not
// a live browser session. Click-driven transitions (answering a quiz, digging a
// cell) run inside handlers and are not exercised here; their RESULTING render
// is pinned by feeding the equivalent state in via toolData.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'prismflow-deploy/node_modules');

// Real React 18 + its SSR renderer (react-dom resolves its own react from the
// same directory, so element identity is consistent with React below).
export const React = require(resolve(MODULES_DIR, 'react'));
export const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));

const noop = () => {};

// The Dino Lab tab ids, in the order they appear in the tab bar.
export const TABS = ['explore', 'timeline', 'deeptime', 'sites', 'map', 'ecosystem', 'compare', 'field3d', 'dig', 'classify', 'birds', 'extinction', 'anatomy', 'records', 'quiz', 'notes', 'glossary', 'classroom'];

let _tool = null;
let _internals = null;

/**
 * Load stem_tool_dinolab.js against the jsdom window with a stubbed StemLab,
 * capturing both the registered tool config and (read-only) its private data
 * tables. Idempotent.
 */
export function setupDinoLab() {
  if (_tool) return api();

  let src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_dinolab.js'), 'utf8');
  // Splice a read-only internals capture right before registration. All data
  // tables and helpers are defined by this point in the IIFE.
  src = src.replace(
    "window.StemLab.registerTool('dinoLab'",
    "globalThis.__dinoInternals = { DINOS: DINOS, PERIODS: PERIODS, CLADES: CLADES, EXTINCTIONS: EXTINCTIONS, KPG_EVIDENCE: KPG_EVIDENCE, ANATOMY: ANATOMY, MYTHS: MYTHS, QUIZ: QUIZ, GLOSSARY: GLOSSARY, SITES: SITES, RECORDS: RECORDS, PEOPLE: PEOPLE, byId: byId, periodName: periodName, fmtLength: fmtLength, fmtWeight: fmtWeight, fmtMya: fmtMya };\n  window.StemLab.registerTool('dinoLab'"
  );
  if (src.indexOf('__dinoInternals') === -1) {
    throw new Error('Harness: failed to splice internals capture — the registerTool anchor changed.');
  }

  const captured = {};
  window.StemLab = { ensureThree: () => new Promise(() => {}), registerTool: (id, cfg) => { captured.id = id; captured.cfg = cfg; } };
  globalThis.StemLab = window.StemLab;
  // eslint-disable-next-line no-new-func
  new Function(src)();

  if (!captured.cfg || typeof captured.cfg.render !== 'function') {
    throw new Error('Harness setup failed: dinoLab did not register a render function.');
  }
  _tool = captured;
  _internals = globalThis.__dinoInternals;
  if (!_internals || !Array.isArray(_internals.DINOS)) {
    throw new Error('Harness setup failed: internals were not captured.');
  }
  return api();
}

/**
 * A deterministic toolData.dinoLab state that drives one tab to a populated,
 * meaningful render. The explore grid is narrowed (query) so its snapshot stays
 * bounded while still exercising the detail card, filters, and a card.
 */
export function baseData(tab) {
  const d = {
    selected: 'tyrannosaurus',
    field3dSelected: 'tyrannosaurus', field3dShowSkeleton: true, field3dShowBody: true, field3dShowHuman: true, field3dShowEvidence: true, field3dChallengeIdx: 0, field3dChallengePicked: null, field3dChallengeScore: 0, field3dChallengeDone: 0, field3dAutoRotate: true, field3dScanTargetIdx: 0, field3dScanLogged: {}, field3dScanSpecies: 'tyrannosaurus', field3dClaimFocus: 'scale',
    compareA: 'spinosaurus', compareB: 'argentinosaurus',
    digSeed: 3, digRevealed: [0, 1, 2, 5, 8, 9, 12], digGuess: 'allosaurus', digSolvedFor: null, digsSolved: 0,
    quizIdx: 2, quizPicked: 1, quizAnswered: true, quizCorrect: 3, quizDone: 5,
    sortIdx: 4, sortAnswered: true, sortPicked: 'theropod', sortScore: 3, sortDone: 4,
    extOpen: 'ext_kpg', ecoOpen: 'Morrison',
    filterPeriod: 'all', filterDiet: 'all', filterContinent: 'all', sortBy: 'name',
    query: '', glossaryQuery: '', surpriseN: 7,
    seen: { triceratops: true },
  };
  if (tab === 'explore') d.query = 'tyrannosaurus';
  if (tab === 'glossary') d.glossaryQuery = 'fossil';
  if (tab === 'map') d.mapSel = 'Asia';
  d.tab = tab;
  return d;
}

function ctxFor(d) {
  return { React, toolData: { dinoLab: d }, update: noop, updateMulti: noop, announceToSR: noop };
}

function scrub(html) {
  return html.split('><').join('>\n<'); // one tag per line -> readable diffs
}

/**
 * SSR-render a tab. Pass a tab id (uses baseData) or a full toolData state
 * object. Returns scrubbed, line-oriented HTML suitable for snapshotting.
 */
export function renderTab(tabOrData) {
  setupDinoLab();
  const d = typeof tabOrData === 'string' ? baseData(tabOrData) : tabOrData;
  return scrub(ReactDOMServer.renderToStaticMarkup(_tool.cfg.render(ctxFor(d))));
}

/** The tool's registration metadata (sans the render fn), for contract tests. */
export function meta() {
  setupDinoLab();
  const c = _tool.cfg;
  return {
    id: _tool.id, name: c.name, icon: c.icon, category: c.category,
    questHooks: (c.questHooks || []).map(q => ({ id: q.id, label: q.label, icon: q.icon })),
  };
}

/** Run the quest-hook predicates against a given toolData state. */
export function questState(data) {
  setupDinoLab();
  return (_tool.cfg.questHooks || []).map(q => ({ id: q.id, done: !!q.check(data), progress: q.progress(data) }));
}

/** Read-only access to the tool's private data tables. */
export function internals() { setupDinoLab(); return _internals; }

function api() {
  return { React, ReactDOMServer, tool: _tool, renderTab, baseData, meta, questState, internals, TABS };
}
