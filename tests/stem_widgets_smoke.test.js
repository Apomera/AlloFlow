// SMOKE TEST for the 29 H7b'' inquiry widgets shipped in session
// batches 11-17. Per the 2026-06-03 audit punchlist, the new inquiry
// blocks have ZERO runtime test coverage: node --check is static-only,
// and most widgets are gated behind a sub-mode (tab/view/section) so
// the existing e2e/14 flagship harness skips them. A runtime
// ReferenceError inside a new widget's JSX would ship undetected.
//
// SCOPE: this file asserts ONE thing per widget — when the tool is
// loaded and rendered under a toolData state that exposes its inquiry
// block, the SSR render does not throw and the output contains an
// H7b'' inquiry signature ("no score, no reveal", "I'm stuck", "🔬",
// "Inquiry widget", or "hypothesis"). It does NOT snapshot pixel-level
// HTML — too brittle, since some inquiry rendering depends on Date and
// other inputs the audit harness flagged.
//
// HONEST LIMITS:
//   • Some tool render() functions depend on browser-only globals
//     (THREE, AudioContext, document.fonts) and can throw inside jsdom
//     for reasons unrelated to the new inquiry blocks. These are
//     marked .skip with the reason; the inquiry block in those tools
//     remains covered by node --check + browser_strict_check.cjs.
//   • State recipes use the minimum keys needed to expose the inquiry
//     block; they are NOT representative of real student usage.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab, findInquirySignal } from './helpers/stem_widgets_smoke_harness.js';

