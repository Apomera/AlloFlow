import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
afterEach(() => { for (const { root, host } of mounted.splice(0)) { act(() => root.unmount()); host.remove(); } vi.restoreAllMocks(); });

async function mount(patch = {}, retainHiddenChem = false) {
  resetStemLab();
  const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); mounted.push({ root, host });
  let latest, update;
  function Host() {
    const [data, setData] = React.useState({ _aquarium: {
      mode: 'marine', selectedTank: 'freshwater', selectedZone: 'sunlight', tutorialDismissed: true,
      soundEnabled: false, simRunning: false, fishIdentityVersion: 3, tankFish: ['guppy'], fishInstanceIds: ['fish-1'], nextFishInstanceId: 2,
      tankPlants: ['anubias'], plantHealth: { anubias: 80 }, plantBiomass: { anubias: 2 }, habitatLayout: [],
      waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 10, salinity: 0, dissolvedO2: 7, co2: 3 },
      lightsOn: true, equipment: { filter: 0, heater: 0, light: 0, airPump: 0 }, equipmentCondition: {}, equipmentFaults: {},
      observationNotes: 'Keep my observation.', coins: 42, ...patch
    } });
    latest = data._aquarium; update = values => setData(old => ({ ...old, _aquarium: { ...old._aquarium, ...values } }));
    const tree = tool.render(makeCtx({ toolData: data, setToolData: setData }, store));
    const previousChemContents = React.useRef(null);
    // Exercise browsers/hosts that retain disclosure content while hiding it.
    // All controls and focus handlers still come from the actual tool render.
    function retain(node) {
      if (Array.isArray(node)) return node.map(retain);
      if (!React.isValidElement(node)) return node;
      if (node.props['data-aquarium-chem-explanation']) {
        if (!node.props.hidden) previousChemContents.current = node.props.children;
        return React.cloneElement(node, null, node.props.hidden && previousChemContents.current ? previousChemContents.current : node.props.children);
      }
      return node.props.children === undefined ? node : React.cloneElement(node, null, retain(node.props.children));
    }
    React.useLayoutEffect(() => {
      if (retainHiddenChem && !data._aquarium.chemTooltip) {
        const close = host.querySelector('[data-aquarium-chem-close]');
        if (close && close === document.activeElement) close.blur();
      }
    });
    return React.createElement('div', null, retainHiddenChem ? retain(tree) : tree, React.createElement('button', { 'data-other-control': 'true' }, 'Another task'));
  }
  await act(async () => root.render(React.createElement(Host)));
  return { host, state: () => latest, update: async values => act(async () => update(values)), other: () => host.querySelector('[data-other-control]'),
    opener: () => host.querySelector('[data-aquarium-marine-species="clownfish"]'),
    anatomy: () => host.querySelector('[data-aquarium-anatomy]'), anatomyHeading: () => host.querySelector('[data-aquarium-anatomy-heading]'), anatomyClose: () => host.querySelector('[data-aquarium-anatomy-close]'),
    detail: () => host.querySelector('[data-aquarium-anatomy-detail]'), parts: () => [...host.querySelectorAll('[data-aquarium-anatomy-part]')], hotspots: () => [...host.querySelectorAll('[data-aquarium-anatomy-hotspot]')],
    chem: () => host.querySelector('[data-aquarium-chem-explanation]'), chemClose: () => host.querySelector('[data-aquarium-chem-close]'), chemButton: key => host.querySelector('[data-aquarium-chem-toggle="' + key + '"]') };
}
async function click(button) { await act(async () => { button.focus(); button.click(); }); }
async function escape(element) { await act(async () => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))); }

