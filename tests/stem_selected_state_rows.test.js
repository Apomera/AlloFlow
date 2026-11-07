// Rows that showed the current choice only with a colour: the contrast theme's yellow ring needs aria-pressed, and a
// screen reader had nothing to say. Each case mounts the tool at a state showing the row, checks that exactly the
// current choice is pressed, presses another, and checks the state moved.
// STEM_SELECTED_ROWS_DIR points the suite at another copy of the tools for the fail-first proof.
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const DIR = (process.env.STEM_SELECTED_ROWS_DIR || 'stem_lab').replace(/\\/g, '/');
let root = null;

beforeEach(() => {
  resetStemLab();
  if (!window.ResizeObserver) { window.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} }; globalThis.ResizeObserver = window.ResizeObserver; }
  if (!window.IntersectionObserver) { window.IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} }; globalThis.IntersectionObserver = window.IntersectionObserver; }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({}, { get: (tg, k) => (k in tg ? tg[k] : /create.*Gradient/.test(k) ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 20 }) : () => {}), set: (tg, k, v) => { tg[k] = v; return true; } }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // Pressing a Music row can start a sound, and jsdom has no Web Audio: the tool throws from a later tick.
  const audioNode = () => new Proxy(function () {}, { get: (tg, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : k === 'state' ? 'running' : k === 'currentTime' || k === 'value' ? 0 : audioNode()), set: () => true, apply: () => audioNode() });
  window.AudioContext = function AudioContext() { return audioNode(); };
  window.webkitAudioContext = window.AudioContext;
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// The host's own signatures: update(toolKey, key, value), updateMulti(toolKey, patch).
async function mount(file, id, toolKey, saved, overrides) {
  loadTool(DIR + '/stem_tool_' + file + '.js', id);
  document.body.innerHTML = '<div id="root"></div>';
  function App() {
    const [state, setState] = React.useState(toolKey ? { [toolKey]: Object.assign({}, saved) } : Object.assign({}, saved));
    const update = (tk, k, v) => setState((p) => Object.assign({}, p, { [tk]: Object.assign({}, p[tk], { [k]: v }) }));
    const updateMulti = (tk, patch) => setState((p) => Object.assign({}, p, { [tk]: Object.assign({}, p[tk], patch) }));
    return window.StemLab._registry[id].render(makeCtx(Object.assign({ toolData: state, setToolData: setState, update, updateMulti }, overrides)));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
}

const norm = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
const same = (el, want) => { const s = norm(el); return s === want || (want.length > 1 && s.includes(want)); };
// The buttons of one row: siblings under one parent, one per wanted label, in order.
function rowOf(labels) {
  for (const b of document.querySelectorAll('button')) {
    if (!same(b, labels[0])) continue;
    const kids = [...b.parentElement.children].filter((c) => c.tagName === 'BUTTON');
    const hit = labels.map((t) => kids.find((c) => same(c, t)));
    if (hit.every(Boolean)) return hit;
  }
  return null;
}
const pressedOf = (buttons) => buttons.map((b) => b.getAttribute('aria-pressed'));
const expected = (labels, current) => labels.map((t) => (t === current ? 'true' : 'false'));

async function assertRow(labels, current, next) {
  const row = rowOf(labels);
  expect(row, 'row not rendered: ' + labels.join(' / ')).not.toBe(null);
  expect(pressedOf(row)).toEqual(expected(labels, current));
  await React.act(async () => { row[labels.indexOf(next)].click(); });
  const after = rowOf(labels);
  expect(after, 'row gone after pressing ' + next).not.toBe(null);
  expect(pressedOf(after)).toEqual(expected(labels, next));
}
async function assertToggle(find) {
  const b = find();
  expect(!!b, 'toggle not rendered').toBe(true);
  expect(b.getAttribute('aria-pressed')).toBe('false');
  await React.act(async () => { b.click(); });
  expect(find().getAttribute('aria-pressed')).toBe('true');
}
const byLabel = (text) => () => [...document.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '').includes(text));
const byText = (text) => () => [...document.querySelectorAll('button')].find((b) => norm(b).includes(text));

