import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 30, lane input. Screens around the drive:
//  4. focus after a screen change stays inside the tool (real hub mounted);
//  6. drive panels: World settings above More with named buttons, touch wording, HUD cards clear of the mirrors (source);
//  7. permit test: Leave test with a confirm step; right / wrong in words; focus on Next;
//  8. the two views without an entry point are in the catalog;
//  9. Keyboard Shortcuts page, speeding warning tone, tour's last button, named selects.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const HUB = process.env.STEM_HUB || 'stem_lab/stem_lab_module.js';
let loadTool, resetStemLab, makeCtx, renderTool, React, ReactDOMClient, RR, SRC;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, makeCtx, renderTool, React, ReactDOMClient } = mod);
  SRC = readFileSync(path.resolve(process.cwd(), TOOL), 'utf8');
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let mounted = [];
async function mount(roadReady) {
  window.__testHooks = {};
  window.__RR_TEST_EXPORTS__ = {};
  resetStemLab();
  const config = loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const state = { toolData: { roadReady } };
  function Host() {
    const [toolData, setToolData] = React.useState(state.toolData);
    state.toolData = toolData;
    const ctx = makeCtx({
      toolData,
      update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
      updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })),
    });
    return config.render(ctx);
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(Host)); });
  const m = { host, root, state };
  mounted.push(m);
  return m;
}
const buttonByText = (host, text) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
afterEach(async () => {
  for (const m of mounted) { await React.act(async () => { m.root.unmount(); }); m.host.remove(); }
  mounted = [];
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  // The permit test saves its tallies; a later render would load them back.
  try { localStorage.clear(); } catch (e) {}
});

const QUIZ = () => ({ index: 0, answers: [], score: 0, done: false, questions: [
  { q: 'First question?', a: ['Alpha', 'Bravo', 'Charlie', 'Delta'], correct: 1, exp: 'Because bravo.', category: 'general' },
  { q: 'Second question?', a: ['One', 'Two', 'Three', 'Four'], correct: 0, exp: 'Because one.', category: 'signs' },
] });

