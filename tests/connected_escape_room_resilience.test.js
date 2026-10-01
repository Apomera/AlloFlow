// Escape Room (connected): local repairs before a model repair call, keeping a failed
// attempt for one more repair, diagnostics, launch readiness, and the learner view.
// CONNECTED_ENGINE_CANDIDATE / CONNECTED_ROOM_CANDIDATE=<path> run against scratch copies (mutation checks).
import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
// Vite resolves a plain absolute path outside the project; it rejects a file:// URL.
const e = await import(process.env.CONNECTED_ENGINE_CANDIDATE ? process.env.CONNECTED_ENGINE_CANDIDATE.replace(/\\/g, '/') : '../connected_escape_room_engine.js');
const require = createRequire(import.meta.url), { source, makeRoom } = require('../dev-tools/fixtures/connected_escape_room.cjs');
const React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;

describe('Local room repairs', () => {
  const lesson = 'The **water cycle** moves water around Earth. Water evaporates when heated — it rises as vapor. “Clouds” form when vapor cools, and rain falls.';
  it('snaps a quote that differs only by copying noise to the exact lesson text', () => {
    expect(e.snapSourceQuote('the water cycle moves water around Earth.', lesson)).toBe('The **water cycle** moves water around Earth.');
    expect(e.snapSourceQuote('Water evaporates when heated - it rises as vapor.', lesson)).toBe('Water evaporates when heated — it rises as vapor.');
    expect(e.snapSourceQuote('"Clouds" form when vapor cools', lesson)).toBe('“Clouds” form when vapor cools');
    expect(e.snapSourceQuote('...vapor cools, and rain falls...', lesson)).toBe('vapor cools, and rain falls');
    for (const quote of ['the water cycle moves water around Earth.', '"Clouds" form when vapor cools']) expect(lesson.includes(e.snapSourceQuote(quote, lesson))).toBe(true);
  });
  it('does not invent a match for a different or too-short quote', () => {
    expect(e.snapSourceQuote('Volcanoes erupt when magma rises.', lesson)).toBeNull();
    // Exact text is always accepted; only a fuzzy match needs enough words to be unambiguous.
    expect(e.snapSourceQuote('rain falls', lesson)).toBe('rain falls');
    expect(e.snapSourceQuote('Rain Falls', lesson)).toBeNull();
    expect(e.snapSourceQuote('Water vapor condenses when cooled.', source)).toBe('Water vapor condenses when cooled.');
  });
  it('leaves a valid room exactly as it is', () => {
    const { room, fixes } = e.autoRepairRoom(makeRoom(), source);
    expect(room).toEqual(makeRoom());
    expect(fixes).toEqual([]);
  });
  it('renames invalid IDs everywhere they are used, trims extra hints, and the room then validates', () => {
    const room = makeRoom();
    room.areas[0].id = 'Main Laboratory';
    room.nodes.filter(n => n.areaId === 'laboratory').forEach(n => { n.areaId = 'Main Laboratory'; });
    room.nodes[0].reward.id = 'UV Lens'; room.nodes[2].requires = ['UV Lens']; room.nodes[2].toolId = 'UV Lens';
    room.nodes[6].id = 'Exit Door'; room.exitNodeId = 'Exit Door';
    room.nodes[1].hints.push('A fourth hint the schema does not allow.');
    room.nodes[4].sourceQuote = 'WATER EVAPORATES when **heated**. Water vapor condenses when cooled.';
    expect(e.validateRoom(room, source).length).toBeGreaterThan(0);
    const { room: fixed, fixes } = e.autoRepairRoom(room, source);
    expect(e.validateRoom(fixed, source)).toEqual([]);
    expect(fixes).toEqual(expect.arrayContaining(['id:Main Laboratory', 'id:UV Lens', 'id:Exit Door', 'hints:notes', 'quote:device']));
    expect(fixed.exitNodeId).toBe('exit-door');
    expect(fixed.nodes[2]).toMatchObject({ requires: ['uv-lens'], toolId: 'uv-lens' });
    expect(fixed.nodes[4].sourceQuote).toBe('Water evaporates when heated. Water vapor condenses when cooled.');
  });
  it('never changes answers or structure while repairing', () => {
    const room = makeRoom(); room.nodes[0].id = 'Lens';
    const { room: fixed } = e.autoRepairRoom(room, source);
    const key = r => r.nodes.map(n => [n.type, n.requires.length, e.solutionValue(r, n)].join(':')).join('|');
    expect(key(fixed)).toBe(key(makeRoom()));
  });
});

