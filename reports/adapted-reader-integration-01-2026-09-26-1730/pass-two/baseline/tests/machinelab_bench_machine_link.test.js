import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const MACHINES = ['trebuchet', 'ballista', 'onager'];
const BENCHES = ['lever', 'pulley', 'windlass', 'ramp', 'wedge', 'screw'];

const state = (o = {}) => ({ machineLab: Object.assign({ view: 'build' }, o) });

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'machineLab');
});

// The tool's whole thesis is that a siege engine is the six simple machines
// bolted together. That was asserted in the Field Manual and nowhere else: a
// student could prove every bench and never see the trebuchet beam AS the lever
// they just proved. These two panels are the link.
describe('Machine Lab: the engine names its own simple machines', () => {
  for (const machine of MACHINES) {
    it(`names the parts of the ${machine}`, () => {
      const html = renderTool('machineLab', state({ machine }));
      expect(html).toContain('Simple machines in this engine');
      expect(html).toContain('the winch drum and handle');
      expect(html).toContain('the cocking tackle');
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('undefined');
    });
  }

  it('shows the trebuchet beam as a lever with its live velocity ratio', () => {
    // 4.5 m long arm over 1.2 m short arm = 3.75, and it must move with the
    // sliders rather than being a fixed bit of prose.
    const html = renderTool('machineLab', state({ machine: 'trebuchet', beamLong: 4.5, beamShort: 1.2 }));
    expect(html).toContain('the throwing beam');
    expect(html).toContain('3.75×');

    const longer = renderTool('machineLab', state({ machine: 'trebuchet', beamLong: 6, beamShort: 1.2 }));
    expect(longer).toContain('5×');
  });

  it('shows the winch and tackle advantages from the live controls', () => {
    const html = renderTool('machineLab', state({ winchHandleR: 0.45, winchDrumR: 0.09, winchPulleys: 3 }));
    expect(html).toContain('5×');    // 0.45 / 0.09 wheel-and-axle
    expect(html).toContain('3×');    // three supporting rope segments
  });

  it('gives the torsion machines a screw and the trebuchet a ramp', () => {
    const treb = renderTool('machineLab', state({ machine: 'trebuchet' }));
    const ball = renderTool('machineLab', state({ machine: 'ballista' }));
    expect(treb).toContain('the loading ramp');
    expect(treb).not.toContain('the bundle tensioning gear');
    expect(ball).toContain('the bundle tensioning gear');
    expect(ball).not.toContain('the loading ramp');
  });

  it('is honest about which advantages the model does not compute', () => {
    // The trigger wedge is really in the mechanism but is not in the energy
    // model, and saying so is better than printing a number we did not derive.
    const html = renderTool('machineLab', state({ machine: 'trebuchet' }));
    expect(html).toContain('in the build');
  });

  it('offers a way through to each bench', () => {
    const html = renderTool('machineLab', state({ machine: 'ballista' }));
    expect(html).toMatch(/aria-label="Open the bench for the two spring arms"/);
    expect(html).toMatch(/aria-label="Open the bench for the cocking tackle"/);
  });

  it('restates the no-free-energy point at every band', () => {
    for (const band of ['k2', 'g35', 'g68', 'g912']) {
      const html = renderTool('machineLab', state({ bandOverride: band }));
      expect(html, band).toContain('Simple machines in this engine');
    }
    expect(renderTool('machineLab', state({ bandOverride: 'g68' })))
      .toContain('not one of them adds any energy');
  });
});

describe('Machine Lab: a bench points back at the engines', () => {
  for (const bench of BENCHES) {
    it(`tells you where the ${bench} bench turns up`, () => {
      const html = renderTool('machineLab', { machineLab: { view: 'machines', bench } });
      expect(html).toContain('Where you meet this machine');
      expect(html).toContain('these six, bolted together.');
    });
  }

  it('names the trebuchet beam from the lever bench', () => {
    const html = renderTool('machineLab', { machineLab: { view: 'machines', bench: 'lever' } });
    expect(html).toContain('Trebuchet');
    expect(html).toContain('the throwing beam');
    expect(html).toContain('the two spring arms');
  });

  it('lists only the torsion machines for the screw bench', () => {
    const html = renderTool('machineLab', { machineLab: { view: 'machines', bench: 'screw' } });
    expect(html).toContain('Ballista');
    expect(html).toContain('Onager');
    // The trebuchet has no tensioning screw, so it must not be claimed here.
    const section = html.slice(html.indexOf('Where you meet this machine'));
    expect(section).not.toContain('Trebuchet');
  });

  it('lists only the trebuchet for the ramp bench', () => {
    const html = renderTool('machineLab', { machineLab: { view: 'machines', bench: 'ramp' } });
    const section = html.slice(html.indexOf('Where you meet this machine'));
    expect(section).toContain('Trebuchet');
    expect(section).not.toContain('Ballista');
  });

  it('offers a way through to each engine', () => {
    const html = renderTool('machineLab', { machineLab: { view: 'machines', bench: 'windlass' } });
    expect(html).toMatch(/aria-label="Open the Trebuchet"/);
    expect(html).toMatch(/aria-label="Open the Onager"/);
  });
});

describe('Machine Lab: the two panels agree with each other', () => {
  let table;
  beforeEach(() => { table = loadTool(FILE, 'machineLab')._machineBenches; });

  it('declares which benches each engine is built from', () => {
    expect(Object.keys(table).sort()).toEqual(['ballista', 'onager', 'trebuchet']);
    for (const machine of MACHINES) {
      expect(Array.isArray(table[machine])).toBe(true);
      expect(table[machine].length).toBeGreaterThan(3);
      for (const bench of table[machine]) {
        expect(BENCHES, machine + ' claims unknown bench ' + bench).toContain(bench);
      }
      expect(new Set(table[machine]).size).toBe(table[machine].length);
    }
  });

  it('matches the bench-to-engine direction exactly, with no drift either way', () => {
    // Invert the table and check the Machine Shop panel names precisely the
    // engines the table says use that bench: no missing ones, no invented ones.
    for (const bench of BENCHES) {
      const expected = MACHINES.filter((m) => table[m].includes(bench));
      const shop = renderTool('machineLab', { machineLab: { view: 'machines', bench } });
      const idx = shop.indexOf('Where you meet this machine');
      const section = idx === -1 ? '' : shop.slice(idx);
      for (const machine of MACHINES) {
        const label = machine[0].toUpperCase() + machine.slice(1);
        const named = section.includes('>' + label + '<');
        expect(named, bench + ' / ' + machine + ': panel says ' + named + ', table says ' + expected.includes(machine))
          .toBe(expected.includes(machine));
      }
    }
  });

  it('lists every bench the table claims in the Build panel', () => {
    for (const machine of MACHINES) {
      const build = renderTool('machineLab', state({ machine }));
      const buttons = (build.match(/aria-label="Open the bench for [^"]+"/g) || []);
      expect(buttons.length, machine).toBe(table[machine].length);
    }
  });
});