describe('in30 item 7: permit test', () => {
  it('Leave test asks first; Keep going stays; Leave test goes back with no result', async () => {
    const m = await mount({ view: 'permit', permit: QUIZ() });
    const leave = m.host.querySelector('button[data-rr-permit-leave]');
    expect(leave.textContent).toBe('Leave test');
    await React.act(async () => { leave.click(); });
    const box = m.host.querySelector('[data-rr-permit-leave-confirm]');
    expect(box.textContent).toContain('Leave the test?');
    expect(box.textContent).toContain('This test will not get a score.');
    expect(document.activeElement).toBe(m.host.querySelector('button[data-rr-permit-stay]'));
    await React.act(async () => { m.host.querySelector('button[data-rr-permit-stay]').click(); });
    expect(m.host.querySelector('[data-rr-permit-leave-confirm]')).toBeNull();
    expect(m.state.toolData.roadReady.view).toBe('permit');
    await React.act(async () => { m.host.querySelector('button[data-rr-permit-leave]').click(); });
    await React.act(async () => { m.host.querySelector('button[data-rr-permit-leave-yes]').click(); });
    expect(m.state.toolData.roadReady.view).toBe('permitStart');
    expect(m.state.toolData.roadReady.permit).toBeNull();
    expect(m.state.toolData.roadReady.badges || {}).not.toHaveProperty('permit_pass');
  });
  it('a wrong answer: both options are marked in words, the result line is a live region, Next keeps focus', async () => {
    const m = await mount({ view: 'permit', permit: QUIZ() });
    expect(document.activeElement).toBe(m.host.querySelector('[data-rr-permit-question]'));
    const options = () => [...m.host.querySelectorAll('button')].filter((b) => /^[A-D]\. /.test(b.textContent));
    expect(options()).toHaveLength(4);
    await React.act(async () => { options()[2].click(); });
    expect(options()[2].textContent).toBe('C. Charlie✗ Your answer');
    expect(options()[1].textContent).toBe('B. Bravo✓ Correct answer');
    expect(options()[0].textContent).toBe('A. Alpha');
    const line = m.host.querySelector('[data-rr-permit-result-line]');
    expect(line.getAttribute('role')).toBe('status');
    expect(line.getAttribute('aria-live')).toBe('polite');
    const next = m.host.querySelector('button[data-rr-permit-next]');
    expect(next.disabled).toBe(false);
    expect(next.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(next);
    // The wait still holds: a press during it does not move on.
    await React.act(async () => { next.click(); });
    expect(m.state.toolData.roadReady.permit.index).toBe(0);
    expect(m.state.toolData.roadReady.permit.score).toBe(0);
  });
  it('a right answer: marked, Next ready and focused; then the next question, then the result heading', async () => {
    const m = await mount({ view: 'permit', permit: QUIZ() });
    const options = () => [...m.host.querySelectorAll('button')].filter((b) => /^[A-D]\. /.test(b.textContent));
    await React.act(async () => { options()[1].click(); });
    expect(options()[1].textContent).toBe('B. Bravo✓ Your answer. Correct');
    let next = m.host.querySelector('button[data-rr-permit-next]');
    expect(next.hasAttribute('aria-disabled')).toBe(false);
    expect(document.activeElement).toBe(next);
    await React.act(async () => { next.click(); });
    expect(m.state.toolData.roadReady.permit.index).toBe(1);
    expect(document.activeElement).toBe(m.host.querySelector('[data-rr-permit-question]'));
    await React.act(async () => { options()[0].click(); });
    await React.act(async () => { m.host.querySelector('button[data-rr-permit-next]').click(); });
    expect(m.state.toolData.roadReady.permit.done).toBe(true);
    expect(m.state.toolData.roadReady.permit.score).toBe(2);
    const heading = m.host.querySelector('h2[data-rr-permit-result]');
    expect(heading.textContent).toBe('PASSED!');
    expect(document.activeElement).toBe(heading);
  });
});

describe('in30 item 8: every finished view has a way in', () => {
  it('the menu catalog lists the guide and the braking view, and both open', async () => {
    const m = await mount({ view: 'helpHub' });
    const text = m.host.textContent;
    expect(text).toContain('Neurodivergent Driver Guide');
    expect(text).toContain('Braking Discovery');
    const entries = (SRC.match(/\{ view: '(neurodivergentGuide|brakingHunt)', goal:/g) || []);
    expect(entries).toHaveLength(2);
    const guide = await mount({ view: 'neurodivergentGuide' });
    expect(guide.host.querySelector('h2').textContent).toBe('Neurodivergent Driver Guide');
    const braking = await mount({ view: 'brakingHunt' });
    expect(braking.host.textContent).toContain('Braking performance discovery');
  });
  it('the Accessibility panel links to the guide', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true });
    const link = m.host.querySelector('button[data-rr-nd-guide-link]');
    expect(link.textContent).toBe('Guide for drivers with ADHD, autism or anxiety');
    await React.act(async () => { link.click(); });
    expect(m.state.toolData.roadReady.view).toBe('neurodivergentGuide');
  });
});

