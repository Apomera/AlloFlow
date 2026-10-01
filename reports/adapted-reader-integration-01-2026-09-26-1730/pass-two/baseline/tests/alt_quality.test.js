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

// ── Item E (2026-07-02): raw-LaTeX alt flag + LaTeX→spoken-English fallback ──
describe('raw-latex flag — equations must use the spoken form', () => {
  const LATEX_HIGH = [
    '\\frac{1}{2}mv^2',
    'x to the power: x^{2} + y_{i}',
    '$E = mc^2$',
    '\\sqrt{b^2 - 4ac} over 2a',
    '\\sum_{i=1}^{n} x_i',
  ];
  for (const alt of LATEX_HIGH) {
    it(`${JSON.stringify(alt)} → high (raw-latex)`, () => {
      const q = altQuality(alt);
      expect(q.severity).toBe('high');
      expect(q.issues.map((i) => i.id)).toContain('raw-latex');
    });
  }
  it('Windows path with backslashes is NOT raw-latex', () => {
    const q = altQuality('Screenshot of the folder C:\\Users\\cabba\\Documents in File Explorer');
    expect(q.issues.map((i) => i.id)).not.toContain('raw-latex');
  });
  it('spoken-form equation description is NOT flagged', () => {
    const q = altQuality('Equation: one half m v squared equals kinetic energy');
    expect(q.flagged).toBe(false);
  });
  it('ordinary caret (footnote marker, "x^2 shorthand" without braces or TeX commands) is NOT raw-latex', () => {
    const q = altQuality('Graph of y = x^2 shifted two units upward on a coordinate grid');
    expect(q.issues.map((i) => i.id)).not.toContain('raw-latex');
  });
});

describe('latexToSpeakable static — deterministic spoken-math fallback source', () => {
  let latexToSpeakable;
  beforeAll(() => {
    latexToSpeakable = window.AlloModules.createDocPipeline.latexToSpeakable;
    expect(typeof latexToSpeakable).toBe('function');
  });
  it('fraction', () => {
    expect(latexToSpeakable('\\frac{1}{2}')).toBe('1 over 2');
  });
  it('kinetic energy: frac + power', () => {
    const s = latexToSpeakable('\\frac{1}{2}mv^2');
    expect(s).toContain('1 over 2');
    expect(s).toContain('to the power 2');
  });
  it('square root', () => {
    expect(latexToSpeakable('\\sqrt{x+1}')).toBe('square root of x plus 1');
  });
  it('comparison words', () => {
    const s = latexToSpeakable('a \\leq b \\neq c');
    expect(s).toContain('less than or equal to');
    expect(s).toContain('not equal to');
  });
  it('strips $ delimiters and equals becomes a word', () => {
    const s = latexToSpeakable('$E = mc^2$');
    expect(s.startsWith('E equals')).toBe(true);
    expect(s).not.toContain('$');
  });
  it('empty/null → empty string (fallback stays silent)', () => {
    expect(latexToSpeakable('')).toBe('');
    expect(latexToSpeakable(null)).toBe('');
  });
});
