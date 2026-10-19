// Near-duplicate image grouping (2026-10-16). describeAndClassifyImages grouped images whose 8x8
// average hash differed by <= 6/64 bits and gave every member the first image's Vision verdict,
// so different bar charts (or equations two terms apart) shared one description and LaTeX.
// Now only EXACT duplicates share a verdict; a near-duplicate gets its own Vision call and
// inherits only a "decorative" verdict (the logo/letterhead case the grouping exists for).
// Runs the built module; Image + canvas are stubbed so each test image has a chosen hash.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadAlloModule } from './setup.js';

// Luminance pattern per image src -> getImageData. Two patterns that differ in 2 cells hash
// 2 bits apart (well inside the old 6-bit grouping threshold).
const BASE = Array.from({ length: 64 }, (_, i) => ((i * 7) % 3 === 0 ? 30 : 220));
const NEAR = BASE.slice(); NEAR[5] = NEAR[5] === 30 ? 220 : 30; NEAR[40] = NEAR[40] === 30 ? 220 : 30;
const PIXELS = {};
const src = (tag) => 'data:image/png;base64,' + Buffer.from(tag).toString('base64');

let savedImage, savedGetContext;
beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  savedImage = globalThis.Image;
  savedGetContext = HTMLCanvasElement.prototype.getContext;
  globalThis.Image = class {
    set src(v) { this._src = v; setTimeout(() => this.onload && this.onload(), 0); }
    get src() { return this._src; }
  };
  HTMLCanvasElement.prototype.getContext = function () {
    let drawn = null;
    return {
      drawImage: (img) => { drawn = img.src; },
      getImageData: () => {
        const lum = PIXELS[drawn] || BASE;
        const d = new Uint8ClampedArray(256);
        lum.forEach((v, i) => { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; });
        return { data: d };
      },
    };
  };
});
afterAll(() => { globalThis.Image = savedImage; HTMLCanvasElement.prototype.getContext = savedGetContext; });

// verdicts: map from base64 payload -> parsed Vision reply. Returns the pipeline and a call log.
const run = async (images, verdicts) => {
  const calls = [];
  const p = window.AlloModules.createDocPipeline({
    callGemini: async () => 'OK', callImagen: async () => null,
    callGeminiVision: async (prompt, b64) => { calls.push(b64); return JSON.stringify(verdicts[b64]); },
    addToast: () => {}, t: (k) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'D', state: {},
  });
  const html = '<html lang="en"><body><main>' + images.map((s) => '<img src="' + s + '" alt="Image (needs description)">').join('') + '</main></body></html>';
  const out = await p.describeAndClassifyImages(html, { cap: 10 });
  const doc = new DOMParser().parseFromString(out.html, 'text/html');
  return { calls, imgs: Array.from(doc.querySelectorAll('img')), out };
};

describe('near-duplicate images', () => {
  it('two different charts that hash alike each get their OWN description', async () => {
    const a = src('chart-a'); const b = src('chart-b');
    PIXELS[a] = BASE; PIXELS[b] = NEAR;
    const { calls, imgs } = await run([a, b], {
      [a.split(',')[1]]: { kind: 'chart', alt: 'Bar chart of reading scores rising from 60 to 80.' },
      [b.split(',')[1]]: { kind: 'chart', alt: 'Bar chart of math scores falling from 75 to 55.' },
    });
    expect(calls).toHaveLength(2);
    expect(imgs[0].getAttribute('alt')).toContain('reading scores');
    expect(imgs[1].getAttribute('alt')).toContain('math scores');
  });

  it('a look-alike of a DECORATIVE image inherits decorative without a Vision call', async () => {
    const a = src('logo-page-1'); const b = src('logo-page-2');
    PIXELS[a] = BASE; PIXELS[b] = NEAR;
    const { calls, imgs } = await run([a, b], { [a.split(',')[1]]: { kind: 'decorative', alt: '' } });
    expect(calls).toHaveLength(1);
    for (const im of imgs) {
      expect(im.getAttribute('alt')).toBe('');
      expect(im.getAttribute('role')).toBe('presentation');
    }
  });

  it('exact duplicates still share one Vision call and one description', async () => {
    const a = src('same-figure');
    PIXELS[a] = BASE;
    const { calls, imgs } = await run([a, a, a], { [a.split(',')[1]]: { kind: 'photo', alt: 'A red barn in a snowy field.' } });
    expect(calls).toHaveLength(1);
    expect(imgs.map((im) => im.getAttribute('alt'))).toEqual(Array(3).fill('A red barn in a snowy field.'));
  });
});
