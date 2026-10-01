import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

// First tests for stem_tool_music.js. At 4,755 lines it was the largest STEM Lab
// tool with no coverage at all, while both of its sibling music tools had a11y
// tests. These guard the things a silent regression would break invisibly:
// the filter maths, the quest wiring, the dark theme, and the localisation floor.

const sourcePath = 'stem_lab/stem_tool_music.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_music.js';
const read = () => fs.readFileSync(sourcePath, 'utf8');

/** Lifts a run of module-scope helpers out of the tool and evaluates them. */
function extract(source, startMarker, endMarker, exportNames) {
  const a = source.indexOf(startMarker);
  const b = source.indexOf(endMarker, a);
  expect(a, 'start marker: ' + startMarker).toBeGreaterThan(-1);
  expect(b, 'end marker: ' + endMarker).toBeGreaterThan(a);
  const body = source.slice(a, b).replace(/\r\n/g, '\n');
  const out = {};
  const assign = exportNames.map((n) => 'exports.' + n + ' = ' + n + ';').join('\n');
  new Function('exports', body + '\n' + assign)(out);
  return out;
}

describe('Music Synthesizer — mirrors', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });
});

describe('Music Synthesizer — Filter Lab response curve', () => {
  const fns = () => extract(read(), '          var FILTER_PLOT_MIN_HZ',
    '          // --- Audio Context singleton ---',
    ['biquadMagnitudeDb', 'filterPlotFreqAt', 'filterPlotFractionOf']);
  const SR = 48000;

  // The curve used to be a hand-rolled linear approximation drawn on an axis
  // labelled 20Hz-20kHz while the cutoff slider only reached 12kHz. It is now the
  // RBJ transfer function BiquadFilterNode itself implements, so it can be checked
  // against textbook values rather than eyeballed.
  it('is flat in the passband and -3 dB at the cutoff', () => {
    const { biquadMagnitudeDb } = fns();
    expect(biquadMagnitudeDb('lowpass', 100, 1000, 0.7071, SR)).toBeCloseTo(0, 1);
    expect(biquadMagnitudeDb('lowpass', 1000, 1000, 0.7071, SR)).toBeGreaterThan(-3.3);
    expect(biquadMagnitudeDb('lowpass', 1000, 1000, 0.7071, SR)).toBeLessThan(-2.7);
  });

  it('rolls off at 12 dB per octave (two poles)', () => {
    const { biquadMagnitudeDb } = fns();
    // Measured well below Nyquist: a digital biquad's zero at Nyquist steepens the
    // slope near SR/2, which is real behaviour and not a bug to assert against.
    const a = biquadMagnitudeDb('lowpass', 2000, 1000, 0.7071, SR);
    const b = biquadMagnitudeDb('lowpass', 4000, 1000, 0.7071, SR);
    expect(b - a).toBeGreaterThan(-12.7);
    expect(b - a).toBeLessThan(-11.3);
  });

  it('mirrors the lowpass for highpass', () => {
    const { biquadMagnitudeDb } = fns();
    expect(biquadMagnitudeDb('highpass', 10000, 1000, 0.7071, SR)).toBeCloseTo(0, 1);
    expect(biquadMagnitudeDb('highpass', 1000, 1000, 0.7071, SR)).toBeGreaterThan(-3.3);
    expect(biquadMagnitudeDb('highpass', 250, 1000, 0.7071, SR))
      .toBeGreaterThan(biquadMagnitudeDb('highpass', 125, 1000, 0.7071, SR));
  });

  it('keeps unity peak gain for bandpass and puts -3 dB points where Q says', () => {
    const { biquadMagnitudeDb } = fns();
    expect(biquadMagnitudeDb('bandpass', 1000, 1000, 1, SR)).toBeCloseTo(0, 1);
    // f0*(sqrt(1+1/(4Q^2)) -/+ 1/(2Q)) = 618 Hz and 1618 Hz at Q=1
    expect(biquadMagnitudeDb('bandpass', 618, 1000, 1, SR)).toBeCloseTo(-3, 0);
    expect(biquadMagnitudeDb('bandpass', 1618, 1000, 1, SR)).toBeCloseTo(-3, 0);
  });

  it('shows resonance as Q rises, so the Q slider has a visible effect', () => {
    const { biquadMagnitudeDb } = fns();
    for (const q of [1, 4, 12, 20]) {
      expect(biquadMagnitudeDb('lowpass', 1000, 1000, q, SR)).toBeCloseTo(20 * Math.log10(q), 0);
    }
  });

  it('never returns a value that would break the SVG polyline', () => {
    const { biquadMagnitudeDb, filterPlotFreqAt } = fns();
    for (const type of ['lowpass', 'highpass', 'bandpass']) {
      for (let i = 0; i <= 260; i += 2) {
        for (const q of [0.1, 1, 20]) {
          const db = biquadMagnitudeDb(type, filterPlotFreqAt(i / 260), 20, q, SR);
          expect(Number.isFinite(db), type + ' at step ' + i + ' Q' + q).toBe(true);
        }
      }
    }
  });
});

