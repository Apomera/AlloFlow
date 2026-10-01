// Reading-order preview in the veraPDF validator popup (2026-06-22): veraPDF/PDFBox validate the tag
// STRUCTURE; this previews the EXPERIENCE — walks the tagged PDF's struct tree IN ORDER and replays each
// element's /ActualText (the sequence a screen reader announces), read aloud via the browser's
// speechSynthesis (no NVDA). This extracts the real _extractReadingOrder from the popup and runs it
// against a mocked pdf-lib struct tree to pin the traversal (grouping → recurse; leaf → emit, in order),
// plus anti-drift that both validator copies carry the feature. (Live browser/Canvas smoke still needed
// for the pdf-lib parsing itself — this file's the Canvas-gate page.)
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const live = readFileSync(resolve(process.cwd(), 'verapdf/verapdf_validator.html'), 'utf8');
const demo = readFileSync(resolve(process.cwd(), 'dev-tools/demo/verapdf_validator.html'), 'utf8');

// ── Extract the real _roName + _roText + _extractReadingOrder from the popup script ──
const _s = live.indexOf('const _roName = (v) =>');
const _e = live.indexOf('\n  }', live.indexOf('return { tagged: true, items: items };', _s)) + 4;
const _extractReadingOrder = new Function('window', live.slice(_s, _e) + '\nreturn _extractReadingOrder;')(globalThis.__roWin || {});

// ── Minimal pdf-lib mock (only what the walk touches) ──
class MockName { constructor(n) { this.n = n; this.encodedName = '/' + n; } }
class MockDict { constructor(m) { this._m = m || {}; } lookup(name) { return this._m[name.n]; } }
class MockArray { constructor(a) { this._a = a || []; } size() { return this._a.length; } lookup(i) { return this._a[i]; } }
const NAME = { of: (n) => new MockName(n) };
const aText = (s) => ({ decodeText: () => s });           // an /ActualText hex string
const leaf = (role, text, mcid) => new MockDict({ S: NAME.of(role), ActualText: aText(text), K: mcid }); // K = MCID number → content leaf
const group = (role, kids) => new MockDict({ S: NAME.of(role), K: new MockArray(kids) });

const runOn = (structRootK) => {
  const catalog = new MockDict({ StructTreeRoot: new MockDict({ K: structRootK }) });
  const win = { PDFLib: { PDFDocument: { load: async () => ({ catalog }) }, PDFName: NAME, PDFDict: MockDict, PDFArray: MockArray } };
  // rebuild the extracted fn bound to THIS window mock
  const fn = new Function('window', live.slice(_s, _e) + '\nreturn _extractReadingOrder;')(win);
  return fn(new Uint8Array([1, 2, 3]));
};

describe('reading-order preview: tag-tree walk replays content leaves in document order', () => {
  it('recurses through grouping elements and emits leaves in order, with /ActualText', async () => {
    const tree = new MockArray([
      group('Sect', [leaf('H1', 'The Title', 0), leaf('P', 'First paragraph', 1)]),
      leaf('P', 'A footer line', 2),
    ]);
    const ro = await runOn(tree);
    expect(ro.tagged).toBe(true);
    expect(ro.items).toEqual([
      { role: 'H1', text: 'The Title' },
      { role: 'P', text: 'First paragraph' },
      { role: 'P', text: 'A footer line' },
    ]);
  });
  it('reports untagged when there is no StructTreeRoot', async () => {
    const win = { PDFLib: { PDFDocument: { load: async () => ({ catalog: new MockDict({}) }) }, PDFName: NAME, PDFDict: MockDict, PDFArray: MockArray } };
    const fn = new Function('window', live.slice(_s, _e) + '\nreturn _extractReadingOrder;')(win);
    expect((await fn(new Uint8Array([1]))).tagged).toBe(false);
  });
  it('a leaf with no /ActualText still emits its role (empty text)', async () => {
    const tree = new MockArray([new MockDict({ S: NAME.of('Figure'), K: 5 })]);
    const ro = await runOn(tree);
    expect(ro.items).toEqual([{ role: 'Figure', text: '' }]);
  });
});

describe('anti-drift: both validator copies carry the reading-order preview', () => {
  for (const [name, src] of [['verapdf/', live], ['dev-tools/demo/', demo]]) {
    it(`${name} has the struct-tree walk + speechSynthesis controls + the UI hook`, () => {
      expect(src).toMatch(/async function _extractReadingOrder\(bytes\)/);
      expect(src).toMatch(/doc\.catalog\.lookup\(PDFName\.of\('StructTreeRoot'\)\)/);
      expect(src).toMatch(/new SpeechSynthesisUtterance\(/);
      expect(src).toMatch(/function _roOfferPreview\(\)/);
      expect(src).toContain('<div id="ro"');
      expect(src).toMatch(/_lastBytes = .*; _roOfferPreview\(\);/); // wired into a validate path
    });
  }
});
