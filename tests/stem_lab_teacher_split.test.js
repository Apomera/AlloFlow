// STEM Lab: teacher-only builders and setup (2026-10-16, same fix as SEL Hub).
//
// The 09-28 audit found students shown the Station Builder, the Math Studio door (problem
// sets and assessments), the "AI extras: off" pill that opens AI backend / API key setup, and
// the Tool Forge tile (a teacher workspace that only shows a "switch on Teacher Mode" notice).
// Students now get the labs, the station picker and the active station. Independent learners
// and families keep Math Studio, AI setup and Forge (it is their own device and practice), but
// not classroom station authoring. STEM Lab already treats a missing isTeacherMode as student.
// ALLO_STEM_HUB_CANDIDATE / STEM_SPLIT_ANTI point the suite at mutated copies.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 30000 }); // full STEM Lab renders are heavy under a loaded machine
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const HUB = process.env.ALLO_STEM_HUB_CANDIDATE || 'stem_lab/stem_lab_module.js';
const ANTI = readFileSync(resolve(process.cwd(), process.env.STEM_SPLIT_ANTI || 'AlloFlowANTI.txt'), 'utf8');

const Icon = () => null;
const STATION = { id: 'st-split', name: 'Fractions Station', grade: '', tools: ['earlyTool'], quests: [] };
let root, host, api;

function Harness({ role }) {
  const [currentRole, setRole] = React.useState(role);
  const [stemLabTool, setStemLabTool] = React.useState(null);
  const [stemLabTab, setStemLabTab] = React.useState('explore');
  const [labToolData, setLabToolData] = React.useState({});
  api = { setRole };
  const base = Object.assign({
    labToolData, setLabToolData, toolSnapshots: [],
    addToast: () => {}, t: (k, fb) => (typeof fb === 'string' ? fb : undefined),
    stemLabTool, setStemLabTool, stemLabTab, setStemLabTab, setShowStemLab: () => {}, showStemLab: true,
    activeStation: null, callGemini: null, callTTS: null,
  }, currentRole);
  const props = new Proxy(base, {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === 'string' && /^[A-Z]/.test(key)) return Icon;
      if (typeof key === 'string' && /^(set|handle|on)[A-Z]/.test(key)) return () => {};
      return undefined;
    },
  });
  return window.AlloModules.StemLab(props);
}
async function render(role) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(React.createElement(Harness, { role })));
}
const buttonText = () => [...host.querySelectorAll('button')].map((b) => b.textContent);
const controls = () => ({
  mathStudio: !!host.querySelector('[aria-label="Create moved: open Math Studio"]'),
  aiSetup: !!host.querySelector('[aria-label^="AI extras are off"]'),
  createStation: !!host.querySelector('[aria-label="Toggle station builder"]'),
  forge: buttonText().some((text) => text.includes('Tool Forge')),
});

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = {};
  window.__alloT = (k, fb) => fb || k;
  new Function(readFileSync(HUB, 'utf8'))();
  const tile = (id, label) => window.StemLab.registerTool(id, { label, icon: 'x', desc: label + ' tool', category: 'math', render: () => React.createElement('div', { 'data-tool-body': id }, label + ' body') });
  tile('earlyTool', 'Early Tool');
  tile('forge', 'Tool Forge');
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear(); });

describe('STEM Lab teacher-only controls', () => {
  it('a teacher sees Math Studio, AI setup, Create Station and Tool Forge', async () => {
    await render({ isTeacherMode: true });
    expect(controls()).toEqual({ mathStudio: true, aiSetup: true, createStation: true, forge: true });
  });

  it('a student sees none of them, and still gets the labs and the station picker', async () => {
    localStorage.setItem('alloflow_stem_stations', JSON.stringify([STATION]));
    await render({ isTeacherMode: false });
    expect(controls(), 'a teacher control is still in front of students').toEqual({ mathStudio: false, aiSetup: false, createStation: false, forge: false });
    expect(buttonText().some((text) => text.includes('Number Line')), 'students lost the labs').toBe(true);
    expect(host.querySelector('[aria-label="Load a saved station"]'), 'students lost the station picker').not.toBeNull();
  });

  it('a host that passes no role is treated as a student, as before', async () => {
    await render({});
    expect(controls()).toEqual({ mathStudio: false, aiSetup: false, createStation: false, forge: false });
  });

  it.each([
    ['an independent learner', { isTeacherMode: true, isIndependentMode: true }],
    ['a family', { isTeacherMode: true, isParentMode: true }],
  ])('%s keeps Math Studio, AI setup and Forge but not classroom stations', async (_label, role) => {
    await render(role);
    expect(controls()).toEqual({ mathStudio: true, aiSetup: true, createStation: false, forge: true });
  });

  it('an open Station Builder closes when the view stops being a teacher view', async () => {
    await render({ isTeacherMode: true });
    await act(async () => { host.querySelector('[aria-label="Toggle station builder"]').click(); });
    const builderOpen = () => [...host.querySelectorAll('h3')].some((h) => h.textContent.includes('Station Builder'));
    expect(builderOpen()).toBe(true);
    await act(async () => api.setRole({ isTeacherMode: false }));
    expect(builderOpen(), 'the builder stayed open for a student').toBe(false);
  });
});

describe('the host passes the role', () => {
  it('the STEM Lab mount passes teacher, independent and family modes', () => {
    const mount = sliceBetween(ANTI, '<CDNModuleGate moduleKey="StemLab"', '</CDNModuleGate>', { file: 'AlloFlowANTI.txt' });
    expect(mount).toContain('activeSessionCode, studentNickname, isTeacherMode, isIndependentMode, isParentMode');
  });
});