describe('Aquarium inline anatomy inspection', () => {
  it('names the inline section, focuses its heading on explicit open, and returns to the species opener on close', async () => {
    const t = await mount(), opener = t.opener();
    await click(opener);
    expect(t.anatomy().tagName).toBe('SECTION'); expect(t.anatomy().hasAttribute('aria-modal')).toBe(false);
    expect(t.anatomy().getAttribute('aria-labelledby')).toBe(t.anatomyHeading().id);
    expect(document.activeElement).toBe(t.anatomyHeading()); expect(t.anatomyHeading().textContent).toBe('Clownfish');
    expect(t.anatomyClose().getAttribute('aria-label')).toBe('Close anatomy: Clownfish');
    await click(t.anatomyClose());
    expect(t.anatomy()).toBeNull(); expect(document.activeElement).toBe(opener);
    expect(t.state().selectedSpecies).toBe('clownfish'); expect(t.state().coins).toBe(42); expect(t.state().observationNotes).toBe('Keep my observation.');
  });

  it('provides equivalent native hotspot and legend controls with persistent associated details', async () => {
    const t = await mount(); await click(t.opener());
    const detail = t.detail(), parts = t.parts(), dots = t.hotspots();
    expect(parts.length).toBeGreaterThan(3); expect(dots).toHaveLength(parts.length); expect(detail.hidden).toBe(true);
    for (let i = 0; i < parts.length; i++) {
      expect(parts[i].type).toBe('button'); expect(dots[i].type).toBe('button');
      expect(parts[i].getAttribute('aria-controls')).toBe(detail.id); expect(dots[i].getAttribute('aria-controls')).toBe(detail.id);
    }
    await click(parts[1]);
    expect(t.detail()).toBe(detail); expect(detail.hidden).toBe(false); expect(document.activeElement).toBe(parts[1]);
    expect(parts[1].getAttribute('aria-pressed')).toBe('true'); expect(dots[1].getAttribute('aria-pressed')).toBe('true');
    expect(parts[1].getAttribute('aria-describedby')).toBe(detail.id); expect(detail.textContent).toContain(dots[1].getAttribute('aria-label'));
    expect(detail.querySelector('p').textContent.length).toBeGreaterThan(30);
    await click(dots[1]); expect(detail.hidden).toBe(true); expect(parts[1].getAttribute('aria-pressed')).toBe('false');
    await click(dots[2]); expect(detail.hidden).toBe(false); expect(document.activeElement).toBe(dots[2]); expect(t.state().anatomyHighlight).toBe(2);
  });

  it('supports Escape without trapping focus', async () => {
    const t = await mount(), opener = t.opener(); await click(opener); await escape(t.anatomyHeading());
    expect(t.anatomy()).toBeNull(); expect(document.activeElement).toBe(opener);
  });

  it('does not override a subsequent user focus move on open or close', async () => {
    const t = await mount();
    await act(async () => { t.opener().focus(); t.opener().click(); t.other().focus(); });
    expect(document.activeElement).toBe(t.other());
    await act(async () => { t.anatomyClose().focus(); t.anatomyClose().click(); t.other().focus(); });
    expect(t.anatomy()).toBeNull(); expect(document.activeElement).toBe(t.other());
  });

  it('does not autofocus saved inspection content or cross modes after an open request', async () => {
    const saved = await mount({ viewingAnatomy: 'clownfish' }); expect(document.activeElement).not.toBe(saved.anatomyHeading());
    const t = await mount(); await act(async () => { t.opener().focus(); t.opener().click(); });
    await t.update({ mode: 'ocean' }); t.other().focus(); await t.update({ coins: 43 }); expect(document.activeElement).toBe(t.other());
  });

  it('returns cross-mode Close focus to the current navigation in its own tool instance', async () => {
    const otherInstance = await mount({ mode: 'ocean' });
    const t = await mount(); await click(t.opener()); await t.update({ mode: 'ocean' });
    expect(t.anatomy()).toBeTruthy();
    const ownNav = t.host.querySelector('[data-aquarium-mode="ocean"]');
    await click(t.anatomyClose()); expect(t.anatomy()).toBeNull(); expect(document.activeElement).toBe(ownNav);
    expect(document.activeElement).not.toBe(otherInstance.host.querySelector('[data-aquarium-mode="ocean"]'));
    await t.update({ mode: 'marine' }); await click(t.opener()); await t.update({ mode: 'ocean' });
    await act(async () => { t.anatomyClose().focus(); t.anatomyClose().click(); t.other().focus(); });
    expect(document.activeElement).toBe(t.other());
  });
});

describe('Aquarium chemistry explanation disclosure', () => {
  it('exposes a persistent controlled section and retains focus when opening or switching explanations', async () => {
    const t = await mount({ mode: 'tank', aquariumWorkspacePanel: 'observe' }), section = t.chem(), first = t.chemButton('pH');
    expect(section.hidden).toBe(true); expect(first.getAttribute('aria-controls')).toBe(section.id); expect(first.getAttribute('aria-expanded')).toBe('false');
    await click(first); expect(t.chem()).toBe(section); expect(section.hidden).toBe(false); expect(document.activeElement).toBe(first);
    expect(first.getAttribute('aria-expanded')).toBe('true'); expect(document.getElementById(section.getAttribute('aria-labelledby')).textContent).toContain('pH');
    const second = t.chemButton('ammonia'); await click(second);
    expect(first.getAttribute('aria-expanded')).toBe('false'); expect(second.getAttribute('aria-expanded')).toBe('true'); expect(document.activeElement).toBe(second);
    expect(document.getElementById(section.getAttribute('aria-labelledby')).textContent).toContain('Ammonia');
    await click(t.chemClose()); expect(section.hidden).toBe(true); expect(document.activeElement).toBe(second); expect(t.state().chemTooltip).toBeNull();
  });

  it('returns focus in the default Observe workspace and supports Escape', async () => {
    const t = await mount({ mode: 'tank' }), button = t.chemButton('pH'); await click(button);
    await act(async () => { t.chemClose().focus(); }); await escape(t.chemClose());
    expect(t.chem().hidden).toBe(true); expect(document.activeElement).toBe(button);
  });

  it('honors later focus moves when the Close control disappears', async () => {
    const t = await mount({ mode: 'tank', aquariumWorkspacePanel: 'observe' }); await click(t.chemButton('pH'));
    await act(async () => { t.chemClose().focus(); t.chemClose().click(); t.other().focus(); });
    expect(document.activeElement).toBe(t.other()); expect(t.state().observationNotes).toBe('Keep my observation.');
  });

  it('recovers BODY focus when a closed explanation retains its hidden Close control', async () => {
    const t = await mount({ mode: 'tank', aquariumWorkspacePanel: 'observe' }, true), button = t.chemButton('pH');
    await click(button); const close = t.chemClose();
    await click(close);
    expect(close.isConnected).toBe(true); expect(close.closest('[hidden]')).toBe(t.chem());
    expect(t.chem().hidden).toBe(true); expect(document.activeElement).toBe(button);
    await click(button);
    await act(async () => { t.chemClose().focus(); t.chemClose().click(); t.other().focus(); });
    expect(document.activeElement).toBe(t.other());
  });

  it('uses unique inspection and disclosure IDs across tool instances', async () => {
    const a = await mount({ mode: 'tank', viewingAnatomy: 'guppy' }), b = await mount({ mode: 'tank', viewingAnatomy: 'guppy' });
    expect(a.chem().id).not.toBe(b.chem().id); expect(a.anatomyHeading().id).not.toBe(b.anatomyHeading().id);
    expect(a.chemButton('pH').getAttribute('aria-controls')).toBe(a.chem().id); expect(b.chemButton('pH').getAttribute('aria-controls')).toBe(b.chem().id);
  });
});
