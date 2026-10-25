import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { mounts.splice(0).forEach(({ root, host }) => { act(() => root.unmount()); host.remove(); }); vi.restoreAllMocks(); });
function find(node, match) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const result = find(child, match); if (result) return result; } return null; }
  return match(node) ? node : find(node.props?.children, match);
}
async function mount(patch = {}, overrides = {}, initialSnapshots = []) {
  resetStemLab();
  const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  let state, snapshots, update;
  function Host() {
    const [data, setData] = React.useState({ _aquarium: {
      mode: 'learn', selectedTank: 'freshwater', tutorialDismissed: true, soundEnabled: false, simRunning: false,
      fishIdentityVersion: 3, tankFish: [], fishInstanceIds: [], tankPlants: [], equipment: {},
      waterChem: { pH: 7, temp: 76, ammonia: 0, nitrite: 0, nitrate: 12, salinity: 0, dissolvedO2: 7, co2: 3 },
      observationNotes: 'Keep this written observation.', tutorialNotebook: { choose: { prediction: 'Keep this prediction.' } },
      coins: 42, ...patch
    } });
    const [saved, setSaved] = React.useState(initialSnapshots);
    state = data._aquarium; snapshots = saved;
    update = values => setData(old => ({ ...old, _aquarium: { ...old._aquarium, ...values } }));
    const tree = tool.render(makeCtx({ toolData: data, setToolData: setData, toolSnapshots: saved, setToolSnapshots: setSaved, ...overrides }, store));
    // Mount the actual header controls without unrelated viewers. Tool state and handlers remain real.
    return find(tree, node => node.props?.['data-aquarium-focus-panel']);
  }
  await act(async () => root.render(React.createElement(Host)));
  return { host, state: () => state, snapshots: () => snapshots, update: values => act(async () => update(values)),
    save: async () => { const button = host.querySelector('[data-aquarium-snapshot]'); await act(async () => { button.focus(); button.click(); }); return button; } };
}

describe('Aquarium saved-work action', () => {
  it('labels snapshots with each visible learning mode while preserving notes and mode state', async () => {
    const t = await mount();
    const modes = [['marine', 'Marine Science'], ['learn', 'Learn'], ['reference', 'Reference'], ['quiz', 'Quiz'], ['waterlab', 'Water Lab'], ['designer', 'Designer'], ['stressHunt', 'Stress Lab']];
    for (const [mode, title] of modes) {
      await t.update({ mode }); const button = await t.save(), snapshot = t.snapshots().at(-1);
      expect(button.type).toBe('button'); expect(button.getAttribute('aria-label')).toBe('Snapshot');
      expect(snapshot.label).toBe(title); expect(snapshot.tool).toBe('aquarium');
      expect(snapshot.data).not.toBe(t.state());
      expect(snapshot.data).toMatchObject({ mode, coins: 42, observationNotes: 'Keep this written observation.', tutorialNotebook: { choose: { prediction: 'Keep this prediction.' } } });
      expect(t.state().mode).toBe(mode); expect(document.activeElement).toBe(button);
    }
    expect(t.snapshots()).toHaveLength(modes.length);
  });

  it.each([['tank', 'Tank: freshwater'], ['ocean', 'Ocean Year 12']])('keeps saved %s context explicit', async (mode, label) => {
    const t = await mount({ mode, oceanYear: 12 }); await t.save();
    expect(t.snapshots()).toHaveLength(1); expect(t.snapshots()[0].label).toBe(label);
    expect(t.snapshots()[0].data).toMatchObject({ mode, selectedTank: 'freshwater', oceanYear: 12 });
  });

  it('uses translated mode metadata and preserves pre-existing host snapshots', async () => {
    const existing = { id: 'keep-other-tool', tool: 'other-tool', label: 'Keep earlier work', data: { note: 'Keep this too.' } };
    const addToast = vi.fn();
    const t = await mount({ mode: 'designer' }, { addToast, t: (key, fallback) => key === 'stem.aquarium.designer' ? 'Concepteur' : key === 'stem.aquarium.snapshot' ? 'Enregistrer un instantané' : fallback }, [existing]);
    const button = await t.save();
    expect(button.getAttribute('aria-label')).toBe('Enregistrer un instantané');
    expect(t.snapshots()).toHaveLength(2); expect(t.snapshots()[0]).toEqual(existing);
    expect(t.snapshots()[1]).toMatchObject({ label: 'Concepteur', tool: 'aquarium', data: { mode: 'designer', coins: 42 } });
    expect(t.snapshots()[1].id).toMatch(/^aqua-\d+$/); expect(t.snapshots()[1].timestamp).toBeTypeOf('number');
    expect(addToast).toHaveBeenCalledOnce(); expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Snapshot saved'), 'success');
  });
});
