// Document Builder image crop (Tier 1, 2026-07-02). Click any <img> in the builder
// preview → floating "✂ Crop" button → drag-select modal → src replaced with the
// cropped pixels. This pins (a) the selection→natural-px math (mirror), (b) the
// output-format rule (JPEG only when the source was JPEG — transparency survives),
// (c) the FIFO-capped session store for pre-crop originals, and (d) the PRIVACY
// invariant that motivated the design: the pre-crop original must NEVER be stashed
// in the DOM (teachers crop to REMOVE content — a name, a face — and an attribute-
// stashed original would silently ship those pixels inside every export).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8') /* extracted-sources appended 2026-07-20 */ + ['misc_handlers_source.jsx','view_export_preview_source.jsx','udl_chat_source.jsx'].map(f => readFileSync(resolve(process.cwd(), f), 'utf8')).join('\n');

// ── Behavioral mirror: selection (display px) → source rect (natural px) ──
// Mirrors the Apply computation: scale by natural/client, clamp into the image,
// reject selections under 8 natural px on either axis.
const cropRect = (sel, pic) => {
  const kx = pic.naturalWidth / pic.clientWidth, ky = pic.naturalHeight / pic.clientHeight;
  let sx = (sel.left || 0) * kx, sy = (sel.top || 0) * ky;
  let sw = (sel.width || 0) * kx, sh = (sel.height || 0) * ky;
  sx = Math.max(0, Math.min(sx, pic.naturalWidth - 1)); sy = Math.max(0, Math.min(sy, pic.naturalHeight - 1));
  sw = Math.min(sw, pic.naturalWidth - sx); sh = Math.min(sh, pic.naturalHeight - sy);
  if (sw < 8 || sh < 8) return null;
  return { sx, sy, sw, sh };
};

describe('crop math: display selection maps to natural pixels, clamped, min-size gated', () => {
  const pic = { naturalWidth: 1200, naturalHeight: 800, clientWidth: 600, clientHeight: 400 };
  it('scales a mid-image selection by the natural/client ratio (2x here)', () => {
    const r = cropRect({ left: 100, top: 50, width: 200, height: 100 }, pic);
    expect(r).toEqual({ sx: 200, sy: 100, sw: 400, sh: 200 });
  });
  it('clamps a selection dragged past the right/bottom edge into the image', () => {
    const r = cropRect({ left: 500, top: 350, width: 400, height: 400 }, pic);
    expect(r.sx).toBe(1000);
    expect(r.sw).toBe(200); // 1200 - 1000, not 800
    expect(r.sy).toBe(700);
    expect(r.sh).toBe(100);
  });
  it('rejects selections under 8 natural px (accidental clicks / zero-drag)', () => {
    expect(cropRect({ left: 10, top: 10, width: 3, height: 100 }, pic)).toBeNull();
    expect(cropRect({ left: 10, top: 10, width: 0, height: 0 }, pic)).toBeNull();
  });
  it('a selection starting outside the image clamps its origin inside', () => {
    const r = cropRect({ left: -20, top: 20, width: 100, height: 100 }, pic);
    expect(r.sx).toBe(0); // -40 natural clamps to 0
    expect(r.sw).toBe(200);
  });
});

