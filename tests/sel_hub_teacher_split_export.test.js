// SEL Hub: teacher/student split and a working Save / Export (2026-10-16).
//
// - The hub had no notion of who was using it: students saw the Station Builder, the teacher
//   launch plans, the teacher notes on stations, and the delete / adapt controls.
//   Authoring is now teacher-only. A host that predates the prop passes nothing, and
//   undefined keeps the old (teacher) view so existing links are not broken.
// - "Save now" and every tool's Export asked the host for a project save, but the host never
//   listened, so nothing was saved. The host now opens its project Save dialog (above the hub)
//   and announces a finished save with `alloflow-project-saved`, which the hub already hears.
// SEL_HUB_MODULE_PATH / SEL_EXPORT_ANTI point the suite at mutated copies.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 30000 }); // full hub renders are heavy under a loaded machine
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
const HUB = process.env.SEL_HUB_MODULE_PATH ? resolve(process.env.SEL_HUB_MODULE_PATH) : resolve(SEL, 'sel_hub_module.js');
const ANTI = readFileSync(resolve(ROOT, process.env.SEL_EXPORT_ANTI || 'AlloFlowANTI.txt'), 'utf8');
const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
const React = req('react');
const RDC = req('react-dom/client');
const { act } = req('react-dom/test-utils');
const nodeRequire = createRequire(import.meta.url);
const load = (f) => new Function('require', readFileSync(f, 'utf8'))(nodeRequire);

const STATION = { id: 'st1', name: 'Calm Corner', tools: ['breathing'], quests: [], teacherNote: 'Model the pass option first.' };

beforeAll(() => {
  const noop = () => {};
  globalThis.React = window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = window.AlloModules || {};
  window.callGemini = null;
  if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  globalThis.Audio = function () { return { play: () => Promise.resolve() }; };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  if (typeof window.Element.prototype.scrollIntoView !== 'function') window.Element.prototype.scrollIntoView = noop;
  load(HUB);
  for (const f of ['sel_safety_layer.js', 'sel_standards_alignment.js']) if (existsSync(join(SEL, f))) { try { load(join(SEL, f)); } catch { /* optional */ } }
  window.__alloEnsureSelPluginLoaded = () => true;
  window.__alloGetSelPluginState = () => null;
  window.__alloflowSelSnapshots = []; window.__alloflowStudentArtifacts = [];
});

let mounted = null;
afterEach(() => {
  if (mounted) mounted.unmount();
  mounted = null;
  sessionStorage.clear(); localStorage.clear();
  document.body.querySelectorAll('[data-test-outside]').forEach((n) => n.remove());
});

function mountHub(extra = {}, { stations = [STATION] } = {}) {
  sessionStorage.setItem('alloflow_sel_seen_ephemeral_explainer', '1');
  localStorage.setItem('alloflow_sel_stations', JSON.stringify(stations));
  window.__alloflowSelStations = stations.slice(); // the hub falls back to this slot when storage is empty
  const Icon = () => null;
  const setShowSelHub = vi.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = RDC.createRoot(container);
  act(() => {
    root.render(React.createElement(window.AlloModules.SelHub, Object.assign({
      showSelHub: true, setShowSelHub, selHubTab: 'explore', setSelHubTab: () => {},
      selHubTool: null, setSelHubTool: () => {}, addToast: () => {}, gradeLevel: '7th Grade',
      callGemini: null, onSafetyFlag: () => {}, studentCodename: 'test', t: (k) => k,
      ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon,
    }, extra)));
  });
  mounted = { container, setShowSelHub, unmount: () => { act(() => root.unmount()); container.remove(); } };
  return mounted;
}
const flush = (ms = 60) => act(() => new Promise((r) => setTimeout(r, ms)));
const has = (root, selector) => !!root.querySelector(selector);
const teacherControls = (root) => ({
  builder: has(root, '[aria-label="Build a new custom SEL Station"]'),
  launch: has(root, 'details[aria-label="Teacher launch routines"]'),
  remove: has(root, '[aria-label="Delete station Calm Corner"]'),
  adapt: has(root, '[aria-label="Adapt a copy of station Calm Corner"]'),
  note: root.textContent.includes('Model the pass option first.'),
});
const ALL = { builder: true, launch: true, remove: true, adapt: true, note: true };
const NONE = { builder: false, launch: false, remove: false, adapt: false, note: false };

describe('who sees the authoring controls', () => {
  it('a teacher sees the Station Builder, launch plans and station editing', async () => {
    const h = mountHub({ isTeacherMode: true });
    await flush();
    expect(teacherControls(h.container)).toEqual(ALL);
  });

  it('an older host that passes no role keeps the teacher view', async () => {
    const h = mountHub({});
    await flush();
    expect(teacherControls(h.container)).toEqual(ALL);
  });

  it('a student sees none of them, but can still start the station', async () => {
    const h = mountHub({ isTeacherMode: false });
    await flush();
    expect(teacherControls(h.container), 'a teacher control is still in front of students').toEqual(NONE);
    expect(has(h.container, '[data-sel-station-activate="st1"]'), 'students lost Start station').toBe(true);
  });

  it.each([
    ['an independent learner', { isTeacherMode: true, isIndependentMode: true }],
    ['a family', { isTeacherMode: true, isParentMode: true }],
  ])('%s does not get classroom authoring', async (_label, props) => {
    const h = mountHub(props);
    await flush();
    expect(teacherControls(h.container)).toEqual(NONE);
  });

  it('a student with no stations does not get an empty teacher stations panel', async () => {
    const h = mountHub({ isTeacherMode: false }, { stations: [] });
    await flush();
    expect(h.container.textContent).not.toContain('Custom SEL Stations');
  });
});

