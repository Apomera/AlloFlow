// Whiteboard popup review, 2026-09-06. The popup is a standalone page, so the
// pure helpers are sliced out of the source the way whiteboard_recording does it.
//
//  - "Whoever opened me" was the trust boundary. The app opens the popup by
//    NAME, so a page already open in the same browser can create that window
//    first and remain window.opener after the app navigates it here; Save then
//    posted the drawing to that page with target '*'. Save and AI now wait for
//    an ack from a trusted origin, and drawing-bearing posts go only there.
//  - The AI buttons used the disabled attribute while busy, dropping keyboard
//    focus for the whole generation.
//  - Choosing a template replaced the whole scene with no confirmation.
//  - An empty export used a blocking alert().
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const FILE = 'whiteboard/whiteboard.html';
const src = readFileSync(FILE, 'utf8');

function lift(name, extraArgs = [], extraVals = []) {
  const start = src.indexOf('function ' + name + '(');
  expect(start, name + ' not found').toBeGreaterThan(-1);
  let depth = 0, i = src.indexOf('{', start);
  const open = i;
  for (; i < src.length; i += 1) { if (src[i] === '{') depth += 1; else if (src[i] === '}') { depth -= 1; if (depth === 0) break; } }
  const params = src.slice(src.indexOf('(', start) + 1, src.indexOf(')', start)).split(',').map((s) => s.trim()).filter(Boolean);
  // eslint-disable-next-line no-new-func
  const fn = new Function(...extraArgs, ...params, src.slice(open + 1, i));
  return (...args) => fn(...extraVals, ...args);
}

describe('the popup only hands its drawing to a trusted opener', () => {
  it('gates Save and AI on an ack from a trusted origin', () => {
    expect(src).toContain("if (d.type === 'allocwb-ack') {\n        if (!isTrustedOpenerOrigin(ev.origin)) return;");
    expect(src).toContain('setLinked(true);');
    expect(src).toContain("if (!linked) { flash('Waiting for AlloFlow to connect\\u2026', false); return; }");
    expect(src).toContain("if (!linked) { aiStatus('Waiting for AlloFlow to connect\\u2026', false); return; }");
    // everything after the ack is ignored until linked
    expect(src).toContain('      if (!linked) return;\n');
  });

  it('posts drawing-bearing messages only to the pinned origin, never to *', () => {
    expect(src).toContain("if (!handshake && !linked) return;");
    expect(src).toContain("var target = (linked && openerOrigin && openerOrigin !== 'null') ? openerOrigin : '*';");
    expect(src).toContain("var HANDSHAKE_TYPES = { 'allocwb-hello': 1, 'allocwb-closed': 1 };");
    expect(src).not.toContain("window.opener.postMessage(payload, openerOrigin || '*')");
  });

  it('the origin allowlist, lifted from the page, accepts AlloFlow hosts and refuses the rest', () => {
    const ok = lift('isTrustedOpenerOrigin');
    expect(ok('https://alloflow-cdn.pages.dev')).toBe(true);
    expect(ok('https://abc123.alloflow-cdn.pages.dev')).toBe(true);
    expect(ok('http://localhost:5173')).toBe(true);
    expect(ok('http://127.0.0.1:8080')).toBe(true);
    // the desktop bundle reports an opaque origin; the code's own history says
    // refusing it made the bridge go silent, so it stays accepted
    expect(ok('null')).toBe(true);
    expect(ok('https://alloflow.evil.example')).toBe(false);
    expect(ok('https://alloflow-cdn.pages.dev.evil.example')).toBe(false);
    expect(ok('https://evil-alloflow-cdn.pages.dev')).toBe(false);
    expect(ok('http://alloflow-cdn.pages.dev')).toBe(false);
    expect(ok('https://anyone.web.app')).toBe(false);
    expect(ok('')).toBe(false);
    expect(ok(undefined)).toBe(false);
  });
});

describe('the AI buttons keep keyboard focus while busy', () => {
  it('uses aria-disabled and refuses the click, not the disabled attribute', () => {
    expect(src).not.toContain('diag.disabled = busy');
    expect(src).not.toContain('img.disabled = busy');
    expect(src).not.toContain('rec.disabled = busy');
    expect(src).not.toContain('b.disabled = aiBusyFlag || !getSelectedImage()');
    expect(src).toContain("    if (aiBusyFlag) return;\n");
    expect(src).toContain("b.setAttribute('aria-disabled', off ? 'true' : 'false')");
    expect(src).toContain('aria-label="Edit the selected image with AI" aria-disabled="true"');
    expect(src).toContain('button.hdr[aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; }');
  });

  it('keeps the real disabled attribute for a browser that cannot record at all', () => {
    // genuinely unavailable, not a locked state: that one stays disabled
    expect(src).toContain("if (!ok) { rec.disabled = true; rec.title = 'This browser cannot record canvas video.'; }");
    expect(src).toContain('if (b && !b.disabled) b.setAttribute');
  });
});

describe('templates add to the drawing instead of replacing it', () => {
  it('appends below the existing content and resets the select', () => {
    expect(src).toContain('excalidrawAPI.updateScene({ elements: cur.concat(elements) });');
    expect(src).not.toContain('excalidrawAPI.updateScene({ elements: elements });');
    expect(src).toContain("ev.target.value = '';");
  });

  it('places the template under the lowest existing element, lifted from the page', () => {
    const sceneBounds = (els) => {
      let b = null;
      els.forEach((el) => {
        const e = [el.x, el.y, el.x + (el.width || 0), el.y + (el.height || 0)];
        b = b ? [Math.min(b[0], e[0]), Math.min(b[1], e[1]), Math.max(b[2], e[2]), Math.max(b[3], e[3])] : e;
      });
      return b || [0, 0, 100, 100];
    };
    const offset = lift('offsetSkeletonBelow', ['sceneBounds'], [sceneBounds]);
    const skel = [{ type: 'ellipse', x: 120, y: 140, width: 320, height: 320 }, { type: 'text', x: 180, y: 110, text: 'A' }];
    // nothing drawn: untouched
    expect(offset(skel, [])).toEqual(skel);
    // something drawn down to y=500: the template's top (110) lands at 580
    const moved = offset(skel, [{ x: 0, y: 100, width: 50, height: 400 }]);
    expect(moved[1].y).toBe(580);
    expect(moved[0].y).toBe(140 + (580 - 110));
    expect(moved[0].x).toBe(120);
    // the source skeleton is not mutated
    expect(skel[0].y).toBe(140);
  });
});

describe('small things', () => {
  it('an empty export reports inline rather than with a blocking alert', () => {
    expect(src).not.toContain("alert('Draw something first, or pick a template.')");
    expect(src).toContain("flash('Draw something first, or pick a template.', false)");
  });

  it('toolbar controls are readable and reach a 44px target', () => {
    expect(src).toContain('select, button.hdr, input.hdr { min-height: 44px; font-size: 13px; }');
    expect(src).toContain('.privacy { font-size: 12px; color: #94a3b8; }');
  });

  it('the desktop mirror is byte-identical', () => {
    expect(readFileSync('desktop/web-app/public/whiteboard/whiteboard.html', 'utf8')).toBe(src);
  });
});
