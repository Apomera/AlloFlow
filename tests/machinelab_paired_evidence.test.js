import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab
} from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const LEVER = { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400, loadDistance: 0.5 };
const PULLEY = { pulleySegments: 2, pulleyLoad: 400, loadDistance: 0.5 };
let tool;

beforeEach(() => {
  resetStemLab();
  tool = loadTool(FILE, 'machineLab');
});

function descendants(node) {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (!node || typeof node !== 'object') return [];
  return [node, ...descendants(node.props && node.props.children)];
}

function content(node) {
  if (Array.isArray(node)) return node.map(content).join('');
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  return content(node.props && node.props.children);
}

function session(overrides = {}) {
  const store = newStore({ machineLab: {
    view: 'machines', bandOverride: 'g68', bench: 'lever',
    ...LEVER, benchReferences: { lever: { ...LEVER } }, ...overrides
  } });
  const render = () => tool.render(makeCtx({}, store));
  const find = (predicate) => descendants(render()).find(predicate);
  const button = (label) => find((node) => node.type === 'button' && content(node) === label);
  const section = () => find((node) => node.props && node.props['data-ml-experiment'] !== undefined);
  const currentTarget = {
    closest: () => ({ isConnected: false, parentElement: { isConnected: false }, querySelector: () => null })
  };
  return {
    store, render, find, button, section,
    state: () => store.toolData.machineLab,
    patch: (patch) => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    click: (label) => {
      const node = button(label);
      expect(node, `Missing button: ${label}`).toBeTruthy();
      expect(node.props.disabled, `Disabled button: ${label}`).not.toBe(true);
      node.props.onClick({ currentTarget });
    },
    change: (id, value) => {
      const input = find((node) => node.props && node.props.id === id);
      expect(input, `Missing input: ${id}`).toBeTruthy();
      input.props.onChange({ target: { value: String(value) } });
    },
    metric: (name, side) => {
      const row = descendants(section()).find((node) => node.props && node.props['data-ml-experiment-metric'] === name);
      const cell = descendants(row).find((node) => node.props && node.props['data-ml-experiment-value'] === side);
      expect(cell, `Missing evidence value: ${name}/${side}`).toBeTruthy();
      return Number(cell.props['data-value']);
    }
  };
}

