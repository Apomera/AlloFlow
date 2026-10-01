import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Free Build had no goals: the checker for build targets existed, but only guided
// lessons used it. The challenge deck gives the sandbox build-to-spec tasks that
// tie building to volume, area and surface area, checked from the student's own
// selected blocks. Every number in the feedback is computed from those blocks.
const BUILDER = readFileSync('stem_lab/stem_tool_geometryworld_builder.js', 'utf8');
let cfg, pure;
beforeAll(() => {
  const lab = resetStemLab();
  lab.registerTool('geometryWorld', { aliases: [], render(ctx) {
    return ctx.React.createElement('main', { id: 'geoworld-fs-workspace', className: 'gw-core' },
      ctx.React.createElement('div', { id: 'geoworld-fs-wrap', role: 'application', tabIndex: 0 }, '3D world'));
  } });
  new Function(BUILDER)();
  cfg = lab._registry.geometryWorld;
  pure = window.StemLab.geometryWorldBuilderPure;
});
afterEach(() => { delete window.__geoWorldEngine; });

function box(w, d, h, at = { x: 0, y: 1, z: 0 }) {
  const out = [];
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) for (let y = 0; y < h; y++) out.push({ x: at.x + x, y: at.y + y, z: at.z + z, type: 'wood', shape: 'cube', rotation: 0 });
  return out;
}
const piece = (x, y, z, shape = 'cube') => ({ x, y, z, type: 'stone', shape, rotation: 0 });
const stairs = () => [0, 1, 2, 3].flatMap((x) => Array.from({ length: x + 1 }, (_, y) => piece(x, 1 + y, 0)));

// One worked solution per challenge, built the way a student would.
const SOLUTIONS = {
  prism12: box(3, 2, 2),
  tower6: box(1, 1, 6),
  floor16: box(4, 4, 1),
  flat24: box(4, 3, 2),
  cube27: box(3, 3, 3),
  layers36: box(4, 3, 3),
  half45: [...box(2, 2, 1), piece(0, 2, 0, 'halfB')],
  twobox20: [...box(4, 2, 2), ...box(1, 2, 2, { x: 0, y: 1, z: 2 })],
  stairs10: stairs(),
  wrap24: box(2, 3, 4),
  double123: box(2, 4, 6),
  wrap22: box(1, 2, 3),
};

describe('build challenge deck', () => {
  it('every challenge has a worked solution that the checker accepts', () => {
    expect(pure.BUILD_CHALLENGES.map((c) => c.id).sort()).toEqual(Object.keys(SOLUTIONS).sort());
    pure.BUILD_CHALLENGES.forEach((challenge) => {
      const result = pure.evaluateBuildChallenge(challenge, SOLUTIONS[challenge.id]);
      expect(result.status, challenge.id + ': ' + result.message).toBe('met');
      expect(result.checks.length).toBeGreaterThan(0);
    });
  });

  it('computes surface area from exposed faces, and only for full cubes', () => {
    const area = (blocks) => pure.buildChallengeFacts(blocks).surfaceArea;
    expect(area(box(1, 1, 1))).toBe(6);
    expect(area(box(2, 3, 4))).toBe(52);
    expect(area(box(2, 2, 6))).toBe(56);
    expect(area(box(1, 1, 24))).toBe(98);
    expect(area(box(1, 2, 3))).toBe(22);
    expect(area(box(1, 1, 5))).toBe(22);
    expect(area(stairs())).toBe(36);
    expect(area(SOLUTIONS.half45)).toBeNull();
    expect(pure.buildChallengeFacts(box(3, 2, 2)).box).toBe(true);
    expect(pure.buildChallengeFacts(stairs()).box).toBe(false);
  });

  it('says what is missing, using the numbers the student built', () => {
    const wrap24 = pure.BUILD_CHALLENGES.find((c) => c.id === 'wrap24');
    const tall = pure.evaluateBuildChallenge(wrap24, box(2, 2, 6));
    expect(tall.status).toBe('revise');
    expect(tall.checks.find((c) => !c.ok)).toMatchObject({ label: 'Surface area 52 square units or less', detail: 'you built 56' });
    const flat24 = pure.BUILD_CHALLENGES.find((c) => c.id === 'flat24');
    const gap = box(4, 3, 2).filter((b) => !(b.x === 1 && b.z === 1 && b.y === 2));
    const holed = pure.evaluateBuildChallenge(flat24, gap);
    expect(holed.checks.find((c) => c.label === 'One rectangular prism')).toMatchObject({ ok: false });
    expect(holed.checks.find((c) => c.label === 'Volume 24 cubic units')).toMatchObject({ ok: false, detail: 'you built 23' });
    const half = pure.evaluateBuildChallenge(pure.BUILD_CHALLENGES.find((c) => c.id === 'half45'), box(2, 2, 1));
    expect(half.checks.find((c) => c.label === 'Volume 4½ cubic units')).toMatchObject({ ok: false, detail: 'you built 4' });
    // A single box is not "two boxes joined", even at the right volume.
    const single = pure.evaluateBuildChallenge(pure.BUILD_CHALLENGES.find((c) => c.id === 'twobox20'), box(5, 2, 2));
    expect(single.checks.find((c) => c.label === 'Not a single box')).toMatchObject({ ok: false, detail: 'this is one 5 × 2 × 2 box' });
  });

  it('keeps student copy free of em and en dashes', () => {
    pure.BUILD_CHALLENGES.forEach((c) => expect(c.title + c.prompt + c.hint).not.toMatch(/[–—]/));
  });
});