// ─────────────────────────────────────────────────────────────────────
// Widget catalog with per-widget state recipes. Each entry says: load
// this file, capture this toolId, render with this toolData state, and
// expect the inquiry signature in the resulting HTML.
//
// `data` is the FULL toolData object. The slot key (e.g., `petsLab`)
// names the per-tool state object the render reads from.
// `skip` (optional) marks a known jsdom-incompatible tool with a
// reason string; the test stays in the suite but is skipped.
// ─────────────────────────────────────────────────────────────────────
const WIDGETS = [
  // B11
  // The command-center refactor (0326d9475) moved the ops inquiry widget
  // behind the menu's Ops Lab panel; the default panel is 'airports'.
  { file: 'stem_lab/stem_tool_atctower.js', toolId: 'atcTower', data: { atcTower: { atcMenuPanel: 'ops' } } },
  { file: 'stem_lab/stem_tool_geosandbox.js', toolId: 'geoSandbox', skip: 'Three.js / OrbitControls global (loaded via CDN at runtime; not available in jsdom)', data: { geoSandbox: { mode: 'stretch', construction: { objects: [{ type: 'segment', position: [0, 0, 0], vector: [1, 0, 0] }], selection: null }, history: [], savedConstructions: {} } } },
  { file: 'stem_lab/stem_tool_pets.js', toolId: 'petsLab', data: {} },
  { file: 'stem_lab/stem_tool_fisherlab.js', toolId: 'fisherLab', skip: 'Tool body depends on window.THREE; aqcond inquiry tab is reached after sim init', data: { fisherLab: {} } },

  // B12
  { file: 'stem_lab/stem_tool_circuit.js', toolId: 'circuit', data: { circuit: { workspaceTab: 'reference', expSection: 'ohmInquiry' } } },
  { file: 'stem_lab/stem_tool_statslab.js', toolId: 'statsLab', data: { statsLab: { mode: 'inquiry' } } },
  { file: 'stem_lab/stem_tool_dna.js', toolId: 'dnaLab', data: { dna: { expSection: 'mutInquiry' } } },
  // skatelab guards on `labToolData.skatelab` being present (line 1664: if (!labToolData || !labToolData.skatelab) return Initializing...); seed an empty object to bypass the init early-return.
  { file: 'stem_lab/stem_tool_skatelab.js', toolId: 'skatelab', data: { skatelab: { mode: 'halfpipe', vehicle: 'skate', tour: { open: false, step: 0, seen: true } } } },

  // B13
  { file: 'stem_lab/stem_tool_optics.js', toolId: 'opticsLab', data: { opticsLab: { mode: 'inquiry' } } },
  { file: 'stem_lab/stem_tool_nutritionlab.js', toolId: 'nutritionLab', data: { nutritionLab: { view: 'macroInquiry' } } },
  { file: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', data: { solarSystem: { orreryMode: true, orr_tab: 8 } } },
  { file: 'stem_lab/stem_tool_migration.js', toolId: 'migration', data: { migration: { tab: 'inquiry' } } },

  // B14
  { file: 'stem_lab/stem_tool_worldbuilder.js', toolId: 'worldBuilder', data: { worldBuilder: { selectedWorld: null } } },
  { file: 'stem_lab/stem_tool_coding.js', toolId: 'codingPlayground', data: {} },
  { file: 'stem_lab/stem_tool_economicslab.js', toolId: 'economicsLab', data: { econTab: 'inquiry' } },
  { file: 'stem_lab/stem_tool_brainatlas.js', toolId: 'brainAtlas', data: { brainAtlas: { view: 'neurotransmitters', showNtInquiry: true } } },

  // B15
  { file: 'stem_lab/stem_tool_dataplot.js', toolId: 'dataPlot', data: { dataPlot: { activeTab: 'inquiry' } } },
  { file: 'stem_lab/stem_tool_money.js', toolId: 'moneyMath', data: { moneyMath: { tab: 'inquiry' } } },
  { file: 'stem_lab/stem_tool_universe.js', toolId: 'universe', data: { universe: { showHubbleInquiry: true } } },
  { file: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', data: { dissection: { specimen: 'frog', currentLayer: 0 } } },

  // B16
  { file: 'stem_lab/stem_tool_stewardship.js', toolId: 'stewardshipHub', data: { stewardshipHub: { tutorialSeen: true } } },
  { file: 'stem_lab/stem_tool_llm_literacy.js', toolId: 'llmLiteracy', data: { llmLiteracy: { section: 'inquiry' } } },
  { file: 'stem_lab/stem_tool_manipulatives.js', toolId: 'base10', data: { _manipulatives: { mode: 'inquiry' } } },
  { file: 'stem_lab/stem_tool_allobotsage.js', toolId: 'alloBotSage', data: { alloBotSage: { phase: 'inquiry' } } },

  // B17
  { file: 'stem_lab/stem_tool_lumen.js', toolId: 'lumen', data: { lumen: { observations: [{ x: 1, y: 50, phase: 'baseline' }, { x: 2, y: 52, phase: 'baseline' }, { x: 3, y: 55, phase: 'baseline' }], showInquiry: true } } }, // showInquiry: the Evidence-Inquiry sandbox is now gated behind a default-closed disclosure (needs >=3 obs + the toggle)
  { file: 'stem_lab/stem_tool_assessmentliteracy.js', toolId: 'assessmentLiteracy', data: { assessmentLiteracy: { view: 'inquiry' } } },
  { file: 'stem_lab/stem_tool_printingpress.js', toolId: 'printingPress', data: { printingPress: { view: 'pressInquiry' } } },
  { file: 'stem_lab/stem_tool_schoolbehaviortoolkit.js', toolId: 'schoolBehaviorToolkit', data: { schoolBehaviorToolkit: { activeSection: 'inquiry' } } },
  { file: 'stem_lab/stem_tool_applab.js', toolId: 'appLab', data: { appLab: {} } },
  { file: 'stem_lab/stem_tool_behaviorlab.js', toolId: 'behaviorLab', data: {} }
];

describe('STEM Lab H7b\'\' inquiry widgets — runtime smoke (29 widgets)', () => {
  beforeEach(() => {
    resetStemLab();
  });

  for (const w of WIDGETS) {
    const testFn = w.skip ? it.skip : it;
    const title = w.toolId + ' (' + w.file.replace('stem_lab/', '') + ')' + (w.skip ? ' [SKIP: ' + w.skip + ']' : '');
    testFn(title + ' — SSR-renders without throwing, contains inquiry signature', () => {
      const cfg = loadTool(w.file, w.toolId);
      expect(cfg, 'tool config missing').toBeTruthy();
      expect(typeof cfg.render).toBe('function');

      let html;
      try {
        html = renderTool(w.toolId, w.data);
      } catch (e) {
        // Surface the render error with file + toolId context.
        throw new Error('render threw for ' + w.toolId + ' (' + w.file + '): ' + (e && e.message ? e.message : e));
      }
      expect(html.length, w.toolId + ' rendered empty HTML').toBeGreaterThan(50);

      const sig = findInquirySignal(html);
      expect(sig, w.toolId + ' SSR output contains no H7b\'\' inquiry signature — the inquiry block did not render under the test state').toBeTruthy();
    });
  }

  it('all 30 widget IDs are unique (no copy-paste collisions)', () => {
    const ids = WIDGETS.map(w => w.toolId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
