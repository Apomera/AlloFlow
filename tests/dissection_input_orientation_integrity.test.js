import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

function loadProductionFunction(name, bindings = {}, assigned = false) {
  const pattern = assigned
    ? new RegExp('^([ \\t]*)var ' + name + ' = function \\(', 'gm')
    : new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm');
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) throw new Error('Expected one production function: ' + name);
  const match = matches[0];
  const start = match.index + match[1].length + (assigned ? ('var ' + name + ' = ').length : 0);
  const ending = '\n' + match[1] + '}' + (assigned ? ';' : '');
  const end = source.indexOf(ending, start);
  if (end < start) throw new Error('Missing function ending: ' + name);
  const body = source.slice(start, end + ending.length - (assigned ? 1 : 0));
  return new Function(...Object.keys(bindings), '"use strict"; return (' + body + ');')(...Object.values(bindings));
}

function keyboardHarness() {
  const state = { canvasZoom: 2, selectedOrgan: null };
  const target = { tagName: 'CANVAS', closest: () => ({}), matches: () => true };
  const callbacks = Object.fromEntries([
    'setProcedureFeedback', 'focusDissectionTarget', 'panCanvasByControl', 'applyCanvasZoom',
    'changeAnatomicalView', 'cycleLensMagnification', 'toggleInspectionPin', 'cycleLensFocusDepth',
    'selectProcedureInstrument', 'updMany', 'cancelActiveCanvasGesture',
  ].map(name => [name, vi.fn()]));
  const upd = vi.fn((key, value) => { state[key] = value; });
  const handle = loadProductionFunction('dissectionKeyHandler', {
    ...callbacks, upd, d: state, advancedWorkspace: true,
    organs: [{ id: 'heart', name: 'Heart' }], currentProcedure: {},
    structureExposureState: () => 'visible', PROCEDURE_INSTRUMENTS: [],
  }, true);
  function press(key, modifiers = {}) {
    const event = { target, key, preventDefault: vi.fn(), ...modifiers };
    handle(event);
    return event;
  }
  return { target, callbacks, upd, press };
}

describe('dissection canvas shortcut integrity', () => {
  const modifiers = [
    ['Control', { ctrlKey: true }], ['Meta', { metaKey: true }], ['Alt', { altKey: true }],
    ['composition', { isComposing: true }], ['native composition', { nativeEvent: { isComposing: true } }],
    ['legacy composition', { keyCode: 229 }],
  ];
  it.each(modifiers)('leaves %s commands untouched', (_name, modifier) => {
    for (const key of ['f', 'p', 'r', '+', 'ArrowRight', 'Enter', 'Escape']) {
      const h = keyboardHarness();
      const event = h.press(key, modifier);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(h.upd).not.toHaveBeenCalled();
      for (const callback of Object.values(h.callbacks)) expect(callback).not.toHaveBeenCalled();
    }
  });

  it.each(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])('retains Shift + %s panning', key => {
    const h = keyboardHarness();
    const event = h.press(key, { shiftKey: true });
    expect(event.preventDefault).toHaveBeenCalledOnce();
    const x = key === 'ArrowLeft' ? -54 : key === 'ArrowRight' ? 54 : 0;
    const y = key === 'ArrowUp' ? -54 : key === 'ArrowDown' ? 54 : 0;
    expect(h.callbacks.panCanvasByControl).toHaveBeenCalledExactlyOnceWith(
      { currentTarget: h.target }, x, y, key.replace('Arrow', '').toLowerCase());
    expect(h.upd).not.toHaveBeenCalled();
  });

  it('retains normal canvas commands and unmodified structure preview', () => {
    const h = keyboardHarness();
    expect(h.press('f').preventDefault).toHaveBeenCalledOnce();
    expect(h.callbacks.cycleLensFocusDepth).toHaveBeenCalledOnce();
    expect(h.press('r').preventDefault).toHaveBeenCalledOnce();
    expect(h.callbacks.applyCanvasZoom).toHaveBeenCalledExactlyOnceWith(h.target, 1, null, null, true);
    expect(h.press('ArrowRight').preventDefault).toHaveBeenCalledOnce();
    expect(h.upd).toHaveBeenCalledExactlyOnceWith('selectedOrgan', 'heart');
    expect(h.callbacks.setProcedureFeedback).toHaveBeenCalledWith('Previewing Heart. Press Enter to inspect this structure.', 'working');
  });
});

