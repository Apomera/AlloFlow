import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = file => readFileSync(resolve(ROOT, file), 'utf8');
const source = read('view_directions_result_source.jsx');
const moduleCode = read('view_directions_result_module.js');
const host = read('AlloFlowANTI.txt');
const build = read('build.js');
const builder = read('_build_view_directions_result_module.js');

function loadApi() {
  const React = {
    Fragment: Symbol('Fragment'),
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  };
  const window = {
    React,
    AlloModules: {},
    AlloIcons: {},
    sanitizeHtml: value => String(value),
  };
  vm.runInNewContext(moduleCode, {
    window,
    React,
    console,
    Math,
    Number,
    String,
    Array,
    Object,
  }, { filename: 'view_directions_result_module.js' });
  return window.AlloModules.DirectionsResult;
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('Directions Result safe view extraction', () => {
  it('registers exactly the intended presentation API', () => {
    const api = loadApi();
    expect(Object.keys(api)).toEqual(['DirectionsResultView']);
    expect(typeof api.DirectionsResultView).toBe('function');
  });

  it('renders bounded display records without running host controllers', () => {
    const api = loadApi();
    const tree = api.DirectionsResultView({
      t: () => '',
      title: 'Read first, then choose',
      bodyHtml: '<p>Use the evidence in the passage.</p>',
      showQuestMap: true,
      stationViews: [{
        id: 'station-1',
        title: 'Reading',
        typeLabel: 'Reading',
        icon: 'R',
        shape: 'circle',
        fill: '#f8fafc',
        stroke: '#64748b',
        visited: false,
      }],
      goalViews: [{ id: 'goal-1', label: 'Read the passage', kind: 'manual', done: false }],
      recommendationView: { nextId: 'station-1', alternateIds: [], nextGoalLabel: 'Read the passage' },
      choiceBoardView: null,
      onToggleMap: () => {},
      onTravel: () => {},
      onChoose: () => {},
      onToggleManual: () => {},
    });
    expect(tree.type).toBe('div');
    const rendered = JSON.stringify(tree);
    expect(rendered).toContain('Read first, then choose');
    expect(rendered).toContain('Use the evidence in the passage.');
    expect(rendered).toContain('Read the passage');
  });

  it('accepts only bounded view props and semantic ID callbacks', () => {
    for (const prop of [
      'title',
      'bodyHtml',
      'showQuestMap',
      'stationViews',
      'goalViews',
      'choiceBoardView',
      'recommendationView',
      'onToggleMap',
      'onTravel',
      'onChoose',
      'onToggleManual',
    ]) expect(source).toContain(prop);

    expect(source).toContain('onTravel(station.id)');
    expect(source).toContain('onChoose(item.resourceId)');
    expect(source).toContain('onToggleManual(goal.id)');
    expect(source).toContain('const trustedBodyHtml = typeof bodyHtml');
    expect(source).toContain("window.sanitizeHtml(trustedBodyHtml)");
  });

  it('cannot reach raw history, resources, stores, sessions, setters, AI, or network operations', () => {
    const executable = stripComments(source);
    for (const forbiddenIdentifier of [
      'history',
      'resources',
      'generatedContent',
      'directionsProgress',
      'directionsChoiceSelection',
      'storageDB',
      'localStorage',
      'sessionStorage',
      'mailbox',
      'mbConfig',
      'packSecret',
      'TEACHER_ONLY_TYPES',
      '_alloStudentSafeResources',
      '_alloNormalizeDirectionsData',
      '_alloEvaluateObjectives',
      'parseMarkdownToHTML',
      'handleRestoreView',
      'callGemini',
    ]) {
      expect(executable, forbiddenIdentifier).not.toMatch(new RegExp(`\\b${forbiddenIdentifier}\\b`));
    }
    expect(executable).not.toMatch(/\bset[A-Z][A-Za-z0-9_]*\b/);
    expect(executable).not.toMatch(/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|loadModule)\b/);
  });

  it('removes the inline body while retaining safety, sanitization, persistence, and controllers in the host', () => {
    for (const file of [
      'AlloFlowANTI.txt',
      'desktop/web-app/src/AlloFlowANTI.txt',
      'desktop/web-app/src/App.jsx',
    ]) {
      const shell = read(file);
      expect(shell, file).toContain('<DirectionsResultView');
      expect(shell, file).toContain('_alloBuildDirectionsResultAdapter');
      expect(shell, file).not.toContain('id="directions-choice-board-title"');
      expect(shell, file).not.toContain('const _mapW = Math.max(340');
      expect(shell, file).not.toContain("<g key={it.id} onClick={() => _travelTo(it)}");
      expect(shell, file).toContain('_alloStudentSafeResources(historyItems)');
      expect(shell, file).toContain('_alloEvaluateObjectives(normalized.objectives');
      expect(shell, file).toContain('sanitizeHtml(String(parsedBody || \'\'))');
      expect(shell, file).toContain("storageDB.get('allo_directions_progress_v1')");
      expect(shell, file).toContain('const toggleManualObjective =');
      expect(shell, file).toContain('const handleRestoreView =');
    }
  });

  it('mounts a deliberately narrow contract and resolves all IDs in the host', () => {
    const seamStart = host.indexOf("activeView === 'directions' && generatedContent?.type === 'directions'");
    const seamEnd = host.indexOf("activeView === 'simplified'", seamStart);
    const seam = host.slice(seamStart, seamEnd);
    expect(seamStart).toBeGreaterThan(0);
    expect(seamEnd).toBeGreaterThan(seamStart);
    expect(seam).toContain('_alloBuildDirectionsResultAdapter({');
    expect(seam).toContain('{...adapter.viewProps}');
    for (const callback of ['onToggleMap', 'onTravel', 'onChoose', 'onToggleManual']) {
      expect(seam).toContain(callback);
    }
    expect(seam).toContain('stationById.get(resolveDirectionsId(value))');
    expect(seam).toContain('choiceById.get(resolveDirectionsId(value))');
    expect(seam).toContain('goalById.has(goalId)');
    expect(seam).not.toMatch(/\b(?:history|directionsProgress|generatedContent|setShowQuestMap|setDirectionsChoiceSelection)=\{/);
  });

  it('is lazy, non-core, prewarmed on assignment open, and recoverable', () => {
    expect(host).toContain("loadModule('DirectionsResult', 'https://alloflow-cdn.pages.dev/view_directions_result_module.js");
    expect(host).toContain('window.__alloLazyDirectionsResult');
    const restoreStart = host.indexOf('const handleRestoreView =');
    const restoreSlice = host.slice(restoreStart, restoreStart + 1600);
    expect(restoreSlice).toMatch(/item\.type === ['"]directions['"][\s\S]*?__alloLazyDirectionsResult/);
    const core = host.match(/const CORE_BOOT_MODULES = \[([^\]]+)\]/)?.[1] || '';
    expect(core).not.toContain('DirectionsResult');
    expect(host).toContain('Directions could not load');
    expect(host).toContain('Retry loading directions');
    expect(host).toContain('Back to your resources');
  });

  it('is build-managed and keeps generated deploy mirrors byte-identical', () => {
    expect(build).toContain("name: 'DirectionsResult'");
    expect(build).toContain("filename: 'view_directions_result_module.js'");
    expect(build).toContain('buildDirectionsResultModule(src)');
    expect(builder).toContain("SOURCE = path.join(ROOT, 'view_directions_result_source.jsx')");
    expect(builder).toContain("OUTPUT = path.join(ROOT, 'view_directions_result_module.js')");
    expect(builder).toContain('window.AlloModules.DirectionsResult = { DirectionsResultView: DirectionsResultView }');
    expect(read('desktop/web-app/public/view_directions_result_module.js')).toBe(moduleCode);
  });
});
