import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { mounts.splice(0).forEach(({ root, host }) => { act(() => root.unmount()); host.remove(); }); vi.restoreAllMocks(); });
function find(node, match) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const value = find(child, match); if (value) return value; } return null; }
  return match(node) ? node : find(node.props?.children, match);
}
async function mount(patch = {}) {
  resetStemLab(); const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium');
  const store = newStore(), host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  let latest, update, tree; const addToast = vi.fn();
  function Harness() {
    const [data, setData] = React.useState({ _aquarium: {
      mode: 'tank', selectedTank: 'freshwater', aquariumWorkspacePanel: 'decide', soundEnabled: false, simRunning: false,
      tutorialDismissed: false, tutorialPanelOpen: true, tutorialNotebookOpen: false, tutorialOutlineOpen: false,
      fishIdentityVersion: 3, tankFish: ['guppy'], fishInstanceIds: ['fish-1'], nextFishInstanceId: 2, hungerLevels: { 'fish-1': 80 },
      tankPlants: ['anubias'], plantHealth: { anubias: 80 }, plantBiomass: { anubias: 2 }, habitatLayout: [],
      simTick: 10, simDay: 0, simHour: 12, lightsOn: true, equipment: { filter: 0, heater: 0, light: 0, airPump: 0 },
      equipmentCondition: { filter: 100, heater: 100, light: 100, airPump: 100 }, equipmentFaults: {},
      waterChem: { pH: 7, temp: 76, ammonia: 0.1, nitrite: 0, nitrate: 12, salinity: 0, dissolvedO2: 7, co2: 3 },
      coins: 50, observationNotes: 'Keep my observation.', ...patch
    } });
    latest = data._aquarium; update = values => setData(old => ({ ...old, _aquarium: { ...old._aquarium, ...values } }));
    tree = tool.render(makeCtx({ toolData: data, setToolData: setData, addToast }, store));
    return React.createElement('div', null, tree, React.createElement('button', { 'data-other-control': 'true' }, 'Another task'));
  }
  await act(async () => root.render(React.createElement(Harness)));
  return { host, addToast, state: () => latest, rawUpdate: values => update(values), update: values => act(async () => update(values)),
    action: name => host.querySelector('[data-aquarium-tutorial-action="' + name + '"]'),
    field: name => host.querySelector('[data-aquarium-notebook-field="' + name + '"]'),
    heading: () => host.querySelector('[data-aquarium-lesson-heading]'),
    other: () => host.querySelector('[data-other-control]'),
    change: (hook, value) => act(async () => find(tree, node => node.props?.['data-aquarium-notebook-field'] === hook).props.onChange({ target: { value } })),
    trialChange: (hook, value) => act(async () => find(tree, node => node.props?.['data-aquarium-trial-field'] === hook).props.onChange({ target: { value } })) };
}
async function activate(button) { expect(button).toBeTruthy(); await act(async () => { button.focus(); button.click(); }); }
const progress = () => Object.fromEntries(['habitat', 'stock', 'cycle', 'feed', 'water', 'equipment', 'exchange'].map(id => [id, { evidence: 'Recorded earlier.' }]));

