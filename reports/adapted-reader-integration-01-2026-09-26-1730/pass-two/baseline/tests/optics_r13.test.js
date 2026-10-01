// Optics Lab, audit round 13 (Sept 2026): the 418-term glossary, the reference
// data tables, a runtime accessibility sweep, and the deferred 3D items.
//
// What the audit found:
//   - near-duplicate glossary terms slipped past the exact-name dedupe ("Infrared"
//     beside "Infrared (IR)"); "related" lists named terms that do not exist;
//     no entry for the Rayleigh criterion or circular polarization;
//   - welding advice gave one shade for every process; cuttlefish pupils were "U";
//     "Vacuum" could never be shown (it equals Air to 3 decimals); acrylic's model
//     dispersion gave an Abbe number of ~76 (PMMA is ~53);
//   - six card lists were one big role="button" (a worked solution was only the
//     button's name); four pages and the quiz were 1.06-3.8:1 in the default theme;
//     the Fresnel-number box re-read ~225 characters on every slider step.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_optics.js'), 'utf8');
const RENDER_TIMEOUT = 30000;
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
function render(state) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
  return renderTool('opticsLab', { opticsLab: state });
}
function table(name) {
  const open = `  var ${name} = [`;
  const start = SRC.indexOf(open);
  let depth = 0, i = start + open.length - 1;
  for (; i < SRC.length; i += 1) {
    if (SRC[i] === '[') depth += 1;
    else if (SRC[i] === ']') { depth -= 1; if (depth === 0) break; }
  }
  return vm.runInNewContext(`(${SRC.slice(start + open.length - 1, i + 1)})`, {});
}
const ALL = { phDbLimit: 9999, scientistLimit: 9999, historyLimit: 9999, instrumentLimit: 9999, kitLimit: 9999, careerLimit: 9999, workedLimit: 9999, glossaryLimit: 9999 };

describe('Glossary', () => {
  // Same rule as the tool: a bracketed ABBREVIATION does not make a new term; a sense label does.
  const key = (t) => String(t).trim().replace(/\s*[(][A-Zλ0-9]{1,6}[)]$/, '').toLowerCase().replace(/[-\s]+/g, ' ');

  it('no two shown terms are the same term (brackets and hyphens aside)', () => {
    const html = render({ mode: 'glossary_ex', ...ALL });
    const terms = [...html.matchAll(/<span style="font-size:13px;font-weight:800;color:#86efac">([^<]+)<\/span>/g)].map((m) => key(decode(m[1])));
    expect(terms.length).toBeGreaterThan(400);
    expect(terms.filter((t, i) => terms.indexOf(t) !== i)).toEqual([]);
    for (const t of ['rayleigh criterion', 'circular polarization']) expect(terms, t).toContain(t);
  }, RENDER_TIMEOUT);

  it('the Rayleigh example follows from its formula', () => {
    const entry = table('GLOSSARY_EXPANDED_MORE').find((g) => g.term === 'Rayleigh criterion');
    const rad = 1.22 * 550e-9 / 0.10;
    expect(entry.example).toContain((rad * 1e6).toFixed(1) + ' microradians');
    expect(entry.example).toContain('about ' + (rad * 206265).toFixed(1) + ' arcseconds');
  });

  it('"related" lists name terms that exist (the renamed ones, at least)', () => {
    const shown = table('GLOSSARY_EXPANDED').concat(table('GLOSSARY_EXPANDED_MORE'));
    const all = new Set(shown.concat(table('GLOSSARY_E_Z'), table('GLOSSARY_RZ')).map((g) => key(g.term)));
    for (const stale of ['fiber optics', 'photoreceptor', 'spectroscopy', 'photodetector', 'uniaxial crystal', 'neutral density filter', 'fresnel equations']) {
      const users = shown.filter((g) => (g.related || '').split(',').map((x) => key(x)).includes(stale)).map((g) => g.term);
      expect(users, stale).toEqual([]);
    }
    for (const target of ['optical fiber', 'retinal photoreceptor', 'spectrometer', 'detector', 'uniaxial', 'neutral density', 'fresnel reflection']) {
      expect(all.has(target), target).toBe(true);
    }
  });

  it('optical density is not the "optically denser" of refraction, and lens powers add only in contact', () => {
    expect(SRC).toContain('Not the same as "optically denser" in refraction');
    expect(SRC).toContain('For thin lenses in contact the powers add');
    expect(SRC).not.toContain("Combined as a sum: P_total = P₁ + P₂.'");
  });
});

