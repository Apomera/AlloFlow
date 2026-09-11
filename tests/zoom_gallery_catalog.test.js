// Zoom Gallery v2 invariants (2026-09-07).
//
// The tool exists as an inline STEAM Lab tool (stem_lab/stem_tool_zoomgallery.js)
// AND a companion pop-out (zoom_gallery/zoom_gallery.html). Both carry the same
// image catalog and the same string table, and both ship from two live copies
// (root = CDN, desktop/web-app/public = desktop app). These tests pin the
// invariants that broke — or would have broken silently — in v1:
//   1. Every NASA source is loaded WITHOUT CORS (images-assets.nasa.gov sends no
//      Access-Control-Allow-Origin header; the anonymous request failed for all
//      eight photos in v1) and every Smithsonian IIIF source carries pinned
//      width/height (ids.si.edu does not serve info.json with CORS).
//   2. Catalogs are identical between the inline tool and the companion window.
//   3. Live mirrors are byte-identical.
//   4. The zoom_coach quest is reachable with AI off (v1 counted only on the AI
//      path, so the quest was unattainable for AI-off classrooms).
//   5. Every companion-window string key is registered under
//      stem.zoomGallery in ui_strings.js, in all four copies, with the same
//      English value the source falls back to.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const TOOL = 'stem_lab/stem_tool_zoomgallery.js';
const TOOL_MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_zoomgallery.js';
const POPUP = 'zoom_gallery/zoom_gallery.html';
const POPUP_MIRROR = 'desktop/web-app/public/zoom_gallery/zoom_gallery.html';
const UI_STRINGS_COPIES = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js', 'desktop/web-app/build/ui_strings.js', 'desktop/app-build/ui_strings.js'];

