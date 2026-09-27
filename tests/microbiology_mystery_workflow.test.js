import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool, mounted;
const answers = { pond: 'protist', budding: 'yeast', wall: 'bacterium', salt: 'archaeon', particle: 'phage', unresolved: 'unresolved' };
const act = React.act;
const priorAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});
afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  globalThis.IS_REACT_ACT_ENVIRONMENT = priorAct;
  vi.restoreAllMocks();
});
const core = () => window.__MicrobiologyCore.mystery;
function mount(seed = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), state: null };
  function Host() {
    const [data, setData] = React.useState({ microbiology: { tab: 'mystery', ...seed } });
    view.state = data.microbiology;
    return tool.render(makeCtx({ toolData: data, setToolData: setData }));
  }
  mounted = view; act(() => view.root.render(React.createElement(Host))); return view;
}
function button(text) {
  const node = [...mounted.container.querySelectorAll('button')].find(n => n.textContent.trim() === text);
  expect(node, text).toBeTruthy(); return node;
}
function click(node) { act(() => (typeof node === 'string' ? button(node) : node).click()); }
function choice(name, value) { click(mounted.container.querySelector(`input[name="${name}"][value="${value}"]`)); }
function write(text) {
  const node = mounted.container.querySelector('#micro-mystery-reasoning');
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, text);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  }); return node;
}
function openCase(id) {
  const index = core().ids.indexOf(id); click(mounted.container.querySelectorAll('.micro-mystery-cases button')[index]);
}
function build(id) {
  openCase(id);
  click('+ Size and shape'); click('+ Cell structure and chemistry'); click('+ Behavior and reproduction');
  choice('micro-mystery-claim', answers[id]);
  choice('micro-mystery-evidence', 'structure'); choice('micro-mystery-evidence', 'behavior');
  choice('micro-mystery-limitation', 'bounded');
  write('The supplied structure and behavior together support this group; the species remains unknown.');
}
const data = () => mounted.state.mysteryLab;

