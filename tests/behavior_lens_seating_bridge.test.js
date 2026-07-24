// BehaviorLens ↔ Seating Chart bridge — source-contract pins.
//
// The bridge is deliberately thin: ABCModal's "Use seating chart position"
// button resolves window.AlloModules.SeatingChart.describeSeatForStudent
// (lazy-loading the module via __alloLazySeatingChart when absent) and the
// ABA graph reads rosterKey.seating.history for seating-change markers.
// These greps pin the privacy-relevant parts of that contract so a refactor
// can't silently drop them.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('behavior_lens_module.js', 'utf8');
const MIRROR = readFileSync('desktop/web-app/public/behavior_lens_module.js', 'utf8');

describe('BehaviorLens seating bridge contract', () => {
  it('mirror is a byte-copy of the root module', () => {
    expect(MIRROR).toBe(SRC);
  });

  it('ABCModal receives studentName + addToast and gates the button on studentName', () => {
    expect(SRC).toContain('const ABCModal = ({ entry, onSave, onClose, t, callGemini, studentName, addToast })');
    expect(SRC).toMatch(/studentName && h\('div', \{ className: 'flex flex-wrap items-center gap-2 mt-1\.5' \}/);
  });

  it('neighbor names are opt-in (checkbox default false, passed through)', () => {
    expect(SRC).toContain('const [includeNeighbors, setIncludeNeighbors] = useState(false)');
    expect(SRC).toContain('{ includeNeighbors: includeNeighbors }');
  });

  it('resolves the seating module defensively and lazy-loads when absent', () => {
    expect(SRC).toContain("window.AlloModules && window.AlloModules.SeatingChart");
    expect(SRC).toContain("typeof mod.describeSeatForStudent === 'function'");
    expect(SRC).toContain("typeof window.__alloLazySeatingChart === 'function'");
  });

  it('ABA graph markers read seating history, are toggleable, and skip undated data', () => {
    expect(SRC).toContain("rk.seating && Array.isArray(rk.seating.history)");
    expect(SRC).toContain('const [showSeatMarkers, setShowSeatMarkers] = useState(true)');
    expect(SRC).toContain('if (dated.length < 2) return [];');
    expect(SRC).toContain("...(showSeatMarkers ? seatingMarkers : []).map");
  });
});