describe('build challenge card in the Free Build dock', () => {
  function engineWith(blocks) {
    const en = { blocks: {}, _currentLesson: { sandbox: true, ground: {} }, _undoStack: [], _redoStack: [], events: [],
      loadLesson() {}, placeBlock() {}, logEvent(type) { en.events.push(type); } };
    blocks.forEach((b) => { en.blocks[[b.x, b.y, b.z].join(',')] = { userData: { blockType: b.type, shape: b.shape, rotation: 0, volume: 1, gridPos: { x: b.x, y: b.y, z: b.z }, _measurementLayer: 'student' } }; });
    en.measureStructure = (_x, _y, _z, retained) => ({ blocks: (retained || []).slice(), count: (retained || []).length, L: 3, W: 2, H: 2, isComplete: true });
    en._builderSelection = { blocks: blocks.map(({ x, y, z }) => ({ x, y, z })), exact: true };
    return en;
  }
  function mount(initial) {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const calls = { xp: [], toasts: [] };
    let latest = initial;
    function Host() {
      const [gw, setGw] = React.useState(initial);
      latest = gw;
      const ctx = makeCtx({ toolData: { geometryWorld: gw },
        updateMulti(_tool, patch) { setGw((previous) => ({ ...previous, ...patch })); },
        awardXP(tool, amount, reason) { calls.xp.push([tool, amount, reason]); },
        addToast(message) { calls.toasts.push(message); } });
      return cfg.render(ctx);
    }
    act(() => root.render(React.createElement(Host)));
    return { host, calls, state: () => latest, unmount() { act(() => root.unmount()); host.remove(); } };
  }
  const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));

  it('checks the selected build, celebrates once, and moves on', () => {
    window.__geoWorldEngine = engineWith(SOLUTIONS.prism12);
    const view = mount({ activeLesson: 'builderSandbox', worldActive: true, selectedBlock: 0, selectedShape: 0 });
    try {
      const card = view.host.querySelector('.gwe-challenge');
      expect(card).toBeTruthy();
      expect(card.textContent).toContain('Twelve-cube prism');
      expect(card.textContent).toContain('0 of 12 solved');
      click(view.host.querySelector('[data-gwe-challenge-check]'));
      expect(view.host.querySelector('.gwe-challenge-result').getAttribute('data-status')).toBe('met');
      expect(view.host.querySelector('.gwe-challenge').textContent).toContain('1 of 12 solved');
      expect(view.state().builderChallengesDone).toEqual({ prism12: true });
      expect(view.calls.xp).toEqual([['geometryWorld', 10, 'Build challenge: Twelve-cube prism']]);
      expect(window.__geoWorldEngine.events).toContain('build_challenge_met');
      // Checking a solved challenge again does not pay out twice.
      click(view.host.querySelector('[data-gwe-challenge-check]'));
      expect(view.calls.xp).toHaveLength(1);
      click([...view.host.querySelectorAll('.gwe-challenge button')].find((b) => b.textContent === 'Next challenge'));
      expect(view.host.querySelector('.gwe-challenge h3').textContent).toBe('Six-high tower');
      expect(view.host.querySelector('.gwe-challenge-result')).toBeNull();
    } finally { view.unmount(); }
  });

  it('explains a near miss without awarding anything', () => {
    window.__geoWorldEngine = engineWith(box(3, 2, 1));
    const view = mount({ activeLesson: 'builderSandbox', worldActive: true, selectedBlock: 0, selectedShape: 0 });
    try {
      click(view.host.querySelector('[data-gwe-challenge-check]'));
      const result = view.host.querySelector('.gwe-challenge-result');
      expect(result.getAttribute('data-status')).toBe('revise');
      expect(result.textContent).toContain('Volume 12 cubic units: you built 6');
      expect(view.calls.xp).toEqual([]);
      expect(view.state().builderChallengesDone).toBeUndefined();
    } finally { view.unmount(); }
  });

  it('can be found in the Tool Finder', () => {
    expect(pure.findWorkshopTools('challenge', false)[0]).toMatchObject({ id: 'challenge', available: true });
  });

  it('Learn marks finished lessons and opens on the next unfinished one', () => {
    const lesson = (id, title) => ({ id, title, description: title + ' world', objectives: [], ground: { xMin: 0, xMax: 4, zMin: 0, zMax: 4, y: 0 }, structures: [], activities: [], npcs: [] });
    const en = engineWith([]);
    en.geometryHomeLessons = [lesson('volumeExplorer', 'Volume Explorer'), lesson('areaSurface', 'Area and Surface'), lesson('geometryGarden', 'Geometry Garden')];
    en.startHomeLesson = () => true;
    window.__geoWorldEngine = en;
    window.StemLab.geometryWorldLessonProgress = { completed: (key) => key === 'volumeExplorer' };
    const view = mount({ activeLesson: 'volumeExplorer', worldActive: true, showGeometryHome: true, geometryHomePage: 'learn' });
    try {
      const options = [...view.host.querySelectorAll('#gwe-home-lesson option')].map((o) => o.textContent);
      expect(options).toEqual(['✓ Volume Explorer', 'Area and Surface']);
      expect(view.host.querySelector('#gwe-home-lesson').value).toBe('areaSurface');
      expect(view.host.querySelector('[data-gwe-lessons-done]').textContent).toBe('1 of 2 guided lessons complete');
      expect(view.host.querySelector('[data-gwe-lesson-done]')).toBeNull();
    } finally { view.unmount(); delete window.StemLab.geometryWorldLessonProgress; }
    // Without the engine's progress record nothing is claimed.
    const plain = mount({ activeLesson: 'volumeExplorer', worldActive: true, showGeometryHome: true, geometryHomePage: 'learn' });
    try {
      expect(plain.host.querySelector('[data-gwe-lessons-done]')).toBeNull();
      expect(plain.host.querySelector('#gwe-home-lesson').value).toBe('volumeExplorer');
    } finally { plain.unmount(); }
  });
});
