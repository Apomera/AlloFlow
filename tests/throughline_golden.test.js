// Render golden master for mind_map_module.js (Throughline — the spatial unit
// builder, registered as window.AlloModules.MindMap / .Throughline).
//
// MANDATORY Step 0 of the Generate-Unit build (docs/generate_unit_design.md):
// this was the only major module with no characterization net. Pins the v1+v1.1
// render across the load-bearing states (manual / host-wired / populated /
// units-aware) BEFORE the long async driver + review state machine land, so a
// structural regression in the canvas, empty state, toolbar, node cards, edges,
// or outline fails loudly instead of shipping silently.
//
// Determinism: Date + Math.random frozen (the module's uid()/emptyUnit() use
// them). Re-baseline an INTENTIONAL render change with:
//   npx vitest -u tests/throughline_golden.test.js

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import {
  renderState, seedStorage, clearStorage, setupThroughline,
  sampleUnit, sampleHistory, sampleUnits, sampleGenProps,
} from './helpers/throughline_harness.js';

function digest(html) {
  const count = (re) => (html.match(re) || []).length;
  return {
    lengthBucket: Math.round(html.length / 200),
    buttons: count(/role="button"|<button/g),
    svgs: count(/<svg/g),
    inputs: count(/<input/g),
    textareas: count(/<textarea/g),
    sha: crypto.createHash('sha256').update(html).digest('hex').slice(0, 16),
  };
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.4242);
});
afterAll(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
beforeEach(() => clearStorage());

describe('Throughline render goldens', () => {
  it('registers window.AlloModules.MindMap + .Throughline (the live gate chain)', () => {
    setupThroughline();
    expect(typeof window.AlloModules.Throughline).toBe('function');
    expect(window.AlloModules.MindMap).toBe(window.AlloModules.Throughline);
  });

  it('closed (isOpen:false) renders nothing', () => {
    expect(renderState({ isOpen: false })).toBe('');
  });

  it('manual mode (5 props, empty) — empty state + manual-import hint', () => {
    const html = renderState({});
    expect(html.length).toBeGreaterThan(0);
    expect(digest(html)).toMatchSnapshot();
  });

  it('host-wired empty (history + currentLesson + onOpenLesson)', () => {
    const html = renderState({
      history: sampleHistory(),
      currentLesson: sampleHistory()[0],
      onOpenLesson: () => {},
      inLiveSession: false,
    });
    expect(digest(html)).toMatchSnapshot();
  });

  it('units-aware empty (history with unitId + units prop)', () => {
    const html = renderState({
      history: sampleHistory(),
      units: sampleUnits(),
      onOpenLesson: () => {},
    });
    expect(digest(html)).toMatchSnapshot();
  });

  it('populated unit (seeded localStorage + matching history) — cards + edges', () => {
    seedStorage(sampleUnit());
    const html = renderState({ history: sampleHistory(), units: sampleUnits(), onOpenLesson: () => {} });
    // a populated canvas has node cards (buttons) and at least one edge line/svg
    expect(html).toMatch(/Water Cycle/);
    expect(digest(html)).toMatchSnapshot();
  });

  it('Generate-Unit capability wired → toolbar shows the ✨ button', () => {
    // the t-stub returns the i18n key verbatim, so the label renders as the key
    const html = renderState(Object.assign({ history: sampleHistory(), onOpenLesson: () => {} }, sampleGenProps()));
    expect(html).toMatch(/throughline\.gen_btn/);
    expect(html).not.toMatch(/disabled/);   // enabled when not in a live session
    expect(digest(html)).toMatchSnapshot();
  });

  it('Generate-Unit button is disabled in a live class session (hard block)', () => {
    const html = renderState(Object.assign({ history: sampleHistory(), inLiveSession: true, onOpenLesson: () => {} }, sampleGenProps()));
    expect(html).toMatch(/throughline\.gen_btn/);
    expect(html).toMatch(/disabled/);       // rendered, but as a disabled control
    expect(digest(html)).toMatchSnapshot();
  });

  it('populated unit tolerates a dangling lessonId without crashing (normalize guard)', () => {
    const u = sampleUnit();
    u.nodes.push({ nodeId: 'n3', lessonId: 'ghost', x: 600, y: 120, description: '', role: '', status: 'draft', category: null });
    u.edges.push({ from: 'n2', to: 'n3', type: 'prerequisite' });
    seedStorage(u);
    const html = renderState({ history: sampleHistory(), onOpenLesson: () => {} });
    expect(html.length).toBeGreaterThan(0);
    expect(digest(html)).toMatchSnapshot();
  });
});