// Evaluate a `var NAME = [...]` / `var NAME = {...}` literal out of source text.
function extractLiteral(src, name) {
  const start = src.indexOf('var ' + name + ' = ');
  if (start < 0) throw new Error('no ' + name + ' in source');
  const open = src.indexOf('=', start) + 1;
  // Find the matching close by walking brackets outside strings.
  let depth = 0, i = src.indexOf(src.slice(open).match(/[\[{]/)[0], open), inStr = null;
  const first = src[i];
  const closeCh = first === '[' ? ']' : '}';
  for (; i < src.length; i++) {
    const ch = src[i];
    if (inStr) { if (ch === '\\') { i++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === '\'' || ch === '"' || ch === '`') { inStr = ch; continue; }
    if (ch === first) depth++;
    else if (ch === closeCh) { depth--; if (depth === 0) break; }
  }
  const literal = src.slice(open, i + 1);
  return vm.runInNewContext('(' + literal + ')');
}

const toolSrc = read(TOOL);
const popupSrc = read(POPUP);
const toolImages = extractLiteral(toolSrc, 'IMAGES');
const popupImages = extractLiteral(popupSrc, 'IMAGES');
const toolWin = extractLiteral(toolSrc, 'WIN');
const toolInl = extractLiteral(toolSrc, 'INL');
const popupStr = extractLiteral(popupSrc, 'STR');

describe('Zoom Gallery catalog', () => {
  it('has at least 13 images with the required fields', () => {
    expect(toolImages.length).toBeGreaterThanOrEqual(13);
    for (const it of toolImages) {
      for (const f of ['id', 'emoji', 'name', 'type', 'src', 'source', 'credit', 'link', 'meta', 'notice', 'wonder', 'describe', 'width', 'height']) {
        expect(it[f], `${it.id}.${f}`).toBeTruthy();
      }
      expect(['iiif', 'image']).toContain(it.type);
      expect(/^https:\/\//.test(it.src), it.id + ' src https').toBe(true);
      expect(/^https:\/\//.test(it.link), it.id + ' link https').toBe(true);
    }
    const ids = toolImages.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only cites openly licensed hosts (NASA public domain, Smithsonian CC0, Library of Congress)', () => {
    for (const it of toolImages) {
      const host = new URL(it.src).hostname;
      expect(['images-assets.nasa.gov', 'ids.si.edu', 'tile.loc.gov'], it.id + ' host').toContain(host);
      if (host === 'images-assets.nasa.gov') expect(it.type).toBe('image');
      else expect(it.type).toBe('iiif');
    }
  });

  it('gives every image a real text alternative, not a restatement of the title', () => {
    for (const it of toolImages) {
      // The description is what a student who cannot see the image gets instead
      // of the picture, so it has to describe rather than label.
      expect(it.describe.length, it.id + ' describe too short').toBeGreaterThan(180);
      expect(it.describe, it.id + ' describe repeats the name').not.toBe(it.name);
      // It says what is there; it does not hand over the observation task.
      expect(it.describe, it.id + ' describe poses the task').not.toMatch(/\bzoom in\b/i);
    }
  });

  it('loads every NASA image without CORS and pins IIIF dimensions (the v1 breakage)', () => {
    for (const it of toolImages) {
      if (it.type === 'image') {
        expect(it.cors, it.id + ' must be cors:false (NASA sends no ACAO header)').toBe(false);
      } else {
        expect(it.cors, it.id).toBe(true);
        expect(/\/info\.json$/.test(it.src), it.id + ' src must be the IIIF base, not info.json').toBe(false);
        expect(it.width).toBeGreaterThan(1000);
        expect(it.height).toBeGreaterThan(1000);
      }
    }
    // The tile source must honour the flag — a catalog flag nothing reads is decoration.
    for (const src of [toolSrc, popupSrc]) {
      expect(src).toMatch(/crossOriginPolicy: item\.cors === false \? false : 'Anonymous'/);
      expect(src).toMatch(/\{ tileSource: ts, crossOriginPolicy: false \}/);
    }
  });

  it('keeps real deep zoom available: at least 6 IIIF pyramids, at least 4 NASA photos above 3000px', () => {
    expect(toolImages.filter((i) => i.type === 'iiif').length).toBeGreaterThanOrEqual(6);
    expect(toolImages.filter((i) => i.type === 'image' && Math.max(i.width, i.height) >= 3000).length).toBeGreaterThanOrEqual(4);
  });

  it('reaches beyond spaceflight, so the tool is not a one-subject gallery', () => {
    const space = toolImages.filter((i) => /NASA|NASM/.test(i.source));
    expect(toolImages.length - space.length, 'non-spaceflight items').toBeGreaterThanOrEqual(4);
  });

  it('generates enough IIIF scale factors to fit the largest sheet in one tile', () => {
    // A fixed [1,2,4,8,16] list leaves the 9904px Chicago map unable to zoom out
    // to a single tile, so its top level never fits the frame.
    for (const src of [toolSrc, popupSrc]) {
      expect(src).toMatch(/scaleFactors: scaleFactorsFor\(item\.width, item\.height\)/);
      expect(src).toMatch(/longest \/ f <= 512/);
    }
  });

  it('is identical between the inline tool and the companion window', () => {
    expect(popupImages).toEqual(toolImages);
  });

  it('shares one string table between the inline tool and the companion window', () => {
    expect(popupStr).toEqual(toolWin);
  });
});

describe('Zoom Gallery mirrors', () => {
  it('root and desktop copies of the tool are byte-identical', () => {
    expect(read(TOOL_MIRROR)).toBe(toolSrc);
  });
  it('root and desktop copies of the companion window are byte-identical', () => {
    expect(read(POPUP_MIRROR)).toBe(popupSrc);
  });
  it('the launcher opens the v2 companion (cache pin bumped with the rewrite)', () => {
    expect(toolSrc).toMatch(/zoom_gallery\/zoom_gallery\.html\?v=2/);
    expect(toolSrc).not.toMatch(/zoom_gallery\.html\?v=1/);
  });
});

describe('Zoom Gallery quests', () => {
  it('the coach quest counts with AI off, inline and via the companion', () => {
    // Inline: the AI-off branch bumps coachCount.
    expect(toolSrc).toMatch(/if \(!aiOn\) \{ setNote\(current\.id, \{ feedback: nextReflect\(\) \}\); bumpSlice\('coachCount'\); return; \}/);
    // Companion: the AI-off branch tells the opener, and the opener counts it.
    expect(popupSrc).toMatch(/toOpener\(\{ type: 'alloczoom-coached' \}\)/);
    expect(toolSrc).toMatch(/data\.type === 'alloczoom-coached'\) \{ bumpSlice\('coachCount'\)/);
  });
  it('opening an image inline satisfies zoom_open', () => {
    expect(toolSrc).toMatch(/function openImage\(id\) \{[\s\S]*?bumpSlice\('openedCount'\)/);
  });
});

describe('Zoom Gallery strings in ui_strings.js (all four copies)', () => {
  const expected = {};
  for (const k of Object.keys(toolWin)) expected[k] = toolWin[k];
  for (const k of Object.keys(toolInl)) expected[k] = toolInl[k];
  for (const it of toolImages) {
    const base = 'img_' + it.id.replace(/-/g, '_') + '_';
    expected[base + 'name'] = it.name; expected[base + 'meta'] = it.meta; expected[base + 'notice'] = it.notice; expected[base + 'wonder'] = it.wonder; expected[base + 'describe'] = it.describe;
  }
  const sections = UI_STRINGS_COPIES.map((p) => {
    const json = JSON.parse(read(p));
    return { path: p, section: (json.stem && json.stem.zoomGallery) || {} };
  });

  it('registers every key the source falls back to, with the identical English value', () => {
    const missing = [], drift = [];
    for (const k of Object.keys(expected)) {
      const v = sections[0].section[k];
      if (v == null) missing.push(k);
      else if (v !== expected[k]) drift.push(k + ': shipped "' + String(v).slice(0, 40) + '" vs source "' + String(expected[k]).slice(0, 40) + '"');
    }
    expect(missing, 'missing keys').toEqual([]);
    expect(drift, 'shipped value differs from source fallback').toEqual([]);
  });

  it('all four copies agree on the zoomGallery section', () => {
    for (const s of sections.slice(1)) {
      expect(s.section, s.path).toEqual(sections[0].section);
    }
  });

  it('the inline tool reads every key through t() under the stem.zoomGallery prefix', () => {
    expect(toolSrc).toMatch(/t\('stem\.zoomGallery\.' \+ key, WIN\[key\]\)/);
    expect(toolSrc).toMatch(/t\('stem\.zoomGallery\.' \+ key, INL\[key\]\)/);
    expect(toolSrc).toMatch(/t\('stem\.zoomGallery\.' \+ imgKey\(item, field\), item\[field\]\)/);
  });
});

describe('Zoom Gallery accessibility contract', () => {
  // These pin the defects an axe + keyboard audit found in v2.0. Every one of them
  // passed the existing repo-wide gates, because none of those measure a canvas.
  it('does not leave OpenSeadragon unlabelled controls in the tab order', () => {
    for (const src of [toolSrc, popupSrc]) {
      // OSD renders its zoom cluster as focusable divs with no accessible name.
      expect(src).toMatch(/showNavigationControl: false/);
    }
    for (const key of ['zoom_in', 'zoom_out', 'zoom_fit']) expect(toolWin[key], key).toBeTruthy();
    expect(toolSrc).toMatch(/'aria-label': W\('zoom_in'\)/);
    expect(popupSrc).toMatch(/data-s-aria="zoom_in"/);
  });

  it('names the element that actually takes focus, with role application', () => {
    // An aria-label on a bare div wrapper is ignored (aria-prohibited-attr); the
    // label has to sit on OSD's own focusable canvas element.
    expect(toolSrc).toMatch(/c\.setAttribute\('role', 'application'\)/);
    expect(toolSrc).toMatch(/c\.setAttribute\('aria-describedby', descTextId\)/);
    expect(popupSrc).toMatch(/osdCanvas\.setAttribute\('role', 'application'\)/);
    expect(toolSrc).not.toMatch(/ref: stageRef, 'aria-label'/);
  });

  it('lets a keyboard user drop a pin, not just a mouse user', () => {
    for (const src of [toolSrc, popupSrc]) {
      expect(src).toMatch(/addEventListener\('keydown'/);
      expect(src).toMatch(/e\.key !== 'Enter'/);
      expect(src).toMatch(/addPinAtViewportPoint\(/);
    }
    expect(toolWin.pin_center).toBeTruthy();
  });

  it('uses a button fill that carries white text at AA', () => {
    // #0ea5e9 behind white 700-weight 13px text measured 2.77:1 in v2.0.
    expect(toolSrc).toMatch(/accentBtn: '#0369a1'/);
    expect(toolSrc).toMatch(/background: P\.accentBtn, color: P\.accentFg/);
    expect(popupSrc).not.toMatch(/--accent2: #0ea5e9/);
  });

  it('gives every slab that floats over the image an opaque ground', () => {
    // Over an arbitrary photograph a translucent chip has no computable contrast
    // ratio, and no guaranteed one either.
    expect(toolSrc).not.toMatch(/rgba\(15,23,42,0\.8/);
    expect(popupSrc).not.toMatch(/rgba\(15,23,42,0\.8/);
    for (const key of ['chip', 'chipFg', 'chipLine', 'chipLink']) expect(toolSrc).toMatch(new RegExp(key + ':'));
    expect(popupSrc).toMatch(/--chip: #0f172a/);
  });

  it('offers the image description in both surfaces and can translate it', () => {
    expect(toolSrc).toMatch(/'aria-expanded': showDesc \? 'true' : 'false'/);
    expect(toolSrc).toMatch(/imgText\(current, 'describe'\)/);
    expect(popupSrc).toMatch(/id="describeBody"/);
    expect(popupSrc).toMatch(/imgStr\(current, 'describe'\)/);
    expect(popupSrc).toMatch(/out\[base \+ 'describe'\] = it\.describe/);
    expect(toolSrc).toMatch(/out\[imgKey\(it, 'describe'\)\] = it\.describe/);
  });

  it('does not narrate the zoom level on every wheel tick', () => {
    // A live region carrying a running metric talks over everything else. The
    // readout stays silent; the explicit zoom buttons announce instead.
    expect(popupSrc).toMatch(/id="zoomRead"[^>]*aria-hidden="true"/);
    expect(popupSrc).not.toMatch(/id="zoomRead"[^>]*aria-live="polite"/);
    expect(toolWin.zoom_announced).toBeTruthy();
    expect(toolSrc).toMatch(/say\(W\('zoom_announced'/);
  });
});

describe('Zoom Gallery read-aloud', () => {
  it('routes through the house player and only for an explicit user action', () => {
    // ctx.callTTS respects the header mute unless { force: true }, which is the
    // sanctioned bypass for a button the student pressed. Nothing here ever
    // speaks on its own, so there is no autoplay to mute.
    expect(toolSrc).toMatch(/ctx\.callTTS\(String\(text\), null, null, \{ force: true \}\)/);
    expect(toolSrc).not.toMatch(/callTTS\([^)]*\)\s*;\s*\/\/ *auto/);
  });

  it('hides the controls entirely when the host offers no speech', () => {
    // A dead button is worse than no button.
    expect(toolSrc).toMatch(/if \(typeof ctx\.callTTS !== 'function' \|\| !text\) return null;/);
    expect(popupSrc).toMatch(/if \(!ttsAvailable \|\| !text\) return null;/);
  });

  it('tells the student when speech fails instead of doing nothing', () => {
    expect(toolWin.read_aloud_failed).toBeTruthy();
    expect(toolSrc).toMatch(/say\(W\('read_aloud_failed'\)\)/);
    expect(popupSrc).toMatch(/announce\(STR\.read_aloud_failed\)/);
  });

  it('gives the pop-out speech through the opener, since it has no host', () => {
    expect(popupSrc).toMatch(/type: 'alloczoom-speak'/);
    expect(toolSrc).toMatch(/data\.type === 'alloczoom-speak'/);
    expect(toolSrc).toMatch(/type: 'alloczoom-speak-result'/);
    // and the opener advertises the capability on the handshake
    expect(toolSrc).toMatch(/tts: typeof ctx\.callTTS === 'function'/);
    expect(popupSrc).toMatch(/ttsAvailable = Boolean\(data\.tts\)/);
  });

  it('drops the navigator inset on a phone-sized stage', () => {
    // It sits exactly where the credit chip sits and eats a third of a small stage.
    expect(toolSrc).toMatch(/var navOn = \(el\.clientWidth \|\| 0\) >= 480;/);
    expect(toolSrc).toMatch(/showNavigator: navOn/);
    expect(popupSrc).toMatch(/showNavigator: \(osdEl\.clientWidth \|\| 0\) >= 480/);
  });

  it('keeps the credit line clear of the navigator instead of under it', () => {
    // At the same corner they overlapped, so the credit ran beneath the inset.
    expect(toolSrc).toMatch(/right: navOn \? 218 : 8/);
  });
});

describe('Zoom Gallery description plumbing', () => {
  // Three defects found by reading the accessibility tree rather than the source.
  it('describes the picture, not the paragraph about descriptions', () => {
    // aria-describedby aimed at the whole panel resolved to the intro copy
    // ("A written description of what the picture shows..."), so a screen
    // reader never heard the picture. It must name the description text alone.
    expect(toolSrc).toMatch(/var descTextId = descId \+ '-text';/);
    expect(toolSrc).toMatch(/c\.setAttribute\('aria-describedby', descTextId\)/);
    expect(toolSrc).not.toMatch(/setAttribute\('aria-describedby', descId\)/);
    expect(toolSrc).toMatch(/h\('p', \{ id: descTextId/);
    expect(popupSrc).toMatch(/setAttribute\('aria-describedby', 'describeText'\)/);
    expect(popupSrc).not.toMatch(/setAttribute\('aria-describedby', 'describeBody'\)/);
  });

  it('offers no description control when there is nothing to describe', () => {
    // A pasted "bring your own" image has no describe text; the disclosure used
    // to open onto the intro paragraph and nothing else.
    expect(toolSrc).toMatch(/current && imgText\(current, 'describe'\) \? h\('div'/);
    expect(popupSrc).toMatch(/if \(!current \|\| !imgStr\(current, 'describe'\)\) \{ describeWrap\.style\.display = 'none'; return; \}/);
    expect(toolSrc).toMatch(/else c\.removeAttribute\('aria-describedby'\)/);
    expect(popupSrc).toMatch(/else osdCanvas\.removeAttribute\('aria-describedby'\)/);
  });

  it('never leaves the read-aloud control stuck on Speaking', () => {
    // A speech call that never settles used to disable read-aloud for the rest
    // of the session, and changing picture did not clear it.
    expect(toolSrc).toMatch(/speakTokenRef\.current !== token/);
    expect(toolSrc).toMatch(/speakTimerRef\.current = setTimeout\(function \(\) \{ settle\(true\); \}, 30000\)/);
    expect(toolSrc).toMatch(/speakTokenRef\.current\+\+;[\s\S]{0,120}setSpeaking\(''\);\n *\}, \[currentId\]\)/);
    expect(popupSrc).toMatch(/function abandonSpeech\(\)/);
    expect(popupSrc).toMatch(/abandonSpeech\(\);\n    picker\.style\.display = 'none';/);
  });
});

// 2026-09-10. The shell deep link (?tool=zoomGallery) requests this plugin as soon as
// the app is ready, while stem_lab_module.js is still queued in the deferred
// module pump, so on a cold load the plugin runs with no window.StemLab. The
// file used to return silently in that case and the live app showed "The
// plugin loaded but did not register" on every shared link. It now installs
// the same minimal registry the other plugins install; the module adopts it.
describe('zoomGallery registers even when it runs before stem_lab_module.js', () => {
  it('leaves a registry entry behind in a context that had no window.StemLab', () => {
    const win = {
      AlloModules: {}, addEventListener() {}, navigator: {},
      location: { hostname: '', pathname: '', origin: '', href: 'about:blank' },
      __alloT: (k, fb) => fb || k,
      localStorage: { getItem() { return null; }, setItem() {} },
    };
    win.window = win; win.self = win;
    const ctx = {
      window: win, self: win, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout,
      navigator: win.navigator, location: win.location, localStorage: win.localStorage,
      document: { createElement() { return { style: {}, setAttribute() {}, appendChild() {} }; }, head: { appendChild() {} }, body: { appendChild() {} }, addEventListener() {}, querySelector() { return null; } },
    };
    ctx.globalThis = ctx;
    vm.runInNewContext(fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_zoomgallery.js'), 'utf8'), ctx, { filename: 'stem_lab/stem_tool_zoomgallery.js' });
    expect(win.StemLab && win.StemLab._registry && Object.keys(win.StemLab._registry)).toEqual(['zoomGallery']);
    expect(typeof win.StemLab.isRegistered).toBe('function');
    expect(win.StemLab.isRegistered('zoomGallery')).toBe(true);
  });

  it('the shim is the recognisable kind: it lacks ensureThree, so the module knows to adopt it', () => {
    // stem_lab_module.js tells a plugin shim from its own full object by that
    // one method. If a shim ever grows an ensureThree, the module would keep it
    // and the session would lose the real helpers again.
    const shim = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_zoomgallery.js'), 'utf8').match(/window\.StemLab = window\.StemLab \|\| \{[\s\S]*?\n  \};/);
    expect(shim, 'shim block present').toBeTruthy();
    expect(shim[0]).not.toMatch(/ensureThree/);
  });
});