// ── Behavioral mirror: output format rule ──
const asJpeg = (srcFull) => /^data:image\/jpe?g/i.test(srcFull) || /\.jpe?g([?#]|$)/i.test(srcFull);
describe('crop output format: JPEG only when the source was JPEG (transparency survives PNG/webp/gif)', () => {
  it('data:image/jpeg and .jpg/.jpeg URLs re-encode as JPEG (photos stay small)', () => {
    expect(asJpeg('data:image/jpeg;base64,/9j/4AAQ')).toBe(true);
    expect(asJpeg('data:image/jpg;base64,/9j/4AAQ')).toBe(true);
    expect(asJpeg('https://cdn.school.org/photo.JPG')).toBe(true);
    expect(asJpeg('photo.jpeg?v=2')).toBe(true);
  });
  it('PNG / webp / gif / svg sources stay PNG so alpha is not flattened to black', () => {
    expect(asJpeg('data:image/png;base64,iVBOR')).toBe(false);
    expect(asJpeg('data:image/webp;base64,UklGR')).toBe(false);
    expect(asJpeg('diagram.gif')).toBe(false);
    expect(asJpeg('logo.svg')).toBe(false);
  });
  it('a .jpg mid-path does not fool the rule (only the terminal extension counts)', () => {
    expect(asJpeg('https://site.org/images.jpg.attacker/logo.png')).toBe(false);
  });
});

// ── Behavioral mirror: FIFO-capped original store ──
const storeAdd = (store, key, src, cap = 30) => {
  if (!store.map[key]) {
    store.map[key] = src;
    store.order.push(key);
    while (store.order.length > cap) delete store.map[store.order.shift()];
  }
};
describe('original store: first-write wins per key, FIFO-capped', () => {
  it('re-cropping the same image does not overwrite the true original', () => {
    const store = { map: {}, order: [] };
    storeAdd(store, 'c1', 'ORIGINAL');
    storeAdd(store, 'c1', 'ALREADY_CROPPED'); // second crop of the same img
    expect(store.map.c1).toBe('ORIGINAL');
    expect(store.order).toEqual(['c1']);
  });
  it('evicts the oldest original past the cap (session memory stays bounded)', () => {
    const store = { map: {}, order: [] };
    for (let i = 1; i <= 33; i++) storeAdd(store, 'c' + i, 'src' + i);
    expect(store.order.length).toBe(30);
    expect(store.map.c1).toBeUndefined();
    expect(store.map.c3).toBeUndefined();
    expect(store.map.c4).toBe('src4');
    expect(store.map.c33).toBe('src33');
  });
});

// ── Anti-drift pins on the source ──
describe('anti-drift: builder crop shipped with its privacy + chrome-sweep invariants', () => {
  it('the crop UI exists and is tagged data-allo-crop-ui', () => {
    expect(anti).toMatch(/_openBuilderCropModal/);
    expect(anti).toMatch(/allo-crop-overlay/);
    expect(anti).toMatch(/data-allo-crop-ui/);
  });
  it('PRIVACY: the pre-crop original never enters the DOM — no data-allo-crop-orig attribute pattern anywhere', () => {
    // The leaky design would be img.setAttribute('data-allo-crop-orig', src).
    // Originals must live only in the session-scoped window store.
    expect(anti).not.toMatch(/data-allo-crop-orig/);
    expect(anti).toMatch(/window\.__alloBuilderCropOriginals/);
  });
  it('the close-time remediation write-back strips crop chrome AND crop bookkeeping attrs', () => {
    expect(anti).toMatch(/#a11y-inspect-css[^'\n]*\.a11y-inspect-badge[^'\n]*\[data-allo-crop-ui\]/);
    expect(anti).toMatch(/removeAttribute\('data-allo-crop-id'\); n\.removeAttribute\('data-allo-crop'\)/);
  });
  it('the export shim sweeps live crop chrome before the module serializes the iframe', () => {
    const shim = anti.slice(anti.indexOf('const executeExportFromPreview = async () => {'));
    const firstChunk = shim.slice(0, 300);
    expect(firstChunk).toContain('_removeBuilderCropUi();');
  });
  it('applying or resetting a crop arms the edit-loss guard (data-allo-user-edited)', () => {
    const modal = anti.slice(anti.indexOf('const _openBuilderCropModal'), anti.indexOf('const _dismissCropBtn'));
    const armings = modal.match(/data-allo-user-edited', '1'/g) || [];
    expect(armings.length).toBeGreaterThanOrEqual(2); // apply + restore-original
  });
  it('keyboard support: arrows nudge / Shift+arrows resize, Escape closes without tripping the doc-level handler', () => {
    expect(anti).toMatch(/ArrowLeft: \[-4, 0\], ArrowRight: \[4, 0\], ArrowUp: \[0, -4\], ArrowDown: \[0, 4\]/);
    const kb = anti.slice(anti.indexOf('const _openBuilderCropModal'), anti.indexOf('const _dismissCropBtn'));
    expect(kb).toMatch(/e\.key === 'Escape'.*e\.stopPropagation\(\); _close\(\)/);
  });
  it('the floating button self-expires and dismisses on scroll (never parked in a serializable DOM)', () => {
    expect(anti).toMatch(/setTimeout\(\(\) => \{ try \{ if \(btn\.parentNode\) btn\.remove\(\); \} catch \(_\) \{\} \}, 10000\);/);
    expect(anti).toMatch(/doc\.addEventListener\('scroll', _dismissCropBtn, true\)/);
  });
});