describe('Mystery specimen evidence reasoning', { timeout: 20000 }, () => {
  it('requires distinguishing evidence and a bounded conclusion for every fictional case', () => {
    for (const [id, claim] of Object.entries(answers)) {
      const input = { claim, evidence: ['structure', 'behavior'], limitation: 'bounded', reasoning: 'Reasoned explanation.' };
      expect(core().evaluate(id, input).canRecord).toBe(true);
      expect(core().evaluate(id, { ...input, evidence: ['context', 'size'] }).code).toBe('evidence');
      expect(core().evaluate(id, { ...input, limitation: 'safe' }).code).toBe('limit');
      expect(core().evaluate(id, { ...input, limitation: 'species' }).code).toBe('limit');
      expect(core().evaluate(id, { ...input, reasoning: '  ' }).code).toBe('reasoning');
    }
  });
  it('allows uncertainty when bacteria and archaea cannot be distinguished', () => {
    const entry = { evidence: ['structure', 'behavior'], limitation: 'bounded', reasoning: 'Membrane or sequence data would distinguish them.' };
    expect(core().evaluate('unresolved', { ...entry, claim: 'bacterium' }).code).toBe('claim');
    expect(core().evaluate('unresolved', { ...entry, claim: 'archaeon' }).code).toBe('claim');
    expect(core().evaluate('unresolved', { ...entry, claim: 'unresolved' }).canRecord).toBe(true);
  });
  it('normalizes malformed state and prevents citing unrevealed observations', () => {
    for (const value of [null, [], 4, 'bad']) {
      const normalized = core().normalize(value);
      expect(normalized.active).toBe('pond'); expect(normalized.cases.pond.record).toBeNull();
    }
    const result = core().normalize({ active: '__proto__', cases: { pond: { revealed: ['context', 'context', 'bogus'], evidence: ['size', 'structure'], claim: {}, reasoning: 'x'.repeat(1800), record: { claim: 'protist' } } } });
    expect(result.cases.pond.evidence).toEqual([]);
    expect(result.cases.pond.reasoning).toHaveLength(1600);
    expect(result.cases.pond.record).toBeNull();
    expect(core().normalize(result)).toEqual(result);
  });
  it('revises an unsupported claim without losing the learner’s explanation', () => {
    mount();
    expect(button('Check my evidence').disabled).toBe(true);
    expect(mounted.container.querySelector('input[name="micro-mystery-evidence"][value="structure"]').disabled).toBe(true);
    click('+ Cell structure and chemistry'); click('+ Behavior and reproduction');
    choice('micro-mystery-claim', 'bacterium'); choice('micro-mystery-evidence', 'structure'); choice('micro-mystery-evidence', 'behavior');
    choice('micro-mystery-limitation', 'bounded'); write('I thought all microbes were bacteria.');
    click('Check my evidence'); expect(mounted.container.textContent).toContain('Reconsider the classification');
    expect(button('Record specimen report').disabled).toBe(true);
    choice('micro-mystery-claim', 'protist');
    expect(mounted.container.querySelector('#micro-mystery-reasoning').value).toBe('I thought all microbes were bacteria.');
    expect(button('Record specimen report').disabled).toBe(true); // recheck changed evidence
    click('Check my evidence'); expect(button('Record specimen report').disabled).toBe(false);
  });
  it('records every case through the actual controls and preserves drafts across cases', () => {
    mount();
    for (const id of core().ids) {
      build(id); click('Check my evidence'); click('Record specimen report');
      expect(data().cases[id].record.claim).toBe(answers[id]);
    }
    expect(mounted.container.textContent).toContain('6/6 reports recorded');
    openCase('pond');
    expect(mounted.container.querySelector('#micro-mystery-reasoning').value).toContain('supplied structure');
  });
  it('keeps the recorded snapshot intact until a valid replacement is explicitly recorded', () => {
    mount(); build('wall'); click('Check my evidence'); click('Record specimen report');
    const original = JSON.parse(JSON.stringify(data().cases.wall.record));
    const node = write('<img src=x onerror=alert(1)> a draft revision');
    expect(mounted.container.querySelector('#micro-mystery-reasoning')).toBe(node);
    expect(data().cases.wall.record).toEqual(original);
    expect(mounted.container.querySelector('.micro-mystery-record').textContent).toContain(original.reasoning);
    expect(mounted.container.querySelector('img')).toBeNull();
    click('Check my evidence'); click('Update recorded report');
    expect(data().cases.wall.record.reasoning).toContain('<img');
  });
  it('restores incomplete work and recorded reports after section changes and JSON reload', () => {
    mount(); build('unresolved'); click('Check my evidence'); click('Record specimen report');
    write('A revised draft asks for DNA-sequence evidence.');
    click('Practice with the microscope');
    click(mounted.container.querySelector('#micro-tab-mystery'));
    expect(mounted.container.querySelector('#micro-mystery-reasoning').value).toContain('revised draft');
    const restored = JSON.parse(JSON.stringify(mounted.state));
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null;
    mount(restored);
    expect(data()).toEqual(restored.mysteryLab);
    expect(mounted.container.querySelector('.micro-mystery-record')).toBeTruthy();
  });
  it('exports both original reports and current drafts without revealing unobserved case answers', async () => {
    mount(); build('pond'); click('Check my evidence'); click('Record specimen report');
    const savedReport = JSON.parse(JSON.stringify(data().cases.pond.record));
    choice('micro-mystery-evidence', 'behavior');
    choice('micro-mystery-evidence', 'size');
    choice('micro-mystery-limitation', 'species');
    write('My revision is still in progress.');
    let blob;
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(value => { blob = value; return 'blob:mystery-test'; }) });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    click('Download specimen reports');
    const text = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(blob); });
    expect(text).toContain('Recorded claim: Ciliated protist');
    expect(text).toContain('My revision is still in progress.');
    const [recorded, working] = text.split('Current working notes');
    expect(recorded).toContain('The supplied cell map shows membrane-bound compartments');
    expect(recorded).toContain('many cilia beat together');
    expect(recorded).toContain('species and safety remain unknown.');
    expect(recorded).not.toContain('These observations establish the exact species.');
    expect(working).toContain('Current cited observations: Size and shape; Cell structure and chemistry');
    expect(working).not.toContain('Current cited observations: Cell structure and chemistry; Behavior and reproduction');
    expect(working).toContain('Current conclusion about limits: These observations establish the exact species.');
    expect(working).toContain('Revealed observations:\nSample context:');
    expect(data().cases.pond.record).toEqual(savedReport);
    expect(text).not.toContain('Beyond appearances');
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('downloads a limitation-only draft even before a classification or explanation is chosen', async () => {
    mount();
    expect(button('Download specimen reports').disabled).toBe(true);
    choice('micro-mystery-limitation', 'safe');
    expect(button('Download specimen reports').disabled).toBe(false);
    let blob;
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(value => { blob = value; return 'blob:mystery-limits'; }) });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    click('Download specimen reports');
    const text = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(blob); });
    expect(text).toContain('A · Freshwater drifter');
    expect(text).toContain('My classification: No claim yet');
    expect(text).toContain('Current cited observations: No observations selected');
    expect(text).toContain('Current conclusion about limits: Knowing the group proves this sample is safe to handle or eat.');
    expect(text).not.toContain('Recorded claim:');
    expect(text).not.toContain('The supplied cell map shows');
    expect(text).not.toContain('A growing neighbor');
  });
});
