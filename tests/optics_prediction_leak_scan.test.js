// Optics Lab prediction gate: a scan for RESTATEMENTS of the held answer.
//
// The calculator table masks its outcome rows until a prediction is saved, but
// the same numbers kept reappearing elsewhere on the page: diagram labels,
// captions, slider aria-valuetext, "show me the math", 3-D alt text, the causal
// chain. Each of those was found and fixed by hand, one at a time. This scan
// takes the answers from the REVEALED table of each setup (so it proves they
// exist) and searches the HELD page's visible text and accessible names for any
// restatement of them, at the precisions the tool prints.
//
// Setups are chosen so no answer coincides with an input (a restated input is
// not a leak) or with a common number like 50 or 100.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { withPrediction } from './helpers/optics_prediction.js';

const SRC = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_optics.js'), 'utf8');
const outcomeStart = SRC.indexOf('var OPTICS_OUTCOME_ROWS = {');
const OUTCOME_ROWS = Function('return ' + SRC.slice(SRC.indexOf('{', outcomeStart), SRC.indexOf('};', outcomeStart) + 1)
  .split('\n').map((line) => line.replace(/[/][/].*$/, '')).join('\n'))();

const BS = String.fromCharCode(92);
const escapeRe = (s) => [...s].map((c) => ('.*+?^${}()|[]' + BS).includes(c) ? BS + c : c).join('');
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
// What a student can read or hear: text nodes plus accessible names. Never
// data-* attributes or styles, which nobody sees.
function readable(html) {
  const out = [];
  for (const m of html.matchAll(/ (aria-label|aria-valuetext|title|alt)="([^"]*)"/g)) out.push(decode(m[2]));
  out.push(decode(html.replace(/<style[^>]*>[^]*?<[/]style>/g, ' ').replace(/<[^>]+>/g, '\n')));
  return out.join('\n');
}
function cell(html, label) {
  const m = html.match(new RegExp('>' + escapeRe(label) + '<[/]span><span[^>]*>([^<]*)<'));
  return m ? decode(m[1]) : null;
}
const COMMON = new Set(['0.0', '1.0', '2.0', '50.0', '100.0', '0.00', '1.00', '25.0', '25.00', '12.5', '12.50', '100.00', '50.00']);

const SETUPS = {
  reflection: [
    { reflMirrorType: 'concave', reflFocal: 10, reflDo: 27, reflObjH: 5, reflScreenCm: 15 },   // d_i 15.88, m −0.59
    { reflMirrorType: 'concave', reflFocal: 10, reflDo: 7, reflObjH: 5, reflScreenCm: 15 },    // d_i −23.33, m 3.33
    { reflMirrorType: 'convex', reflFocal: 12, reflDo: 31, reflObjH: 5, reflScreenCm: 15 },    // d_i −8.65, m 0.28
  ],
  refraction: [
    { refrN1: 1, refrN2: 1.52, refrTheta1: 33 },     // θ₂ 20.98°
    { refrN1: 1.5, refrN2: 1, refrTheta1: 37 },      // θ₂ 64.53°
  ],
  lenses: [
    { lensType: 'converging', lensFocal: 12, lensDo: 25, lensObjH: 5, lensScreenCm: 20 },  // d_i 23.08, m −0.92
    { lensType: 'converging', lensFocal: 10, lensDo: 7, lensObjH: 5, lensScreenCm: 20 },   // d_i −23.33, m 3.33
    { lensType: 'diverging', lensFocal: 10, lensDo: 21, lensObjH: 5, lensScreenCm: 20 },   // d_i −6.77, m 0.32
  ],
  interference: [{ intLambda: 630, intSlitSep: 0.14, intScreenL: 0.9 }],                  // 4.05 mm
  diffraction: [
    { diffMode: 'single', diffLambda: 570, diffSlitWidth: 34, diffScreenL: 1.3 },          // y₁ 21.79 mm
    { diffMode: 'grating', diffLambda: 610, diffGrating: 600, diffGratingDuty: 30, diffScreenL: 0.9 },
  ],
  polarization: [
    { polTheta2: 57 },                                        // 14.83%
    { polTheta2: 33, polUseP3: true, polTheta3: 71 },         // 21.84%
  ],
};
const VIEWS = {
  reflection: [{}, { reflShow3D: true }, { reflShowMath: true }],
  refraction: [{}, { refrShow3D: true }, { refrShowMath: true }, { refrShowWindow: true }],
  lenses: [{}, { lensShow3D: true }, { lensShowMath: true }],
  interference: [{}, { intShowMath: true }, { intShowWavefield3D: true }],
  diffraction: [{}, { diffShowMath: true }, { diffShowWavefield3D: true }],
  polarization: [{}, { polShowMath: true }],
};

describe('Optics prediction gate — no held page restates a masked answer', () => {
  it('finds every masked answer on the revealed page and none on the held page', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
    const render = (state) => renderTool('opticsLab', { opticsLab: state });
    const leaks = [];
    let answersChecked = 0;
    for (const [tab, setups] of Object.entries(SETUPS)) {
      for (const base of setups) {
        for (const view of VIEWS[tab]) {
          const setup = Object.assign({ mode: tab }, base, view);
          const revealed = render(withPrediction(tab, setup));
          const held = readable(render(setup));
          const inputs = Object.values(setup).filter((v) => typeof v === 'number');
          for (const label of OUTCOME_ROWS[tab]) {
            const value = cell(revealed, label);
            if (!value) continue;
            for (const n of value.match(/-?[0-9]+[.][0-9]+/g) || []) {
              const x = Number(n);
              const forms = new Set([n.replace('-', '')]);
              for (const d of [1, 2, 3]) forms.add(Math.abs(x).toFixed(d));
              for (const f of forms) {
                if (COMMON.has(f) || f.length < 4) continue;
                if (inputs.some((v) => [0, 1, 2, 3].some((d) => v.toFixed(d) === f))) continue;
                answersChecked += 1;
                const re = new RegExp('(^|[^0-9.e])' + escapeRe(f) + '($|[^0-9]|e[^-+0-9])');
                const hit = held.split('\n').find((line) => re.test(line));
                if (hit) leaks.push(`${tab} ${JSON.stringify(view)} ${label} = ${n}, held page says "${hit.trim().slice(0, 120)}"`);
              }
            }
          }
        }
      }
    }
    // The scan must have had answers to look for, or its silence proves nothing.
    expect(answersChecked, 'masked answers found on the revealed pages').toBeGreaterThan(150);
    expect(leaks).toEqual([]);
  }, 180000);
});
