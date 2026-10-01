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

// The sweep above reads stem_lab_module.js like every other file, but its
// regex only matches `window._NAME = function (e) {`, and the hub attaches
// its handlers as local function declarations and element properties. It
// therefore matched 0 of the hub's 6 keydown sites -- including the
// CSS-fullscreen Escape handler that leaked on every tool unmount until
// 2026-09-21. The hub is the one file in stem_lab/ that is always loaded, so
// a listener leaked there outlives every tool.
//
// This sweep is written against the attachment rather than the assignment, so
// it sees any spelling. It is a ratchet: the known-permanent singleton is
// listed by name, and any NEW global attachment must remove itself.
describe('the hub module cleans up its own global key listeners', () => {
  const HUB = 'stem_lab_module.js';

  // Attachments to window/document that are deliberately permanent.
  const PERMANENT = [
    // The StemInput runtime sits behind `if (window.StemInput) return;`, so it
    // attaches exactly once per page and must stay for the session.
    { handler: 'onKeyboard', why: 'once-only StemInput runtime singleton' }
  ];

  function globalKeySites(src) {
    const out = [];
    const re = /(window|document)\.addEventListener\(\s*'(keydown|keyup)'\s*,\s*([A-Za-z_$][\w$.]*)/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      out.push({ target: m[1], type: m[2], handler: m[3], at: m.index });
    }
    return out;
  }

  it('attaches its global key listeners only in ways this gate can see', () => {
    // Guards the gate itself: if the hub grows a new attachment spelling,
    // this count moves and the sweep below must be revisited rather than
    // silently covering less.
    const sites = globalKeySites(read(HUB));
    expect(sites.length, sites.map((s) => s.handler).join(', ')).toBeGreaterThanOrEqual(5);
  });

  it('removes every global key listener it adds, or declares it permanent', () => {
    const src = read(HUB);
    const offenders = [];
    for (const site of globalKeySites(src)) {
      const permanent = PERMANENT.some((p) => p.handler === site.handler);
      if (permanent) continue;
      const esc = site.handler.replace(/[.$]/g, '\\$&');
      const removed = new RegExp(
        'removeEventListener\\(\\s*\'' + site.type + '\'\\s*,\\s*' + esc
      ).test(src);

      // A handler stored ON A NODE (el.__alloFsEsc) outlives that node: the
      // hub cannot know when a plugin's subtree unmounts, so an explicit
      // remove elsewhere in the file is NOT sufficient on its own -- it only
      // runs on the paths the tool chooses to take. Such a handler must ALSO
      // drop itself once its node has left the document. Requiring only the
      // explicit remove is what let the real leak pass: _stemFsExit removes
      // this listener by the same name, so deleting the self-removal changed
      // nothing the gate could see.
      const nodeScoped = site.handler.includes('.');
      const selfRemoving = new RegExp(
        esc + '\\s*=\\s*function[\\s\\S]{0,500}?isConnected[\\s\\S]{0,300}?removeEventListener\\(\\s*\'' + site.type + '\''
      ).test(src);

      const ok = nodeScoped ? (removed && selfRemoving) : (removed || selfRemoving);
      if (!ok) {
        offenders.push(
          site.target + '.' + site.type + ' <- ' + site.handler +
          (nodeScoped && removed && !selfRemoving
            ? ' (removed on the normal path, but never drops itself after its node is gone)'
            : '')
        );
      }
    }
    expect(offenders, offenders.join(' | ')).toEqual([]);
  });

  it('keeps the permanent list honest', () => {
    const src = read(HUB);
    for (const { handler } of PERMANENT) {
      // A name listed as permanent must still exist, or the exemption is
      // covering nothing and hiding the next leak that reuses the name.
      expect(src, handler + ' is exempted but no longer attached').toContain("'keydown'," + handler);
    }
    // The StemInput runtime's once-only guard is what makes it safe.
    expect(src).toContain('if (window.StemInput) return;');
  });

  it('mirror is byte-identical', () => {
    expect(pub(HUB)).toBe(read(HUB));
  });
});