describe('Reference data', () => {
  it('safety and biology fixes stay made', () => {
    expect(SRC).toContain('about 3 to 8 for gas welding and cutting');
    expect(SRC).not.toContain("prevention: 'Welding: shade-12 or darker filters.");
    expect(SRC).toContain('W-shaped pupils');
    expect(SRC).not.toContain('U-shaped pupils exploit');
  });

  it('every refractive-index preset can be shown, and quartz means what it says', () => {
    const presets = table('COMMON_N');
    const byN = {};
    presets.forEach((p) => { (byN[p.n.toFixed(3)] = byN[p.n.toFixed(3)] || []).push(p.label); });
    expect(Object.values(byN).filter((l) => l.length > 1), 'two presets share one index, so one can never be selected').toEqual([]);
    expect(presets.find((p) => p.n === 1.458).label).toBe('Fused quartz');
  });

  it('gas indices are printed precisely enough to differ from vacuum', () => {
    const html = decode(render({ mode: 'reference', refSubView: 'refIndex' }));
    expect(html).toContain('1.000036');
    expect(html).toContain('n (589 nm unless noted)');
  }, RENDER_TIMEOUT);

  it('the acrylic prism model reproduces PMMA (n_D 1.4905, Abbe ~53)', () => {
    const m = SRC.match(/acrylic: \{ label: 'Acrylic', +A: ([0-9.]+), B: ([0-9.]+)/);
    const n = (um) => Number(m[1]) + Number(m[2]) / (um * um);
    expect(n(0.5893)).toBeCloseTo(1.4905, 3);
    const abbe = (n(0.5893) - 1) / (n(0.4861) - n(0.6563));
    expect(abbe).toBeGreaterThan(48);
    expect(abbe).toBeLessThan(58);
  });
});

describe('Accessibility', () => {
  const PANELS = [
    ['phenomena_db', 'phDbOpenId', 'op-phdb-body-'], ['scientists', 'scientistOpenId', 'op-sci-body-'],
    ['instruments', 'instOpenId', 'op-inst-body-'], ['lab_kits', 'kitOpenId', 'op-kit-body-'],
    ['careers', 'careerOpenId', 'op-career-body-'], ['worked', 'wpOpenId', 'op-wp-body-'],
  ];

  it('each card list uses heading + disclosure button, never one big role="button"', () => {
    for (const [mode, openKey, prefix] of PANELS) {
      const html = render({ mode, ...ALL });
      expect(html, mode).not.toMatch(/<div[^>]*role="button"/);
      const toggles = [...html.matchAll(/<h4[^>]*><button type="button" data-op-focusable="true" data-op-card-toggle="([^"]+)" aria-expanded="false"(?! aria-controls)/g)];
      expect(toggles.length, mode).toBeGreaterThan(5);
      const id = toggles[0][1];
      const open = render({ mode, ...ALL, [openKey]: id });
      expect(open, mode).toContain('data-op-card-toggle="' + id + '" aria-expanded="true" aria-controls="' + prefix + id + '"');
      expect(open, mode).toContain('id="' + prefix + id + '"');
    }
  }, RENDER_TIMEOUT * 2);

  it('the pages that were unreadable in the default theme sit in the dark island', () => {
    for (const mode of ['phenomena_db', 'history', 'lab_kits', 'glossary_ex', 'quiz']) {
      expect(render({ mode }), mode).toContain('data-op-dark-panel="' + mode + '"');
    }
  }, RENDER_TIMEOUT);

  it('selected states and groups are exposed, not just coloured', () => {
    const db = render({ mode: 'phenomena_db' });
    expect(db).toMatch(/<button type="button" aria-pressed="true"[^>]*>[^<]*All/);
    const bank = table('AP_OPTICS_QUIZ').slice(0, 2).map((q) => ({ ...q }));
    const quiz = render({ mode: 'quiz', quizQuestions: bank, quizAnswers: [], quizSubmitted: false });
    expect(quiz).toContain('role="group" aria-labelledby="op-quiz-q-0"');
    expect(quiz).toContain('id="op-quiz-q-0"');
    expect(SRC).toContain("className: 'opticslab-semantic-key', role: 'group',");
  }, RENDER_TIMEOUT);

  it('the Fresnel-number box is not itself a live region; only the regime is announced', () => {
    const html = render({ mode: 'interference' });
    const box = html.match(/<div class="opticslab-model-validity"[^>]*>/)[0];
    expect(box).not.toContain('role="status"');
    expect(box).not.toContain('aria-live');
    expect(html).toMatch(/<span class="op-aria-live" role="status" data-op-model-regime-live="interference">(Far-field|Near-field|Transition) regime<\/span>/);
  }, RENDER_TIMEOUT);

  it('page-swapping buttons hand focus to the new panel', () => {
    expect((SRC.match(/_opFocusPanelSoon\(/g) || []).length).toBeGreaterThanOrEqual(6);
    expect(SRC).toContain("document.getElementById('op-panel-' + mode)");
  });
});

describe('3D and wavefield', () => {
  it('a failed 3D scene offers a retry in all five scenes', () => {
    expect((SRC.match(/retry: function ?\(\) \{ var hh = node; this\.dispose\(\); if \(hh\) this\.attach\(hh\); \},/g) || []).length).toBe(5);
    expect((SRC.match(/\? _opticsGlFailed\(h, /g) || []).length).toBe(5);
  });

  it('a 3D model rebuild keeps its shader programs (measured: 150-225 ms -> 25-38 ms per slider tick)', () => {
    // Disposing the old materials BEFORE the next render made three.js delete and
    // relink every program on each tick; they are retired and disposed after it.
    const modules = SRC.split('function applyModel(').slice(1).map((s) => s.slice(0, s.indexOf('\n    }\n')));
    expect(modules.length).toBe(5);
    modules.forEach((body, i) => {
      expect(body, 'applyModel #' + i).toContain('_opRetireGroup(S);');
      expect(body, 'applyModel #' + i).not.toContain('disposeGroup(S.model)');
    });
    expect((SRC.match(/S\.renderer\.render\(S\.scene, S\.camera\); \} catch \(e\) \{[^}]*\}\n\s+_opFlushRetired\(S\);/g) || []).length).toBe(5);
    expect((SRC.match(/_opFlushRetired\(S\);\n\s+disposeGroup\(S\.model\);/g) || []).length).toBe(5);
    // the WebGL build waits for the click to paint, and never builds twice for one host
    expect((SRC.match(/_opAfterPaint\(function \(\) \{\n\s+if \(node !== host \|\| S\) return;/g) || []).length).toBe(5);
  });

  it('Visual Lab cards are keyed children, not positional ones', () => {
    expect(SRC).toContain("return c && c.props ? h(c.type, Object.assign({ key: 'viz-card-' + i }, c.props)) : c;");
    expect(SRC).toContain('return h(panel.type, panel.props, intro, search, shown);');
  });

  it('in phase view the ridges are named by what still marks them', () => {
    const phase = decode(render({ mode: 'interference', intShowWavefield3D: true, opWavefieldDisplay: 'phase' }));
    expect(phase).toContain('The final solid, cyan-tinted ridge is the screen slice');
    expect(phase).toContain('The solid, amber-tinted ridge and diamond mark the adjustable probe sample');
    const intensity = decode(render({ mode: 'interference', intShowWavefield3D: true }));
    expect(intensity).toContain('The final cyan ridge is the screen slice');
  }, RENDER_TIMEOUT);
});
