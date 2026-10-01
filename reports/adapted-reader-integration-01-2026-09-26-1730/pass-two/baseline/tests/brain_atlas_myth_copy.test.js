// Copying a myth card as plain text, for handing the evidence to a teacher or a
// family. Two things are load-bearing and easy to regress:
//   1. It must NOT call navigator.clipboard directly. Gemini Canvas refuses that
//      API by permissions policy, so a direct call fails on every click for the
//      real user while passing every jsdom and Playwright gate.
//   2. execCommand needs the click's own transient activation, so the text must
//      be built synchronously with no await between the click and the copy.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resetStemLab, loadTool, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const render = (state) => renderTool('brainAtlas', { brainAtlas: state || {} });
const card = (id, extra) => render(Object.assign({ view: 'neuromyths', selectedRegion: id, detailMode: 'advanced' }, extra || {}));

describe('brainAtlas myth card copy', () => {
  beforeAll(() => { resetStemLab(); vi.spyOn(Math, 'random').mockReturnValue(0.4242); });
  afterAll(() => vi.restoreAllMocks());
  beforeEach(() => { resetStemLab(); loadTool(FILE, 'brainAtlas'); });

  it('offers copy on every myth card', () => {
    ['myth_learning_styles', 'myth_adhd_brain', 'myth_chemical_imbalance', 'myth_retina_screening'].forEach((id) => {
      const html = card(id);
      expect(html, id).toMatch(new RegExp('data-brainatlas-copy-myth-card="' + id + '"'));
      expect(html, id).toMatch(/Share this card/);
    });
  });

  it('does not offer copy on an ordinary atlas region', () => {
    expect(render({ view: 'lateral', selectedRegion: 'frontal', detailMode: 'advanced' }))
      .not.toMatch(/data-brainatlas-copy-myth-card/);
  });

  it('shows the outcome, and only for the card it belongs to', () => {
    const ok = card('myth_adhd_brain', { mythCopyState: { id: 'myth_adhd_brain', ok: true } });
    expect(ok).toMatch(/data-brainatlas-copy-status="copied"/);
    expect(ok).toMatch(/Card copied\./);

    const bad = card('myth_adhd_brain', { mythCopyState: { id: 'myth_adhd_brain', ok: false } });
    expect(bad).toMatch(/data-brainatlas-copy-status="failed"/);
    expect(bad).toMatch(/Select the card text and press Control C/);

    // a result left over from a different card must not show here
    const stale = card('myth_autism_brain', { mythCopyState: { id: 'myth_adhd_brain', ok: true } });
    expect(stale).not.toMatch(/data-brainatlas-copy-status/);
  });

  it('routes through alloCopyText and never calls navigator.clipboard', () => {
    const src = readFileSync(FILE, 'utf8');
    expect(src).not.toMatch(/navigator\.clipboard/);
    const fn = src.slice(src.indexOf('function copyBrainAtlasMythCard'), src.indexOf('function brainAtlasMythFor'));
    expect(fn).toContain('window.alloCopyText');
    expect(fn).toContain("document.execCommand('copy')");
    // No await between the click and the copy: execCommand needs the click's own
    // activation. Strip comments first — this is a claim about the code, and the
    // comment above the call says the word while describing the rule.
    const code = fn.replace(/\/\/[^\n\r]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/\bawait\b/);
    expect(code).not.toMatch(/fetch\(/);
  });

  it('builds a self-contained card: claim, evidence, alternative, source, and a scope line', () => {
    const src = readFileSync(FILE, 'utf8');
    const fn = src.slice(src.indexOf('function brainAtlasMythCardText'), src.indexOf('function copyBrainAtlasMythCard'));
    ['card.claim', 'card.fn', 'card.instead', 'card.source', 'card.sourceUrl'].forEach((f) => expect(fn, f).toContain(f));
    expect(fn).toContain('verdictMeta.label');
    expect(fn).toContain('verdictMeta.meaning');
    // the copied text has to carry its own limits once it leaves the tool
    expect(fn).toContain('Not a diagnosis and not medical advice');
    expect(fn).toContain('group level');
  });
});
