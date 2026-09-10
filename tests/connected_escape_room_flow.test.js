import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../connected_escape_room_engine.js';
import { analyzeRoomFlow, generationFlowErrors } from '../connected_escape_room_flow.js';
import { saveLibraryRoom } from '../connected_escape_room_library.js';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url), { source, makeRoom } = require('../dev-tools/fixtures/connected_escape_room.cjs');
const serialRoom = () => { const room = makeRoom(); room.nodes[5].requires = ['device-found', 'ledger-found']; return room; };
const discoveryRoom = () => { const room = makeRoom(); room.nodes[5].requires.push('wall-found'); return room; };
const apply = (room, progress, node, uid = 'solo') => engine.mergeProgress(progress, engine.planRequest(room, progress, { attemptId: 'attempt', requestId: engine.identity('act'), nodeId: node.id, kind: 'interact', value: engine.solutionValue(room, node) }, uid, { attemptId: 'attempt', active: true }));
describe('Actual escape room puzzle paths', () => {
  it('finds both independent devices and the clue they share', () => {
    const flow = analyzeRoomFlow(makeRoom());
    expect(flow.independentPaths).toBe(2); expect(flow.sharedIds).toEqual(['notes']);
    expect(flow.startingIds).toEqual(['lens', 'notes', 'ledger']);
    expect(flow.branches.map(branch => branch.puzzleIds)).toEqual([['device'], ['sequence']]);
    expect(flow.branches[0].nodeIds).toEqual(['lens', 'wall', 'device']);
    expect(flow.toolGateIds).toEqual([]); expect(generationFlowErrors(makeRoom())).toEqual([]);
  });
  it('does not mistake a redundant door requirement for a parallel puzzle', () => {
    const room = serialRoom(); expect(engine.validateRoom(room, source)).toEqual([]);
    const flow = analyzeRoomFlow(room); expect(flow.independentPaths).toBe(1); expect(flow.redundantExitIds).toEqual(['device']);
    expect(generationFlowErrors(room).join()).toContain('independent reasoning paths');
  });
  it('does not count an extra starting clue as an independent reasoning path', () => {
    const room = serialRoom(), clue = structuredClone(room.nodes[3]); clue.id = 'spare'; clue.reward.id = 'spare-found'; room.nodes.push(clue); room.nodes[6].requires.push('spare-found');
    expect(engine.validateRoom(room, source)).toEqual([]); const flow = analyzeRoomFlow(room);
    expect(flow.branches).toHaveLength(2); expect(flow.independentPaths).toBe(1);
  });
  it('recognizes reasoning products carried through another object', () => {
    const room = makeRoom(), relay = structuredClone(room.nodes[3]); relay.id = 'relay'; relay.requires = ['device-found']; relay.reward.id = 'relay-found'; room.nodes.push(relay); room.nodes[6].requires[0] = 'relay-found';
    expect(engine.validateRoom(room, source)).toEqual([]); expect(generationFlowErrors(room)).toEqual([]);
    expect(analyzeRoomFlow(room).branches[0].puzzleIds).toEqual(['device']);
  });
  it('does not count shared upstream reasoning again for each final branch', () => {
    const room = serialRoom(), relay = structuredClone(room.nodes[3]); relay.id = 'relay'; relay.requires = ['device-found']; relay.reward.id = 'relay-found'; room.nodes.push(relay); room.nodes[6].requires = ['relay-found', 'sequence-found'];
    const flow = analyzeRoomFlow(room); expect(engine.validateRoom(room, source)).toEqual([]); expect(flow.sharedIds).toContain('device'); expect(flow.independentPaths).toBe(1);
  });
  it('handles three independent paths and clues shared by only two of them', () => {
    const room = makeRoom(), device = structuredClone(room.nodes[4]); device.id = 'third'; device.reward.id = 'third-found'; device.requires = ['wall-found', 'ledger-found']; room.nodes.push(device); room.nodes[6].requires.push('third-found');
    expect(engine.validateRoom(room, source)).toEqual([]); const flow = analyzeRoomFlow(room);
    expect(flow.independentPaths).toBe(3); expect(flow.sharedIds).toEqual(['lens', 'notes', 'ledger', 'wall']);
    expect(new Set([...flow.sharedIds, ...flow.branches.flatMap(branch => branch.nodeIds), flow.exitNodeId]).size).toBe(8);
  });
  it('requires the discovery variation to open both reasoning paths with a tool', () => {
    expect(generationFlowErrors(makeRoom(), 'discovery').join()).toContain('one use-tool discovery');
    const room = discoveryRoom(); expect(engine.validateRoom(room, source)).toEqual([]); expect(analyzeRoomFlow(room).toolGateIds).toEqual(['wall']); expect(generationFlowErrors(room, 'discovery')).toEqual([]);
  });
  it('recognizes an indirect shared tool gate', () => {
    const room = discoveryRoom(); room.nodes[3].requires = ['wall-found']; room.nodes[5].requires = ['notes-found', 'ledger-found'];
    expect(engine.validateRoom(room, source)).toEqual([]); expect(generationFlowErrors(room, 'discovery')).toEqual([]);
  });
  it('does not mutate or depend on the input object order', () => {
    const room = discoveryRoom(), before = JSON.stringify(room); analyzeRoomFlow(room); expect(JSON.stringify(room)).toBe(before);
    room.nodes.reverse(); expect(generationFlowErrors(room, 'discovery')).toEqual([]); expect(analyzeRoomFlow(room).independentPaths).toBe(2);
  });
  it('bounds traversal of an invalid cyclic graph', () => { const room = makeRoom(); room.nodes[0].requires = ['wall-found']; expect(() => analyzeRoomFlow(room)).toThrow('acyclic'); });
  it.each(['parallel', 'discovery'])('keeps %s rooms completable by one learner or a shared party', mode => {
    const room = mode === 'parallel' ? makeRoom() : discoveryRoom();
    for (const team of [false, true]) { let progress = engine.emptyProgress(); for (let pass = 0; pass < room.nodes.length; pass++) for (const node of room.nodes) if (!progress.solved[node.id] && engine.available(room, progress, node)) progress = apply(room, progress, node, team && node.areaId === 'archive' ? 'bob' : 'alice'); expect(engine.complete(room, progress)).toBe(true); }
  });
});
describe('Bounded generation quality repair', () => {
  it('repairs a valid but sequential room once with specific graph feedback', async () => {
    const provider = vi.fn().mockResolvedValueOnce(JSON.stringify(serialRoom())).mockResolvedValueOnce(JSON.stringify(makeRoom())), stages = vi.fn();
    expect(await engine.generateRoom(provider, source, {}, stages)).toEqual(engine.prepareRoom(makeRoom(), source));
    expect(provider).toHaveBeenCalledTimes(2); expect(provider.mock.calls[1][0]).toContain('independent reasoning paths'); expect(stages.mock.calls.flat()).toEqual(['generating', 'repairing']);
  });
  it('fails after one unsuccessful topology repair without a retry loop', async () => { const provider = vi.fn().mockResolvedValue(JSON.stringify(serialRoom())); await expect(engine.generateRoom(provider, source)).rejects.toThrow('independent reasoning paths'); expect(provider).toHaveBeenCalledTimes(2); });
  it.each(['discovery', 'A tool unlocks two investigations that reunite at the final door'])('checks the requested tool gate for %s', async structure => {
    const provider = vi.fn().mockResolvedValueOnce(JSON.stringify(makeRoom())).mockResolvedValueOnce(JSON.stringify(discoveryRoom()));
    await expect(engine.generateRoom(provider, source, { structure })).resolves.toBeTruthy(); expect(provider).toHaveBeenCalledTimes(2); expect(provider.mock.calls[0][0]).toContain('A tool unlocks two investigations'); expect(provider.mock.calls[1][0]).toContain('one use-tool discovery');
  });
  it('keeps saved v1 sequential rooms playable without applying new generation rules', () => { const room = serialRoom(); expect(engine.prepareRoom(room, source)).toBeTruthy(); expect(engine.createSession(room, 'teacher').connectedRoom).toEqual(room); });
});
const React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
let root, el, api, write;
const base = { inputText: source, language: 'English', appId: 'flow', user: { uid: 'u' }, allowLive: false, t: key => key, onClose: () => {}, callGemini: async () => JSON.stringify(makeRoom()) };
beforeAll(() => { global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true; write = vi.fn(); window.__alloFirebase = { db: {}, doc: () => ({}), updateDoc: write }; loadAlloModule('connected_escape_room_module.js'); api = window.AlloModules; });
afterEach(async () => { if (root) await act(async () => root.unmount()); el?.remove(); root = el = null; localStorage.clear(); sessionStorage.clear(); write.mockClear(); });
async function render(props = {}) { if (!root) { el = document.createElement('div'); document.body.appendChild(el); root = createRoot(el); } await act(async () => root.render(React.createElement(api.ConnectedEscapeRoomSetup, { ...base, ...props }))); }
const button = name => [...el.querySelectorAll('button')].find(node => node.textContent.trim() === name);
const click = async node => { expect(node).toBeTruthy(); await act(async () => node.click()); };
describe('Teacher room connection review', () => {
  it('shows all objects once in a collapsed flow review without an additional AI call', async () => {
    const provider = vi.fn(base.callGemini); await render({ callGemini: provider }); await click(button('Generate connected room'));
    expect(el.querySelector('[data-room-flow]').open).toBe(false); expect(el.querySelector('[data-room-flow] summary').textContent).toContain('2 independent puzzle paths');
    expect(el.querySelectorAll('[data-flow-object]')).toHaveLength(7); expect(provider).toHaveBeenCalledTimes(1); expect(write).not.toHaveBeenCalled();
  });
  it('opens and focuses the exact object editor from a path', async () => {
    await render(); await click(button('Generate connected room')); await click(el.querySelector('[data-flow-object="device"]')); await act(async () => new Promise(resolve => setTimeout(resolve, 5)));
    const details = el.querySelector('[data-edit-object="device"]'); expect(details.open).toBe(true); expect(document.activeElement).toBe(details.querySelector('textarea'));
    await click(button('Back to room connections')); expect(document.activeElement).toBe(el.querySelector('[data-room-flow] summary')); expect(el.querySelector('[data-room-flow]').open).toBe(true);
  });
  it('explains an old sequential room while keeping solo and saving enabled', async () => {
    saveLibraryRoom(localStorage, source, 'English', serialRoom()); const provider = vi.fn(); await render({ callGemini: provider });
    expect(el.querySelector('[data-flow-concern]').textContent).toContain('remains playable'); expect(button('Play solo').disabled).toBe(false); expect(button('Save room in this browser').disabled).toBe(false); expect(provider).not.toHaveBeenCalled();
    await click(button('Play solo')); expect(el.querySelector('[data-room-flow]')).toBeNull(); expect(el.querySelector('[data-submit-object="lens"]')).toBeTruthy();
  });
  it('keeps the current room after new generation fails its flow repair', async () => {
    await render(); await click(button('Generate connected room')); const before = el.querySelector('[data-room-flow]').textContent;
    const provider = vi.fn().mockResolvedValue(JSON.stringify(serialRoom())); await render({ callGemini: provider }); await click(button('Generate another room'));
    expect(el.querySelector('[data-room-flow]').textContent).toBe(before); expect(button('Play solo').disabled).toBe(false); expect(provider).toHaveBeenCalledTimes(2); expect(el.textContent).toContain('could not be validated');
  });
});
