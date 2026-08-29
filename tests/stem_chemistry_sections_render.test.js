// Render smoke for the chemistry sections that only exist behind a tab.
//
// WHY THIS FILE EXISTS
// dev-tools/check_stem_render.cjs renders each tool in its DEFAULT state. Molecule
// opens with no reference section expanded and chemBalance opens on its hub, so a
// throw inside the equilibrium simulator, the gas-law sandbox or the balance-tab
// particle view is invisible to that gate, to the render goldens (same default
// state), and to every pure-science test in this repo - those exercise the maths on
// window.__alloMoleculePure and never build a single element.
//
// So this renders each of those sections with its tab actually open, and asserts the
// controls a student needs are really there. A ReferenceError in a section renderer
// is the exact failure this catches, and nothing else was catching it.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const MOLECULE = 'stem_lab/stem_tool_molecule.js';
const CHEMBALANCE = 'stem_lab/stem_tool_chembalance.js';

function frag(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

// Atoms inside one molecule cluster. Each atom is a <circle> inside its own <g>;
// the cluster's own direct-child <circle> is the dashed "these are one molecule"
// ring, which :scope > g > circle correctly leaves out. If the markup is ever
// restructured this counts 0 and the assertions FAIL - the safe direction.
function atomCircles(moleculeGroup) {
  return moleculeGroup.querySelectorAll(':scope > g > circle').length;
}

describe('Molecule — sections that live behind a tab', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
  });

  function section(id, extra = {}) {
    return frag(renderTool('molecule', { molecule: { expSection: id, ...extra } }));
  }

  it('renders the Le Chatelier simulator with all ten stresses reachable', () => {
    const el = section('equilibrium');
    expect(el.querySelector('[data-testid="mol-equilibrium-sim"]')).toBeTruthy();

    for (const id of ['addN2', 'addH2', 'addNH3', 'removeNH3', 'compress', 'expand', 'heat', 'cool', 'catalyst', 'inert', 'reset']) {
      expect(el.querySelector(`[data-eq-stress="${id}"]`), 'stress button ' + id).toBeTruthy();
    }
    // Every stress is a real button, not a div wearing a click handler - so it is
    // reachable by keyboard and announced as a button.
    for (const btn of el.querySelectorAll('[data-eq-stress]')) {
      expect(btn.tagName).toBe('BUTTON');
      expect(btn.getAttribute('type')).toBe('button');
    }

    // The particle box has to be described, since it carries the whole picture.
    const box = el.querySelector('[data-testid="mol-equilibrium-sim"] svg[role="img"]');
    expect(box.getAttribute('aria-label')).toContain('Particle box');
    expect(box.querySelectorAll('[data-eq-species]').length).toBeGreaterThan(0);

    // The status line is a live region: pressing a stress must ANNOUNCE the result,
    // not just redraw it, or the simulator is mute to a screen-reader user.
    const status = el.querySelector('[data-testid="mol-eq-status"]');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent.length).toBeGreaterThan(20);

    // The original reference table was carried across, not replaced.
    expect(el.textContent).toContain('Le Chatelier');
    expect(el.textContent).toContain('Add catalyst');
  });

  it('reports the settled mixture, and shows Q = K at rest', () => {
    const el = section('equilibrium');
    const text = el.textContent;
    expect(text).toContain('N₂(g) + 3 H₂(g) ⇌ 2 NH₃(g)');
    expect(text).toMatch(/Kc\(T\)/);
    expect(text).toContain('= K');            // Q equals K in a settled state
    expect(text).toMatch(/NH₃ share/);
    // States the model's limits rather than presenting it as the real plant.
    expect(text).toMatch(/van .t Hoff/);
  });

  it('renders the gas-law sandbox with a slider for every variable it does not solve', () => {
    const el = section('gaslaws');
    expect(el.querySelector('[data-testid="mol-gaslaws"]')).toBeTruthy();

    // Default solves for P, so P is a readout and the other three are sliders.
    expect(el.querySelector('[data-gl-result="P"]')).toBeTruthy();
    for (const id of ['gl-V', 'gl-n', 'gl-T']) {
      const input = el.querySelector('#' + id);
      expect(input, 'slider ' + id).toBeTruthy();
      expect(input.getAttribute('type')).toBe('range');
      // A range with no accessible name and no value text is unusable by ear.
      expect(el.querySelector(`label[for="${id}"]`), 'label for ' + id).toBeTruthy();
      expect(input.getAttribute('aria-valuetext')).toBeTruthy();
    }
    // The solve-for selector covers all four.
    for (const k of ['P', 'V', 'n', 'T']) {
      expect(el.querySelector(`[data-gl-solve="${k}"]`), 'solve-for ' + k).toBeTruthy();
    }
  });

  it('moves the readout to whichever variable is being solved for', () => {
    const solvingV = section('gaslaws', { glSolve: 'V' });
    expect(solvingV.querySelector('[data-gl-result="V"]')).toBeTruthy();
    expect(solvingV.querySelector('[data-gl-result="P"]')).toBeFalsy();
    // P becomes a slider in exchange.
    expect(solvingV.querySelector('#gl-P')).toBeTruthy();
    expect(solvingV.querySelector('#gl-V')).toBeFalsy();
  });

  it('shows temperature in Celsius alongside Kelvin wherever it appears', () => {
    // The tab is about the Kelvin trap; hiding Celsius entirely would just move the
    // confusion rather than resolve it. Both are shown, with Kelvin driving the maths.
    const el = section('gaslaws');
    expect(el.textContent).toMatch(/°C/);
    expect(el.querySelector('#gl-T').getAttribute('aria-valuetext')).toMatch(/degrees Celsius/);
  });

  it('works the Kelvin trap with real numbers rather than just warning about it', () => {
    const el = section('gaslaws');
    const trap = el.querySelector('[data-testid="mol-gl-kelvin"]');
    expect(trap).toBeTruthy();
    expect(trap.textContent).toContain('50 / 25 = ×2.00');        // the wrong way
    expect(trap.textContent).toContain('323.15 / 298.15 = ×1.084'); // the right way
  });

  it('compares real and ideal pressure at the student’s own conditions', () => {
    const el = section('gaslaws');
    const real = el.querySelector('[data-testid="mol-gl-real"]');
    expect(real).toBeTruthy();
    expect(real.textContent).toMatch(/Ideal.*bar/);
    expect(real.textContent).toMatch(/Van der Waals/);

    // Switching gas changes the comparison - if it did not, the card would be decoration.
    const co2 = section('gaslaws', { glGas: 'CO2', glV: 1, gln: 1, glT: 300 });
    const he = section('gaslaws', { glGas: 'He', glV: 1, gln: 1, glT: 300 });
    expect(co2.querySelector('[data-testid="mol-gl-real"]').textContent)
      .not.toBe(he.querySelector('[data-testid="mol-gl-real"]').textContent);
  });

  it('keeps the original ten gas-law reference cards', () => {
    const el = section('gaslaws');
    for (const name of ["Boyle's Law", "Charles's Law", 'Ideal Gas Law', "Graham's Law of Effusion"]) {
      expect(el.textContent, name).toContain(name);
    }
  });

  it('survives the extremes of every slider without throwing or printing NaN', () => {
    const corners = [
      { glP: 0.1, glV: 0.5, gln: 0.1, glT: 100 },
      { glP: 50, glV: 50, gln: 5, glT: 1000 },
      { glP: 50, glV: 0.5, gln: 5, glT: 100 },
    ];
    for (const solve of ['P', 'V', 'n', 'T']) {
      for (const corner of corners) {
        const el = section('gaslaws', { ...corner, glSolve: solve });
        expect(el.querySelector('[data-testid="mol-gaslaws"]'), solve + ' ' + JSON.stringify(corner)).toBeTruthy();
        expect(el.textContent).not.toContain('NaN');
        expect(el.textContent).not.toContain('Infinity');
      }
    }
  });

  it('shrugs off junk in stored state instead of rendering a broken tab', () => {
    // toolData is persisted, so a stale or hand-edited value is reachable in the wild.
    const el = section('gaslaws', { glP: 'banana', glV: null, gln: undefined, glT: NaN, glSolve: 'nonsense', glGas: 'unobtainium' });
    expect(el.querySelector('[data-testid="mol-gaslaws"]')).toBeTruthy();
    expect(el.textContent).not.toContain('NaN');

    const eq = section('equilibrium', { eqT: 'hot', eqN2: null });
    expect(eq.querySelector('[data-testid="mol-equilibrium-sim"]')).toBeTruthy();
    expect(eq.textContent).not.toContain('NaN');
  });
});

