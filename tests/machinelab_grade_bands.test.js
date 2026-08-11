import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const BANDS = ['k2', 'g35', 'g68', 'g912'];
const BENCHES = ['lever', 'pulley', 'windlass', 'ramp', 'wedge', 'screw'];

let cfg;

function state(overrides = {}) {
  return { machineLab: Object.assign({ view: 'machines', bench: 'lever' }, overrides) };
}

beforeEach(() => {
  resetStemLab();
  cfg = loadTool(FILE, 'machineLab');
});

describe('Machine Lab: band resolution', () => {
  const resolve = (ctx, override) => cfg._resolveBand(ctx, override);

  it('prefers an explicit in-tool override', () => {
    expect(resolve({ gradeBand: 'g68' }, 'k2')).toBe('k2');
  });

  it('uses the host gradeBand when there is no override', () => {
    for (const b of BANDS) {
      expect(resolve({ gradeBand: b }, null)).toBe(b);
    }
  });

  it('derives a band from gradeLevel when the host omits gradeBand', () => {
    // The smoke harness supplies gradeLevel but not gradeBand, so this path is
    // the one the tests themselves exercise.
    expect(resolve({ gradeLevel: 'Kindergarten' }, null)).toBe('k2');
    expect(resolve({ gradeLevel: '2nd Grade' }, null)).toBe('k2');
    expect(resolve({ gradeLevel: '4th Grade' }, null)).toBe('g35');
    expect(resolve({ gradeLevel: '7th Grade' }, null)).toBe('g68');
    expect(resolve({ gradeLevel: '11th Grade' }, null)).toBe('g912');
    expect(resolve({ gradeLevel: 'College' }, null)).toBe('g912');
  });

  it('falls back to g68 rather than blanking on an unrecognised band', () => {
    // A band value that reaches the content lookup unrecognised is what
    // silently emptied fifteen semiconductor sub-tools.
    expect(resolve({ gradeBand: 'martian' }, null)).toBe('g68');
    expect(resolve({}, null)).toBe('g68');
    expect(resolve({ gradeBand: '' }, 'also-nonsense')).toBe('g68');
    expect(resolve(null, null)).toBe('g68');
  });
});

describe('Machine Lab: every band renders every bench', () => {
  for (const band of BANDS) {
    for (const benchId of BENCHES) {
      it(`renders ${benchId} at ${band} without throwing or blanking`, () => {
        const html = renderTool('machineLab', state({ bench: benchId, bandOverride: band }));
        expect(html).toBeTruthy();
        expect(html.length).toBeGreaterThan(400);
        expect(html).not.toContain('undefined');
        expect(html).not.toContain('NaN');
        // Mechanical advantage is shown at every level, including K-2.
        expect(html.toLowerCase()).toContain('mechanical advantage');
      });
    }
  }
});

describe('Machine Lab: bands restate rather than filter', () => {
  it('shows all six benches at every band', () => {
    for (const band of BANDS) {
      const html = renderTool('machineLab', state({ bandOverride: band }));
      // Nothing is hidden below a grade band: every bench tab is always present.
      expect(html).toContain('Lever');
      expect(html).toContain('Pulley');
      expect(html).toContain('Wheel &amp; Axle');
      expect(html).toContain('Inclined Plane');
      expect(html).toContain('Wedge');
      expect(html).toContain('Screw');
    }
  });

  it('gives each band its own wording for the same machine', () => {
    const k2 = renderTool('machineLab', state({ bench: 'lever', bandOverride: 'k2' }));
    const g912 = renderTool('machineLab', state({ bench: 'lever', bandOverride: 'g912' }));
    expect(k2).toContain('seesaw');
    expect(k2).not.toContain('massless');
    expect(g912).toContain('moments about the fulcrum');
    expect(k2).not.toBe(g912);
  });

  it('withholds the formula line from k2 but shows it from g35 up', () => {
    const k2 = renderTool('machineLab', state({ bench: 'ramp', bandOverride: 'k2' }));
    const g35 = renderTool('machineLab', state({ bench: 'ramp', bandOverride: 'g35' }));
    expect(k2).not.toContain('MA = ramp length');
    expect(g35).toContain('MA = ramp length');
  });

  it('shows the work-in/work-out ledger only from g68 up', () => {
    const g35 = renderTool('machineLab', state({ bench: 'lever', bandOverride: 'g35' }));
    const g68 = renderTool('machineLab', state({ bench: 'lever', bandOverride: 'g68' }));
    expect(g35).not.toContain('Work in:');
    expect(g68).toContain('Work in:');
    expect(g68).toContain('Work out:');
    expect(g68).toContain('identical');
  });
});

describe('Machine Lab: answer position is rotated, not authored-in-place', () => {
  it('does not place the correct k2 answer in the same slot on every bench', () => {
    // The scanner reads static literals, so the correct answer must not always
    // be first. Rotation happens at module scope by bench index.
    const positions = new Set();
    for (const benchId of BENCHES) {
      const choices = cfg._benchChoices(benchId);
      // Guard the premise: if the accessor ever returns nothing, this test must
      // fail loudly rather than pass on an empty set.
      expect(Array.isArray(choices)).toBe(true);
      expect(choices.length).toBeGreaterThan(1);
      const idx = choices.findIndex((o) => o.correct);
      expect(idx).toBeGreaterThanOrEqual(0);
      positions.add(idx);
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('keeps exactly one correct option per bench after rotation', () => {
    for (const benchId of BENCHES) {
      const choices = cfg._benchChoices(benchId);
      expect(choices.filter((o) => o.correct).length).toBe(1);
    }
  });
});

describe('Machine Lab: partial stored state is filled from defaults', () => {
  it('renders real numbers when the stored state predates the current controls', () => {
    // A snapshot saved by an earlier build, or any restore through
    // ctx.toolSnapshots, arrives without the keys this build expects. Before
    // the defaults fill, this rendered a wall of "—" and unset sliders while
    // reporting a successful load.
    const html = renderTool('machineLab', { machineLab: { view: 'machines', bench: 'lever' } });
    expect(html).toContain('2×');            // MA from the default 2 m / 1 m arms
    expect(html).toContain('400 N');         // default load
    expect(html).toContain('value="2"');     // slider actually bound
    expect(html).not.toContain('NaN');
  });

  it('keeps the stored values that ARE present rather than overwriting them', () => {
    const html = renderTool('machineLab', {
      machineLab: { bench: 'lever', leverEffortArm: 3, leverLoadArm: 1, bandOverride: 'g68' }
    });
    expect(html).toContain('3×');            // 3 m / 1 m, not the 2x default
  });
});

describe('Machine Lab: invalid geometry degrades honestly', () => {
  it('shows a dash instead of a number when the ramp cannot exist', () => {
    const html = renderTool('machineLab', state({
      bench: 'ramp', bandOverride: 'g68', rampLength: 1, rampHeight: 4
    }));
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
    expect(html).toContain('—');
  });
});