describe('Generation keeps working through model slips', () => {
  it('accepts typographic quote noise without spending a repair call', async () => {
    const room = makeRoom(); room.nodes[4].sourceQuote = 'WATER EVAPORATES when **heated**. Water vapor condenses when cooled.';
    const provider = vi.fn().mockResolvedValue(JSON.stringify(room));
    const result = await e.generateRoom(provider, source);
    expect(provider).toHaveBeenCalledTimes(1);
    expect(result.nodes[4].sourceQuote).toBe('Water evaporates when heated. Water vapor condenses when cooled.');
  });
  it('keeps the last answer on failure, and resumes from it with exactly one repair call', async () => {
    const bad = JSON.stringify({ ...makeRoom(), nodes: [] });
    const provider = vi.fn().mockResolvedValue(bad);
    const error = await e.generateRoom(provider, source).catch(x => x);
    expect(provider).toHaveBeenCalledTimes(2);
    expect(error.message).toContain('could not be validated');
    expect(error.candidate).toEqual({ response: bad, message: expect.stringContaining('Use seven to twelve connected objects') });
    const fixer = vi.fn().mockResolvedValue(JSON.stringify(makeRoom())), stage = vi.fn();
    const room = await e.generateRoom(fixer, source, { repairFrom: error.candidate }, stage);
    expect(fixer).toHaveBeenCalledTimes(1);
    expect(fixer.mock.calls[0][0]).toContain('Validation errors');
    expect(fixer.mock.calls[0][0]).toContain(bad.slice(0, 60));
    expect(stage.mock.calls.flat()).toEqual(['repairing']);
    expect(room.nodes).toHaveLength(7);
  });
  it('has nothing to resume after a provider outage', async () => {
    const error = await e.generateRoom(vi.fn().mockRejectedValue(Error('offline')), source).catch(x => x);
    expect(error.candidate).toBeUndefined();
  });
  it('records every failed check in the diagnostics log', async () => {
    const record = vi.fn();
    window.AlloModules = { ...(window.AlloModules || {}), ErrorReporter: { record } };
    await e.generateRoom(vi.fn().mockResolvedValue('{}'), source).catch(() => {});
    expect(record).toHaveBeenCalledTimes(2);
    expect(record.mock.calls[0]).toEqual(['warn', expect.stringContaining('[Escape Room] generation check'), '', 'connected_escape_room_engine.js', 0, 0]);
    expect(record.mock.calls[1][1]).toContain('[Escape Room] repair check');
    delete window.AlloModules.ErrorReporter;
  });
});

let el, root, write;
const t = k => k, base = { appId: 'app', activeSessionCode: 'ROOM', user: { uid: 'u' }, t, inputText: source, sessionData: {}, onClose: () => {} };
const view = async props => { if (!root) { el = document.createElement('div'); document.body.appendChild(el); root = createRoot(el); } await act(async () => root.render(React.createElement(window.AlloModules.ConnectedEscapeRoomSetup, props))); };
const button = name => [...el.querySelectorAll('button')].find(b => b.textContent.trim() === name);
const click = async node => { expect(node).toBeTruthy(); await act(async () => node.click()); };
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true; write = vi.fn();
  window.__alloShared = { db: {}, warnLog() {} };
  window.__alloFirebase = { db: {}, doc: (_, ...bits) => bits.join('/'), updateDoc: (...args) => write(...args) };
  window.AlloLanguageContext = React.createContext({ t }); window.UiLanguageSelector = () => null; window.__alloHooks = { useFocusTrap() {} };
  if (process.env.CONNECTED_ROOM_CANDIDATE) new Function(readFileSync(process.env.CONNECTED_ROOM_CANDIDATE, 'utf8'))();
  else loadAlloModule('connected_escape_room_module.js');
});
afterEach(async () => { if (root) await act(async () => root.unmount()); el?.remove(); root = el = null; write.mockReset(); sessionStorage.clear(); localStorage.clear(); });

