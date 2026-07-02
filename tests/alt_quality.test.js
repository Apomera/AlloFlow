// Alt-text QUALITY gate (2026-07-02): golden characterization of _alloAltQuality +
// _alloScanAltQuality. Presence was always checked; these pin the QUALITY heuristics —
// what counts as information-free (high), what is merely degraded (warn), and crucially
// what must NOT be flagged (real descriptions, non-English alts, decorative empties,
// our own aria-hidden caption pattern).
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let altQuality, scanAltQuality;

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  altQuality = window.AlloModules.createDocPipeline.altQuality;
  scanAltQuality = window.AlloModules.createDocPipeline.scanAltQuality;
  expect(typeof altQuality).toBe('function');
  expect(typeof scanAltQuality).toBe('function');
});

describe('high severity — information-free alts', () => {
  const HIGH = [
    ['Image (needs description)', 'placeholder'],
    ['image', 'boilerplate'],
    ['Image of', 'boilerplate'],
    ['a picture', 'boilerplate'],
    ['Chart', 'boilerplate'],
    ['diagram.', 'boilerplate'],
    ['photo.jpg', 'filename'],
    ['IMG_0417', 'filename'],
    ['scan-003', 'filename'],
    ['diagram_final_v2.png', 'filename'],
  ];
  for (const [alt, expectedIssue] of HIGH) {
    it(`"${alt}" → high (${expectedIssue})`, () => {
      const q = altQuality(alt);
      expect(q.severity).toBe('high');
      expect(q.issues.map((i) => i.id)).toContain(expectedIssue);
    });
  }
});

describe('warn severity — degraded but not empty', () => {
  it('redundant "image of…" prefix on a real description', () => {
    const q = altQuality('Image of the water cycle showing evaporation and condensation');
    expect(q.severity).toBe('warn');
    expect(q.issues.map((i) => i.id)).toContain('redundant-prefix');
  });
  it('very short alt', () => {
    const q = altQuality('Map');
    expect(q.severity).toBe('warn');
    expect(q.issues.map((i) => i.id)).toContain('too-short');
  });
  it('over-long alt (>250 chars)', () => {
    const q = altQuality('A '.repeat(130) + 'diagram');
    expect(q.issues.map((i) => i.id)).toContain('too-long');
  });
  it('truncated alt', () => {
    const q = altQuality('The diagram shows the relationship between...');
    expect(q.issues.map((i) => i.id)).toContain('truncated');
  });
  it('caption echo (visible caption identical to alt)', () => {
    const q = altQuality('Diagram of the rock cycle', { figcaptionText: 'Diagram of the rock cycle' });
    expect(q.issues.map((i) => i.id)).toContain('caption-echo');
  });
  it('nearby-text echo (alt repeats adjacent body text)', () => {
    const q = altQuality('The mitochondria is the powerhouse of the cell', { nearbyText: 'As we learned, the mitochondria is the powerhouse of the cell and produces ATP.' });
    expect(q.issues.map((i) => i.id)).toContain('nearby-echo');
  });
});

describe('NOT flagged — real, decorative, and non-English alts', () => {
  const CLEAN = [
    'Cross-section of a plant cell with labeled chloroplasts and nucleus',
    'Bar chart: rainfall doubles from March (2cm) to April (4cm)',
    '', // decorative convention — presence policing belongs to axe
    'Diagrama del ciclo del agua con evaporación y condensación', // non-English: patterns don't match, no false flag
    'Students planting seedlings in the school garden',
  ];
  for (const alt of CLEAN) {
    it(`"${alt.slice(0, 40) || '(empty/decorative)'}" passes clean`, () => {
      const q = altQuality(alt);
      expect(q.flagged).toBe(false);
      expect(q.severity).toBe(null);
    });
  }
  it('short-but-real alt near unrelated text is not an echo', () => {
    const q = altQuality('School logo: a maple leaf', { nearbyText: 'Welcome to the spring newsletter for families.' });
    expect(q.flagged).toBe(false);
  });
});

describe('scanAltQuality — whole-document behavior', () => {
  it('flags worst-first, skips missing-alt (axe territory), respects aria-hidden captions', () => {
    const html = `<html><body><main>
      <p>Intro text.</p>
      <img src="a.png" alt="Photosynthesis inputs and outputs labeled on a leaf diagram">
      <img src="b.png" alt="Map">
      <img src="c.png" alt="IMG_0417">
      <img src="d.png">
      <figure><img src="e.png" alt="Water cycle stages"><figcaption><span aria-hidden="true">Water cycle stages</span></figcaption></figure>
    </main></body></html>`;
    const r = scanAltQuality(html);
    expect(r.total).toBe(5); // total = all imgs seen; d.png (NO alt attribute) is skipped from FLAGGING — that's axe's finding
    expect(r.flaggedCount).toBe(2);
    expect(r.highCount).toBe(1);
    expect(r.flagged[0].severity).toBe('high'); // worst-first: IMG_0417 before Map
    expect(r.flagged[0].alt).toBe('IMG_0417');
    // e.png's caption duplicates the alt but is aria-hidden — the pipeline's own
    // double-announcement fix — so it must NOT be flagged as caption-echo.
    expect(r.flagged.some((f) => f.alt === 'Water cycle stages')).toBe(false);
  });
  it('clean document → zero flags', () => {
    const r = scanAltQuality('<html><body><img src="x.png" alt="Two students measuring shadows at noon"></body></html>');
    expect(r.flaggedCount).toBe(0);
  });
});