describe('fractionViz', () => {
  it('Practice: easy / medium / hard', async () => {
    await mount('fractions', 'fractionViz', '_fractions', { tab: 'practice', difficulty: 'medium' });
    await assertRow(['easy', 'medium', 'hard'], 'medium', 'hard');
  });
  it('Converter: fraction to decimal / decimal to fraction', async () => {
    await mount('fractions', 'fractionViz', '_fractions', { tab: 'converter', convDirection: 'decToFrac' });
    await assertRow(['Fraction to Decimal', 'Decimal to Fraction'], 'Decimal to Fraction', 'Fraction to Decimal');
  });
  it('Standards Planning grade row, a teacher tab no first-screen survey reaches', async () => {
    await mount('fractions', 'fractionViz', '_fractions', { tab: 'standardsPlanning', stdGrade: '2' }, { isTeacherMode: true });
    await assertRow(['All', 'Grade 1', 'Grade 2', 'Grade 3'], 'Grade 2', 'Grade 3');
  });
  it('Pedagogy severity row', async () => {
    await mount('fractions', 'fractionViz', '_fractions', { tab: 'pedagogy', miscSeverity: 'medium' }, { isTeacherMode: true });
    await assertRow(['high', 'medium', 'low'], 'medium', 'low');
  });
});

describe('wave', () => {
  it('Sine / Square / Triangle / Sawtooth', async () => {
    await mount('wave', 'wave', 'wave', { waveMode: 'free', waveType: 'square' });
    await assertRow(['Sine', 'Square', 'Triangle', 'Sawtooth'], 'Square', 'Sine');
  });
  it('standing wave harmonic 1 to 6', async () => {
    await mount('wave', 'wave', 'wave', { waveMode: 'standing', harmonic: 2 });
    await assertRow(['1', '2', '3', '4', '5', '6'], '2', '5');
  });
});

describe('gameStudio, which had no aria state at all', () => {
  it('Map / Sprites section row', async () => {
    await mount('gamestudio', 'gameStudio', 'gameStudio', { tab: 'map' });
    await assertRow(['Map', 'Sprites'], 'Map', 'Sprites');
  });
  it('map drawing tools', async () => {
    await mount('gamestudio', 'gameStudio', 'gameStudio', { tab: 'map', brushTool: 'brush' });
    await assertRow(['✏️', '🪣', '🧹', '💧'], '✏️', '🧹');
  });
  it('sprite tools', async () => {
    await mount('gamestudio', 'gameStudio', 'gameStudio', { tab: 'sprite', spriteTool: 'draw' });
    await assertRow(['✏️', '🧹', '🪣'], '✏️', '🪣');
  });
});

describe('musicSynth', () => {
  const play = { synthTab: 'play', synthEngine: 'standard', octave: 4 };
  it('octave 3 to 6', async () => {
    await mount('music', 'musicSynth', 'musicSynth', play);
    await assertRow(['3', '4', '5', '6'], '4', '6');
  });
  it('oscillator row', async () => {
    await mount('music', 'musicSynth', 'musicSynth', Object.assign({ waveType: 'square' }, play));
    const row = rowOf(['sine', 'square', 'sawtooth', 'triangle']);
    expect(row).not.toBe(null);
    expect(pressedOf(row)).toEqual(['false', 'true', 'false', 'false']);
  });
  it('Scale Lock is a toggle', async () => {
    await mount('music', 'musicSynth', 'musicSynth', play);
    await assertToggle(byText('Scale Lock'));
  });
});

