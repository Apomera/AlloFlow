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

// 2026-09-13. ?tool=zoomGallery&image=<id> opens straight onto an image, and an
// open image offers a "Copy link to this image" control whose link points at
// the public shell from anywhere a class cannot reach (Canvas, localhost, the
// desktop app). Verified end to end on the dev server: image=bootprint opened
// the bootprint and the clipboard held the public link.
describe('Zoom Gallery shareable images', () => {
  function lift(name, until) {
    const s = toolSrc.indexOf('function ' + name + '(');
    const e = toolSrc.indexOf('function ' + until + '(', s);
    if (s < 0 || e < 0) throw new Error('could not lift ' + name);
    return toolSrc.slice(s, e);
  }
  const helpers = lift('linkImageId', 'shareBase') + lift('shareBase', 'copyPlain');
  function evalWith(search, hostname) {
    const ctx = { window: { location: { search, hostname, origin: 'https://' + hostname, pathname: '/app/' } }, URLSearchParams, encodeURIComponent };
    vm.runInNewContext(helpers + '\nthis.linkImageId = linkImageId; this.shareLinkFor = shareLinkFor;', ctx);
    return ctx;
  }

  it('reads the image only when the link names this tool, and never the custom slot', () => {
    expect(evalWith('?tool=zoomGallery&image=bootprint', 'x').linkImageId(toolImages)).toBe('bootprint');
    expect(evalWith('?tool=zoom-gallery&image=EARTHRISE', 'x').linkImageId(toolImages)).toBe('earthrise');
    expect(evalWith('?tool=scaleExplorer&image=bootprint', 'x').linkImageId(toolImages)).toBeNull();
    expect(evalWith('?tool=zoomGallery&image=custom', 'x').linkImageId(toolImages)).toBeNull();
    expect(evalWith('?tool=zoomGallery&image=nothing', 'x').linkImageId(toolImages)).toBeNull();
    expect(evalWith('', 'x').linkImageId(toolImages)).toBeNull();
  });

  it('copies the public link off-host and the current origin on an AlloFlow host', () => {
    expect(evalWith('', 'alloflow-cdn.pages.dev').shareLinkFor('bootprint')).toBe('https://alloflow-cdn.pages.dev/app/?tool=zoomGallery&image=bootprint');
    for (const host of ['localhost', 'abc.usercontent.goog']) {
      expect(evalWith('', host).shareLinkFor('pillars')).toBe('https://alloflow-cdn.pages.dev/app/?tool=zoomGallery&image=pillars');
    }
  });

  it('opens the linked image at mount, offers the control only for catalog images, and registers its strings', () => {
    // the link wins over a hand-off from another tool; either opens the image once at mount
    expect(toolSrc).toMatch(/var id = linkImageId\(IMAGES\);[\s\S]{0,600}?if \(id\) openImage\(id\);/);
    expect(toolSrc).toMatch(/if \(!id && hand && hand\.image && IMAGES\.some/);
    expect(toolSrc).toMatch(/window\.__alloZoomGalleryStart = null;/);
    expect(toolSrc).toMatch(/current && current\.id !== 'custom' \? h\('button', \{ type: 'button', style: btnBase, onClick: copyLink/);
    expect(toolSrc).toMatch(/linkState === 'failed' && current \? h\('div'/);
    for (const k of ['copy_link', 'copy_link_title', 'link_copied', 'link_copied_sr', 'link_failed', 'link_field_aria']) {
      expect(toolInl[k], 'INL ' + k).toBeTruthy();
      for (const rel of UI_STRINGS_COPIES) expect(JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf8')).stem.zoomGallery[k], rel + ' ' + k).toBe(toolInl[k]);
    }
  });
});

// 2026-09-13. A live scale bar on the four images whose real size is known:
// two measured discs (Earth in Earthrise, the Sun in the SDO flare, fitted
// with a circle to the image pixels) and two NASA-stated nebula heights,
// flagged approximate. Checked in the real host: Earthrise 20,000 km at home,
// 2,000 km after four zoom steps; Pillars about 1 light-year; no bar on the
// bootprint; the hand-off opened Scale Explorer at 30 thousand km with the
// Earth in focus, and a plain reopen afterwards started at the person.
describe('Zoom Gallery scale bar', () => {
  const withScale = toolImages.filter((i) => i.scale).map((i) => i.id).sort();
  it('only images with a defensible reference carry a scale, and each says how it was set', () => {
    expect(withScale).toEqual(['carina', 'earthrise', 'pillars', 'solarflare']);
    for (const it of toolImages.filter((i) => i.scale)) {
      expect(it.scale.px).toBeGreaterThan(100);
      expect(it.scale.metres).toBeGreaterThan(0);
      expect(typeof it.scale.approx).toBe('boolean');
      expect(it.scale.basis.length).toBeGreaterThan(60);
      expect(it.scale.px).toBeLessThanOrEqual(Math.max(it.width, it.height));
    }
    // the two discs are measured, not stated; the two nebulae are stated, and say so
    expect(toolImages.find((i) => i.id === 'earthrise').scale.approx).toBe(false);
    expect(toolImages.find((i) => i.id === 'solarflare').scale.approx).toBe(false);
    expect(toolImages.find((i) => i.id === 'pillars').scale.approx).toBe(true);
    expect(toolImages.find((i) => i.id === 'carina').scale.approx).toBe(true);
    // the museum objects are photographed in perspective: deliberately no bar
    for (const id of ['apollo-cm', 'wright-flyer', 'bootprint', 'curiosity', 'iss-cupola']) expect(toolImages.find((i) => i.id === id).scale).toBeUndefined();
  });
  it('the Earth and Sun references agree with the known diameters to a few percent', () => {
    const e = toolImages.find((i) => i.id === 'earthrise').scale, s = toolImages.find((i) => i.id === 'solarflare').scale;
    expect(Math.abs(e.metres / 1.2742e7 - 1)).toBeLessThan(0.01);
    expect(Math.abs(s.metres / 1.3914e9 - 1)).toBeLessThan(0.01);
    // measured 2026-09-13: circle fit 453 px (bright width 448) and 3277 px (bright height 3258-3340)
    expect(e.px).toBe(453);
    expect(s.px).toBe(3280);
  });
  it('formats lengths a person can read and picks a round bar between 60 and 180 px', () => {
    const lift = (a, b) => toolSrc.slice(toolSrc.indexOf('function ' + a + '('), toolSrc.indexOf('function ' + b + '('));
    const ctx = { Math }; vm.runInNewContext(lift('fmtLen', 'niceBarMetres') + lift('niceBarMetres', 'copyPlain') + '\nthis.fmtLen = fmtLen; this.nice = niceBarMetres;', ctx);
    expect(ctx.fmtLen(5e6)).toBe('5000 km');
    expect(ctx.fmtLen(3.016e7)).toBe('30,160 km');
    expect(ctx.fmtLen(1.2742e7)).toBe('12,742 km');
    expect(ctx.fmtLen(9.4607e15)).toBe('1 light year');
    expect(ctx.fmtLen(2e15)).toBe('0.21 light years');
    expect(ctx.fmtLen(0.33)).toBe('33 cm');
    expect(ctx.fmtLen(2.5e-6)).toBe('2.5 µm');
    for (const mpp of [1, 33, 2.1e6, 1e14, 1e-7]) {
      const bar = ctx.nice(mpp);
      expect(bar, 'metres per px ' + mpp).toBeTruthy();
      expect(bar.px).toBeGreaterThanOrEqual(60); expect(bar.px).toBeLessThanOrEqual(180);
      const mant = bar.metres / Math.pow(10, Math.floor(Math.log10(bar.metres) + 1e-9));
      const isLy = bar.metres >= 9.4607e14;
      if (!isLy) expect([1, 2, 5].some((k) => Math.abs(mant - k) < 1e-6), 'round mantissa ' + bar.metres).toBe(true);
    }
  });
  it('paints from the viewer mapping on animation frames, and hands the visible width to Scale Explorer', () => {
    const fn = toolSrc.slice(toolSrc.indexOf('function updateScaleBar'), toolSrc.indexOf('function currentZoom'));
    expect(fn).toMatch(/imageToViewerElementCoordinates\(new window\.OpenSeadragon\.Point\(0, 0\)\)/);
    expect(fn).toMatch(/imageToViewerElementCoordinates\(new window\.OpenSeadragon\.Point\(it\.width, 0\)\)/);
    expect(fn).toMatch(/scaleTextRef\.current\.textContent =/); // painted, not bound
    expect(fn).not.toMatch(/setState|setZoomX|setCopied/);
    expect(toolSrc).toMatch(/v\.addHandler\('animation', updateScaleBar\);\s*v\.addHandler\('open', updateScaleBar\);\s*v\.addHandler\('resize', updateScaleBar\);/);
    expect(fn).toMatch(/window\.__alloScaleExplorerStart = \{ exp: Math\.log\(w\) \/ Math\.LN10, from: 'zoomGallery' \}/);
    expect(fn).toMatch(/setStemLabTool\('scaleExplorer'\)/);
    // the group is named, carries its basis as a title, and is never a live region
    expect(toolSrc).toMatch(/role: 'group', 'aria-label': I\('scale_group'\), title: I\('scale_basis_title'\) \+ ': ' \+ current\.scale\.basis/);
    expect(toolSrc).not.toMatch(/ref: scaleBarRef[^\n]*aria-live/);
  });
});

// 2026-09-13. Measure: two points on an image with a scale, joined by an
// overlay repainted on the viewer's animation frames, with the distance in
// real units. Real host: two clicks 40% of the view apart read 49,396 km
// against 49,414 km expected; Enter, pan, Enter measured 10,253 km from the
// keyboard; the bar and overlay now paint as soon as the image opens (the
// viewer's 'open' fires before the render that mounts them).
describe('Zoom Gallery measure tool', () => {
  it('is offered only where the image has a scale, and shares the pin paths for click and keyboard', () => {
    expect(toolSrc).toMatch(/current\.scale \? h\('button', \{ type: 'button', 'aria-pressed': measureMode \? 'true' : 'false'/);
    expect(toolSrc).toMatch(/if \(measureModeRef\.current\) \{ if \(addMeasurePoint\(vp\)\) ev\.preventDefaultAction = true; return; \}/);
    expect(toolSrc).toMatch(/if \(measureModeRef\.current\) addMeasurePoint\(v\.viewport\.getCenter\(true\)\);/);
    expect(toolSrc).toMatch(/I\('measure_center'\)/); // a button for the keyboard-only student too
  });
  it('measures in image pixels times the image scale, and says "about" when the scale is', () => {
    const fn = toolSrc.slice(toolSrc.indexOf('function measureDistance'), toolSrc.indexOf('function paintMeasure'));
    expect(fn).toMatch(/Math\.hypot\(pts\[1\]\.x - pts\[0\]\.x, pts\[1\]\.y - pts\[0\]\.y\)/);
    expect(fn).toMatch(/px \* \(it\.scale\.metres \/ it\.scale\.px\)/);
    expect(fn).toMatch(/it\.scale\.approx \? I\('scale_about'\) \+ ' ' : ''/);
  });
  it('paints the overlay imperatively, clears it on a new image, and paints when the open state lands', () => {
    const paint = toolSrc.slice(toolSrc.indexOf('function paintMeasure'), toolSrc.indexOf('function addMeasurePoint'));
    expect(paint).toMatch(/imageToViewerElementCoordinates/);
    expect(paint).not.toMatch(/setMeasurePts|setState/);
    expect(toolSrc).toMatch(/v\.addHandler\('animation', paintMeasure\);/);
    expect(toolSrc).toMatch(/setMeasureMode\(false\); measurePtsRef\.current = \[\]; setMeasurePts\(\[\]\);/);
    expect(toolSrc).toMatch(/React\.useEffect\(function \(\) \{ updateScaleBar\(\); paintMeasure\(\); \}, \[imgState, currentId\]\);/);
    expect(toolSrc).toMatch(/h\('svg', \{ ref: measureSvgRef, 'aria-hidden': 'true', focusable: 'false'/);
    for (const k of ['measure_btn', 'measure_active', 'measure_center', 'measure_clear', 'measure_hint', 'measure_first_sr', 'measure_sr', 'measure_result']) {
      expect(toolInl[k], 'INL ' + k).toBeTruthy();
      for (const rel of UI_STRINGS_COPIES) expect(JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf8')).stem.zoomGallery[k], rel + ' ' + k).toBe(toolInl[k]);
    }
  });
});
