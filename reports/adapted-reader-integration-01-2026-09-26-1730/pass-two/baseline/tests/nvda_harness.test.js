// NVDA harness pure-core tests (2026-07-02): expectation derivation from remediated HTML,
// speech-log parsing, and the in-order transcript differ. The live NVDA loop is human-in-
// the-loop by design (see dev-tools/nvda-harness/README.md); everything testable headless
// is tested here.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { deriveExpected, deriveMustNotAnnounce } = require('../dev-tools/nvda-harness/expected_announcements.cjs');
const { parseSpeechLog, diffTranscript, formatReport } = require('../dev-tools/nvda-harness/diff_transcript.cjs');

const HTML = `<!DOCTYPE html><html lang="en"><head><title>T</title></head><body>
<main>
  <h1>Photosynthesis Study Guide</h1>
  <p>Intro paragraph.</p>
  <img src="leaf.png" alt="Cross-section of a leaf with labeled chloroplasts">
  <img src="border.png" alt="">
  <img src="nolabel.png">
  <h2>Key &amp; Terms</h2>
  <ul><li>Chlorophyll</li><li>Stomata</li><li>Glucose</li></ul>
  <table><caption>Rainfall by month</caption><tr><th scope="col">Month</th><th scope="col">cm</th></tr><tr><td>March</td><td>2</td></tr></table>
  <table role="presentation"><tr><td>layout</td></tr></table>
  <a href="https://example.org/photosynthesis">Read the full article</a>
  <a href="#">decorated non-link</a>
</main>
</body></html>`;

describe('deriveExpected — announcement expectations from remediated HTML', () => {
  const exp = deriveExpected(HTML);
  it('captures headings with levels and decoded entities', () => {
    const hs = exp.filter((e) => e.kind === 'heading');
    expect(hs.map((h) => [h.level, h.text])).toEqual([[1, 'Photosynthesis Study Guide'], [2, 'Key & Terms']]);
  });
  it('captures the main landmark, meaningful image, list, data table, and real link', () => {
    expect(exp.some((e) => e.kind === 'landmark' && e.text === 'main')).toBe(true);
    expect(exp.some((e) => e.kind === 'image' && e.text.startsWith('Cross-section'))).toBe(true);
    expect(exp.some((e) => e.kind === 'list' && e.items === 3)).toBe(true);
    expect(exp.some((e) => e.kind === 'table' && e.text === 'Rainfall by month' && e.rows === 2)).toBe(true);
    expect(exp.some((e) => e.kind === 'link' && e.text === 'Read the full article')).toBe(true);
  });
  it('excludes decorative (alt="") and missing-alt images, layout tables, and href="#" links', () => {
    expect(exp.filter((e) => e.kind === 'image').length).toBe(1);
    expect(exp.filter((e) => e.kind === 'table').length).toBe(1);
    expect(exp.filter((e) => e.kind === 'link').length).toBe(1);
  });
  it('preserves document order', () => {
    const kinds = exp.map((e) => (e.kind === 'heading' ? 'h' + e.level : e.kind));
    expect(kinds).toEqual(['landmark', 'h1', 'image', 'h2', 'list', 'table', 'link']);
  });
  it('deriveMustNotAnnounce lists the decorative image', () => {
    const d = deriveMustNotAnnounce(HTML);
    expect(d.length).toBe(1);
    expect(d[0].src).toBe('border.png');
  });
});

describe('parseSpeechLog — strips timestamps, keeps utterance order', () => {
  it('handles bare, clock-stamped, and ISO-stamped lines', () => {
    const log = [
      'main landmark',
      '12:01:03 - heading level 1, Photosynthesis Study Guide',
      '[12:01:05.221] graphic, Cross-section of a leaf with labeled chloroplasts',
      '2026-07-02T12:01:07.001 heading level 2, Key & Terms',
      '',
      '   ',
    ].join('\n');
    const u = parseSpeechLog(log);
    expect(u.length).toBe(4);
    expect(u[1]).toBe('heading level 1, Photosynthesis Study Guide');
    expect(u[3]).toBe('heading level 2, Key & Terms');
  });
});

describe('diffTranscript — in-order matching with honest verdicts', () => {
  const expected = deriveExpected(HTML);
  const mustNot = deriveMustNotAnnounce(HTML);
  const perfect = [
    'document, T',
    'main landmark',
    'heading level 1, Photosynthesis Study Guide',
    'Intro paragraph.',
    'graphic, Cross-section of a leaf with labeled chloroplasts',
    'heading level 2, Key & Terms',
    'list with 3 items',
    'bullet Chlorophyll', 'bullet Stomata', 'bullet Glucose',
    'table with 2 rows and 2 columns, Rainfall by month, caption',
    'Month, cm, March, 2',
    'link, Read the full article',
  ];
  it('perfect say-all pass → 100% spoken, exit-clean summary', () => {
    const d = diffTranscript(expected, perfect, mustNot);
    expect(d.summary.spoken).toBe(expected.length);
    expect(d.summary.missing).toBe(0);
    expect(d.summary.outOfOrder).toBe(0);
    expect(d.summary.decorativeAnnounced).toBe(0);
    expect(d.summary.coveragePct).toBe(100);
  });
  it('a skipped table reports MISSING, not a silent pass', () => {
    const noTable = perfect.filter((u) => !/table|Rainfall|Month, cm/.test(u));
    const d = diffTranscript(expected, noTable, mustNot);
    expect(d.results.find((r) => r.kind === 'table').verdict).toBe('missing');
    expect(d.summary.missing).toBe(1);
  });
  it('content spoken in the wrong order reports OUT-OF-ORDER (reading-order finding)', () => {
    // h2 spoken BEFORE h1: h2 matches in order (cursor 0), then h1's in-order search
    // fails past the cursor and falls back to anywhere-search → out-of-order.
    const swapped = [...perfect];
    const h1 = swapped.indexOf('heading level 1, Photosynthesis Study Guide');
    const h2 = swapped.indexOf('heading level 2, Key & Terms');
    [swapped[h1], swapped[h2]] = [swapped[h2], swapped[h1]];
    const d = diffTranscript(expected, swapped, mustNot);
    expect(d.summary.outOfOrder).toBeGreaterThanOrEqual(1);
  });
  it('a decorative image announced by filename is a VIOLATION', () => {
    const leaky = [...perfect, 'graphic, border'];
    const d = diffTranscript(expected, leaky, mustNot);
    expect(d.summary.decorativeAnnounced).toBe(1);
    expect(d.violations[0].src).toBe('border.png');
  });
  it('formatReport carries the verdict rows and headline', () => {
    const d = diffTranscript(expected, perfect, mustNot);
    const rpt = formatReport(d, { file: 'doc.html', log: 'nvda.log', when: 'now' });
    expect(rpt).toContain('RESULT:');
    expect(rpt).toContain('[OK ] h1 "Photosynthesis Study Guide"');
  });
});