describe('Machine Lab: saved paired evidence', () => {
  it('only offers saving a comparison when both setups are valid and different', () => {
    for (const overrides of [
      {},
      { benchReferences: {} },
      { leverEffortArm: 0 },
      { benchReferences: { lever: { ...LEVER, leverLoadArm: 0 } }, leverEffortArm: 4 }
    ]) {
      const s = session(overrides);
      const save = s.button('Save comparison');
      expect(!save || save.props.disabled === true).toBe(true);
      expect(s.state().benchExperiments).toBeUndefined();
    }
    const valid = session({ leverEffortArm: 4 });
    expect(valid.button('Save comparison').props.disabled).not.toBe(true);
  });

  it('captures independent snapshots of every setting, including load and travel', () => {
    const s = session({ leverEffortArm: 4, leverLoad: 600, loadDistance: 1 });
    s.click('Save comparison');
    const saved = s.state().benchExperiments.lever;
    expect(saved).toMatchObject({
      benchId: 'lever', before: { settings: LEVER },
      after: { settings: { ...LEVER, leverEffortArm: 4, leverLoad: 600, loadDistance: 1 } }, note: ''
    });
    expect(saved.before.settings).not.toBe(s.state().benchReferences.lever);
    expect(saved.before.settings).not.toBe(saved.after.settings);
    expect(content(s.section())).toContain('Several settings changed');
  });

  it('keeps the recorded force-distance trade fixed while live controls change', () => {
    const s = session({ leverEffortArm: 4 });
    s.click('Save comparison');
    const evidence = JSON.stringify(s.state().benchExperiments.lever);
    s.change('ml-leverEffortArm', 1);
    expect(JSON.stringify(s.state().benchExperiments.lever)).toBe(evidence);
    expect(s.metric('ma', 'before')).toBe(2);
    expect(s.metric('ma', 'after')).toBe(4);
    expect(s.metric('force', 'before')).toBe(200);
    expect(s.metric('force', 'after')).toBe(100);
    expect(s.metric('distance', 'before')).toBe(1);
    expect(s.metric('distance', 'after')).toBe(2);
    for (const side of ['before', 'after']) {
      expect(s.metric('workIn', side)).toBeCloseTo(200);
      expect(s.metric('workOut', side)).toBeCloseTo(200);
    }
    expect(content(s.section())).not.toContain('Several settings changed');
  });

  it('shows the correct work for each setup when load and travel change', () => {
    const s = session({ leverLoad: 600, loadDistance: 1 });
    s.click('Save comparison');
    expect(s.metric('workIn', 'before')).toBeCloseTo(200);
    expect(s.metric('workOut', 'before')).toBeCloseTo(200);
    expect(s.metric('workIn', 'after')).toBeCloseTo(600);
    expect(s.metric('workOut', 'after')).toBeCloseTo(600);
    expect(content(s.section())).toContain('Several settings changed');
  });

  it('stores the reflection with its evidence and keeps it when leaving the station', () => {
    const s = session({ leverEffortArm: 4 });
    s.click('Save comparison');
    const reflection = s.find((node) => node.type === 'textarea' && node.props['aria-label'] === 'What does your comparison show?');
    expect(reflection).toBeTruthy();
    expect(reflection.props.maxLength).toBe(1200);
    const note = 'The longer effort arm needs half the force and twice the distance.';
    reflection.props.onChange({ target: { value: note } });
    expect(s.state().benchExperiments.lever.note).toBe(note);
    s.patch({ bench: 'pulley' });
    expect(s.section()).toBeUndefined();
    s.patch({ bench: 'lever' });
    const restored = s.find((node) => node.type === 'textarea' && node.props['aria-label'] === 'What does your comparison show?');
    expect(restored.props.value).toBe(note);
  });

  it('replaces one station record without changing another station or its note', () => {
    const other = { benchId: 'pulley', before: { settings: { ...PULLEY } }, after: { settings: { ...PULLEY, pulleySegments: 4 } }, note: 'More rope shares the load.' };
    const s = session({ leverEffortArm: 4, benchExperiments: { pulley: other } });
    s.click('Save comparison');
    s.change('ml-leverEffortArm', 3);
    s.click('Replace comparison record');
    expect(s.state().benchExperiments.lever.after.settings.leverEffortArm).toBe(3);
    expect(s.state().benchExperiments.pulley).toEqual(other);
    expect(Object.keys(s.state().benchExperiments)).toHaveLength(2);
  });

  it('clearing the live saved setup leaves the comparison record available', () => {
    const s = session({ leverEffortArm: 4 });
    s.click('Save comparison');
    const record = JSON.stringify(s.state().benchExperiments.lever);
    const clear = s.button('Clear saved setup') || s.button('Clear comparison');
    expect(clear).toBeTruthy();
    clear.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } });
    expect(s.state().benchReferences.lever).toBeUndefined();
    expect(JSON.stringify(s.state().benchExperiments.lever)).toBe(record);
    expect(s.metric('force', 'after')).toBe(100);
  });

  it('clearing a comparison record preserves its saved setup and other station records', () => {
    const other = { benchId: 'pulley', before: { settings: { ...PULLEY } }, after: { settings: { ...PULLEY, pulleySegments: 4 } }, note: 'Kept.' };
    const s = session({ leverEffortArm: 4, benchExperiments: { pulley: other } });
    s.click('Save comparison');
    s.click('Clear comparison record');
    expect(s.state().benchExperiments.lever).toBeUndefined();
    expect(s.state().benchExperiments.pulley).toEqual(other);
    expect(s.state().benchReferences.lever).toEqual(LEVER);
    expect(s.section()).toBeUndefined();
  });

  it('renders stored evidence without relying on live geometry or a current reference', () => {
    const s = session({
      leverEffortArm: 0, benchReferences: {},
      benchExperiments: { lever: {
        benchId: 'lever', before: { settings: { ...LEVER } },
        after: { settings: { ...LEVER, leverEffortArm: 4 } }, note: 'Recorded before the controls changed.'
      } }
    });
    expect(s.metric('force', 'before')).toBe(200);
    expect(s.metric('force', 'after')).toBe(100);
    const html = ReactDOMServer.renderToStaticMarkup(s.render());
    expect(html).toContain('Recorded before the controls changed.');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
  });

  it('ignores malformed, mismatched, and unchanged imported records', () => {
    const good = { benchId: 'lever', before: { settings: { ...LEVER } }, after: { settings: { ...LEVER, leverEffortArm: 4 } }, note: '' };
    for (const record of [null, {}, [], { ...good, benchId: 'pulley' },
      { ...good, before: {} }, { ...good, after: { settings: { ...LEVER, leverEffortArm: Infinity } } },
      { ...good, after: { settings: { ...LEVER } } }]) {
      const s = session({ benchExperiments: { lever: record } });
      expect(s.section()).toBeUndefined();
      expect(() => ReactDOMServer.renderToStaticMarkup(s.render())).not.toThrow();
    }
  });

  it('bounds notes and prevents an old editor callback from changing a replacement pair', () => {
    const s = session({ leverEffortArm: 4 });
    s.click('Save comparison');
    const oldEditor = s.find((node) => node.type === 'textarea' && node.props['aria-label'] === 'What does your comparison show?');
    oldEditor.props.onChange({ target: { value: 'x'.repeat(1300) } });
    expect(s.state().benchExperiments.lever.note).toHaveLength(1200);
    s.change('ml-leverEffortArm', 3);
    s.click('Replace comparison record');
    oldEditor.props.onChange({ target: { value: 'This explanation belongs to the previous pair.' } });
    expect(s.state().benchExperiments.lever.note).toBe('');
    expect(s.state().benchExperiments.lever.after.settings.leverEffortArm).toBe(3);
  });
});
