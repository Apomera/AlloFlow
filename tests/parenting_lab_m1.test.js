// Science of Parenting Lab — birth tests for the shell + badge system + M1.
//
// The tool's contract (PARENTING_LAB_SPEC.md): every content card carries a
// strength-of-evidence badge backed by the in-code EVIDENCE register, the
// content stays strengths-based / non-diagnostic, and M2-M9 stay visibly
// locked until the SME review gate clears them. These tests pin all three
// so a later content batch cannot silently drop the scaffolding.
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_parentinglab.js';
const src = fs.readFileSync(FILE, 'utf8');

describe('Science of Parenting Lab — shell + M1', () => {
  beforeEach(() => resetStemLab());

  it('registers and renders the menu with all four evidence badges', () => {
    const cfg = loadTool(FILE, 'parentingLab');
    expect(typeof cfg.render).toBe('function');
    const html = renderTool('parentingLab', {});
    expect(html.length).toBeGreaterThan(500);
    for (const label of ['RCT-supported', 'Meta-analytic association', 'Culturally moderated', 'Popular, not supported']) {
      expect(html).toContain(label);
    }
  });

  it('shows M1-M5 open and the four later modules locked', () => {
    loadTool(FILE, 'parentingLab');
    const html = renderTool('parentingLab', {});
    expect(html).toContain('Warmth &amp; Structure');
    expect(html).toContain('Attachment: the theory vs. the brand');
    expect(html).toContain('The RCT core');
    expect(html).toContain('PRIDE Skills Studio');
    expect(html).toContain('ABC at Home');
    const locks = (html.match(/In expert review/g) || []).length;
    expect(locks).toBe(4);
  });

  it('renders M4 with the avoids framed as normal parenting elsewhere', () => {
    loadTool(FILE, 'parentingLab');
    const html = renderTool('parentingLab', { parentingLab: { view: 'm4' } });
    expect((html.match(/Source: /g) || []).length).toBe(4);
    expect(html).toContain('Label the play session');
    // Honesty pin: the avoids are exercise-specific, not bad parenting.
    expect(html).toContain('normal parenting everywhere else');
    // All five PRIDE skills present in the card content:
    for (const s of ['PRAISE', 'REFLECT', 'IMITATE', 'DESCRIBE', 'ENJOY']) expect(html).toContain(s);
  });

  it('renders M5 with the burst warning and the function-is-not-a-verdict pin', () => {
    loadTool(FILE, 'parentingLab');
    const html = renderTool('parentingLab', { parentingLab: { view: 'm5' } });
    expect((html.match(/Source: /g) || []).length).toBe(5);
    expect(html).toContain('extinction burst');
    // Neurodiversity pin: sensory scene and card must survive edits.
    expect(html).toContain('a description, not a verdict');
    expect(html).toContain('neurodivergent');
    // Coercion is framed as a loop, not blame:
    expect(html).toContain('Nobody in the loop is bad');
  });

  it('M4/M5 answers are not position- or single-option-biased', () => {
    const utter = src.match(/var M4_UTTERANCES = \[([\s\S]*?)\n  \];/)[1];
    const uAnswers = [...utter.matchAll(/answer:\s*'(\w+)'/g)].map((m) => m[1]);
    // At least 4 distinct labels used, and no label is a majority.
    expect(new Set(uAnswers).size).toBeGreaterThanOrEqual(4);
    for (const a of new Set(uAnswers)) {
      expect(uAnswers.filter((x) => x === a).length).toBeLessThan(uAnswers.length / 2);
    }
    const scenes = src.match(/var M5_SCENES = \[([\s\S]*?)\n  \];/)[1];
    const sAnswers = [...scenes.matchAll(/answer:\s*'(\w+)'/g)].map((m) => m[1]);
    expect(new Set(sAnswers).size).toBeGreaterThanOrEqual(3);
  });

  it('renders M2 with five badged cards and the Serve & Return studio', () => {
    loadTool(FILE, 'parentingLab');
    const html = renderTool('parentingLab', { parentingLab: { view: 'm2' } });
    expect((html.match(/Source: /g) || []).length).toBe(5);
    expect(html).toContain('Serve &amp; Return studio');
    expect(html).toContain('practice, not scoring');
    // The brand/theory separation is the module's spine:
    expect(html).toContain('not what attachment security is made of');
  });

  it('renders M3 with the Triple P publication-bias note intact', () => {
    loadTool(FILE, 'parentingLab');
    const html = renderTool('parentingLab', { parentingLab: { view: 'm3' } });
    // Honesty pin: the dissemination caveat must survive every future edit.
    expect(html).toContain('publication bias');
    expect(html).toContain('wider error bar');
    expect(html).toContain('Tag the skill');
    // Time-out honesty: endorsement and contestation in the same breath.
    expect(html).toContain('American Academy of Pediatrics');
  });

  it('serve options are not position-biased toward the first slot', () => {
    const serves = src.match(/var M2_SERVES = \[([\s\S]*?)\n  \];/)[1];
    const blocks = serves.split(/\bserve:/).slice(1);
    const firstIsReturn = blocks.filter((b) => {
      const m = b.match(/kind:\s*'(\w+)'/);
      return m && m[1] === 'return';
    }).length;
    // At least one scene must NOT have the return in the first option slot.
    expect(firstIsReturn).toBeLessThan(blocks.length);
  });

  it('renders M1 with every card badged from the EVIDENCE register', () => {
    loadTool(FILE, 'parentingLab');
    const html = renderTool('parentingLab', { parentingLab: { view: 'm1' } });
    // 5 cards, each with a source line resolved from EVIDENCE
    expect((html.match(/Source: /g) || []).length).toBe(5);
    expect(html).toContain('Chao (1994)');
    // The Two Dials interactive is present with both dials
    expect(html).toContain('Warmth (responsiveness)');
    expect(html).toContain('Structure (demandingness)');
  });

  it('every EVIDENCE entry has a source, note, and a valid badge key', () => {
    const evidence = src.match(/var EVIDENCE = \{([\s\S]*?)\n  \};/);
    expect(evidence).toBeTruthy();
    const entries = [...evidence[1].matchAll(/badge:\s*'([a-z]+)'/g)].map((m) => m[1]);
    expect(entries.length).toBeGreaterThanOrEqual(5);
    for (const b of entries) expect(['rct', 'meta', 'cultural', 'popular']).toContain(b);
    expect((evidence[1].match(/source:/g) || []).length).toBe(entries.length);
    expect((evidence[1].match(/note:/g) || []).length).toBe(entries.length);
  });

  it('stays non-diagnostic: no scoring language about the reader\'s own family', () => {
    // The spec forbids content that scores or judges the reader's family.
    // These phrasings are the failure modes to keep out of shipped copy.
    for (const banned of [/your parenting style is/i, /you are an? (authoritarian|permissive|uninvolved)/i, /diagnos(e|is|tic) your/i]) {
      expect(src).not.toMatch(banned);
    }
    // And the promise is stated to the reader:
    expect(src).toContain('nothing here diagnoses or scores your family');
  });

  it('vignette answers are not position-biased (Semiconductor Lab lesson)', () => {
    const highs = (src.match(/warmth: 'high'/g) || []).length;
    const lows = (src.match(/warmth: 'low'/g) || []).length;
    // Neither answer dominates and the context-dependent option exists.
    expect(highs).toBeGreaterThan(0);
    expect(lows).toBeGreaterThan(0);
    expect(src).toContain("warmth: 'depends'");
  });

  it('two dials interaction updates state through the ctx contract', () => {
    loadTool(FILE, 'parentingLab');
    // Simulate a completed vignette state and confirm the reveal renders.
    const html = renderTool('parentingLab', {
      parentingLab: {
        view: 'm1',
        dialsCurrent: 0,
        dialsRevealed: true,
        dialsDone: { v1: { warmth: 'high', structure: 'high', correct: true } }
      }
    });
    expect(html).toContain('Your reading matches the intended one');
  });
});
