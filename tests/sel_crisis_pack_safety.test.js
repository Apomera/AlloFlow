// Crisis details survive translation (2026-09-28).
//
// Crisis Companion and TIPP give students phone numbers, text keywords and web
// addresses. A translation that reformats "741741", translates the keyword HOME,
// or drops "988" sends a student in crisis to nothing. For every translated
// string in sel.crisiscompanion / sel.tipp / sel.safety, in both copies of every
// pack: each run of 3+ digits, each keyword and each web address in the English
// must appear verbatim.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const flat = (d, p = '', out = {}) => { for (const [k, v] of Object.entries(d || {})) { if (v && typeof v === 'object') flat(v, p + k + '.', out); else if (typeof v === 'string') out[p + k] = v; } return out; };
const EN = flat(JSON.parse(readFileSync(resolve(ROOT, 'ui_strings.js'), 'utf8')));
const GROUPS = ['sel.crisiscompanion.', 'sel.tipp.', 'sel.safety.'];
const DOMAIN = /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:org|gov|com|info|net|edu)(?:\/[A-Za-z0-9_/.-]*)?/gi;
function mustKeep(en) {
  const out = new Set(en.match(/\d{3,}/g) || []);
  for (const w of ['HOME', 'START']) if (new RegExp('\\b' + w + '\\b').test(en)) out.add(w);
  for (const d of en.match(DOMAIN) || []) out.add(d.replace(/\.$/, ''));
  return [...out];
}

describe('crisis details stay verbatim in every pack', () => {
  const langs = readdirSync(resolve(ROOT, 'lang')).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));
  let checked = 0; let packsWithCrisis = 0;
  for (const dir of ['lang', 'desktop/web-app/public/lang']) {
    it(dir, () => {
      const bad = [];
      for (const lang of langs) {
        let pack;
        try { pack = flat(JSON.parse(readFileSync(resolve(ROOT, dir, lang + '.js'), 'utf8'))); } catch (e) { continue; }
        let any = false;
        for (const [k, v] of Object.entries(pack)) {
          if (!GROUPS.some((g) => k.startsWith(g)) || typeof EN[k] !== 'string') continue;
          if (k.startsWith('sel.crisiscompanion.')) any = true;
          const lost = mustKeep(EN[k]).filter((t) => !v.includes(t));
          checked++;
          if (lost.length) bad.push(lang + ' ' + k + ' lost ' + lost.join(','));
        }
        if (any && dir === 'lang') packsWithCrisis++;
      }
      expect(bad).toEqual([]);
    });
  }
  it('actually checked translated crisis strings', () => {
    expect(packsWithCrisis).toBeGreaterThan(50);
    expect(checked).toBeGreaterThan(50 * 500);
  });
});