describe('musicSynth, other tabs', () => {
  it('Y-axis Filter / Volume row', async () => {
    await mount('music', 'musicSynth', 'musicSynth', { synthTab: 'play', xyMode: 'volume' });
    await assertRow(['filter', 'volume', 'vibrato', 'reverb'], 'volume', 'reverb');
  });
  it('engine row in the bar', async () => {
    await mount('music', 'musicSynth', 'musicSynth', { synthTab: 'play', synthEngine: 'fm' });
    await assertRow(['Wave', 'Super', 'FM', 'Sub', 'Pad', 'Pluck'], 'FM', 'Super');
  });
  it('chord explorer inversion row', async () => {
    await mount('music', 'musicSynth', 'musicSynth', { synthTab: 'chords', chordInversion: 1 });
    const invs = () => { const label = [...document.querySelectorAll('span')].find((n) => norm(n) === 'Inversion'); return [...label.parentElement.querySelectorAll('button')].slice(0, 3); };
    expect(invs().length).toBe(3);
    expect(pressedOf(invs())).toEqual(['false', 'true', 'false']);
    await React.act(async () => { invs()[2].click(); });
    expect(pressedOf(invs())).toEqual(['false', 'false', 'true']);
  });
});

describe('worldBuilder', () => {
  it('biome row', async () => {
    await mount('worldbuilder', 'worldBuilder', 'worldBuilder', { worldInquiry: { biome: 'arctic' } });
    await assertRow(['Temperate', 'Arctic'], 'Arctic', 'Temperate');
  });
});

describe('dataStudio', () => {
  it('sort None / Asc / Desc', async () => {
    await mount('datastudio', 'dataStudio', '_dataStudio', { sortOrder: 'none' });
    await assertRow(['None', 'Asc', 'Desc'], 'None', 'Desc');
  });
});

describe('behaviorLab', () => {
  it('schedule row', async () => {
    await mount('behaviorlab', 'behaviorLab', null, {});
    await assertRow(['CRF', 'FR3', 'VR5', 'FI30', 'VI30'], 'FR3', 'VR5');
  });
});

describe('volume', () => {
  it('paint toggle', async () => {
    await mount('volume', 'volume', '_volume', { mode: 'slider' });
    await assertToggle(byLabel('Toggle paint'));
  });
});

describe('a11yAuditor', () => {
  it('social platform row', async () => {
    await mount('a11yauditor', 'a11yAuditor', 'a11yAuditor', { auditInputMode: 'social', socialPlatform: 'twitter' }, { callGemini: async () => '' });
    await assertRow(['Instagram', 'X/Twitter', 'Facebook'], 'X/Twitter', 'Facebook');
  });
});

describe('cephalopodLab', () => {
  it('Facts Pool category row', async () => {
    await mount('cephalopodlab', 'cephalopodLab', 'cephalopodLab', { activeSection: 'factspool', factsCat: 'All' });
    const row = () => { const all = [...document.querySelectorAll('button')].find((b) => norm(b) === 'All'); return [...all.parentElement.children].filter((c) => c.tagName === 'BUTTON'); };
    expect(row().length).toBeGreaterThan(2);
    expect(pressedOf(row()).filter((v) => v === 'true').length).toBe(1);
    expect(row()[0].getAttribute('aria-pressed')).toBe('true');
    await React.act(async () => { row()[2].click(); });
    expect(pressedOf(row()).filter((v) => v === 'true').length).toBe(1);
    expect(row()[2].getAttribute('aria-pressed')).toBe('true');
  });
});

