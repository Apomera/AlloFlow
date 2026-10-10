import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const BENCHES = [
  { id: 'lever', label: 'Lever', defaultControl: 'leverEffortArm', load: 'leverLoad',
    settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 },
    controls: [{ key: 'leverEffortArm', min: 0.2, max: 4, step: 0.1 }, { key: 'leverLoadArm', min: 0.2, max: 4, step: 0.1 }], ma: d => d.leverEffortArm / d.leverLoadArm },
  { id: 'pulley', label: 'Pulley', defaultControl: 'pulleySegments', load: 'pulleyLoad',
    settings: { pulleySegments: 2, pulleyLoad: 400 },
    controls: [{ key: 'pulleySegments', min: 1, max: 6, step: 1 }], ma: d => d.pulleySegments },
  { id: 'windlass', label: 'Wheel & Axle', defaultControl: 'windlassHandleR', load: 'windlassLoad',
    settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 },
    controls: [{ key: 'windlassHandleR', min: 0.05, max: 0.8, step: 0.05 }, { key: 'windlassDrumR', min: 0.02, max: 0.4, step: 0.01 }], ma: d => d.windlassHandleR / d.windlassDrumR },
  { id: 'ramp', label: 'Inclined Plane', defaultControl: 'rampLength', load: 'rampLoad',
    settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 },
    controls: [{ key: 'rampLength', min: 0.5, max: 8, step: 0.1 }, { key: 'rampHeight', min: 0.2, max: 4, step: 0.1 }], ma: d => d.rampHeight <= d.rampLength ? d.rampLength / d.rampHeight : null },
  { id: 'wedge', label: 'Wedge', defaultControl: 'wedgeLength', load: 'wedgeLoad',
    settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 },
    controls: [{ key: 'wedgeLength', min: 0.05, max: 0.6, step: 0.01 }, { key: 'wedgeThickness', min: 0.01, max: 0.2, step: 0.005 }], ma: d => d.wedgeLength / d.wedgeThickness },
  { id: 'screw', label: 'Screw', defaultControl: 'screwPitch', load: 'screwLoad',
    settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 },
    controls: [{ key: 'screwHandleR', min: 0.02, max: 0.5, step: 0.01 }, { key: 'screwPitch', min: 0.001, max: 0.02, step: 0.001 }], ma: d => 2 * Math.PI * d.screwHandleR / d.screwPitch }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
const SELECTED_CONTROLS = BENCHES.flatMap(b => b.controls.map(c => ({ bench: b, control: c, name: `${b.id}/${c.key}` })));
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool(FILE, 'machineLab'); });

function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function record(extra = {}) {
  return { benchId: 'lever', settings: { ...BENCHES[0].settings, loadDistance: 0.5 },
    limits: { force: 100, travel: 3 }, control: 'leverLoadArm', note: 'The force exceeds my limit.', ...extra };
}
function session(extra = {}) {
  const store = newStore({ machineLab: { view: 'machines', bench: 'lever', bandOverride: 'g68', ...BASE, ...extra } });
  const render = () => tool.render(makeCtx({}, store));
  const find = predicate => nodes(render()).find(predicate);
  const currentTarget = { closest: () => ({ isConnected: false, querySelector: () => null }) };
  const button = label => find(n => n.type === 'button' && text(n) === label);
  return {
    store, render, find, button, state: () => store.toolData.machineLab,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    html: () => ReactDOMServer.renderToStaticMarkup(render()),
    select: () => find(n => n.type === 'select' && n.props.id === `ml-design-control-${store.toolData.machineLab.bench}`),
    choose: key => {
      const select = find(n => n.type === 'select' && n.props.id === `ml-design-control-${store.toolData.machineLab.bench}`);
      expect(select).toBeTruthy(); select.props.onChange({ target: { value: key } });
    },
    click: label => { const node = button(label); expect(node, `Missing button ${label}`).toBeTruthy(); expect(node.props.disabled).not.toBe(true); node.props.onClick({ currentTarget }); },
    invoke: node => node.props.onClick({ currentTarget }),
    stationNote: () => find(n => n.type === 'textarea' && n.props.id === `ml-design-note-${store.toolData.machineLab.bench}`),
    workNote: bench => find(n => n.type === 'textarea' && n.props.id === `ml-record-design-note-${bench}`)
  };
}
function legalValues(b, c, setup, force = 5000, travel = 300) {
  const values = [];
  for (let i = 0; i <= Math.round((c.max - c.min) / c.step); i++) {
    const value = Number((c.min + i * c.step).toFixed(10));
    const candidate = { ...setup, [c.key]: value }, ma = b.ma(candidate);
    if (ma && candidate[b.load] / ma <= force + 1e-8 && candidate.loadDistance * ma <= travel + 1e-8) values.push(value);
  }
  return values;
}

