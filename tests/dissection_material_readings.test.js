import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

function loadProductionFunction(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw new Error('Expected one production function: ' + name);
  const match = matches[0], start = match.index + match[1].length;
  const ending = '\n' + match[1] + '}', end = source.indexOf(ending, start);
  if (end < start) throw new Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

function freeze(value) {
  if (value && typeof value === 'object') Object.values(value).forEach(freeze);
  return value && typeof value === 'object' ? Object.freeze(value) : value;
}

const normalizeToolCalibration = loadProductionFunction('normalizeToolCalibration');
const calibrationRangeScore = loadProductionFunction('calibrationRangeScore');
const calibrationControlDefinition = loadProductionFunction('calibrationControlDefinition');
const toolCalibrationScore = loadProductionFunction('toolCalibrationScore', { normalizeToolCalibration, calibrationRangeScore });
const instrumentCalibrationAssessment = loadProductionFunction('instrumentCalibrationAssessment', { toolCalibrationScore, calibrationControlDefinition });

// Only unrelated readiness inputs are fixtures: calibration and material math
// execute their production implementations against immutable action evidence.
function readings(toolId = 'scalpel', live = {}, recorded = {}, options = {}) {
  const toolCalibration = freeze(normalizeToolCalibration(live));
  const state = freeze({
    toolCalibration: normalizeToolCalibration(recorded), calibrationScore: 100,
    calibrationScores: { [toolId]: 100 },
    tissueState: { clarity: 80, risk: 10, ...options.tissue },
    actionEvidence: [{ id: 'recorded-contact', toolCalibration: { ...recorded } }],
  });
  const before = JSON.stringify({ state, toolCalibration });
  const procedureProtocol = freeze({ cutResistance: 40, recommendedView: 'ventral', failureMode: 'Avoid tearing the tissue.', ...options.protocol });
  const material = loadProductionFunction('procedureMaterialInteractionData', {
    toolCalibration, toolCalibrationScore, procedureProtocol,
    specimenCondition: options.condition || 'fresh', activeMaterialProfile: { response: 'Elastic recoil' },
  });
  const readiness = loadProductionFunction('procedureToolReadinessData', {
    currentProcedure: state, toolCalibration, instrumentCalibrationAssessment, procedureProtocol,
    procedureMaterialInteractionData: material,
    PROCEDURE_INSTRUMENTS: [{ id: toolId, label: toolId }, { id: 'probe', label: 'Probe' }],
    procedureInstrumentStatus: () => ({ readiness: 'ready', label: 'Waiting', instruction: 'Finish the previous step.', ...options.status }),
    nextProcedureInfo: () => ({ action: toolId, instrument: toolId, label: 'Open the tissue', ...options.next }),
    procedureLearningGateFor: () => ({ required: false, ...options.learning }),
    observationFieldData: () => ({ quality: 80, ...options.field }),
    normalizeTissueState: tissue => tissue,
    currentScenarioDefinition: () => ({ id: options.scenario || 'practice' }),
    d: { anatomicalView: 'ventral', incisionDepth: 'shallow', ...options.data }, anatomicalView: 'ventral',
    procedureActionLabel: action => action,
  });
  return { state, toolCalibration, material, readiness, expectPreserved() {
    expect(JSON.stringify({ state, toolCalibration })).toBe(before);
  } };
}

const checks = result => Object.fromEntries(result.checks.map(check => [check.id, check.ready]));

describe('dissection material readings use current calibration', () => {
  it.each([
    ['scalpel', { bladeAngle: 60 }, { bladeAngle: 25 }, 20, false],
    ['scalpel', { bladeAngle: 25 }, { bladeAngle: 60 }, 100, true],
    ['scissors', { scissorsAperture: 70 }, { scissorsAperture: 35 }, 20, false],
    ['scissors', { scissorsAperture: 35 }, { scissorsAperture: 70 }, 100, true],
    ['probe', { probePressure: 80 }, { probePressure: 30 }, 20, false],
    ['probe', { probePressure: 30 }, { probePressure: 80 }, 100, true],
  ])('%s follows live %j instead of recorded %j', (toolId, live, recorded, score, safe) => {
    const h = readings(toolId, live, recorded);
    expect(h.material(toolId, h.state).calibration).toBe(score);
    for (const state of [h.state, undefined]) {
      const result = h.readiness(toolId, state);
      expect(result.calibration.score).toBe(score);
      expect(result.material.calibration).toBe(score);
      expect(result.safeToAct).toBe(safe);
      expect(checks(result).calibration).toBe(safe);
      expect(result.material.margin).toBe(score - 65);
    }
    h.expectPreserved();
  });

  it.each([
    [30, 12, 'Calibration supports a controlled opening.'],
    [32, 11, 'Proceed slowly at the current calibration.'],
    [70, 0, 'Proceed slowly at the current calibration.'],
    [75, -1, 'Recalibrate before cutting this material.'],
  ])('uses the response boundary at resistance %i and margin %i', (resistance, margin, response) => {
    const h = readings('scalpel', { bladeAngle: 43 }, { bladeAngle: 25 }, { protocol: { cutResistance: resistance } });
    expect(h.material('scalpel', h.state)).toMatchObject({ resistance, calibration: 74, margin, response });
    const result = h.readiness('scalpel');
    expect(checks(result)).toEqual({ sequence: true, learning: true, calibration: true, field: true, contact: margin >= 0 });
    expect(result.safeToAct).toBe(margin >= 0);
    h.expectPreserved();
  });

  it.each([
    ['fresh', 40, 40], ['dehydrated', 40, 52], ['preserved', 40, 47], ['swollen', 40, 45],
    ['dehydrated', 95, 100], ['fresh', 150, 100], ['fresh', -10, 0],
    ['dehydrated', -10, 12], ['fresh', 0, 40], ['fresh', 'invalid', 40],
  ])('preserves %s resistance normalization for %s', (condition, input, resistance) => {
    const h = readings('scalpel', {}, {}, { condition, protocol: { cutResistance: input } });
    expect(h.material('scalpel', h.state)).toMatchObject({ resistance, calibration: 100, margin: 100 - Math.round(54 + resistance * 0.28) });
    h.expectPreserved();
  });

  it.each([[47, 'Low-resistance material'], [48, 'Moderate-resistance material'], [75, 'Moderate-resistance material'], [76, 'High-resistance material']])(
    'classifies resistance %i as %s', (resistance, label) => {
      const h = readings('scalpel', {}, {}, { protocol: { cutResistance: resistance } });
      expect(h.material('scalpel').label).toBe(label);
    });

  it.each([[47.5, 60, true], [47.8125, 59, false]])('keeps the calibration gate at 60 for blade angle %s', (bladeAngle, score, ready) => {
    const h = readings('scalpel', { bladeAngle }, {}, { protocol: { cutResistance: 10 } });
    const result = h.readiness('scalpel');
    expect(result.calibration.score).toBe(score);
    expect(checks(result)).toEqual({ sequence: true, learning: true, calibration: ready, field: true, contact: true });
    expect(result.safeToAct).toBe(ready);
  });

  it('does not apply cutting resistance to a calibrated non-cutting instrument', () => {
    const h = readings('probe', { probePressure: 59 }, { probePressure: 80 }, { protocol: { cutResistance: 100 } });
    const result = h.readiness('probe');
    expect(result.material).toMatchObject({ calibration: 60, margin: -22, response: 'Elastic recoil expected at contact.' });
    expect(result.safeToAct).toBe(true);
    expect(checks(result).contact).toBe(true);
    h.expectPreserved();
  });

  it.each([
    ['sequence', { next: { instrument: 'probe' } }, 'sequence', 'waiting'],
    ['prediction', { learning: { required: true, phase: 'predict' } }, 'learning', 'waiting'],
    ['reflection', { learning: { required: true, phase: 'reflect', action: 'scalpel' } }, 'learning', 'waiting'],
    ['clarity', { tissue: { clarity: 44 } }, 'field', 'caution'],
    ['risk', { tissue: { risk: 70 } }, 'field', 'caution'],
    ['view', { data: { anatomicalView: 'dorsal' } }, 'field', 'caution'],
    ['depth', { data: { incisionDepth: 'deep' } }, 'contact', 'caution'],
  ])('good current calibration preserves the %s gate', (_name, options, failedCheck, tone) => {
    const h = readings('scalpel', { bladeAngle: 25 }, { bladeAngle: 60 }, options);
    const result = h.readiness('scalpel');
    expect(result.calibration.score).toBe(100);
    expect(checks(result).calibration).toBe(true);
    expect(checks(result)[failedCheck]).toBe(false);
    expect(result.tone).toBe(tone);
    expect(result.safeToAct).toBe(false);
    h.expectPreserved();
  });

  it.each([
    ['dropper', { scenario: 'restricted-tray' }, 'restricted'],
    ['scalpel', { next: { action: 'complete' } }, 'complete'],
    ['scalpel', { status: { readiness: 'complete' } }, 'complete'],
    ['scalpel', { status: { readiness: 'waiting' } }, 'waiting'],
  ])('preserves %s availability for %j', (toolId, options, tone) => {
    const h = readings(toolId, {}, {}, options);
    const result = h.readiness(toolId);
    expect(result.tone).toBe(tone);
    expect(result.safeToAct).toBe(false);
    h.expectPreserved();
  });
});

function materialReview(data = {}) {
  const saved = freeze({ specimen: 'frog', activeLayer: 'skin', workspaceMode: 'advanced', activeInstrument: 'probe',
    quizMode: false, practicalMode: false, toolCalibration: { probePressure: 30 },
    organNotes: { heart: 'Keep this observation' }, visualEvidence: [{ id: 'capture' }],
    procedureByLayer: { skin: { inspected: true, calibrationScores: { probe: 100 } } }, ...data });
  const before = JSON.stringify(saved);
  const forbidden = vi.fn(() => { throw new Error('Calibration review must only navigate within the live lab.'); });
  const root = { isConnected: true }, sibling = { isConnected: true };
  const current = { root }, originRoot = { root };
  const document = { querySelector: forbidden, getElementById: forbidden };
  const origin = { ownerDocument: document, getClientRects: vi.fn(() => [{}]), closest: vi.fn(() => originRoot.root) };
  const canvas = { _drawD: saved }, siblingCanvas = { _drawD: saved };
  const target = { getClientRects: vi.fn(() => [{}]), focus: vi.fn(() => { document.activeElement = target; }), scrollIntoView: vi.fn() };
  const members = new Set([origin, canvas, target]);
  root.contains = node => members.has(node);
  document.activeElement = origin;
  const canvases = new Map([[root, canvas], [sibling, siblingCanvas]]), targets = new Map([[root, target]]);
  const header = { current: null };
  const query = vi.fn((scope, selector) => {
    if (selector === '[data-diss-canvas]') return canvases.get(scope) || null;
    if (selector === '#diss-calibration-range') return targets.get(scope) || null;
    if (selector === '.diss-next-action') return scope === root ? header.current : null;
    throw new Error('Unexpected scoped navigation query: ' + selector);
  });
  const review = loadProductionFunction('reviewMaterialCalibration', {
    fieldReadinessContext: saved, currentDissectionRootNode: () => current.root, scopedDissectionQuery: query,
    d: freeze({ ...saved, activeInstrument: 'scalpel', workspaceMode: 'essentials' }), document,
    window: { setTimeout: forbidden, requestAnimationFrame: forbidden },
    upd: forbidden, updMany: forbidden, updateProcedure: forbidden, setProcedureFeedback: forbidden,
    focusDissectionTarget: forbidden, selectProcedureInstrument: forbidden,
    setTimeout: forbidden, clearTimeout: forbidden, requestAnimationFrame: forbidden, scheduleDissectionCanvasTimer: forbidden,
  });
  function expectPreserved() {
    expect(JSON.stringify(saved)).toBe(before);
    expect(siblingCanvas._drawD).toBe(saved);
    expect(forbidden).not.toHaveBeenCalled();
  }
  function expectNavigation(allowed = true) {
    if (allowed) {
      expect(target.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
      expect(target.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'start', behavior: 'auto' });
      expect(target.focus.mock.invocationCallOrder[0]).toBeLessThan(target.scrollIntoView.mock.invocationCallOrder[0]);
    } else {
      expect(target.focus).not.toHaveBeenCalled();
      expect(target.scrollIntoView).not.toHaveBeenCalled();
    }
    expect(document.activeElement).toBe(allowed ? target : origin);
    expectPreserved();
  }
  return { saved, root, sibling, current, originRoot, origin, canvas, target, members, canvases, targets, header, query, document, review,
    event: { currentTarget: origin }, expectPreserved, expectNavigation };
}

function scrollGeometry(h, { position = 'sticky', value = '', priority = '', computedMargin = '80px' } = {}) {
  const properties = new Map([['color', { value: 'navy', priority: '' }]]);
  if (value) properties.set('scroll-margin-top', { value, priority });
  const before = new Map(properties);
  h.target.style = {
    getPropertyValue: key => properties.get(key)?.value || '', getPropertyPriority: key => properties.get(key)?.priority || '',
    setProperty: vi.fn((key, nextValue, nextPriority) => properties.set(key, { value: nextValue, priority: nextPriority })),
    removeProperty: vi.fn(key => properties.delete(key)),
  };
  h.header.current = { getBoundingClientRect: vi.fn(() => ({ height: 170 })) };
  h.document.defaultView = { getComputedStyle: node => {
    if (node === h.header.current) return { position, top: '16px' };
    if (node === h.target) return { scrollMarginTop: computedMargin };
    throw new Error('Computed style requested outside the originating lab.');
  } };
  return { properties, before, style: h.target.style };
}

describe('dissection material calibration review', () => {
  it('synchronously focuses and scrolls the originating lab control without editing saved work', () => {
    const h = materialReview();
    h.review(h.event);
    h.expectNavigation();
    expect(h.canvas._drawD).toBe(h.saved);
    expect(h.origin.closest).toHaveBeenCalledExactlyOnceWith('[data-dissection-root]');
    expect(h.query.mock.calls).toEqual([[h.root, '[data-diss-canvas]'], [h.root, '#diss-calibration-range']]);
  });

  it('uses the current canvas and preserves newer work within the captured context', () => {
    const h = materialReview();
    const latest = freeze({ ...h.saved, toolCalibration: { probePressure: 70 }, organNotes: { liver: 'A later observation' } });
    const replacement = { _drawD: latest };
    h.canvases.set(h.root, replacement);
    h.review(h.event);
    h.expectNavigation();
    expect(replacement._drawD).toBe(latest);
  });

  it('uses captured context when the canvas has no live snapshot', () => {
    const h = materialReview();
    delete h.canvas._drawD;
    h.review(h.event);
    h.expectNavigation();
    expect(h.canvas).not.toHaveProperty('_drawD');
  });

  it.each([
    ['missing event', h => { h.event = undefined; }],
    ['missing origin', h => { h.event = {}; }],
    ['unscoped origin', h => { delete h.origin.closest; }],
    ['origin outside a lab', h => { h.originRoot.root = null; }],
    ['hidden origin', h => { h.origin.getClientRects.mockReturnValue([]); }],
    ['detached origin', h => { h.members.delete(h.origin); }],
    ['detached root', h => { h.root.isConnected = false; }],
    ['missing current root', h => { h.current.root = null; }],
    ['replaced root', h => { h.current.root = h.sibling; }],
    ['sibling origin', h => { h.originRoot.root = h.sibling; }],
    ['missing canvas', h => { h.canvases.delete(h.root); }],
  ])('rejects a %s before querying calibration', (_name, change) => {
    const h = materialReview();
    change(h);
    h.review(h.event);
    h.expectNavigation(false);
    expect(h.query.mock.calls.some(([, selector]) => selector === '#diss-calibration-range')).toBe(false);
  });

  it.each([
    ['quiz', { quizMode: true }], ['practical', { practicalMode: true }],
    ['specimen', { specimen: 'earthworm' }], ['layer', { activeLayer: 'muscle' }],
    ['workspace', { workspaceMode: 'essentials' }], ['instrument', { activeInstrument: 'scalpel' }],
  ])('rejects a changed %s context', (_name, patch) => {
    const h = materialReview();
    const latest = freeze({ ...h.saved, ...patch });
    h.canvas._drawD = latest;
    h.review(h.event);
    h.expectNavigation(false);
    expect(h.canvas._drawD).toBe(latest);
  });

  it.each(['quizMode', 'practicalMode'])('retains the %s guard without a live snapshot', flag => {
    const h = materialReview({ [flag]: true });
    delete h.canvas._drawD;
    h.review(h.event);
    h.expectNavigation(false);
  });

  it.each([
    [undefined, undefined, true], [undefined, 'probe', true], ['probe', undefined, true],
    [undefined, 'scalpel', false], ['scalpel', undefined, false],
  ])('compares legacy instrument %s with live %s using the probe default', (captured, current, allowed) => {
    const h = materialReview({ activeInstrument: captured });
    h.canvas._drawD = freeze({ ...h.saved, activeInstrument: current });
    h.review(h.event);
    h.expectNavigation(allowed);
  });

  it.each([
    ['missing', h => { h.targets.delete(h.root); }],
    ['hidden', h => { h.target.getClientRects.mockReturnValue([]); }],
  ])('leaves focus intact for a %s calibration target', (_name, change) => {
    const h = materialReview();
    change(h);
    h.review(h.event);
    h.expectNavigation(false);
  });

  it.each([
    ['sticky', '', '', '80px', '198px'],
    ['fixed', '2em', 'important', '240px', '240px'],
  ])('temporarily clears a %s header and restores the prior margin', (position, value, priority, computedMargin, margin) => {
    const h = materialReview(), geometry = scrollGeometry(h, { position, value, priority, computedMargin });
    h.target.scrollIntoView.mockImplementation(() => {
      expect(h.target.style.getPropertyValue('scroll-margin-top')).toBe(margin);
      expect(h.target.style.getPropertyPriority('scroll-margin-top')).toBe('important');
      expect(h.document.activeElement).toBe(h.target);
    });
    h.review(h.event);
    h.expectNavigation();
    expect(geometry.properties).toEqual(geometry.before);
    expect(h.query.mock.calls.every(([scope]) => scope === h.root)).toBe(true);
  });

  it.each([['', ''], ['6rem', 'important']])('restores inline margin %s even if scrolling throws', (value, priority) => {
    const h = materialReview(), geometry = scrollGeometry(h, { value, priority });
    const failure = new Error('Host scrolling failed');
    h.target.scrollIntoView.mockImplementation(() => { throw failure; });
    expect(() => h.review(h.event)).toThrow(failure);
    expect(geometry.properties).toEqual(geometry.before);
    expect(h.document.activeElement).toBe(h.target);
    h.expectPreserved();
  });

  it.each(['static', 'missing header', 'missing style', 'missing view'])('navigates without a margin override for %s', condition => {
    const h = materialReview(), geometry = scrollGeometry(h, { position: 'static', value: '3rem' });
    if (condition === 'missing header') h.header.current = null;
    if (condition === 'missing style') delete h.target.style;
    if (condition === 'missing view') delete h.document.defaultView;
    h.review(h.event);
    h.expectNavigation();
    expect(geometry.style.setProperty).not.toHaveBeenCalled();
    expect(geometry.properties).toEqual(geometry.before);
  });
});