// The world-detail panel holding these mini tools did not render in jsdom under any seed tried, so this is a source
// check on the rows, not a live one: each handler sits in a props object that states the same test as its class.
describe('solarSystem mini tools (source check)', () => {
  it.each([
    ['isActive', "upd('_keplerBody', body.id);"], ['!!on', "solTouch('orbital'); upd('_keplerShow_' + tog.id, !on);"],
    ['active', "upd('stellarMass', k);"], ['Math.abs(phase - st.at) < 5', "upd('stellarPhase', st.at);"],
    ['active', "upd('moonPhasePos', p.a);"], ['active', "upd('eclipseType', t);"],
    ['active', "upd('spacecraft', Object.assign({}, sc, { [cat]: k }));"], ['active', 'togglePayload(k);'],
    ['picked === k', "upd('constPicked', k);"], ['dest === k', "upd('trajDest', k);"], ['type === k', "upd('galType', k);"],
    ['dist === idx', "upd('lyDist', idx);"], ['moon === k', "upd('habMoon', k);"], ['astType === k', "upd('astType', k);"],
    ['pl[cat] === o', 'set(cat, o);'], ['p === k', "upd('auPl', k);"], ['sys === k', "upd('coordSys', k);"], ['method === k', "upd('exMth', k);"],
  ])('aria-pressed %s beside %s', (expr, handler) => {
    const src = fs.readFileSync(DIR + '/stem_tool_solarsystem.js', 'utf8');
    expect(src.replace(/\s+/g, ' ').includes("'aria-pressed': " + expr + ", onClick: function() { " + handler)).toBe(true);
  });
});

describe('autoRepair', () => {
  it('Repair Bay part row marks the part under inspection', async () => {
    await mount('autorepair', 'autoRepair', 'autoRepair', { view: 'repairbay', rbCase: 'charging', rbEngine: 'off', rbFound: {}, rbSel: null });
    const parts = () => [...document.querySelectorAll('button')].filter((b) => /^Inspect /.test(b.getAttribute('aria-label') || ''));
    expect(parts().length).toBeGreaterThan(1);
    expect(parts().filter((b) => b.getAttribute('aria-pressed') === 'true').length).toBe(0);
    await React.act(async () => { parts()[1].click(); });
    expect(parts().map((b) => b.getAttribute('aria-pressed')).filter((v) => v === 'true').length).toBe(1);
    expect(parts()[1].getAttribute('aria-pressed')).toBe('true');
  });
});

// REAL_NAMES_BLOCK: an aria-label replaces the visible text for a screen reader, so a copied label names the wrong thing.
const labelled = (re) => [...document.querySelectorAll('button')].filter((b) => re.test(b.getAttribute('aria-label') || ''));
const namesOf = (re) => labelled(re).map((b) => b.getAttribute('aria-label'));
const allLabels = () => [...document.querySelectorAll('button')].map((b) => b.getAttribute('aria-label')).filter(Boolean);
// Sibling buttons, two or more, sharing one aria-label: the copied-label pattern.
function sameLabelRows() {
  const out = [];
  document.querySelectorAll('*').forEach((p) => {
    const seen = {};
    [...p.children].filter((c) => c.tagName === 'BUTTON' && c.getAttribute('aria-label')).forEach((b) => { const k = b.getAttribute('aria-label'); seen[k] = (seen[k] || 0) + 1; });
    Object.keys(seen).forEach((k) => { if (seen[k] > 1) out.push(k + ' x' + seen[k]); });
  });
  return out;
}

