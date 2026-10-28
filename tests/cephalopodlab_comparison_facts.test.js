import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// The Comparative Tables listed mantis shrimp under "Vertebrate", gave a mouse
// 2 million neurons (it has about 70 million), called benthic octopuses
// neutrally buoyant, and put cephalopod RNA editing at "1-10x" vertebrates.
const SOURCE = 'stem_lab/stem_tool_cephalopodlab.js';

function rows() {
  const c = document.createElement('div');
  c.innerHTML = renderTool('cephalopodLab', { cephalopodLab: { activeSection: 'compare' } });
  return [...c.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td, th')].map((cell) => cell.textContent.trim()));
}
const row = (all, feature) => all.find((r) => r[0] === feature);

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE, 'cephalopodLab');
});

describe('Cephalopod Lab comparison tables', () => {
  it('keeps invertebrates out of the vertebrate column', () => {
    const polar = row(rows(), 'Polarization vision');
    expect(polar[2]).not.toMatch(/shrimp|crab|insect|bee|octopus|squid/i);
    expect(polar[2]).toMatch(/fish/);
  }, 20000);

  it('gives neuron counts in the right order of magnitude', () => {
    const neurons = row(rows(), 'Total neurons');
    expect(neurons[2]).toMatch(/86 billion \(human\)/);
    const mouse = /~?(\d+) million \(mouse\)/.exec(neurons[2]);
    expect(mouse, 'mouse figure').toBeTruthy();
    expect(Number(mouse[1])).toBeGreaterThanOrEqual(50);
    expect(neurons[1]).toMatch(/cerebral cortex/);
  }, 20000);

  // W-shaped pupils are the cuttlefish's; squid close to a U, octopuses to a horizontal slit.
  it('gives W-shaped pupils to cuttlefish only, in every string the tool ships', () => {
    const { readFileSync } = require('node:fs');
    const src = readFileSync(SOURCE, 'utf8');
    const ui = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.cephalopodlab;
    const strings = [...src.matchAll(/'((?:[^'\\]|\\.)*W-shaped(?:[^'\\]|\\.)*)'/g)].map((m) => m[1]).concat(Object.values(ui).filter((v) => /W-shaped/.test(v)));
    expect(strings.length).toBeGreaterThan(1);
    for (const s of strings) expect(s, s).not.toMatch(/octopus(es)?(?:\s+\w+){0,3}\s+(?:have|has|with)?\s*W-shaped|Octopus eyes have an unusual "W-shaped"|W-shaped pupils that allow/i);
    expect(ui.octopus_eyes_have_an_unusual_w_shaped_).toMatch(/^Cuttlefish/);
  }, 20000);

  // A review of the 268-entry facts pool found invented or wrong claims; none may return.
  it('keeps the facts pool free of the claims a review found wrong', () => {
    const { readFileSync } = require('node:fs');
    const text = readFileSync(SOURCE, 'utf8') + '\n' + Object.values(JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.cephalopodlab).join('\n');
    const wrong = [
      [/51 years old|aged to 51 years/, 'no 51-year-old octopus exists'],
      [/colossal squid[^.]{0,80}14 m|reaches 14 m/i, 'the colossal squid is the heaviest, not 14 m long'],
      [/Approval in Canada/, 'tetrodotoxin is not an approved medicine'],
      [/Alfred Fr[ée]d[ée]ricq|identified in 1851/, 'hemocyanin was named by Léon Fredericq in 1878'],
      [/arm has thousands of suckers/, 'about 2,000 suckers in total'],
      [/100 distinct colors per square/, 'each chromatophore holds one pigment'],
      [/Egyptian tomb paintings/, 'the octopus art is Minoan pottery'],
      [/CARTOGRAPHIC mappings/, 'octopus motor centers have no body map (Zullo et al. 2009)'],
      [/discovered DURING the octopus genome project/, 'RNA editing was studied in squid first'],
      [/withstand pressures up to ~80 m/, 'nautilus shells hold to about 800 m'],
      // checked against sources 2026-10-27: no record of any of these
      [/Eledone bermudensis/, 'no such species has been described'],
      [/Greek euro coins|Japanese coins \(squid\)/, 'modern Greek euro coins show no octopus'],
      [/15x survival multiplier|60\+ seconds — vs\. 4 seconds/, 'no study reports these detection times'],
    ];
    for (const [re, why] of wrong) expect(re.test(text), why).toBe(false);
  }, 20000);

  it('does not understate cephalopod RNA editing or call octopuses neutrally buoyant', () => {
    const all = rows();
    expect(row(all, 'RNA editing')[1]).not.toMatch(/\d+\s*-\s*\d+x/);
    expect(row(all, 'Buoyancy')[1]).not.toMatch(/neutral/i);
  }, 20000);
});