describe('Aquarium guided learning and notebooks', () => {
  it('keeps disclosure targets mounted and connects native field labels and prompts', async () => {
    const t = await mount();
    const notebookToggle = t.host.querySelector('[data-aquarium-notebook-toggle]'), outlineToggle = t.host.querySelector('[data-aquarium-tutorial-outline-toggle]');
    const notebook = t.host.querySelector('[data-aquarium-notebook]'), outline = t.host.querySelector('[id="' + outlineToggle.getAttribute('aria-controls') + '"]');
    expect(notebookToggle.getAttribute('aria-controls')).toBe(notebook.id); expect(notebook.hidden).toBe(true); expect(outline.hidden).toBe(true);
    await activate(notebookToggle); expect(document.activeElement).toBe(notebookToggle); expect(notebook.hidden).toBe(false);
    for (const field of ['prediction', 'observation', 'explanation']) { const input = t.field(field); expect(input.labels).toHaveLength(1); expect(input.labels[0].htmlFor).toBe(input.id); }
    for (const field of ['prediction', 'explanation']) expect(t.host.querySelector('[id="' + t.field(field).getAttribute('aria-describedby') + '"]').textContent).toBeTruthy();
    await t.change('prediction', 'A specific prediction.'); await activate(notebookToggle);
    expect(t.host.querySelector('[data-aquarium-notebook]')).toBe(notebook); expect(notebook.hidden).toBe(true); expect(t.field('prediction').value).toBe('A specific prediction.');
    await activate(outlineToggle); expect(outline.hidden).toBe(false); await activate(outlineToggle); expect(outline.hidden).toBe(true); expect(t.host.querySelector('[id="' + outline.id + '"]')).toBe(outline);
  });

  it('focuses explicit lesson navigation and preserves independently saved notes and evidence', async () => {
    const notes = { habitat: { prediction: 'Habitat prediction', observation: 'Habitat evidence', explanation: 'Habitat claim' }, stock: { prediction: 'Stock prediction' } };
    const t = await mount({ tutorialNotebook: notes, tutorialNotebookOpen: true });
    await activate(t.action('next')); expect(t.state().tutorialStep).toBe(1); expect(document.activeElement).toBe(t.heading()); expect(t.heading().textContent).toContain('Stock');
    expect(t.state().tutorialProgress.habitat.evidence).toBe('Habitat selected.'); expect(t.field('prediction').value).toBe('Stock prediction');
    await activate(t.action('previous')); expect(t.state().tutorialStep).toBe(0); expect(document.activeElement).toBe(t.heading()); expect(t.action('previous').disabled).toBe(false); expect(t.action('previous').getAttribute('aria-disabled')).toBe('true');
    expect(t.field('prediction').value).toBe('Habitat prediction'); expect(t.state().tutorialNotebook).toEqual(notes); expect(t.state().observationNotes).toBe('Keep my observation.'); expect(t.state().coins).toBe(50);
    await activate(t.action('previous')); expect(t.state().tutorialStep).toBe(0);
  });

  it('focuses a lesson selected from the outline, including revisiting the same lesson', async () => {
    const t = await mount({ tutorialOutlineOpen: true }); const lesson = t.host.querySelector('[data-aquarium-tutorial-lesson="cycle"]');
    await activate(lesson); expect(t.state().tutorialStep).toBe(2); expect(document.activeElement).toBe(t.heading()); expect(lesson.getAttribute('aria-current')).toBe('step');
    await activate(lesson); expect(document.activeElement).toBe(t.heading());
  });

  it('recovers to this tank’s learning action when hiding and completing the path', async () => {
    const t = await mount({ tutorialNotebook: { habitat: { prediction: 'Keep this.' } } });
    await activate(t.action('hide')); expect(t.host.querySelector('[data-aquarium-learning-path]')).toBeNull(); expect(document.activeElement).toBe(t.action('workspace')); expect(t.state().tutorialNotebook.habitat.prediction).toBe('Keep this.');
    await t.update({ tutorialDismissed: false, tutorialPanelOpen: true, tutorialStep: 7, perfectWaterTicks: 5, tutorialProgress: progress() });
    await activate(t.action('next')); expect(t.state().tutorialDismissed).toBe(true); expect(t.state().tutorialProgress.stabilize.evidence).toContain('safe ticks'); expect(document.activeElement).toBe(t.action('workspace'));
    await activate(t.action('workspace')); expect(document.activeElement).toBe(t.field('prediction')); expect(t.state().tutorialNotebookOpen).toBe(true); expect(t.state().tutorialNotebook.habitat.prediction).toBe('Keep this.');
  });

  it('uses the resume control outside a tank workspace and keeps its name aligned with visible words', async () => {
    const t = await mount({ selectedTank: null, tankFish: [], fishInstanceIds: [], tankPlants: [] });
    await activate(t.action('hide')); const resume = t.action('resume'); expect(document.activeElement).toBe(resume); expect(resume.getAttribute('aria-label')).toContain('Resume guided learning path');
    await activate(resume); expect(document.activeElement).toBe(t.heading());
  });

  it('opens each instance’s notebook through its own CTA and keeps labels and investigation IDs unique', async () => {
    const a = await mount({ tutorialDismissed: true }), b = await mount({ tutorialDismissed: true });
    await activate(a.host.querySelector('[data-aquarium-notebook-cta]')); await activate(b.host.querySelector('[data-aquarium-notebook-cta]'));
    expect(document.activeElement).toBe(b.field('prediction')); expect(a.field('prediction').id).not.toBe(b.field('prediction').id);
    for (const field of ['prediction', 'observation', 'explanation']) {
      for (const t of [a,b]) expect(document.getElementById(t.field(field).labels[0].htmlFor)).toBe(t.field(field));
    }
    const pa = a.host.querySelector('[data-aquarium-intervention-plan]'), pb = b.host.querySelector('[data-aquarium-intervention-plan]');
    expect(pa.id).not.toBe(pb.id); expect(document.getElementById(pa.labels[0].htmlFor)).toBe(pa); expect(document.getElementById(pb.labels[0].htmlFor)).toBe(pb);
    for (const t of [a,b]) {
      await activate([...t.host.querySelectorAll('button')].find(n=>n.textContent==='Save baseline'));
      await t.update({aquariumWorkspacePanel:'investigate'});
    }
    for (const field of ['factor', 'value', 'prediction']) {
      const fa=a.host.querySelector('[data-aquarium-trial-field="'+field+'"]'), fb=b.host.querySelector('[data-aquarium-trial-field="'+field+'"]');
      expect(fa.id).not.toBe(fb.id); expect(document.getElementById(fa.labels[0].htmlFor)).toBe(fa); expect(document.getElementById(fb.labels[0].htmlFor)).toBe(fb);
      if (field==='value') expect(fa.getAttribute('aria-describedby')).not.toBe(fb.getAttribute('aria-describedby'));
    }
    for (const t of [a,b]) {
      await t.trialChange('prediction','Oxygen in B will fall because biological lights are off.');
      await activate([...t.host.querySelectorAll('button')].find(n=>n.textContent==='Create paired trial'));
    }
    for (const field of ['metric','reflection']) {
      const fa=a.host.querySelector('[data-aquarium-trial-field="'+field+'"]'), fb=b.host.querySelector('[data-aquarium-trial-field="'+field+'"]');
      expect(fa.id).not.toBe(fb.id); expect(document.getElementById(fa.labels[0].htmlFor)).toBe(fa); expect(document.getElementById(fb.labels[0].htmlFor)).toBe(fb);
    }
    const ah=a.host.querySelector('[data-aquarium-trial-heading]'),bh=b.host.querySelector('[data-aquarium-trial-heading]');
    expect(ah.id).not.toBe(bh.id);expect(a.host.querySelector('[data-aquarium-paired-trial]').getAttribute('aria-labelledby')).toBe(ah.id);expect(b.host.querySelector('[data-aquarium-paired-trial]').getAttribute('aria-labelledby')).toBe(bh.id);
  });

  it('captures live readings into the current lesson without replacing learner text or moving focus', async () => {
    const t = await mount({ tutorialNotebookOpen: true, tutorialNotebook: { habitat: { observation: 'My own evidence.' }, stock: { explanation: 'Leave this alone.' } } });
    const capture = t.host.querySelector('[data-aquarium-notebook-capture]'); await activate(capture);
    expect(document.activeElement).toBe(capture); expect(t.field('observation').value).toContain('My own evidence.\nDay 0 12:00'); expect(t.field('observation').value).toContain('NH3 0.10 ppm');
    expect(t.state().tutorialNotebook.stock.explanation).toBe('Leave this alone.'); expect(t.addToast).toHaveBeenCalledWith(expect.stringContaining('evidence snapshot saved'), 'success');
  });

  it('does not steal focus or leave a request pending after another control or mode takes over', async () => {
    const t=await mount(); await act(async()=>{const button=t.action('next');button.focus();button.click();t.other().focus();});
    expect(document.activeElement).toBe(t.other()); expect(t.state().tutorialStep).toBe(1);
    await act(async()=>{const button=t.action('previous');button.focus();button.click();t.rawUpdate({mode:'learn'});t.other().focus();});
    expect(document.activeElement).toBe(t.other());await t.update({mode:'tank'});expect(document.activeElement).toBe(t.other());
  });

  it('announces evidence through one live copy while retaining both readable copies', async () => {
    const t=await mount();
    const evidenceStatuses=()=>[...t.host.querySelectorAll('[role="status"]')].filter(n=>/Evidence (ready|needed):/.test(n.textContent));
    const workspace=()=>t.host.querySelector('[data-aquarium-workspace-evidence]');
    const text=workspace().textContent;
    expect(evidenceStatuses()).toHaveLength(1);
    expect(workspace().getAttribute('role')).toBeNull();
    expect(t.host.querySelector('[data-aquarium-learning-path]').textContent).toContain('Evidence ready: Habitat selected.');
    await t.update({tutorialPanelOpen:false});
    expect(t.host.querySelector('[data-aquarium-learning-path]')).toBeNull();
    expect(workspace().textContent).toBe(text);expect(workspace().getAttribute('role')).toBe('status');expect(evidenceStatuses()).toHaveLength(1);
    await t.update({tutorialPanelOpen:true});expect(workspace().getAttribute('role')).toBeNull();expect(evidenceStatuses()).toHaveLength(1);
    await activate(t.action('hide'));
    expect(workspace().textContent).toBe(text);expect(workspace().getAttribute('role')).toBe('status');expect(evidenceStatuses()).toHaveLength(1);
  });

  it('hands trial creation and setup to the heading, preserves completion focus, and respects later focus ownership', async () => {
    const t=await mount({tutorialDismissed:true});
    await activate([...t.host.querySelectorAll('button')].find(n=>n.textContent==='Save baseline'));
    await t.update({aquariumWorkspacePanel:'investigate'});
    await t.trialChange('prediction','Oxygen in B will fall because biological lights are off.');
    const action=name=>t.host.querySelector('[data-aquarium-trial-action="'+name+'"]');
    const heading=()=>t.host.querySelector('[data-aquarium-trial-heading]');
    const liveBefore={waterChem:{...t.state().waterChem},tick:t.state().simTick,coins:t.state().coins};
    await activate(action('create'));
    expect(document.activeElement).toBe(heading());
    expect(t.host.querySelector('[data-aquarium-paired-trial]').getAttribute('aria-labelledby')).toBe(heading().id);
    await t.trialChange('reflection','Keep this explanation when replaying.');
    const observe=action('observe-6');
    for(let i=0;i<4;i++)await activate(observe);
    expect(t.state().inquiryExperiment.elapsed).toBe(24);expect(document.activeElement).toBe(observe);
    expect(observe.disabled).toBe(false);expect(observe.getAttribute('aria-disabled')).toBe('true');expect(action('observe-1').getAttribute('aria-disabled')).toBe('true');
    const completed=JSON.stringify(t.state().inquiryExperiment);await activate(observe);await activate(action('observe-1'));expect(JSON.stringify(t.state().inquiryExperiment)).toBe(completed);
    await activate(action('replay'));expect(document.activeElement).toBe(action('replay'));expect(t.state().inquiryExperiment.elapsed).toBe(0);expect(t.state().inquiryExperiment.reflection).toBe('Keep this explanation when replaying.');
    await activate(action('clear'));expect(t.state().inquiryExperiment).toBeNull();expect(document.activeElement).toBe(heading());
    expect(t.state().inquiryPrediction).toBe('Oxygen in B will fall because biological lights are off.');
    expect({waterChem:t.state().waterChem,tick:t.state().simTick,coins:t.state().coins}).toEqual(liveBefore);
    await act(async()=>{const create=action('create');create.focus();create.click();t.other().focus();});
    expect(document.activeElement).toBe(t.other());
    await act(async()=>{const clear=action('clear');clear.focus();clear.click();t.other().focus();});
    expect(document.activeElement).toBe(t.other());
    await act(async()=>{const create=action('create');create.focus();create.click();t.rawUpdate({aquariumWorkspacePanel:'observe'});t.other().focus();});
    expect(document.activeElement).toBe(t.other());await t.update({aquariumWorkspacePanel:'investigate'});expect(document.activeElement).toBe(t.other());
  });
});
