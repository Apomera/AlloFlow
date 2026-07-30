// Every sub-tool must survive a state slice that names only the sub-tool.
//
// renderDoping read `d.dopant.length` directly while the safe fallback
// (DOPANTS[d.dopant] || DOPANTS.none) sat two lines above it. A slice without a
// `dopant` key therefore threw, and because renderTool swallows render throws the
// WHOLE TOOL went blank -- not just the doping panel. The default state does set
// dopant:'none', so this only bit a partially restored or older persisted slice,
// which is exactly the case nothing else covers.
//
// The same shape is possible in any of the 15 sub-tools, so this walks all of them.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_semiconductor.js';

const SUBTOOLS = [
  'bandgap', 'doping', 'pnjunction', 'transistor', 'gates', 'ivcurve', 'sandbox',
  'waferfab', 'ledspec', 'solarcell', 'moorelaw', 'qwell', 'memory', 'amplifier',
  'dopeHunt',
];

beforeAll(() => {
  resetStemLab();
  loadTool(SOURCE, 'semiconductor');
});

describe('sub-tools render from a bare state slice', () => {
  it.each(SUBTOOLS)('%s produces markup with only { subtool } set', (subtool) => {
    const html = renderTool('semiconductor', { semiconductor: { subtool } });
    // A swallowed render throw shows up as empty or near-empty output.
    expect(html.length, subtool + ' rendered nothing — likely a swallowed throw').toBeGreaterThan(400);
  });

  it.each(SUBTOOLS)('%s survives an entirely empty tool slice', (subtool) => {
    // Some paths hand the tool {} before any state is written.
    const html = renderTool('semiconductor', { semiconductor: {} });
    expect(html.length).toBeGreaterThan(400);
  });

  it('renders with no semiconductor slice at all', () => {
    expect(renderTool('semiconductor', {}).length).toBeGreaterThan(400);
  });
});

describe('doping shows the intrinsic lattice before any dopant is chosen', () => {
  // The intrinsic crystal is the baseline the whole doping lesson builds on: the
  // student is meant to see pure silicon first, then watch a dopant change it.
  it('labels the lattice intrinsic when no dopant is set', () => {
    const html = renderTool('semiconductor', { semiconductor: { subtool: 'doping' } });
    expect(html).toMatch(/intrinsic silicon/i);
  });

  it('treats a missing dopant key exactly like the explicit "none"', () => {
    const missing = renderTool('semiconductor', { semiconductor: { subtool: 'doping' } });
    const explicit = renderTool('semiconductor', { semiconductor: { subtool: 'doping', dopant: 'none' } });
    expect(missing).toBe(explicit);
  });

  it('switches to the doped description once a dopant is chosen', () => {
    const n = renderTool('semiconductor', { semiconductor: { subtool: 'doping', dopant: 'phosphorus' } });
    expect(n).toMatch(/Phosphorus \(P\) doped silicon/i);
    expect(n).not.toMatch(/intrinsic silicon/i);

    const p = renderTool('semiconductor', { semiconductor: { subtool: 'doping', dopant: 'boron' } });
    expect(p).toMatch(/Boron \(B\) doped silicon/i);
  });
});
