import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMClient, loadTool, makeCtx, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

// Stage C features mounted and driven through their real controls: the four
// claim-evidence-reasoning investigations, the "keep it frozen" cooler
// challenge, the convection driver (and the 3D scene's frame hook), the
// surface and vacuum-flask radiation panels, and the heating / cooling curve
// over time with its bubbles callout and the guarded Water Cycle link.
const FILE = 'stem_lab/stem_tool_heatlab.js';
let cfg, host, root, previousAct, reduceMotion, viewerCfg, syncs;

beforeEach(() => {
  previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  reduceMotion = false;
  resetStemLab();
  // Capture the 3D viewer config and every sync, like the host shell would see them.
  syncs = [];
  viewerCfg = null;
  window.StemLab.makeBayViewer = (c) => {
    viewerCfg = c;
    return { attach() {}, sync(p) { syncs.push(p); }, nudge() {}, zoom() {}, reset() {}, status() { return 'idle'; } };
  };
  const contexts = new WeakMap();
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (kind) {
    if (kind !== '2d') return null;
    if (!contexts.has(this)) contexts.set(this, new Proxy({
      canvas: this,
      measureText: (text) => ({ width: String(text).length * 7 }),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    }, { get: (target, key) => (key in target ? target[key] : () => {}) }));
    return contexts.get(this);
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
  window.matchMedia = (q) => ({
    matches: reduceMotion && /reduce/.test(q), media: q,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  });
  cfg = loadTool(FILE, 'heatLab');
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  if (root) React.act(() => root.unmount());
  root = null;
  host?.remove();
  delete window.__alloEnsureStemPluginLoaded;
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  vi.restoreAllMocks();
});

function mount(initial, overrides) {
  const box = { data: null, xp: [], announced: [], tool: [] };
  function Panel() {
    const [toolData, setToolData] = React.useState(initial || {});
    box.data = toolData;
    return cfg.render(makeCtx(Object.assign({
      toolData, setToolData,
      awardXP: (id, pts, why) => box.xp.push([id, pts, why]),
      announceToSR: (msg) => box.announced.push(msg),
      setStemLabTool: (id) => box.tool.push(id),
    }, overrides || {})));
  }
  React.act(() => {
    root = ReactDOMClient.createRoot(host);
    root.render(React.createElement(Panel));
  });
  box.d = () => (box.data && box.data._heatLab) || {};
  return box;
}
const click = (node) => React.act(() => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const buttons = (scope) => [...(scope || host).querySelectorAll('button')];
const byText = (scope, re) => buttons(scope).find((b) => re.test(b.textContent));
const sec = (id) => host.querySelector('#htsec-' + id);
const hook = (id) => cfg.questHooks.find((q) => q.id === id);
function setValue(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
  React.act(() => { set.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
const recordIn = (id) => buttons(sec(id)).filter((b) => /^Record this .* trial in your lab notebook$/.test(b.getAttribute('aria-label') || ''));

describe('sections and index', () => {
  it('adds the investigations (17) and the cooler challenge (18) to the topic index', () => {
    mount({});
    expect(sec('investigate').querySelector('h4').textContent).toMatch(/^🔬 17\. Investigations/);
    expect(sec('cooler').querySelector('h4').textContent).toMatch(/^❄️ 18\. Design challenge/);
    // 19 since stage D added the passive house designer.
    expect(buttons().filter((b) => /^Jump to /.test(b.getAttribute('aria-label') || ''))).toHaveLength(19);
  });
});

describe('claim-evidence-reasoning investigations', () => {
  const LOG = [
    { kind: 'mixing', at: 1000, sub1: 'water', m1_kg: 0.5, sub2: 'iron', m2_kg: 0.5, Tf_C: 26.78, dT1_K: 6.78 },
    { kind: 'mixing', at: 2000, sub1: 'water', m1_kg: 0.5, sub2: 'iron', m2_kg: 1, Tf_C: 32.4, dT1_K: 12.4 },
    { kind: 'mixing', at: 3000, sub1: 'water', m1_kg: 0.5, sub2: 'copper', m2_kg: 2, Tf_C: 38.1, dT1_K: 18.1 },
    { kind: 'mug', at: 4000, material: 'wood', thickness_mm: 10, T60_C: 60.6 },
  ];

  it('walks question, plan, evidence, argument and self-check, then awards XP once', () => {
    const box = mount({ _heatLab: { log: LOG } });
    const s = sec('investigate');
    const panel = s.querySelector('[data-ht-cer="massmaterial"]');
    expect(panel.textContent).toContain('Change (independent variable)');
    expect(panel.textContent).toContain('0.5 kg of water at 20 °C');
    // only mixing rows are offered as evidence
    expect(s.querySelectorAll('[data-ht-cer-row]')).toHaveLength(3);
    const done = byText(s, /Mark this investigation complete/);
    expect(done.disabled).toBe(true);

    // the plan sets the section up
    click(byText(s, /Set up Mix two things/));
    expect(box.d().sub2).toBe('iron');
    expect(box.d().m2).toBe(0.5);

    // pick two rows differing only in the iron's mass: a fair comparison
    click(s.querySelector('[data-ht-cer-row="0"] input'));
    click(s.querySelector('[data-ht-cer-row="1"] input'));
    expect(box.d().cer.massmaterial.picks.map((p) => p.at)).toEqual([1000, 2000]);
    expect(box.d().cer.massmaterial.picks[0].text).toContain('Tf_C 26.78');
    const auto = () => Object.fromEntries([...s.querySelectorAll('[data-ht-cer-auto] li')].map((li, i) => [i, li.getAttribute('data-ok')]));
    expect(auto()[0]).toBe('true');
    expect(auto()[1]).toBe('true');

    // the sentence starter can be copied in; then the learner writes
    click(byText(s, /Use the starter/));
    expect(box.d().cer.massmaterial.claim).toMatch(/^Changing the ___/);
    setValue(s.querySelector('#ht-cer-claim'), 'Changing the material changed Tf more than doubling the mass.');
    setValue(s.querySelector('#ht-cer-evidence'), 'Doubling the iron from 0.5 to 1 kg moved Tf from 26.8 to 32.4 °C.');
    setValue(s.querySelector('#ht-cer-reasoning'), 'The heat it can give depends on the heat capacity m × c, so the bigger change in mc wins.');
    expect(auto()[2]).toBe('true');
    expect(auto()[3]).toBe('true');
    expect(done.disabled).toBe(true);   // self-check not ticked yet
    const rubric = [...s.querySelectorAll('fieldset input[type="checkbox"]')].filter((i) => !i.closest('[data-ht-cer-row]'));
    expect(rubric).toHaveLength(5);
    rubric.forEach((c) => click(c));
    const ready = byText(s, /Mark this investigation complete/);
    expect(ready.disabled).toBe(false);
    click(ready);
    expect(box.d().cer.massmaterial.completed).toBe(true);
    expect(box.xp).toEqual([['heatlab_cer_massmaterial', 15, expect.any(String)]]);
    expect(hook('heat_cer').check(box.d())).toBe(true);
    // pressing again never pays twice; the writing persists in toolData
    click(byText(s, /Completed/));
    expect(box.xp).toHaveLength(1);
    expect(box.d().cer.massmaterial.reasoning).toContain('heat capacity');
    expect(JSON.parse(JSON.stringify(box.d().cer))).toEqual(box.d().cer);
  });

  it('needs rows from both experiments for “cold to hot”, and shows the AI coach only when the host offers it', () => {
    mount({ _heatLab: { cerOpen: 'coldtohot', log: [{ kind: 'equilibrium', at: 1, t_s: 10, q12_J: 5 }, { kind: 'equilibrium', at: 2, t_s: 20, q12_J: 9 }] } });
    let s = sec('investigate');
    click(s.querySelector('[data-ht-cer-row="0"] input'));
    click(s.querySelector('[data-ht-cer-row="1"] input'));
    expect(s.querySelector('[data-ht-cer-auto] li').getAttribute('data-ok')).toBe('false');
    expect(s.textContent).toContain('including both experiments');
    expect(byText(s, /AI coach/)).toBeUndefined();
    React.act(() => root.unmount());
    root = null;
    const getHint = vi.fn((tool, q, ans, idea, n, show) => show('💡 Try naming the second law.'));
    mount({ _heatLab: { cerOpen: 'coldtohot' } }, { getHint, aiHintsEnabled: true });
    s = sec('investigate');
    click(byText(s, /AI coach/));
    expect(getHint).toHaveBeenCalledTimes(1);
    expect(getHint.mock.calls[0][0]).toBe('heatLab-cer-coldtohot');
    expect(getHint.mock.calls[0][3]).toMatch(/entropy/);
    expect(s.textContent).toContain('Try naming the second law');
  });
});

describe('“Keep it frozen” cooler challenge', () => {
  it('tests, logs, iterates and awards the badge only for a design the learner built', () => {
    const box = mount({});
    const s = sec('cooler');
    click(s.querySelector('[data-ht-cooler-test]'));
    expect(s.querySelector('[data-ht-cooler-result]').getAttribute('data-ht-cooler-result')).toBe('fail');
    expect(box.xp).toEqual([]);
    const row = box.d().log[box.d().log.length - 1];
    expect(row.kind).toBe('cooler');
    expect(row.melt_h).toBeCloseTo(cfg.models.coolerModel({}).meltH, 10);
    expect(row.meetsBrief).toBe(false);
    // what limits it, and the upgrades, come from the model
    expect(s.querySelectorAll('[data-ht-cooler-limits] ul')[0].children.length).toBe(3);   // no liner layer
    click(byText(s, /^Polystyrene foam/));
    expect(box.d().clMm).toBe(10);
    expect(s.textContent).toContain('changed the design since this test');
    setValue(s.querySelector('#heat-cl-mm'), 25);
    click(byText(s, /^Foam strip/));
    click(s.querySelector('[data-ht-cooler-test]'));
    const m = cfg.models.coolerModel({ liner: 'eps', mm: 25, seal: 'foam' });
    expect(m.meets).toBe(true);
    expect(s.querySelector('[data-ht-cooler-result]').getAttribute('data-ht-cooler-result')).toBe('pass');
    expect(s.textContent).toContain(m.meltH.toFixed(1).replace(/\.0$/, '') + ' hours');
    expect(box.d().clBadge).toBe(true);
    expect(box.xp).toEqual([['heatlab_cooler', 20, expect.any(String)]]);
    expect(hook('heat_cooler').check(box.d())).toBe(true);
    click(s.querySelector('[data-ht-cooler-test]'));
    expect(box.xp).toHaveLength(1);
    // save up to three for the trade-off chart
    click(byText(s, /Save for comparison/));
    expect(box.d().clSaved).toHaveLength(1);
    expect(s.querySelector('[data-ht-cooler-saved="0"]').textContent).toContain('Design A');
    expect(s.querySelector('[data-ht-cooler-compare] canvas')).toBeTruthy();
    // the justification persists
    setValue(s.querySelector('#ht-cl-why'), 'I would build A: 5.6 h for $6.');
    expect(box.d().clWhy).toContain('5.6 h');
    expect(s.querySelector('details[data-ht-cooler-model] summary').textContent).toContain('How we model it');
  });

  it('gives no badge to a passing design the learner did not build', () => {
    const box = mount({ _heatLab: { clLiner: 'eps', clMm: 25, clSeal: 'foam' } });
    click(sec('cooler').querySelector('[data-ht-cooler-test]'));
    expect(box.d().clTest.meets).toBe(true);
    expect(box.d().clBadge).toBeUndefined();
    expect(box.xp).toEqual([]);
  });
});

describe('convection with a real driver', () => {
  it('moves through the regimes with heater power and stays still when heated from above', () => {
    const box = mount({});
    const s = sec('convection3d');
    const status = () => s.querySelector('[data-ht-cv-status]').textContent;
    setValue(s.querySelector('#heat-cv-power'), -3);
    expect(status()).toMatch(/^Conduction only\./);
    setValue(s.querySelector('#heat-cv-power'), 0);
    expect(status()).toMatch(/^Steady rolls\./);
    setValue(s.querySelector('#heat-cv-power'), 1.5);
    expect(status()).toMatch(/^Rising plumes\./);
    let last = syncs[syncs.length - 1];
    expect(last.sceneProps.regime).toBe('plumes');
    expect(last.sceneKey).toBe('plumes|below');
    expect(last.sceneProps.rate).toBeGreaterThan(0);
    click(byText(s, /^Heater on top$/));
    expect(status()).toMatch(/^Stable: conduction only\./);
    last = syncs[syncs.length - 1];
    expect(last.sceneProps).toMatchObject({ regime: 'stable', from: 'above', rate: 0 });
    click(recordIn('convection3d')[0]);
    const row = box.d().log[0];
    expect(row.kind).toBe('convection');
    const model = cfg.models.convection({ fluid: 'water', powerW: Math.pow(10, 1.5), depthM: 0.01, from: 'above' });
    expect(row.dT_K).toBeCloseTo(model.dT, 10);
    expect(row.regime).toBe('stable');
  });

  it('animates the 3D tracers through the content.frame hook, frozen with streamlines under reduced motion', () => {
    expect(typeof viewerCfg.buildScene).toBe('function');
    function Obj() { this.children = []; this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }; this.rotation = {}; this.scale = { setScalar() {} }; this.visible = true; }
    Obj.prototype.add = function (o) { this.children.push(o); };
    Obj.prototype.traverse = function (fn) { fn(this); this.children.forEach((c) => c.traverse(fn)); };
    function Color(c) { this.c = c; }
    Color.prototype.copy = function (o) { this.c = o.c; return this; };
    Color.prototype.lerp = function () { return this; };
    Color.prototype.clone = function () { return new Color(this.c); };
    const THREE = {
      Group: function () { Obj.call(this); },
      Mesh: function (g, m) { Obj.call(this); this.isMesh = true; this.material = m; },
      Line: function (g, m) { Obj.call(this); this.isLine = true; this.material = m; },
      BoxGeometry: function () {}, SphereGeometry: function () {}, ConeGeometry: function () {}, TorusGeometry: function () {},
      BufferGeometry: function () { this.setFromPoints = (p) => { this.pts = p; return this; }; },
      Vector3: function (x, y, z) { Object.assign(this, { x, y, z }); },
      Color,
      MeshPhongMaterial: function (o) { Object.assign(this, o); },
      MeshBasicMaterial: function (o) { Object.assign(this, o); },
      LineBasicMaterial: function (o) { Object.assign(this, o); },
    };
    ['Group', 'Mesh', 'Line'].forEach((k) => { THREE[k].prototype = Object.create(Obj.prototype); });
    const build = (props, reduced) => {
      const scene = new THREE.Group();
      const out = viewerCfg.buildScene(THREE, { scene, contrast: false, dark: true, wantShadow: false, sceneProps: props, reduced });
      const anchor = out.anchor;
      const tracers = anchor.children.find((g) => g.children.length === 48);
      const lines = anchor.children.find((g) => g.children.length && g.children.every((c) => c.isLine));
      const empty = anchor.children.filter((g) => g.children && g.children.length === 0 && !g.isMesh);
      return { out, tracers, lines, empty };
    };
    const pos = (g) => g.children.map((m) => [m.position.x, m.position.y, m.position.z].map((v) => +v.toFixed(6)).join(','));
    // moving regime: positions change between frames
    const a = build({ regime: 'rolls', from: 'below', rate: 1 }, false);
    expect(typeof a.out.frame).toBe('function');
    a.out.frame(1000, { regime: 'rolls', rate: 1 }, false);
    const p0 = pos(a.tracers);
    a.out.frame(1100, { regime: 'rolls', rate: 1 }, false);
    expect(pos(a.tracers)).not.toEqual(p0);
    expect(a.lines.visible).toBe(false);
    // reduced motion: frozen, streamlines drawn
    const p1 = pos(a.tracers);
    a.out.frame(1200, { regime: 'rolls', rate: 1 }, true);
    a.out.frame(1300, { regime: 'rolls', rate: 1 }, true);
    expect(pos(a.tracers)).toEqual(p1);
    expect(a.lines.visible).toBe(true);
    expect(a.lines.children).toHaveLength(8);
    // a still layer never moves and has no streamlines to show
    const b = build({ regime: 'conduction', from: 'below', rate: 0 }, false);
    const q0 = pos(b.tracers);
    b.out.frame(1000, { regime: 'conduction' }, false);
    b.out.frame(1500, { regime: 'conduction' }, false);
    expect(pos(b.tracers)).toEqual(q0);
    expect(b.empty.length).toBeGreaterThan(0);
    // older hosts pass no sceneProps: the scene still builds
    expect(viewerCfg.buildScene(THREE, { scene: new THREE.Group(), contrast: true }).anchor).toBeTruthy();
  });
});

describe('radiation: surfaces, sun and the vacuum flask', () => {
  it('lets the surface set ε for the T⁴ readouts, the formula and the mode-1 canvas', () => {
    const box = mount({ _heatLab: { mode: 'radiation' } });
    const s = sec('radiation');
    expect(s.textContent).toContain('ε = 0.98');
    expect(s.textContent).toContain('879 W');                          // skin default unchanged
    click(byText(s, /^Polished silver/));
    expect(box.d().radSurf).toBe('silver');
    expect(s.textContent).toContain('ε = 0.03');
    const silver = cfg.models.radiation(33, 20, 1.8, 0.03);
    expect(s.textContent).toContain(Math.round(silver.emittedW) + ' W');
    expect(host.querySelector('#htsec-conduction canvas').dataset.radEps).toBe('0.03');
    expect(s.querySelectorAll('[data-ht-sun-row]')).toHaveLength(5);
    const black = cfg.models.surfaceSun('black');
    expect(s.querySelector('[data-ht-sun-row="black"]').textContent).toContain(Math.round(black.eqC) + ' °C');
    click(recordIn('radiation')[0]);
    expect(box.d().log[0]).toMatchObject({ kind: 'radiation', finish: 'silver', emissivity: 0.03 });
  });

  it('builds a flask path by path and logs it', () => {
    const box = mount({});
    const fl = sec('radiation').querySelector('[data-ht-flask]');
    const plain = cfg.models.flaskModel({});
    expect(fl.querySelector('[data-ht-flask-paths]').textContent).toContain(plain.at6hC.toFixed(1));
    ['Vacuum between the walls', 'Silvered walls', 'Stopper'].forEach((label) => click(byText(fl, new RegExp(label))));
    expect(box.d()).toMatchObject({ flVacuum: true, flSilver: true, flStopper: true });
    const full = cfg.models.flaskModel({ vacuum: true, silver: true, stopper: true });
    expect(fl.querySelector('[data-ht-flask-paths]').textContent).toContain('glass neck (conduction)');
    expect(fl.querySelector('[data-ht-flask-paths]').textContent).toContain(full.at6hC.toFixed(1));
    expect(fl.querySelector('[data-ht-flask-ledger]').textContent).toMatch(/difference (0|-?\d\.\de-\d+) J/);
    click(recordIn('radiation')[1]);
    expect(box.d().log[0]).toMatchObject({ kind: 'flask', vacuum: true, silvered: true, stopper: true });
    expect(box.d().log[0].T6h_C).toBeCloseTo(full.at6hC, 10);
  });
});

describe('heating and cooling over time', () => {
  it('builds the stage table from the model for any substance, and cools water with supercooling', () => {
    const box = mount({});
    const s = sec('heatingcurve');
    const panel = s.querySelector('[data-ht-phase-time]');
    click(byText(panel, /^Lead$/));
    click(byText(panel, /Show the numbers/));
    const table = s.querySelector('#ht-table-phase-time');
    expect(table.textContent).toContain('Melt');
    expect(table.textContent).toContain('23 kJ');
    expect(table.textContent).toContain('stays at 327.5 °C');
    click(byText(panel, /^Water$/));
    click(byText(panel, /Cooling curve/));
    expect(s.querySelector('[data-ht-phase-time]').getAttribute('data-ht-phase-time')).toBe('cool');
    setValue(s.querySelector('#heat-hc-super'), 5);
    expect(box.d().hcSuper).toBe(5);
    const c = cfg.models.phaseCooling('water', { supercoolK: 5 });
    expect(s.textContent).toContain((c.frozenAtOnce * 100).toFixed(1) + '% of the water freezes almost at once');
    // the cursor inside the plateau reads the freezing description and counts bonds
    setValue(s.querySelector('#heat-hc-time'), Math.round((c.freezeStartS + c.plateauS / 2) / c.endS * 100));
    expect(s.querySelector('[data-ht-hc-desc]').textContent).toMatch(/^Water freezing at 0 °C/);
    click(recordIn('heatingcurve')[1]);
    expect(box.d().log[0]).toMatchObject({ kind: 'phase-time', substance: 'water', mode: 'cool', supercool_K: 5, phase: 'freezing' });
  });

  it('says bubbles are vapour while boiling, and links to Water Cycle only when the host can load it', () => {
    let box = mount({ _heatLab: { energyIn: 1900 } });
    let call = host.querySelector('[data-ht-bubbles="energy"]');
    expect(call.textContent).toContain('Bubbles are vapour, not air');
    expect(byText(call, /Water Cycle/)).toBeUndefined();
    React.act(() => root.unmount());
    root = null;
    const ensure = vi.fn(() => true);
    window.__alloEnsureStemPluginLoaded = ensure;
    box = mount({ _heatLab: { hcSub: 'water', hcMode: 'heat', hcCursor: 70 } });
    call = host.querySelector('[data-ht-bubbles="time"]');
    expect(call).toBeTruthy();
    click(byText(call, /Water Cycle/));
    expect(ensure).toHaveBeenCalledWith('waterCycle');
    expect(box.tool).toEqual(['waterCycle']);
    expect(box.d().bridged).toEqual(['waterCycle']);
  });
});
