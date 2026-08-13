import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = file => readFileSync(resolve(ROOT, file), 'utf8');
const source = read('guided_mode_config_source.jsx');
const moduleCode = read('guided_mode_config_module.js');
const host = read('AlloFlowANTI.txt');

function moduleApi() {
  const window = { AlloModules: {} };
  vm.runInNewContext(moduleCode, { window, console, Set, Object, Array, Number, Math, String }, { filename: 'guided_mode_config_module.js' });
  return window.AlloModules.GuidedModeConfig;
}

function hostFallbacks() {
  const start = host.indexOf('  const GUIDED_STEP_IDS =');
  const end = host.indexOf('  // Cross-refresh resume:', start);
  if (start < 0 || end < 0) throw new Error('Guided persistence fallback markers missing');
  return new Function(host.slice(start, end) + '\nreturn { GUIDED_STEP_IDS, GUIDED_DELIVERY_EVIDENCE_KEYS, normalizeGuidedPlanBrief, normalizeGuidedProgress };')();
}

describe('GuidedModeConfig extraction contract', () => {
  it('registers the complete declarative and normalization API', () => {
    expect(Object.keys(moduleApi()).sort()).toEqual([
      'GUIDED_STEP_IDS', 'GUIDED_DELIVERY_EVIDENCE_KEYS', 'GUIDED_PHASES',
      'GUIDED_DELIVERY_GROUPS', 'GUIDED_STEPS', 'GUIDED_PRESETS', 'GUIDED_TOUR_MAP',
      'normalizeGuidedPlanBrief', 'normalizeGuidedProgress',
    ].sort());
  });

  it('keeps catalog IDs, phases, presets, and tour anchors internally aligned', () => {
    const api = moduleApi();
    expect(api.GUIDED_STEP_IDS).toEqual(api.GUIDED_STEPS.map(step => step.id));
    const phases = new Set(api.GUIDED_PHASES.map(phase => phase.id));
    expect(api.GUIDED_STEPS.every(step => phases.has(step.phase))).toBe(true);
    const ids = new Set(api.GUIDED_STEP_IDS);
    for (const preset of api.GUIDED_PRESETS) {
      expect(preset.stepIds === null || preset.stepIds.every(id => ids.has(id))).toBe(true);
    }
    expect(Object.keys(api.GUIDED_TOUR_MAP)).toEqual(api.GUIDED_STEP_IDS);
    for (const domId of Object.values(api.GUIDED_TOUR_MAP)) {
      expect(host.includes(`id="${domId}"`) || host.includes(`id='${domId}'`)).toBe(true);
    }
  });

  it('keeps synchronous cold-start sanitizers behaviorally aligned with the module', () => {
    const local = hostFallbacks();
    const remote = moduleApi();
    expect(local.GUIDED_STEP_IDS).toEqual(remote.GUIDED_STEP_IDS);
    expect(local.GUIDED_DELIVERY_EVIDENCE_KEYS).toEqual(remote.GUIDED_DELIVERY_EVIDENCE_KEYS);
    const raw = {
      guidedStep: 99,
      selectedIds: ['quiz', 'unknown', 'quiz'],
      completedSteps: ['analysis', 'unknown'],
      skippedIds: ['faq', 'unknown'],
      deliveryEvidence: { exportCreated: true, privateValue: true },
      planBrief: { title: '  My lesson  ', stepReasons: { quiz: ' Check learning ', unknown: 'discard' } },
    };
    expect(local.normalizeGuidedProgress(raw)).toEqual(remote.normalizeGuidedProgress(raw));
    expect(local.normalizeGuidedPlanBrief(raw.planBrief)).toEqual(remote.normalizeGuidedPlanBrief(raw.planBrief));
  });

  it('keeps only a resilient bridge, synchronous sanitizer fallback, and recovery UI in every shell', () => {
    for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const shell = read(file);
      expect(shell, file).toContain("loadModule('GuidedModeConfig'");
      expect(shell, file).toContain("'HistoryPanel', 'GuidedModeConfig'");
      expect(shell, file).toContain('const _alloGuidedModeConfig = () =>');
      expect(shell, file).toContain('guidedMode && !guidedModeConfigReady');
      expect(shell, file).toContain('Guided Mode needs one more tool');
      expect(shell, file).toContain('Retry loading');
      expect(shell, file).toContain('Exit Guided Mode');
      expect(shell, file).toContain('const normalizeGuidedProgress');
      expect(shell, file).not.toContain('const GUIDED_PHASES = [');
      expect(shell, file).not.toContain('const GUIDED_STEPS = [');
      expect(shell, file).not.toContain('const GUIDED_PRESETS = [');
      expect(shell, file).not.toContain('const GUIDED_TOUR_MAP = {');
    }
  });

  it('is build-managed and keeps root/public module bytes identical', () => {
    expect(read('build.js')).toContain("filename: 'guided_mode_config_module.js'");
    expect(read('build.js')).toContain("require('./_build_guided_mode_config_module.js').buildGuidedModeConfigModule(src)");
    expect(read('desktop/web-app/public/guided_mode_config_module.js')).toBe(moduleCode);
    expect(source).toContain('window.AlloModules.GuidedModeConfig = {');
  });
});
