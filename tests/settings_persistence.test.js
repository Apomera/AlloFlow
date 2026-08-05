// Display and read-aloud settings are ACCESSIBILITY settings: a student who
// needs 24px text, wide line spacing, a reading ruler or a slower voice should
// not have to rebuild that setup every session. Font choice and colour overlay
// already persisted; these pins cover the ones that silently reset.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const COPIES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];
const read = (f) => readFileSync(f, 'utf-8');

describe('display + read-aloud settings persist across sessions', () => {
  it('each setting is READ back on load, in both ANTI copies', () => {
    for (const f of COPIES) {
      const app = read(f);
      for (const key of ['allo_voice_speed', 'allo_voice_volume', 'allo_base_font_size',
        'allo_line_height', 'allo_font_theme', 'allo_reading_ruler']) {
        expect(app.includes("safeGetItem('" + key + "')"), f + ' reads ' + key).toBe(true);
      }
      // And none of them are left as bare literal initial state.
      expect(app, f).not.toContain('const [voiceSpeed, setVoiceSpeed] = useState(1)');
      expect(app, f).not.toContain('const [baseFontSize, setBaseFontSize] = useState(16)');
      expect(app, f).not.toContain('const [lineHeight, setLineHeight] = useState(1.6)');
      expect(app, f).not.toContain("const [fontTheme, setFontTheme] = useState('Default')");
      expect(app, f).not.toContain('const [readingRuler, setReadingRuler] = useState(false)');
    }
  });

  it('each setting is WRITTEN when it changes (a reader without a writer persists nothing)', () => {
    for (const f of COPIES) {
      const app = read(f);
      for (const [key, dep] of [['allo_voice_speed', 'voiceSpeed'], ['allo_voice_volume', 'voiceVolume'],
        ['allo_base_font_size', 'baseFontSize'], ['allo_line_height', 'lineHeight'],
        ['allo_font_theme', 'fontTheme'], ['allo_reading_ruler', 'readingRuler']]) {
        expect(app.includes("safeSetItem('" + key + "'"), f + ' writes ' + key).toBe(true);
        expect(app.includes('}, [' + dep + ']);'), f + ' effect keyed on ' + dep).toBe(true);
      }
    }
  });

  it('stored values are validated, so corrupt storage cannot break the UI', () => {
    const app = read('AlloFlowANTI.txt');
    // Numeric prefs go through a finite + range check rather than raw parseFloat.
    expect(app).toMatch(/Number\.isFinite\(v\) && v >= 0\.5 && v <= 2/);   // voice speed
    expect(app).toMatch(/Number\.isFinite\(v\) && v >= 10 && v <= 48/);    // font size
    expect(app).toMatch(/Number\.isFinite\(v\) && v >= 1 && v <= 3/);      // line height
  });

  it('reduced motion still defers to the OS unless the user chose otherwise', () => {
    for (const f of COPIES) {
      const app = read(f);
      // A deliberate choice is stored; matching the OS clears the override so a
      // stale value can never mask a later system change.
      expect(app, f).toContain("if (stored === '1') return true;");
      expect(app, f).toContain("safeRemoveItem('allo_disable_animations')");
      expect(app, f).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
    }
  });
});