describe('Machine Lab: learner-selected design geometry', () => {
  it.each(BENCHES)('offers only the $id geometry controls, with the existing default', b => {
    const s = session({ bench: b.id });
    expect(s.select().props.value).toBe(b.defaultControl);
    const options = nodes(s.select()).filter(n => n.type === 'option');
    expect(options.map(n => n.props.value)).toEqual(b.controls.map(c => c.key));
    expect(options.map(n => n.props.value)).not.toContain(b.load);
    expect(options.map(n => n.props.value)).not.toContain('loadDistance');
  });

  it('changes the chosen-control draft while keeping the task, geometry and other stations intact', () => {
    const drafts = { lever: { force: '125', travel: '2.5' }, pulley: { force: '200', travel: '4' } };
    const s = session({ benchDesignLimits: drafts });
    s.choose('leverLoadArm');
    expect(s.state().benchDesignLimits.lever).toEqual({ force: '125', travel: '2.5', control: 'leverLoadArm' });
    expect(s.state().benchDesignLimits.pulley).toEqual(drafts.pulley);
    for (const key of Object.keys(BASE)) expect(s.state()[key]).toBe(BASE[key]);
    const force = s.find(n => n.props?.id === 'ml-design-force-lever');
    force.props.onChange({ target: { value: '140' } });
    expect(s.state().benchDesignLimits.lever.control).toBe('leverLoadArm');
    s.patch({ bench: 'pulley' }); expect(s.select().props.value).toBe('pulleySegments');
    s.patch({ bench: 'lever' }); expect(s.select().props.value).toBe('leverLoadArm');
  });

  it.each(SELECTED_CONTROLS)('reports exactly the legal increments for $name even when the current setup fits', ({ bench: b, control: c }) => {
    const s = session({ bench: b.id, benchDesignLimits: { [b.id]: { force: '5000', travel: '300', control: c.key } } });
    const expected = legalValues(b, c, BASE);
    const feasible = s.find(n => n.props?.['data-ml-design-feasible'] === c.key);
    expect(feasible, `Missing feasible choices for ${c.key}`).toBeTruthy();
    expect(Number(feasible.props['data-count'])).toBe(expected.length);
    expect(Number(feasible.props['data-min'])).toBe(expected[0]);
    expect(Number(feasible.props['data-max'])).toBe(expected.at(-1));
    expect(s.button('Apply suggested setting')).toBeUndefined();
  });

  it('reports no pulley increment in a continuous interval between whole strand counts', () => {
    const s = session({ bench: 'pulley', pulleyLoad: 420,
      benchDesignLimits: { pulley: { force: '200', travel: '1.25', control: 'pulleySegments' } } });
    const feasible = s.find(n => n.props?.['data-ml-design-feasible'] === 'pulleySegments');
    expect(Number(feasible.props['data-count'])).toBe(0);
    expect(feasible.props['data-min']).toBeUndefined();
    expect(feasible.props['data-max']).toBeUndefined();
    expect(s.button('Apply suggested setting')).toBeUndefined();
  });

  it('applies the selected denominator control and preserves the fixed task', () => {
    const s = session({ benchDesignLimits: { lever: { force: '100', travel: '3', control: 'leverLoadArm' } } });
    const suggestion = s.find(n => n.props?.['data-ml-design-suggestion'] === 'leverLoadArm');
    expect(Number(suggestion.props['data-value'])).toBe(0.5);
    s.click('Apply suggested setting');
    expect(s.state().leverLoadArm).toBe(0.5);
    expect(s.state().leverEffortArm).toBe(2);
    expect(s.state().leverLoad).toBe(400);
    expect(s.state().loadDistance).toBe(0.5);
  });

  it('rejects a stale Apply after the learner chooses another geometry control', () => {
    const s = session(), oldApply = s.button('Apply suggested setting');
    expect(oldApply).toBeTruthy(); s.choose('leverLoadArm');
    const before = structuredClone(s.state());
    s.invoke(oldApply); expect(s.state()).toEqual(before);
  });

  it('falls back to the legal default when an imported draft selects a load or unknown key', () => {
    for (const control of ['leverLoad', 'loadDistance', 'unknown']) {
      const s = session({ benchDesignLimits: { lever: { force: '100', travel: '3', control } } });
      expect(s.select().props.value).toBe('leverEffortArm');
    }
  });
});