describe('Save / Export', () => {
  it('"Save now" asks the host for a project save', async () => {
    const onExportRequested = vi.fn(() => true);
    const h = mountHub({ isTeacherMode: false, onExportRequested });
    await flush();
    act(() => { h.container.querySelector('[aria-label="Save or export SEL work now"]').click(); });
    expect(onExportRequested).toHaveBeenCalledTimes(1);
  });

  it('a finished host save is acknowledged in the hub', async () => {
    const h = mountHub({ isTeacherMode: true, onExportRequested: () => true });
    await flush();
    act(() => { window.dispatchEvent(new CustomEvent('alloflow-project-saved')); });
    await flush();
    expect(h.container.textContent).toContain('The host reported a completed project save.');
  });

  it("Escape in the host's Save dialog over the hub does not close the hub", async () => {
    const h = mountHub({ isTeacherMode: false });
    await flush();
    const dialog = document.createElement('div');
    dialog.setAttribute('data-test-outside', '');
    const input = document.createElement('input');
    dialog.appendChild(input);
    document.body.appendChild(dialog);
    input.focus();
    act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
    expect(h.setShowSelHub, 'Escape meant for the Save dialog closed the hub').not.toHaveBeenCalled();
  });
});

describe('the host side', () => {
  const OPENERS = sliceBetween(ANTI, '  const initiateSaveTeacherProject = ', '  const handleLoadProject = (e) => {', { file: 'AlloFlowANTI.txt' });
  function host({ isTeacherMode, history = [] }) {
    const calls = { type: [], open: 0 };
    const env = {
      history, isTeacherMode, studentNickname: 'River Fox', t: (k) => k,
      setSaveType: (v) => calls.type.push(v), setSaveEncryptPassword: () => {}, setSaveFileName: () => {}, setShowSaveModal: (v) => { if (v) calls.open++; },
    };
    const scope = new Proxy(env, { has: () => true, get: (target, name) => (name === Symbol.unscopables ? undefined : name in target ? target[name] : globalThis[name]) });
    // eslint-disable-next-line no-new-func
    const api = new Function('scope', 'with (scope) {\n' + OPENERS + '\nreturn { initiateSaveTeacherProject, initiateSaveStudentProject, handleSelExportRequested };\n}')(scope);
    return { api, calls };
  }

  it('SEL Export opens the teacher save for teachers and the student save for students, even with no resources', () => {
    const teacher = host({ isTeacherMode: true });
    expect(teacher.api.handleSelExportRequested()).toBe(true);
    expect(teacher.calls).toEqual({ type: ['teacher'], open: 1 });
    const student = host({ isTeacherMode: false });
    expect(student.api.handleSelExportRequested()).toBe(true);
    expect(student.calls).toEqual({ type: ['student'], open: 1 });
  });

  it('the ordinary Save buttons still do nothing on an empty project (a click event is not an opt-in)', () => {
    const h = host({ isTeacherMode: true });
    h.api.initiateSaveTeacherProject();
    h.api.initiateSaveTeacherProject({ type: 'click', allowEmpty: 'yes' });
    h.api.initiateSaveStudentProject({ nativeEvent: {} });
    expect(h.calls.open).toBe(0);
  });

  it('the SEL Hub mount passes the role and the export handler', () => {
    const mount = sliceBetween(ANTI, '<CDNModuleGate moduleKey="SelHub"', '</CDNModuleGate>', { file: 'AlloFlowANTI.txt' });
    expect(mount).toContain('isTeacherMode, isIndependentMode, isParentMode,');
    expect(mount).toContain('onExportRequested: handleSelExportRequested,');
  });

  it('the Save dialog sits above the hub while the hub is open', () => {
    const backdrop = ANTI.split('\n').find((line) => line.includes('data-save-project-backdrop'));
    const lifted = Number((backdrop.match(/showSelHub \? \{ zIndex: (\d+) \}/) || [])[1]);
    const hubSource = readFileSync(HUB, 'utf8');
    const hubZ = Number((sliceBetween(hubSource, "'aria-label': 'SEL Hub',", 'overflow: \'hidden\'', { file: 'sel_hub_module.js' }).match(/zIndex: (\d+)/) || [])[1]);
    expect(hubZ).toBeGreaterThan(0);
    expect(lifted, 'the Save dialog opens hidden behind the SEL Hub').toBeGreaterThan(hubZ);
  });

  it('a completed project save is announced to the hub, and a failed one is not', () => {
    const wrapper = sliceBetween(ANTI, '  const executeSaveFile = async (interactionOptions) => {', '  const _studentSavePrivateFilenameTokens', { file: 'AlloFlowANTI.txt' });
    expect(wrapper).toContain("if (result && result.ok === true) { try { window.dispatchEvent(new CustomEvent('alloflow-project-saved')); } catch (_) {} }");
    expect(wrapper.indexOf("new CustomEvent('alloflow-project-saved')")).toBeLessThan(wrapper.indexOf('return result;'));
  });
});