describe('Music Synthesizer — logarithmic frequency mapping', () => {
  const fns = () => extract(read(), '          var FILTER_PLOT_MIN_HZ',
    '          // --- Audio Context singleton ---',
    ['filterPlotFreqAt', 'filterPlotFractionOf']);

  it('spans the audible range end to end', () => {
    const { filterPlotFractionOf } = fns();
    expect(filterPlotFractionOf(20)).toBeCloseTo(0, 5);
    expect(filterPlotFractionOf(20000)).toBeCloseTo(1, 5);
  });

  it('gives every octave equal width, which a linear slider did not', () => {
    const { filterPlotFractionOf } = fns();
    const low = filterPlotFractionOf(200) - filterPlotFractionOf(100);
    const high = filterPlotFractionOf(10000) - filterPlotFractionOf(5000);
    expect(low).toBeCloseTo(high, 6);
    // The old slider was linear over 100-12000 Hz, so 100-800 Hz — where most of
    // the musically useful movement is — occupied under 6% of the travel.
    const oldTravel = (800 - 100) / (12000 - 100);
    const newTravel = filterPlotFractionOf(800) - filterPlotFractionOf(100);
    expect(newTravel).toBeGreaterThan(oldTravel * 4);
  });

  it('round-trips a frequency through the slider position', () => {
    const { filterPlotFreqAt, filterPlotFractionOf } = fns();
    for (const hz of [20, 55, 440, 3000, 12000, 20000]) {
      expect(filterPlotFreqAt(filterPlotFractionOf(hz))).toBeCloseTo(hz, 2);
    }
  });

  it('clamps out-of-range input instead of producing NaN', () => {
    const { filterPlotFractionOf } = fns();
    expect(filterPlotFractionOf(0)).toBeCloseTo(0, 5);
    expect(filterPlotFractionOf(-5)).toBeCloseTo(0, 5);
    expect(filterPlotFractionOf(99999)).toBeCloseTo(1, 5);
    expect(filterPlotFractionOf(undefined)).toBeCloseTo(0, 5);
  });
});

describe('Music Synthesizer — quest hooks are reachable', () => {
  // `notesPlayed` was read by the tool's very first quest hook and written
  // nowhere, so "Play 5 musical notes" could never complete. Any hook that reads
  // a field nothing writes is the same dead end, so assert the pairing.
  it('writes every toolData field its quest hooks read', () => {
    const source = read();
    const block = source.slice(source.indexOf('questHooks: ['), source.indexOf('render: function(ctx)'));
    const fields = new Set();
    for (const m of block.matchAll(/\bd\.([a-zA-Z_$][\w$]*)/g)) fields.add(m[1]);
    expect(fields.size, 'quest hooks should read at least a few fields').toBeGreaterThan(3);
    for (const field of fields) {
      const written = new RegExp("upd\\('" + field + "'|updateMulti\\([^)]*\\b" + field + "\\b").test(source);
      expect(written, 'quest field d.' + field + ' is read by a hook but never written').toBe(true);
    }
  });
});

