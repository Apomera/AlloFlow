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

  // Canvas localStorage is EPHEMERAL, but durability is already solved one
  // layer down: utils_pure mirrors the WHOLE localStorage into the durable
  // bridge (ls_prefs/all) and hydrates it back before first paint. These pins
  // guard that mechanism, because every persisted setting depends on it.
  it('the localStorage-to-bridge mirror that makes these durable still exists', () => {
    const utils = readFileSync('utils_pure_source.jsx', 'utf-8');
    expect(utils).toContain("ds.get('ls_prefs', 'all')");   // hydrate
    expect(utils).toContain("ds.set('ls_prefs', 'all', dump)"); // snapshot
    expect(utils).toContain('window.__alloPrefsHydrated');       // mount gate holds first paint
    expect(utils).toContain("window.addEventListener('pagehide', _lsSnapshot)");
    // Hydration must never clobber a value written earlier this session.
    // The hydrator now reads currentValue once and honors replaceExisting.
    expect(utils).toContain('const currentValue = localStorage.getItem(k);');
    expect(utils).toContain('if (currentValue === null || replaceExisting) {');
    // And it must be active on Canvas hosts.
    expect(utils).toContain("host.includes('googleusercontent')");
  });

  it('does not add a second durable path that would race the existing one', () => {
    for (const f of COPIES) {
      const app = read(f);
      expect(app, f).not.toContain('_alloHydratePrefsFromDevice');
      expect(app, f).not.toContain('ALLO_PREF_NS');
    }
  });

  // ★ Regression: the first version of this feature put the persistence
  // effects ABOVE fontTheme/baseFontSize/lineHeight, so their dep arrays hit
  // the temporal dead zone during render — a ReferenceError and a white
  // screen. check_render_refs does NOT catch this (the names ARE declared,
  // just later), so it needs its own pin.
  it('every persistence effect sits BELOW the state it depends on', () => {
    for (const f of COPIES) {
      const lines = read(f).split('\n');
      const at = (needle) => lines.findIndex((l) => l.includes(needle));
      const decls = [
        'const [voiceSpeed, setVoiceSpeed]', 'const [voiceVolume, setVoiceVolume]',
        'const [baseFontSize, setBaseFontSize]', 'const [lineHeight, setLineHeight]',
        'const [fontTheme, setFontTheme]', 'const [readingRuler, setReadingRuler]',
        'const [selectedFont, _setSelectedFont]', 'const [colorOverlay, _setColorOverlay]',
        'const [disableAnimations, setDisableAnimations]',
      ].map(at);
      expect(Math.min(...decls), f + ' all preference states found').toBeGreaterThan(0);
      const lastDecl = Math.max(...decls);
      const firstEffect = at("safeSetItem('allo_voice_speed'");
      const lastEffect = at("safeSetItem('allo_reading_ruler'");
      expect(firstEffect, f + ' persistence effects below declarations').toBeGreaterThan(lastDecl);
      expect(lastEffect, f + ' last persistence effect below declarations').toBeGreaterThan(lastDecl);
    }
  });
});