describe('real button names: gameStudio', () => {
  it('colour swatches are named by colour and sprite tools by tool', async () => {
    await mount('gamestudio', 'gameStudio', 'gameStudio', { tab: 'sprite', spriteColor: '#3498db', spriteTool: 'erase' });
    const colours = namesOf(/^Sprite color: /);
    expect(colours).toEqual(['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Teal', 'Light gray', 'Dark slate', 'Black', 'White', 'Dark orange'].map((n) => 'Sprite color: ' + n));
    expect(labelled(/^Sprite color: Blue$/)[0].getAttribute('aria-pressed')).toBe('true');
    expect(labelled(/^Sprite color: Red$/)[0].getAttribute('aria-pressed')).toBe('false');
    expect(namesOf(/^Sprite tool: /)).toEqual(['Sprite tool: Draw', 'Sprite tool: Erase', 'Sprite tool: Fill']);
    expect(labelled(/^Sprite tool: Erase$/)[0].getAttribute('aria-pressed')).toBe('true');
    expect(allLabels().filter((l) => /^Mirror/.test(l))).toEqual([]);
  });
  it('the movement pad names all four directions', async () => {
    await mount('gamestudio', 'gameStudio', 'gameStudio', { tab: 'play', isPlaying: true });
    expect(namesOf(/^Move /)).toEqual(['Move up', 'Move left', 'Move right', 'Move down']);
    expect(allLabels()).not.toContain('Process Move');
  });
  it('rule buttons carry their number and count', async () => {
    const rule = { trigger: 'onKey', param: 'ArrowUp', action: 'move', actionParam: 'up' };
    await mount('gamestudio', 'gameStudio', 'gameStudio', { tab: 'events', activeSprite: 'player', events: { player: [rule, rule] } });
    expect(namesOf(/^Remove rule /)).toEqual(['Remove rule 1', 'Remove rule 2']);
    expect(namesOf(/^Add Rule/)).toEqual(['Add Rule (2 of 8 used)']);
  });
  it.each(['map', 'sprite', 'events', 'play', 'learn', 'challenges', 'projects', 'diffHunt'])('no row on the %s tab shares one label', async (tab) => {
    await mount('gamestudio', 'gameStudio', 'gameStudio', { tab, isPlaying: tab === 'play' });
    expect(sameLabelRows()).toEqual([]);
  });
});

describe('real button names: musicSynth', () => {
  // jsdom has no Web Audio; the beat pad builds a graph on mount.
  const fake = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : fake()), apply: () => fake(), construct: () => fake(), set: () => true });
  beforeEach(() => { window.AudioContext = function () { return fake(); }; globalThis.AudioContext = window.AudioContext; });
  it('instrument presets are each named', async () => {
    await mount('music', 'musicSynth', 'musicSynth', { synthTab: 'play', activePreset: 'Guitar' });
    const names = namesOf(/^Instrument preset: /);
    expect(names.length).toBeGreaterThan(2);
    expect(new Set(names).size).toBe(names.length);
    expect(allLabels()).not.toContain('Apply Preset');
    expect(labelled(/^Instrument preset: Guitar$/)[0].getAttribute('aria-pressed')).toBe('true');
  });
  it('chord explorer: chords name their root and type, inversions name the inversion', async () => {
    await mount('music', 'musicSynth', 'musicSynth', { synthTab: 'chords', selectedRoot: 'C', selectedChord: 'Minor', chordInversion: 1 });
    expect(namesOf(/^Chord: /)).toContain('Chord: C Minor');
    expect(labelled(/^Chord: C Minor$/)[0].getAttribute('aria-pressed')).toBe('true');
    expect(labelled(/^Chord: C Major$/)[0].getAttribute('aria-pressed')).toBe('false');
    expect(namesOf(/^Inversion: /)).toEqual(['Inversion: root position', 'Inversion: first', 'Inversion: second']);
    expect(labelled(/^Inversion: first$/)[0].getAttribute('aria-pressed')).toBe('true');
    expect(allLabels().filter((l) => l === 'Strum chord').length).toBe(1);
    expect(allLabels()).not.toContain('Inversion');
  });
  it('progressions are each named', async () => {
    await mount('music', 'musicSynth', 'musicSynth', { synthTab: 'chords' });
    const names = namesOf(/^Play progression: /);
    expect(names.length).toBeGreaterThan(2);
    expect(new Set(names).size).toBe(names.length);
  });
  it('beat pad: Chain, the song button and saved beats say what they are now', async () => {
    localStorage.setItem('alloflow_beats', JSON.stringify([{ name: 'First groove', grid: {}, bpm: 90 }, { name: 'Second groove', grid: {}, bpm: 90 }]));
    const section = { name: 'Verse', grid: {}, bars: 1 };
    await mount('music', 'musicSynth', 'musicSynth', { synthTab: 'beatpad', songSections: [section], songPlaying: true, showSaves: true });
    expect(namesOf(/^Chain patterns$/).length).toBe(1);
    expect(allLabels()).not.toContain('A loop');
    expect(namesOf(/^Stop song$/).length).toBe(1);
    expect(allLabels()).not.toContain('Play full song');
    expect(namesOf(/^Delete saved beat: /)).toEqual(['Delete saved beat: First groove', 'Delete saved beat: Second groove']);
    localStorage.removeItem('alloflow_beats');
  });
  it('the song button reads Play when stopped', async () => {
    await mount('music', 'musicSynth', 'musicSynth', { synthTab: 'beatpad', songSections: [{ name: 'Verse', grid: {}, bars: 1 }], songPlaying: false });
    expect(namesOf(/^Play full song$/).length).toBe(1);
  });
  it('ear training start buttons match their visible Start text', async () => {
    await mount('music', 'musicSynth', 'musicSynth', { synthTab: 'theory' });
    expect(namesOf(/^Start interval game$/).length).toBe(1);
    expect(namesOf(/^Start chord game$/).length).toBe(1);
    expect(namesOf(/^Start dictation$/).length).toBe(1);
    expect(allLabels()).not.toContain('Replay');
    expect(allLabels()).not.toContain('Play Chord');
  });
  it('the harmony pad strum button names its chord', async () => {
    await mount('music', 'musicSynth', 'musicSynth', { synthTab: 'harmonypad', omniChordRoot: 'G', omniChordType: 'Minor' });
    expect(namesOf(/^Strum G Minor$/).length).toBe(1);
  });
  it.each(['play', 'harmonypad', 'beatpad', 'scales', 'chords', 'theory', 'timbreHunt'])('no row on the %s tab shares one label', async (synthTab) => {
    await mount('music', 'musicSynth', 'musicSynth', { synthTab });
    expect(sameLabelRows()).toEqual([]);
  });
});

