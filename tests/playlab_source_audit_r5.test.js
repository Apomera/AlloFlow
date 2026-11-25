// Play Lab source audit, 2026-11-23 (Aaron: "if you're not finding the sources they could be hallucinated so please
// remove unsubstantiated facts"). Each "In real football / soccer" aside was checked: unsourced parts are gone, sourced
// corrections keep their wording, and the penalty rate the model uses matches a published figure.
// PLAYLAB_FILE=<path> points the suite at another copy (start_r4.js turns it red).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const FILE = process.env.PLAYLAB_FILE || 'stem_lab/stem_tool_playlab.js';
const source = readFileSync(FILE, 'utf8');

function loadModel() {
  const win = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }) };
  const doc = {
    getElementById: () => null,
    createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
    head: { appendChild() {} }, body: { appendChild() {} }, addEventListener() {},
    documentElement: { classList: { contains: () => false } },
  };
  win.document = doc; win.window = win;
  const ctx = vm.createContext({ window: win, document: doc, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, navigator: {}, localStorage: { getItem: () => null, setItem() {} } });
  vm.runInContext(source, ctx, { filename: 'stem_tool_playlab.js' });
  return win.StemLab && win.StemLab.PlayLabModel;
}
const M = loadModel();
const S = M.soccer();
const allReal = () => [].concat(M.plays, M.coverages, S.formations, S.concepts, S.shapes, M.scenarios).map((x) => x.real).join('\n');

describe('real-game asides', () => {
  it('claims with no source found are gone', () => {
    const real = allReal();
    for (const s of ['Many of their throws were short and quick', 'has a long history in Italian soccer',
      'struck with almost no spin', 'were known for their quarters coverage', 'is offside if he is nearer the goal']) {
      expect(real, s).not.toContain(s);
    }
    // code comments that quoted unsourced statistics
    expect(source).not.toContain('Set pieces account for ~30% of all goals');
    expect(source).not.toContain('captures ~70% of');
  });
  it('corrected asides carry the sourced wording', () => {
    const real = allReal();
    expect(real).toContain("Antonio Conte's Inter won Serie A in 2021 playing a 3-5-2.");
    expect(real).toContain('Quarters was one of the main coverage families of Nick Saban');
    expect(real).toContain('rose over the wall and then dropped quickly toward the goal');
    expect(real).toContain("in an offside position if he is in the other team's half"); // IFAB Law 11.1
    expect(real).toContain('It is only an offense if he then takes part in the play.');
    expect(real).toContain('the biggest comeback in Super Bowl history.');
  });
  it('the penalty rate is the published 78.6% (CIES, 31 European leagues since 2018/19), rounded', () => {
    expect(S.constants.PENALTY_XG).toBe(0.79);
    expect(M.note('{pen}')).toBe('79');
  });
});