describe('Machine Lab: recorded design decisions', () => {
  it.each(BENCHES)('records fixed task settings, numeric limits and the chosen geometry at $id', b => {
    const control = b.controls.at(-1).key;
    const s = session({ bench: b.id, benchDesignLimits: { [b.id]: { force: '5000', travel: '300', control } } });
    s.click('Record this design');
    const saved = s.state().benchDesignRecords[b.id];
    expect(saved).toMatchObject({ benchId: b.id, settings: { ...b.settings, loadDistance: 0.5 }, limits: { force: 5000, travel: 300 }, control, note: '' });
    expect(Object.keys(saved.settings).sort()).toEqual([...Object.keys(b.settings), 'loadDistance'].sort());
    expect(s.find(n => n.props?.['data-ml-design-recorded'] === b.id)).toBeTruthy();
    expect(s.button('Replace design record')).toBeTruthy();
  });

  it('records a design that misses the limits so learners can explain the failure', () => {
    const s = session(); s.click('Record this design');
    const saved = s.state().benchDesignRecords.lever;
    expect(saved.settings.leverEffortArm).toBe(2);
    expect(saved.limits).toEqual({ force: 100, travel: 3 });
    s.patch({ view: 'learn', manualTopic: 'record' });
    const row = s.find(n => n.props?.['data-ml-design-record-station'] === 'lever');
    expect(text(row)).toContain('does not meet both limits');
  });

  it('preserves recorded comparison evidence, guided predictions, saved setups and other designs', () => {
    const comparison = { lever: { benchId: 'lever', before: { settings: { ...BASE } }, after: { settings: { ...BASE, leverEffortArm: 4 } }, note: 'My comparison.' } };
    const investigations = { lever: { id: 'lever-one-change-v1', force: 'less', distance: 'more', tested: true } };
    const references = { pulley: { pulleySegments: 2, pulleyLoad: 400, loadDistance: 0.5 } };
    const other = { benchId: 'pulley', settings: references.pulley, limits: { force: 200, travel: 2 }, control: 'pulleySegments', note: 'Pulley writing.' };
    const s = session({ benchExperiments: comparison, benchInvestigations: investigations, benchReferences: references, benchDesignRecords: { pulley: other } });
    s.click('Record this design');
    expect(s.state().benchExperiments).toBe(comparison);
    expect(s.state().benchInvestigations).toBe(investigations);
    expect(s.state().benchReferences).toBe(references);
    expect(s.state().benchDesignRecords.pulley).toBe(other);
  });

  it('keeps saved settings and limits fixed when live task settings and draft limits change', () => {
    const s = session(); s.click('Record this design');
    const saved = s.state().benchDesignRecords.lever;
    s.patch({ leverEffortArm: 4, leverLoad: 800, loadDistance: 1,
      benchDesignLimits: { lever: { force: '500', travel: '8', control: 'leverLoadArm' } } });
    expect(s.state().benchDesignRecords.lever).toBe(saved);
    expect(saved.settings).toEqual({ ...BENCHES[0].settings, loadDistance: 0.5 });
    expect(saved.limits).toEqual({ force: 100, travel: 3 });
    expect(saved.control).toBe('leverEffortArm');
  });

  it('replaces only this station design and starts a fresh explanation', () => {
    const other = { benchId: 'pulley', settings: { ...BENCHES[1].settings, loadDistance: 0.5 }, limits: { force: 200, travel: 2 }, control: 'pulleySegments', note: 'Keep this.' };
    const s = session({ benchDesignRecords: { lever: record(), pulley: other } });
    s.patch({ leverEffortArm: 4 }); s.click('Replace design record');
    expect(s.state().benchDesignRecords.lever.settings.leverEffortArm).toBe(4);
    expect(s.state().benchDesignRecords.lever.note).toBe('');
    expect(s.state().benchDesignRecords.pulley).toBe(other);
  });

  it.each([
    ['geometry', { leverLoadArm: 1.1 }], ['load', { leverLoad: 500 }], ['movement', { loadDistance: 0.6 }],
    ['limits', { benchDesignLimits: { lever: { force: '125', travel: '3' } } }],
    ['chosen control', { benchDesignLimits: { lever: { force: '100', travel: '3', control: 'leverLoadArm' } } }],
    ['station', { bench: 'pulley' }]
  ])('rejects stale recording after the %s changes', (_label, patch) => {
    const s = session(), oldSave = s.button('Record this design'); expect(oldSave).toBeTruthy();
    s.patch(patch); const before = structuredClone(s.state());
    s.invoke(oldSave); expect(s.state()).toEqual(before);
  });

  it('does not record invalid limits or invalid station geometry', () => {
    for (const patch of [{ benchDesignLimits: { lever: { force: '', travel: '3' } } }, { leverLoadArm: 0 }]) {
      const s = session(patch), button = s.button('Record this design');
      expect(!button || button.props.disabled === true).toBe(true);
      if (button) s.invoke(button);
      expect(s.state().benchDesignRecords?.lever).toBeUndefined();
    }
  });

  it.each(['station', 'work record'])('edits a bounded explanation from the %s and keeps snapshots untouched across successive edits', view => {
    const original = record(), s = session({ benchDesignRecords: { lever: original }, ...(view === 'work record' ? { view: 'learn', manualTopic: 'record' } : {}) });
    const editor = view === 'station' ? s.stationNote() : s.workNote('lever');
    expect(editor).toBeTruthy();
    editor.props.onChange({ target: { value: 'Revised\nUse <script> as literal text.' } });
    editor.props.onChange({ target: { value: 'x'.repeat(1500) } });
    const saved = s.state().benchDesignRecords.lever;
    expect(saved.note).toBe('x'.repeat(1200));
    expect(saved.settings).toBe(original.settings); expect(saved.limits).toBe(original.limits);
    expect(saved.control).toBe(original.control);
    editor.props.onChange({ target: { value: '' } }); expect(s.state().benchDesignRecords.lever.note).toBe('');
  });

  it.each(['station', 'work record'])('rejects stale note callbacks in the %s after record replacement', view => {
    const s = session({ benchDesignRecords: { lever: record() }, ...(view === 'work record' ? { view: 'learn', manualTopic: 'record' } : {}) });
    const editor = view === 'station' ? s.stationNote() : s.workNote('lever');
    const replacement = record({ note: 'New record.' }); s.patch({ benchDesignRecords: { lever: replacement } });
    editor.props.onChange({ target: { value: 'Stale write.' } });
    expect(s.state().benchDesignRecords.lever).toBe(replacement);
  });

  it.each([
    ['wrong station', record({ benchId: 'pulley' })], ['missing task settings', record({ settings: { leverEffortArm: 2 } })],
    ['string geometry', record({ settings: { ...BASE, leverEffortArm: '2' } })],
    ['outside geometry bounds', record({ settings: { ...BASE, leverEffortArm: 9 } })],
    ['nonfinite limit', record({ limits: { force: NaN, travel: 3 } })],
    ['string limit', record({ limits: { force: '100', travel: 3 } })],
    ['outside force range', record({ limits: { force: 5001, travel: 3 } })],
    ['outside travel range', record({ limits: { force: 100, travel: 301 } })],
    ['load selected as geometry', record({ control: 'leverLoad' })]
  ])('omits an imported record with %s from station and work-record evidence', (_label, invalid) => {
    const s = session({ benchDesignRecords: { lever: invalid } });
    expect(s.find(n => n.props?.['data-ml-design-recorded'] === 'lever')).toBeUndefined();
    s.patch({ view: 'learn', manualTopic: 'record' });
    expect(s.find(n => n.props?.['data-ml-design-record-station'] === 'lever')).toBeUndefined();
    expect(s.workNote('lever')).toBeUndefined();
  });

  it('recomputes frozen outcomes, escapes student writing and exports the saved design rather than live settings', async () => {
    const saved = record({ note: 'Before\nAfter <script>literal</script>', force: 9999, travel: 9999, fits: true });
    const s = session({ view: 'learn', manualTopic: 'record', leverEffortArm: 4, leverLoad: 800,
      benchDesignLimits: { lever: { force: '500', travel: '8', control: 'leverEffortArm' } }, benchDesignRecords: { lever: saved } });
    const row = s.find(n => n.props?.['data-ml-design-record-station'] === 'lever');
    const evidence = text(row);
    expect(evidence).toContain('200 N'); expect(evidence).toContain('1 m');
    expect(evidence).toContain('does not meet both limits'); expect(evidence).not.toContain('9999');
    expect(s.workNote('lever').props.value).toBe(saved.note);
    expect(s.html()).not.toContain('<script>literal</script>');
    const write = vi.fn(async () => true); window.StemLab.writeClipboard = write;
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } });
    try {
      const copy = s.find(n => n.type === 'button' && /Copy.*record/i.test(text(n)));
      expect(copy).toBeTruthy(); s.invoke(copy); await Promise.resolve();
      expect(write).toHaveBeenCalled();
      const copied = write.mock.calls[0][0];
      expect(copied).toContain('Recorded design: Lever');
      expect(copied).toContain('Maximum effort force: 100 N');
      expect(copied).toContain('Maximum total hand travel: 3 m');
      expect(copied).toContain('Chosen setting: Load arm');
      expect(copied).toContain('200 N'); expect(copied).toContain('1 m');
      expect(copied).toContain(saved.note); expect(copied).not.toContain('9999');
    } finally {
      if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
      else delete navigator.clipboard;
    }
  });

  it('reviews the saved design station without loading its frozen settings or erasing records', () => {
    const records = { lever: record() };
    const s = session({ view: 'learn', manualTopic: 'record', bench: 'pulley', leverEffortArm: 3, benchDesignRecords: records, shopAnimating: true });
    const review = s.find(n => n.type === 'button' && text(n).startsWith('Review design at station'));
    expect(review).toBeTruthy(); s.invoke(review);
    expect(s.state().view).toBe('machines'); expect(s.state().bench).toBe('lever');
    expect(s.state().leverEffortArm).toBe(3); expect(s.state().shopAnimating).toBe(false);
    expect(s.state().benchDesignRecords).toBe(records);
  });

  it.each([
    ['Apply suggested setting', 'ml-leverEffortArm', { benchDesignLimits: { lever: { force: '100', travel: '3', control: 'leverLoadArm' } } }],
    ['Record this design', 'ml-design-note-lever', { leverLoad: 500 }]
  ])('moves focus after an accepted %s and preserves focus when its stale callback is rejected', (label, targetId, drift) => {
    vi.useFakeTimers();
    const panel = document.createElement('details'); panel.open = true; panel.setAttribute('data-ml-design', 'lever');
    const trigger = document.createElement('button'); trigger.textContent = label;
    const target = document.createElement('input'); target.id = targetId; target.scrollIntoView = vi.fn();
    panel.append(trigger, target); document.body.append(panel);
    const focus = vi.spyOn(target, 'focus');
    try {
      const stale = session(), oldCallback = stale.button(label); expect(oldCallback).toBeTruthy();
      stale.patch(drift); const before = structuredClone(stale.state());
      trigger.focus(); oldCallback.props.onClick({ currentTarget: trigger });
      vi.runOnlyPendingTimers();
      expect(stale.state()).toEqual(before);
      expect(focus).not.toHaveBeenCalled();
      expect(target.scrollIntoView).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(trigger);

      const accepted = session(), currentCallback = accepted.button(label); expect(currentCallback).toBeTruthy();
      trigger.focus(); currentCallback.props.onClick({ currentTarget: trigger });
      vi.runOnlyPendingTimers();
      expect(focus).toHaveBeenCalledOnce();
      expect(target.scrollIntoView).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(target);
    } finally {
      panel.remove(); focus.mockRestore(); vi.useRealTimers();
    }
  });
});