describe('in30 item 9: small corrections', () => {
  it('menu: the two HUD selects have names', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true });
    const names = [...m.host.querySelectorAll('select')].map((s) => s.getAttribute('aria-label'));
    expect(names).toContain('Driving HUD');
    expect(names).toContain('HUD text size');
    expect(names.every(Boolean)).toBe(true);
  });
  it('Keyboard Shortcuts: B, Esc and the arrows are listed; H is a 4-way choice; every key keeps its tint', async () => {
    const box = (await mount({ view: 'keyboardCheatSheet' })).host;
    const html = box.innerHTML;
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Click any key');
    expect(box.textContent).toContain('The lists below say what each key does.');
    const keys = {}; box.querySelectorAll('.rr-kb-key[data-active]').forEach((k) => { keys[k.textContent] = k; });
    expect(keys.B.getAttribute('data-tooltip')).toBe('Fasten seatbelt');
    expect(keys.H.getAttribute('data-tooltip')).toBe('Change HUD layout (4 choices)');
    for (const letter of ['P', 'A', 'D', 'F', 'G']) {
      expect(keys[letter].getAttribute('style')).toMatch(/background:\s*rgba\(\d+, ?\d+, ?\d+, ?0\.15\)/);
      expect(keys[letter].getAttribute('title')).toBeTruthy();
    }
    const more = box.querySelector('[data-rr-kb-more]').textContent;
    expect(more).toContain('Esc');
    expect(more).toContain('End the drive and open the debrief');
    expect(more).toContain('Up arrow: speed up (same as W)');
    expect(more).toContain('Left and right arrows: steer (same as A and D)');
  });
  it('the speeding warning is a caution card, not blue info', () => {
    const msg = "🚨 Slow down — limit is 25 mph (you're at 31).";
    expect(RR.driveAlertAppearance(msg).tone).toBe('caution');
    expect(RR.driveAlertPriority(msg)).toBe(2);
    expect(RR.driveAlertPriority(msg, 'error')).toBe(3);
    expect(RR.driveAlertAppearance('Seatbelt fastened — check all three mirrors.').tone).toBe('info');
  });
  it("the tour's last button (Start Driving!) opens the list of drives", async () => {
    const m = await mount({ view: 'tour', tourStep: 5 });
    const go = [...m.host.querySelectorAll('button')].find((b) => /Start Driving!/.test(b.textContent));
    await React.act(async () => { go.click(); });
    expect(m.state.toolData.roadReady.view).toBe('scenarioSelect');
    expect(m.state.toolData.roadReady.tourCompleted).toBe(true);
  });
});

describe('in30 item 6: drive panels', () => {
  it('Free Explore: World settings sits above More, and its buttons have names', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true, reducedMotion: true, calmDrive: true, freeExplore: true, freeExploreScenario: { weather: 'clear', time: 'day', traffic: 'light', speedLimit: 25 } });
    await React.act(async () => { window.__testHooks.roadReady.startDriving('residential', 'sedan'); });
    await React.act(async () => { buttonByText(m.host, 'More').click(); });
    await React.act(async () => { buttonByText(m.host, 'World settings').click(); });
    const panel = m.host.querySelector('#rr-world-controls');
    expect(Number(panel.style.zIndex)).toBeGreaterThan(22);
    const buttons = [...panel.querySelectorAll('button')];
    const names = buttons.map((b) => b.textContent.replace(/\s+/g, ' ').trim());
    for (const want of ['☀️ Clear', '🌧 Rain', '❄ Snow', '🌫 Fog', '📻 Radio off', '🎵 Music', '🎙️ Talk', '🌦️ Weather report', '🚦 Traffic report']) expect(names).toContain(want);
    expect(buttons.filter((b) => b.textContent !== '×').every((b) => b.hasAttribute('aria-pressed'))).toBe(true);
    const close = buttonByText(m.host, '×');
    expect(close.style.width).toBe('44px');
    expect(close.style.height).toBe('44px');
    expect(SRC).toContain('.rr-world-controls button{min-width:44px;min-height:44px}');
  });
  it('source: touch wording, the touch More panel, and HUD cards placed from the mirror edges', () => {
    expect(SRC).toContain("className: 'rr-drive-more' + (isTouchDeviceRef.current && !rideAlongActiveUi ? ' rr-more-touch' : '')");
    // On a touch device both panels sit in the band between the mirrors and the pedals.
    expect(SRC).toContain('.rr-drive-shell .rr-more-touch{top:calc(12% + 6px)!important;bottom:auto!important;left:10px!important;right:10px!important;width:auto!important;max-height:max(96px,calc(88% - 360px))!important;overflow:auto}');
    expect(SRC).toContain("className: 'rr-world-controls' + (isTouchDeviceRef.current && !rideAlongActiveUi ? ' rr-more-touch' : '')");
    expect(SRC).toContain("__alloT('stem.roadready.more_touch_help', 'Hold GO to speed up and BRAKE to slow down. Hold an arrow to steer. P, D and R change gear.')");
    expect(SRC).toContain("__alloT('stem.roadready.pause_touch_help', 'Tap Resume Driving to go on. Camera and Photo are under More.')");
    expect(SRC).toContain('var navY = Math.round(mirrorY + mirrorH + 22);');
    expect(SRC).toContain('var qCardY = Math.round(smY + smH) + 22;');
    expect(SRC).toContain("gfx.fillText(hb ? '◉ HIGH BEAMS' : '○ low beams', 14, Math.round(H * 0.12) + 14);");
    expect(SRC).not.toContain('gfx.fillRect(10, 68, 220, 40);');
  });
});