function corridorHarness(view, recommendedView, options = {}) {
  const ctx = new Proxy({}, { get(object, key) {
    if (!(key in object)) object[key] = key === 'measureText'
      ? vi.fn(text => ({ width: text.length * Number(String(object.font).match(/([\d.]+)px/)[1]) * .55 }))
      : key === 'createLinearGradient' ? vi.fn(() => ({ addColorStop: vi.fn() })) : vi.fn();
    return object[key];
  } });
  const fillReadableSpecimenText = vi.fn();
  const draw = loadProductionFunction('drawAnatomicalAccessCorridor', {
    ctx, fillReadableSpecimenText, W: 500, H: 600, cx: 250,
    canvasUiScale: options.canvasUiScale ?? 1, zoom: options.zoom ?? 1,
    specimenTextScaleX: options.textScaleX ?? 1, specimenTextScaleY: options.textScaleY ?? 1,
    d: { visualRealism: 'accessible', incisionDepth: options.depth || 'shallow' },
    visualRealism: 'accessible', highContrastEnabled: !!options.highContrast,
    spec: { bodyShape: 'frog' }, SPECIMEN_MATERIAL_PROFILES: { frog: { compliance: .4 } },
    anatomicalView: view, procedureProtocol: { recommendedView, corridorLabel: 'VENTRAL MIDLINE' },
    adaptiveHotspotLayout: [], hudCompassBox: null,
    specimenScale: { x: (options.mirrored ? -1 : 1) * (options.textScaleX ?? 1), y: options.textScaleY ?? 1 },
  });
  draw([{ x: .5, y: .3 }, { x: .5, y: .5 }, { x: .55, y: .7 }]);
  return { ctx, fillReadableSpecimenText };
}

describe('dissection access corridor orientation', () => {
  it.each(['dorsal', 'ventral'])('keeps the %s-view badge text and padding the same screen size at zoom 1 and 2', view => {
    const dimensions = [1, 2].map(zoom => {
      const options = { zoom, canvasUiScale: 1.6, textScaleX: .82, textScaleY: 1.12, mirrored: view === 'ventral' };
      const h = corridorHarness(view, 'ventral', options);
      const font = Number(String(h.ctx.font).match(/([\d.]+)px/)[1]);
      const [, , width, height] = h.ctx.roundRect.mock.calls.at(-1);
      const text = h.fillReadableSpecimenText.mock.calls[0][0];
      const textScreenWidth = text.length * font * .55 * zoom;
      const boxScreenWidth = width * options.textScaleX * zoom;
      // The text helper cancels the specimen body transform. The card must
      // cancel it independently so zoom and nonuniform body scale cannot clip text.
      expect(boxScreenWidth).toBeGreaterThan(textScreenWidth + 16 * options.canvasUiScale - .01);
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      return { font: font * zoom, width: boxScreenWidth, height: height * options.textScaleY * zoom };
    });
    expect(dimensions[0].font).toBeCloseTo(dimensions[1].font, 6);
    expect(dimensions[0].height).toBeCloseTo(dimensions[1].height, 6);
    // Canvas measurement rounds to logical pixels, so allow the resulting
    // subpixel screen-width difference while preserving all text and padding.
    expect(Math.abs(dimensions[0].width - dimensions[1].width)).toBeLessThan(2);
  });

  it('describes the orientation cue accessibly until the preparation view is aligned', () => {
    const start = source.indexOf("(anatomicalView === procedureProtocol.recommendedView ? '. Guided anatomical access corridor active;");
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf("guided anatomical access corridor')", start);
    expect(end).toBeGreaterThan(start);
    const expression = source.slice(start, end + "guided anatomical access corridor')".length);
    const description = new Function('anatomicalView', 'procedureProtocol', 'return ' + expression + ';');
    expect(description('dorsal', { recommendedView: 'ventral' })).toBe('. Turn to the ventral view to see the guided anatomical access corridor');
    expect(description('ventral', { recommendedView: 'dorsal' })).toBe('. Turn to the dorsal view to see the guided anatomical access corridor');
    expect(description('ventral', { recommendedView: 'ventral' })).toBe('. Guided anatomical access corridor active; circle marks start and diamond marks finish');
  });

  it.each(['dorsal', 'lateral', 'internal'])('replaces route geometry in the %s view with the required orientation', view => {
    const h = corridorHarness(view, 'ventral');
    expect(h.fillReadableSpecimenText).toHaveBeenCalledOnce();
    expect(h.fillReadableSpecimenText.mock.calls[0][0]).toBe('ORIENT TO VENTRAL VIEW');
    expect(h.ctx.arc).not.toHaveBeenCalled();
    expect(h.ctx.moveTo).not.toHaveBeenCalled();
    expect(h.ctx.lineTo).not.toHaveBeenCalled();
    expect(h.ctx.roundRect).toHaveBeenCalledOnce();
    expect(h.ctx.save.mock.calls.length).toBe(h.ctx.restore.mock.calls.length);
  });

  it('uses the specimen preparation view rather than assuming ventral access', () => {
    const h = corridorHarness('ventral', 'dorsal', { depth: 'deep', highContrast: true });
    expect(h.fillReadableSpecimenText.mock.calls[0][0]).toBe('ORIENT TO DORSAL VIEW');
    expect(h.ctx.lineTo).not.toHaveBeenCalled();
  });

  it.each(['shallow', 'deep'])('retains aligned %s route geometry and its existing label', depth => {
    const h = corridorHarness('ventral', 'ventral', { depth, mirrored: true });
    expect(h.ctx.arc).toHaveBeenCalled();
    expect(h.ctx.lineTo).toHaveBeenCalled();
    expect(h.fillReadableSpecimenText.mock.calls[0][0]).toBe(depth === 'deep'
      ? 'DEEP PRACTICE \u00B7 PROTECTED' : 'SAFE \u00B7 VENTRAL MIDLINE');
    expect(h.ctx.save.mock.calls.length).toBe(h.ctx.restore.mock.calls.length);
  });
});