describe('galaxy with its strings not loaded', () => {
  // The module's real ctx.t: a missing key falls back to the second argument, or to the key itself.
  it('shows no raw key anywhere in the default view', async () => {
    await mount('galaxy', 'galaxy', 'galaxy', {});
    const html = document.body.innerHTML;
    expect(document.body.textContent).toContain('Barred Spiral');
    expect([...new Set(html.match(/stem\.galaxy\.[a-z0-9_]+/g) || [])]).toEqual([]);
  });
  it('a loaded translation still wins over the English fallback', async () => {
    await mount('galaxy', 'galaxy', 'galaxy', {}, { t: (k, fb) => (k === 'stem.galaxy.barred_spiral' ? 'Espiral barrada' : (typeof fb === 'string' ? fb : k)) });
    expect(document.body.textContent).toContain('Espiral barrada');
    expect(document.body.textContent).not.toContain('Barred Spiral');
  });
});

describe('cephalopodLab camo challenge row', () => {
  it('marks the scene in use and moves with the press, in step with the main picker', async () => {
    await mount('cephalopodlab', 'cephalopodLab', 'cephalopodLab', { activeSection: 'camo', camoScene: 'reef' });
    const row = () => labelled(/: best \d+ percent/);
    expect(row().length).toBeGreaterThan(1);
    const on = () => row().filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.getAttribute('aria-label').split(':')[0]);
    expect(on().length).toBe(1);
    const first = on()[0];
    const other = row().find((b) => b.getAttribute('aria-pressed') !== 'true');
    const otherName = other.getAttribute('aria-label').split(':')[0];
    await React.act(async () => { other.click(); });
    expect(on()).toEqual([otherName]);
    expect(otherName).not.toBe(first);
    const main = [...document.querySelectorAll('button[aria-pressed="true"]')].filter((b) => norm(b).includes(otherName));
    expect(main.length).toBe(2);
  });
});

