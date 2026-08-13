import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * The planet Mercury was named with the CHEMICAL ELEMENT's translation key.
 *
 * `stem.solar_sys` shipped with exactly eight entries — venus, earth, mars,
 * jupiter, saturn, uranus, neptune, pluto. Mercury was missing, so the tool
 * borrowed `stem.periodic.mercury` from the periodic table. In English both read
 * "Mercury", which hid it completely. Everywhere else the first planet in the
 * solar system was labelled with a toxic liquid metal:
 *
 *   Chinese 汞 · Japanese 水銀 · Korean 수은 · Greek Υδράργυρος
 *   Hindi पारा · Vietnamese Thủy ngân · Arabic زئبق · Russian Ртуть
 *
 * (should be 水星 / 水星 / 수성 / Ερμής / बुध / Sao Thủy / عطارد / Меркурий)
 *
 * The fix adds the English key only. App `t()` resolves languagePack → UI_STRINGS
 * → undefined, so locales that have not been hand-translated yet fall back to
 * English "Mercury" — the right planet in the wrong language, rather than the
 * wrong word entirely. No pack was machine-translated.
 */
const TOOL_PATHS = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];
const STRING_PATHS = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
const get = (o, p) => p.split('.').reduce((a, k) => (a && a[k] != null ? a[k] : undefined), o);

describe('solar system Mercury naming', () => {
  it('no longer names the planet with the element key', () => {
    TOOL_PATHS.forEach((p) => {
      const source = readFileSync(p, 'utf8');
      expect(source, `${p}: the planet still uses the periodic-table key for Mercury`)
        .not.toContain("t('stem.periodic.mercury')");
      expect(source, `${p}: Mercury is not named from the solar_sys namespace`)
        .toContain("name: t('stem.solar_sys.mercury')");
    });
  });

  it('moves every reference together, not just the name', () => {
    TOOL_PATHS.forEach((p) => {
      const source = readFileSync(p, 'utf8');
      // The mission-fact chains compare `sel.name === t(<key>)`. If the name moved
      // namespace and a comparison did not, they would still match in English and
      // silently STOP matching in any locale where the pack has one key and not the
      // other — Mercury's facts would vanish for those students only.
      const nameKeys = (source.match(/t\('stem\.solar_sys\.mercury'\)/g) || []).length;
      expect(nameKeys, `${p}: expected the name plus both fact-chain comparisons`)
        .toBeGreaterThanOrEqual(3);
    });
  });

  it('has the English key so unlocalised packs fall back to a planet', () => {
    STRING_PATHS.forEach((p) => {
      const table = JSON.parse(readFileSync(p, 'utf8'));
      expect(get(table, 'stem.solar_sys.mercury'), `${p}: English Mercury key missing`).toBe('Mercury');
      // All nine worlds the tool offers now live in one namespace.
      expect(Object.keys(get(table, 'stem.solar_sys')).length, `${p}: solar_sys is incomplete`).toBe(9);
      // The chemistry string must survive untouched — it is still correct for the element.
      expect(get(table, 'stem.periodic.mercury'), `${p}: the element string was damaged`).toBe('Mercury');
    });
  });
});