describe('Escape Room setup', () => {
  it('offers one more repair after a failed room, with the technical details kept out of the way', async () => {
    const bad = JSON.stringify({ ...makeRoom(), nodes: [] });
    const provider = vi.fn().mockResolvedValueOnce(bad).mockResolvedValueOnce(bad).mockResolvedValueOnce(JSON.stringify(makeRoom()));
    await view({ ...base, callGemini: provider, allowLive: false });
    await click(button('Generate escape room'));
    expect(el.querySelector('[role="alert"]').textContent).toContain('did not pass the playability checks');
    expect(el.querySelector('[data-generation-failure] details').textContent).toContain('could not be validated');
    await click(el.querySelector('[data-repair-again]'));
    expect(provider).toHaveBeenCalledTimes(3);
    expect(provider.mock.calls[2][0]).toContain('Validation errors');
    expect(el.querySelector('[data-generation-failure]')).toBeNull();
    expect(el.querySelector('[data-play-solo]')).toBeTruthy();
  });
  it('pauses before launching a room nobody has tried, and launches directly once it has been tried', async () => {
    const onLaunched = vi.fn();
    await view({ ...base, callGemini: async () => JSON.stringify(makeRoom()), allowLive: true, onLaunched });
    await click(button('Generate escape room'));
    expect(el.querySelector('[data-launch-readiness]').textContent).toContain('Not tried yet');
    await click(el.querySelector('[data-launch-connected]'));
    expect(el.querySelector('[data-launch-confirm]')).toBeTruthy();
    expect(document.activeElement.textContent).toBe('Try the room first');
    await click(document.activeElement);
    expect(el.querySelector('[data-launch-confirm]')).toBeNull();
    await click(el.querySelector('[data-submit-object="lens"]'));
    expect(el.querySelector('[data-launch-readiness]').textContent).toContain('Tried in preview: 1 of 7 objects solved.');
    expect(write).not.toHaveBeenCalled();
    await click(el.querySelector('[data-launch-connected]'));
    expect(el.querySelector('[data-launch-confirm]')).toBeNull();
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][1].escapeRoomState.mode).toBe('connected-room');
    expect(onLaunched).toHaveBeenCalled();
  });
  it('still lets the teacher launch an untried room on purpose', async () => {
    await view({ ...base, callGemini: async () => JSON.stringify(makeRoom()), allowLive: true });
    await click(button('Generate escape room'));
    await click(el.querySelector('[data-launch-connected]'));
    await click(el.querySelector('[data-launch-anyway]'));
    expect(write).toHaveBeenCalledTimes(1);
  });
  it('opens an independent learner in play view with solutions hidden until asked for', async () => {
    await view({ ...base, activeSessionCode: null, callGemini: async () => JSON.stringify(makeRoom()), allowLive: false, learnerMode: true });
    await click(button('Generate escape room'));
    expect(button('Try the room').getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('[data-launch-readiness]')).toBeNull();
    await click(button('Review clues and solutions'));
    expect(el.textContent).not.toContain('Heat Chamber A to evaporate water');
    await click(el.querySelector('[data-toggle-solutions]'));
    expect(el.textContent).toContain('Heat Chamber A to evaporate water');
  });
  it('shows teachers the solutions by default', async () => {
    await view({ ...base, callGemini: async () => JSON.stringify(makeRoom()), allowLive: false });
    await click(button('Generate escape room'));
    expect(button('Review clues and solutions').getAttribute('aria-pressed')).toBe('true');
    expect(el.textContent).toContain('Heat Chamber A to evaporate water');
    expect(el.querySelector('[data-toggle-solutions]')).toBeNull();
  });
});

describe('Quiz view wiring', () => {
  it('passes learner mode to the setup in every copy', () => {
    // Boolean checks: a failing toContain on these large files diffs the whole source and hangs.
    for (const file of ['view_quiz_module.js', 'desktop/web-app/public/view_quiz_module.js']) expect(readFileSync(file, 'utf8').includes('learnerMode: !!isIndependentMode,'), file).toBe(true);
    expect(readFileSync('view_quiz_source.jsx', 'utf8').includes('learnerMode={!!isIndependentMode}'), 'view_quiz_source.jsx').toBe(true);
    expect(readFileSync('desktop/web-app/public/connected_escape_room_module.js', 'utf8') === readFileSync('connected_escape_room_module.js', 'utf8'), 'connected mirror matches').toBe(true);
  });
});