describe('in30 item 4: focus after a screen change stays inside the tool (real hub)', () => {
  const Icon = () => null;
  let root, host;
  function Harness({ seed }) {
    const [stemLabTool, setStemLabTool] = React.useState('roadReady');
    const [stemLabTab, setStemLabTab] = React.useState('explore');
    const [labToolData, setLabToolData] = React.useState(seed);
    const base = { labToolData, setLabToolData, toolSnapshots: [], addToast: () => {}, t: () => undefined, stemLabTool, setStemLabTool, stemLabTab, setStemLabTab, setShowStemLab: () => {}, showStemLab: true, activeStation: null, callGemini: null, callTTS: null, isTeacherMode: false };
    const props = new Proxy(base, { get(target, key) { if (key in target) return target[key]; if (typeof key === 'string' && /^[A-Z]/.test(key)) return Icon; if (typeof key === 'string' && /^(set|handle|on)[A-Z]/.test(key)) return () => {}; return undefined; } });
    return window.AlloModules.StemLab(props);
  }
  const flush = async () => { for (let i = 0; i < 4; i++) await React.act(async () => { await sleep(0); }); };
  afterEach(async () => { if (root) await React.act(async () => root.unmount()); if (host) host.remove(); root = host = null; });
  it('menu -> a view: focus is on that view heading inside the tool shell, never the app title', async () => {
    global.React = window.React = React;
    window.AlloModules = {};
    window.__alloT = (k, fb) => fb || k;
    if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
    delete window.StemLab; delete window.__stemPluginComponents;
    const appTitle = document.createElement('h1'); appTitle.textContent = 'AlloFlow'; document.body.prepend(appTitle);
    new Function(readFileSync(HUB, 'utf8'))();
    new Function(readFileSync(path.resolve(process.cwd(), TOOL), 'utf8'))();
    host = document.createElement('div'); document.body.append(host);
    root = ReactDOMClient.createRoot(host);
    await React.act(async () => root.render(React.createElement(Harness, { seed: { roadReady: { view: 'menu', tourCompleted: true } } })));
    await flush();
    try {
      const shell = host.querySelector('[data-stem-tool-shell="roadReady"]');
      expect(shell).toBeTruthy();
      await React.act(async () => { shell.querySelector('button[data-rr-nd-guide-link]').click(); });
      await flush();
      const active = document.activeElement;
      expect(active).not.toBe(appTitle);
      expect(shell.contains(active)).toBe(true);
      expect(active.tagName).toBe('H2');
      expect(active.textContent).toBe('Neurodivergent Driver Guide');
      // and on to the permit start page: its own heading
      await React.act(async () => { [...shell.querySelectorAll('button')].find((b) => /Menu/.test(b.textContent)).click(); });
      await flush();
      expect(shell.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).not.toBe(shell.querySelector(':scope > h1'));
    } finally { appTitle.remove(); }
  });
});
