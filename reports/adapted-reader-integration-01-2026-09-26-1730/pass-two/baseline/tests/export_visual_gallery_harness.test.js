import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const gallery = require('../dev-tools/export_visual_gallery.cjs');

describe('HTML export visual gallery harness', () => {
  it('covers every exported reader theme', () => {
    expect(gallery.THEMES.map((theme) => theme.id)).toEqual(['light', 'dark', 'sepia', 'hc']);
  });

  it('covers every exported text-size stop', () => {
    expect(gallery.TEXT_SIZES.map((size) => size.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(gallery.TEXT_SIZES.at(-1).scale).toBeGreaterThanOrEqual(1.75);
  });

  it('covers desktop and mobile viewports', () => {
    expect(gallery.VIEWPORTS.map((viewport) => viewport.id)).toEqual(['desktop', 'mobile']);
    expect(gallery.VIEWPORTS.find((viewport) => viewport.id === 'mobile').isMobile).toBe(true);
  });

  it('uses representative exported resource types', () => {
    const types = new Set(gallery.HISTORY_ITEMS.map((item) => item.type));
    for (const type of ['simplified', 'outline', 'quiz', 'glossary', 'note-taking']) {
      expect(types.has(type), `missing gallery resource type: ${type}`).toBe(true);
    }
  });

  it('documents the expected screenshot matrix size', () => {
    expect(gallery.expectedScreenshotCount()).toBe(4 * 6 * 2);
    expect(gallery.OUTPUT_DIR.replace(/\\/g, '/')).toContain('/test-results/export-visual-gallery');
  });
});