describe('ChemBalance — the balance tab', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
  });

  function balance(data = {}) {
    return frag(renderTool('chemBalance', { chemBalance: { subtool: 'balance', _everPicked: true, ...data } }));
  }

  it('draws one molecule cluster per coefficient, for every preset in the bank', () => {
    // The particle view is generated from preset.atoms, so a preset with an atom
    // count the packing helper had not considered would throw here and nowhere else.
    const el = balance({ equation: 'Glucose Combustion', coefficients: [1, 6, 6, 6] });
    const view = el.querySelector('[data-testid="chem-particle-view"]');
    expect(view).toBeTruthy();

    // Slot 1 carries a coefficient of 6, so six separate O₂ molecules are drawn.
    expect(view.querySelectorAll('[data-pv-slot="1"]').length).toBe(6);
    // Glucose, C₆H₁₂O₆, is one molecule of 24 atoms - not 24 loose atoms.
    const glucose = view.querySelectorAll('[data-pv-slot="0"]');
    expect(glucose.length).toBe(1);
    expect(glucose[0].getAttribute('data-pv-atoms')).toBe('24');
    // COUNT THE CIRCLES, do not take the attribute's word for it. An earlier version
    // of the packing helper could return fewer positions than atoms, which dropped
    // atoms out of the picture while this attribute still cheerfully reported 24.
    expect(atomCircles(glucose[0])).toBe(24);
  });

  it('draws exactly as many atoms as the formula says, for every molecule in the view', () => {
    // The guarantee that makes the picture trustworthy: no molecule is ever drawn
    // with atoms missing, whatever its size or the packing helper's ring maths.
    for (const [equation, coefficients] of [
      ['Water Formation', [2, 1, 2]],
      ['Glucose Combustion', [1, 6, 6, 6]],
      ['Ethanol Combustion', [1, 3, 2, 3]],
      ['Photosynthesis', [6, 6, 1, 6]],
    ]) {
      const view = balance({ equation, coefficients }).querySelector('[data-testid="chem-particle-view"]');
      const drawn = view.querySelectorAll('[data-pv-atoms]');
      expect(drawn.length, equation).toBeGreaterThan(0);
      for (const molecule of drawn) {
        const claimed = Number(molecule.getAttribute('data-pv-atoms'));
        expect(atomCircles(molecule), equation + ' molecule claiming ' + claimed + ' atoms').toBe(claimed);
      }
    }
  });

  it('redraws as the coefficient changes', () => {
    const one = balance({ equation: 'Water Formation', coefficients: [1, 1, 1] });
    const two = balance({ equation: 'Water Formation', coefficients: [2, 1, 2] });
    expect(one.querySelectorAll('[data-pv-slot="0"]').length).toBe(1);
    expect(two.querySelectorAll('[data-pv-slot="0"]').length).toBe(2);
  });

  it('packs any molecule size without losing an atom or bursting its cluster', () => {
    // eval-slice the REAL packing helpers out of the tool and exercise them far past
    // anything the current bank contains. Two separate properties, because they used
    // to be two hand-written tables that could drift apart:
    //   pvPositions must return exactly k positions  -> no atom is ever dropped,
    //   none may sit outside the radius pvRings claims -> the cluster is sized to fit.
    // The bank's biggest molecule is glucose at 24 atoms today, and this bank has
    // been extended before, so the guarantee is checked well beyond present need.
    const src = readFileSync(CHEMBALANCE, 'utf8');
    const start = src.indexOf('var pvRings = function(k) {');
    const endMarker = 'return pos;   // length === k, always';
    const end = src.indexOf(endMarker, start);
    expect(start, 'pvRings slice anchor').toBeGreaterThan(-1);
    expect(end, 'pvPositions slice anchor').toBeGreaterThan(start);
    const slice = src.slice(start, end + endMarker.length) + '\n};\nreturn { pvRings: pvRings, pvPositions: pvPositions };';
    // eslint-disable-next-line no-new-func
    const { pvRings, pvPositions } = new Function(slice)();

    for (let k = 1; k <= 200; k++) {
      const pos = pvPositions(k);
      expect(pos.length, 'positions for ' + k + ' atoms').toBe(k);
      const furthest = pos.reduce((m, p) => Math.max(m, Math.hypot(p[0], p[1])), 0);
      expect(furthest, 'atom ' + k + ' escapes the cluster pvRings sized').toBeLessThanOrEqual(2 * pvRings(k) + 1e-9);
    }
  });

  it('renders every preset in the bank without throwing', () => {
    // Walks the whole bank rather than a sample: the packing helper has branches for
    // 1, 2, 3 and 4+ atoms per molecule, and only the real bank exercises all of them.
    const names = [...frag(renderTool('chemBalance', { chemBalance: { subtool: 'balance', _everPicked: true } }))
      .querySelectorAll('button[aria-label^="Select equation preset"]')]
      .map((b) => b.getAttribute('aria-label').replace(/^Select equation preset: /, '').split(',')[0]);

    expect(names.length).toBeGreaterThan(15);
    for (const name of names) {
      const el = balance({ equation: name });
      expect(el.querySelector('[data-testid="chem-particle-view"]'), name).toBeTruthy();
      expect(el.querySelector('[data-testid="chem-mass-ledger"]').textContent, name).not.toContain('NaN');
    }
  });
});