describe('Music Synthesizer — dark theme', () => {
  const stylesheet = () => {
    const m = /mst\.textContent = ("(?:\\.|[^"])*");/.exec(read());
    expect(m, 'dark stylesheet should be injected').not.toBeNull();
    return JSON.parse(m[1]);
  };

  it('reads the theme from ctx and stamps it on the tool root', () => {
    const source = read();
    expect(source).toContain('var isDark = !!(ctx.isDark || ctx.isContrast);');
    expect(source).toContain("'data-allo-theme': isDark ? 'dark' : 'light'");
    expect(source).toContain('allo-music-tool');
  });

  it('scopes every rule so light mode cannot be affected', () => {
    const rules = stylesheet().split('\n').filter((l) => l.includes('{'));
    expect(rules.length).toBeGreaterThan(100);
    for (const rule of rules) {
      expect(rule.startsWith('.allo-music-tool[data-allo-theme="dark"]'), 'unscoped rule: ' + rule).toBe(true);
    }
  });

  it('leaves no light-only surface class without a dark rule', () => {
    const source = read();
    const declared = new Set();
    for (const line of stylesheet().split('\n')) {
      const m = /^\.allo-music-tool\[data-allo-theme="dark"\] \.([^\s{]+?)(:hover)? \{/.exec(line);
      if (m) declared.add(m[1].replace(/\\/g, ''));
    }
    const isLightOnly = (t) =>
      /^(hover:)?bg-white$/.test(t) ||
      // Alpha surfaces count too. bg-white/80 and bg-purple-50/80 are light cards
      // whose text this stylesheet lightens, so skipping them once put pale amber
      // text on a near-white panel. bg-white/10..30 are overlays on explicitly
      // dark gradient panels and are deliberately excluded.
      /^bg-white\/([5-9]\d|100)$/.test(t) ||
      /^bg-[a-z]+-(50|100|200)\/\d+$/.test(t) ||
      /^(hover:)?bg-[a-z]+-(50|100|200)$/.test(t) ||
      /^text-[a-z]+-(500|600|700|800|900)$/.test(t) ||
      /^border-[a-z]+-(100|200|300|400)$/.test(t) ||
      /^(from|to|via)-[a-z]+-(50|100)$/.test(t);

    const missing = new Set();
    for (const m of source.matchAll(/(['"])((?:\\.|(?!\1)[^\n])*)\1/g)) {
      for (const tok of m[2].split(/\s+/)) {
        if (isLightOnly(tok) && !declared.has(tok)) missing.add(tok);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it('clears WCAG AA on every background and text pairing it creates', () => {
    const source = read();
    const decl = new Map();
    for (const line of stylesheet().split('\n')) {
      const m = /^\.allo-music-tool\[data-allo-theme="dark"\] \.([^\s{]+?)(:hover)? \{ (.+) \}$/.exec(line);
      if (!m) continue;
      const bg = /background-color:\s*(#[0-9a-f]{6})/i.exec(m[3]);
      const fg = /(?:^|\s)color:\s*(#[0-9a-f]{6})/i.exec(m[3]);
      decl.set(m[1].replace(/\\/g, ''), { bg: bg && bg[1], fg: fg && fg[1] });
    }
    const lum = (hex) => {
      const c = [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const ratio = (a, b) => {
      const hi = Math.max(lum(a), lum(b));
      const lo = Math.min(lum(a), lum(b));
      return (hi + 0.05) / (lo + 0.05);
    };

    const failures = [];
    for (const m of source.matchAll(/(['"])((?:\\.|(?!\1)[^\n])*)\1/g)) {
      const toks = m[2].split(/\s+/);
      const fgTok = toks.find((t) => decl.has(t) && decl.get(t).fg);
      if (!fgTok) continue;
      const bgTok = toks.find((t) => decl.has(t) && decl.get(t).bg);
      const bg = bgTok ? decl.get(bgTok).bg : '#0f172a';
      const r = ratio(bg, decl.get(fgTok).fg);
      if (r < 4.5) failures.push((bgTok || '(shell)') + ' + ' + fgTok + ' = ' + r.toFixed(2) + ':1');
    }
    expect([...new Set(failures)]).toEqual([]);
  });
});

describe('Music Synthesizer — localisation floor', () => {
  const scanArgIsRawLiteral = (source, from) => {
    let i = from;
    while (i < source.length && /\s/.test(source[i])) i += 1;
    return source[i] === '"' || source[i] === "'";
  };

  it('routes every toast and screen-reader announcement through a translator', () => {
    const source = read();
    const raw = [];
    for (const pattern of [/addToast\s*\(/g, /announceToSR\s*\(/g]) {
      for (const m of source.matchAll(pattern)) {
        const at = m.index + m[0].length;
        if (scanArgIsRawLiteral(source, at)) {
          raw.push(source.slice(m.index, at + 60).replace(/\n/g, ' '));
        }
      }
    }
    expect(raw).toEqual([]);
  });

  it('does not borrow another tool.s translation keys', () => {
    const source = read();
    // Three borrowings existed, and two of them were worse than a stale reference:
    //  - 'stem.dissection.it_was' in the ear-training toast
    //  - PRESETS keyed to 'stem.periodic.lead', the Periodic Table's word for the
    //    METAL, so a Spanish pack rendered the synth lead preset as "Plomo"
    //  - CHORDS keyed to 'stem.circuit.power', electrical power
    // The last two were computed object keys, so the tables changed shape with the
    // UI language and persisted selections stopped matching after a switch.
    // 'synth_ui' is a deliberately shared generic-UI namespace (also used by
    // brainatlas), not a borrowing from another subject tool.
    const SHARED = new Set(['music', 'synth', 'synth_ui', 'common']);
    const foreign = [...source.matchAll(/['"]stem\.([a-z0-9_]+)\./g)]
      .map((m) => m[1])
      .filter((ns) => !SHARED.has(ns));
    expect([...new Set(foreign)]).toEqual([]);
  });

  it('keeps preset and chord table keys language-independent', () => {
    const source = read();
    // A computed key built from a translation makes the map's shape depend on the
    // UI language. Every entry in both tables must be a plain literal.
    const tables = ['var PRESETS = {', 'var CHORDS = {'];
    for (const marker of tables) {
      const at = source.indexOf(marker);
      expect(at, marker).toBeGreaterThan(-1);
      const block = source.slice(at, source.indexOf('\n          };', at));
      expect(block, marker + ' should not use a translated computed key')
        .not.toMatch(/\[\s*(t|__alloT)\(/);
    }
  });

  it('keeps the placeholder formatter compatible with the host translator', () => {
    const source = read();
    // The host substitutes {name} style placeholders; __alloFmt must use the same
    // syntax or a translated string will render its braces literally.
    expect(source).toContain('var __alloFmt = function (k, fb, vars)');
    expect(source).toMatch(/replace\(\/\\\{\(\\w\+\)\\\}\/g/);
  });
});

describe('Music Synthesizer — Barry Harris chord labels', () => {
  it('names each chord from the degree that actually sounds', () => {
    const source = read();
    // The table pairs label '#Idim7' with degree 2, '#IIdim7' with degree 4 and so
    // on, so every printed Roman numeral named a root a whole step below the chord
    // the button played. Captions are now derived from the degree instead.
    expect(source).toContain('function barryHarrisChordName(rootIdx, chord)');
    const helper = source.slice(source.indexOf('function barryHarrisChordName'));
    expect(helper.slice(0, 400)).toContain('NOTE_NAMES[(rootIdx + chord.degree) % 12]');

    const majorAt = source.indexOf('BARRY_HARRIS.majorScale(rootIdx).map');
    const minorAt = source.indexOf('BARRY_HARRIS.minorScale(rootIdx).map');
    expect(majorAt).toBeGreaterThan(-1);
    expect(minorAt).toBeGreaterThan(majorAt);
    const majorBlock = source.slice(majorAt, minorAt);
    const minorBlock = source.slice(minorAt, minorAt + 1200);
    // Neither block should still render the mismatched hand-written numeral.
    expect(majorBlock).not.toMatch(/\}, chord\.label\)/);
    expect(minorBlock).not.toMatch(/\}, chord\.label\)/);
    expect(majorBlock).toContain('bhName');
    expect(minorBlock).toContain('bhNameMin');
  });

  it('gives each chord button its own accessible name', () => {
    const source = read();
    // All eight major-scale buttons used to announce "Minor 6th Diminished Scale"
    // and all eight minor-scale buttons "Play Chord", so a screen-reader user
    // could not tell any chord in the panel apart.
    const majorAt = source.indexOf('BARRY_HARRIS.majorScale(rootIdx).map');
    const block = source.slice(majorAt, majorAt + 900);
    expect(block).toMatch(/aria-label":\s*__alloT\('stem\.music\.play_chord_named'[^)]*\)\s*\+\s*' '\s*\+\s*bhName/);
    expect(source).not.toContain('"aria-label": __alloT(\'stem.music.minor_6th_diminished_scale\', "Minor 6th Diminished Scale"),');
  });
});
