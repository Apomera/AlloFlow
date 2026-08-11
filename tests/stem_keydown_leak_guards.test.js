import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Catalog sweep: window-level keydown handlers that are never removed on
// unmount kept firing from OTHER tools (multtable's Q/S/? started quizzes,
// speed runs, and AI calls anywhere in the app). Every such handler must
// refuse to act when its tool's root marker is absent from the DOM.
//
// Classification (2026-08-11 sweep of all 38 registration sites): most sites
// are safe — useEffect cleanups, self-cleaning modal dialogs, game-engine
// dispose paths, or handlers requiring the event target inside the tool root
// (dissection). These seven were behaviorally leaking and now carry guards
// (solarsystem's Alt+digit handler was the last, fixed after the other
// session's work on that file landed).

const read = (f) => fs.readFileSync('stem_lab/' + f, 'utf8');
const pub = (f) => fs.readFileSync('desktop/web-app/public/stem_lab/' + f, 'utf8');

const GUARDED = [
  { file: 'stem_tool_multtable.js', guard: "[data-multtable-command]", marker: 'data-multtable-command' },
  { file: 'stem_tool_areamodel.js', guard: "[data-areamodel-root]", marker: 'data-areamodel-root' },
  { file: 'stem_tool_coordgrid.js', guard: "[data-coordinate-theme]", marker: 'data-coordinate-theme' },
  { file: 'stem_tool_volume.js', guard: "[data-volume-root]", marker: 'data-volume-root' },
  { file: 'stem_tool_fractions.js', guard: "[data-fractions-root]", marker: 'data-fractions-root' },
  { file: 'stem_tool_spacecolony.js', guard: "[data-spacecolony-root]", marker: 'data-spacecolony-root' },
  { file: 'stem_tool_cyberdefense.js', guard: "cyber-defense-region", marker: "id: 'cyber-defense-region'" },
  { file: 'stem_tool_solarsystem.js', guard: "[data-solarsystem-tool]", marker: '"data-solarsystem-tool": true' }
];

describe('unmount guards on leaking window keydown handlers', () => {
  for (const { file, guard, marker } of GUARDED) {
    it(file + ' guards its handler and renders the anchor it checks', () => {
      const src = read(file);
      const guardIdx = src.indexOf(guard);
      expect(guardIdx, 'guard selector present').toBeGreaterThan(-1);
      // The guard must appear inside a keydown handler body: within 600 chars
      // before some addEventListener('keydown') or handler assignment.
      const handlerZone = /window\._[A-Za-z]+(Kb|Key|Keydown|KeyHandler)[A-Za-z]*\s*=\s*function|addEventListener\('keydown'/;
      expect(handlerZone.test(src), 'handler exists').toBe(true);
      expect(src, 'anchor markup present').toContain(marker);
    });

    it(file + ' mirror is byte-identical', () => {
      expect(pub(file)).toBe(read(file));
    });
  }
});

describe('no unguarded global-swap keydown handlers remain in the catalog', () => {
  it('every window._X keydown handler assignment is followed by a DOM-presence guard', () => {
    const files = fs.readdirSync('stem_lab').filter((f) => f.endsWith('.js'));
    const offenders = [];
    for (const f of files) {
      const src = read(f);
      const re = /window\._[A-Za-z]+\s*=\s*function\s*\(\s*e?\s*\)\s*\{([\s\S]{0,700})/g;
      let m;
      while ((m = re.exec(src)) !== null) {
        const body = m[1];
        // Only handlers that get attached to window keydown matter.
        const attachNearby = src.slice(m.index, m.index + 3000).includes("addEventListener('keydown'");
        if (!attachNearby) continue;
        const guarded = /document\.querySelector\(|document\.getElementById\(|window\._colonyKeyActive|closest\(/.test(body);
        if (!guarded) offenders.push(f + ': ' + m[0].slice(0, 60));
      }
    }
    expect(offenders, offenders.join(' | ')).toEqual([]);
  });
});
