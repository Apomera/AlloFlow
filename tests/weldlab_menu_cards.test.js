import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const read = () => readFileSync(resolve(process.cwd(), SRC), 'utf8');

beforeEach(() => {
  try { delete window.__alloflowWeldLab; } catch (e) { window.__alloflowWeldLab = undefined; }
  resetStemLab();
  loadTool(SRC, 'weldLab');
});

describe('WeldLab menu catalog tile survives a hand-edited project', () => {
  // The tile looped over Object.keys(catalog) and read `.lastFoundAt` off every
  // value and `DEFECT_INFO[key].name` off the newest one, so a project file with
  // `{porosity: null}` or a key the tool does not know threw while rendering the
  // MENU, the first screen every student sees.
  const hostile = [
    { porosity: null },
    { notADefect: { lastFoundAt: '2099-01-01T00:00:00Z' } },
    { porosity: 'yes', undercut: 42 },
    { __proto__: { porosity: { lastFoundAt: 'x' } } },
    ['porosity'],
  ];
  hostile.forEach((cat, i) => {
    it('renders the menu with hostile catalog #' + i, () => {
      const html = renderTool('weldLab', { weldLab: { defectCatalog: cat } });
      expect(html).toContain('Welder');
      expect(html).toContain('Big question');
    });
  });

  it('names what it counts: defect types FOUND, not identified', () => {
    const html = renderTool('weldLab', { weldLab: { defectCatalog: { porosity: { firstFoundAt: '2026-10-01T00:00:00Z', lastFoundAt: '2026-10-01T00:00:00Z', foundCount: 1 } } } });
    expect(html).toContain('Defect types found');
    expect(html).toMatch(/1 of \d+ defect types found/);
  });
});

describe('WeldLab menu cards describe the modules that now exist', () => {
  const grid = () => renderTool('weldLab', { weldLab: { menu_mode: 'all' } });

  it('names the rebuilt timed module for what it is', () => {
    const html = grid();
    expect(html).toContain('Live Bead Run');
    expect(html).not.toContain('A 60-second timed run');
  });

  it('no longer promises hover cards Defect Hunt never had', () => {
    expect(grid()).not.toMatch(/hover card/i);
  });

  it('no longer claims the Bead Lab scores spatter or that its bead is dragged when it was not', () => {
    const html = grid();
    expect(html).not.toContain('Score on penetration, uniformity, and spatter');
    expect(html).toContain('macro-etch');
  });

  it('counts the qualification quiz from the bank, not a typed 30', () => {
    expect(grid()).not.toContain('30 written-exam practice questions');
  });
});

describe('WeldLab first-pick-final quizzes do not commit on an arrow key', () => {
  // radioGroupKeys selects as it moves (the APG radio pattern). In these groups
  // a click IS the submitted answer, so an arrow pressed only to move used to
  // score the neighbouring option, or file an ACCEPT as a REJECT on the bench.
  // Each opts out with data-arrow-select="false" (arrows move focus; Enter or
  // Space picks). Select-then-confirm groups do not need it and do not carry it.
  const groups = [
    "'stem.weldlab.met2_pred_group'", "'stem.weldlab.met2_cd_group'",
    "'stem.weldlab.insp2_sort_aria'", "'stem.weldlab.insp2_clause_aria'",
    "'stem.weldlab.insp2_decide_aria'", "'stem.weldlab.insp2_q_aria'",
    "'stem.weldlab.pipe2_scn_group'",
  ];
  it.each(groups)('opts %s out of select-on-arrow', (anchor) => {
    const line = read().split('\n').find((l) => l.includes(anchor) && /'?role'?:\s*'radiogroup'/.test(l));
    expect(line, 'radiogroup line for ' + anchor).toBeTruthy();
    expect(line).toContain("'data-arrow-select': 'false'");
  });

  it('opts out both qualification-quiz answer groups', () => {
    const src = read();
    const body = src.slice(src.indexOf('function WelderQualPrep('), src.indexOf('function PipeWeldingDeepDive('));
    const lines = body.split('\n').filter((l) => /'?role'?:\s*'radiogroup'/.test(l) && /'aria-label': (current\.q|q\.q) \}/.test(l));
    expect(lines.length).toBe(2);
    lines.forEach((l) => expect(l).toContain("'data-arrow-select': 'false'"));
  });
});

describe('WeldLab Bead Lab points onward', () => {
  // Every other simulator linked INTO the Bead Lab; the Bead Lab linked nowhere,
  // so the hub of the arc unit was a dead end.
  it('links to the formula, the pressure run, the defects and the metallurgy', () => {
    const html = renderTool('weldLab', { weldLab: { view: 'beadLab' } });
    expect(html).toContain('Keep going');
    ['Heat Input', 'Live Bead Run', 'Defect Hunt', 'Metallurgy'].forEach((t) => expect(html).toContain(t + ' →'));
  });
});

describe('WeldLab ships the English its code says', () => {
  // ui_strings.js OVERRIDES a call site's fallback, and this harness renders the
  // fallback. September's CWI salary fix changed the fallback to $60-110K while
  // the registry kept $70-110K: students went on seeing the old figure and every
  // test passed. So every literal call site must match its registered value.
  it('registers every stem.weldlab key with byte-identical text', () => {
    const reg = JSON.parse(readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8')).stem.weldlab;
    const src = read();
    const re = /__alloT\('stem\.weldlab\.([A-Za-z0-9_]+)',\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\)/g;
    const bad = [];
    let m, n = 0;
    while ((m = re.exec(src))) {
      n++;
      const fb = Function('return ' + m[2])();
      if (reg[m[1]] !== fb) bad.push(m[1]);
    }
    expect(n).toBeGreaterThan(5000);
    expect(bad.slice(0, 10), bad.length + ' key(s) unregistered or drifted').toEqual([]);
  });
});
