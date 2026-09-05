import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// The Contrast lab reports three WCAG results as badges. They rendered
// hardcoded English in every language, and the two preview lines never said
// which badge they belong to, although their sizes are the whole lesson:
// 24px bold is WCAG large text, 14px is normal text.
const toolPath = 'stem_lab/stem_tool_artstudio.js';
const state = { artStudio: { tab: 'contrast', studioHome: false } };

describe('Art Studio contrast badges are translated and tied to the samples', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(toolPath, 'artStudio');
  });

  // A ternary evaluates one branch, so the passing default never asks for the
  // fail wording. Black on white passes every level; near-white on white fails
  // every level.
  const failing = { artStudio: { ...state.artStudio, fgL: 95, bgL: 100 } };

  it('routes every badge name through the translator', () => {
    const seen = [];
    const t = (key, fallback) => { seen.push(key); return key.startsWith('stem.artstudio.contrast_') ? 'X_' + key.split('.').at(-1) : fallback; };
    const html = renderTool('artStudio', state, { t });
    for (const key of ['contrast_badge_aa_large', 'contrast_badge_aa_normal', 'contrast_badge_aaa_normal']) {
      expect(seen, key).toContain('stem.artstudio.' + key);
      expect(html, key).toContain('X_' + key);
    }
    // No bare English badge text survives when a translator is supplied.
    expect(html).not.toMatch(/(Pass|Fail) AA (Large|Normal)/);
    expect(html).not.toMatch(/(Pass|Fail) AAA Normal/);
  });

  it('translates the pass wording when the colours pass and the fail wording when they fail', () => {
    const seenPass = [], seenFail = [];
    const spy = (into) => (key, fallback) => { into.push(key); return key.startsWith('stem.artstudio.contrast_') ? 'X_' + key.split('.').at(-1) : fallback; };
    const passHtml = renderTool('artStudio', state, { t: spy(seenPass) });
    expect(seenPass).toContain('stem.artstudio.contrast_pass');
    expect(passHtml).toContain('X_contrast_pass');
    expect(passHtml).not.toContain('X_contrast_fail');

    const failHtml = renderTool('artStudio', failing, { t: spy(seenFail) });
    expect(seenFail).toContain('stem.artstudio.contrast_fail');
    expect(failHtml).toContain('X_contrast_fail');
    expect(failHtml).not.toContain('X_contrast_pass');
  });

  it('keeps the pass and fail marks distinguishable without colour', () => {
    const html = renderTool('artStudio', state);
    expect(html).toMatch(/✅|❌/);
  });

  it('explains which preview line each badge is about', () => {
    const html = renderTool('artStudio', state);
    expect(html).toContain('24-pixel large text');
    expect(html).toContain('14-pixel normal text');
  });

  it('keeps the sample sizes in pixels, because the WCAG thresholds are pixel-defined', () => {
    const src = readFileSync(toolPath, 'utf8');
    expect(src).toContain('fontSize: 24, fontWeight: \'bold\'');
    expect(src).toContain('fontSize: 14');
  });

  it('registers the new English in all three registries', () => {
    const section = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.artstudio;
    const mirror = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.artstudio;
    const catalog = JSON.parse(readFileSync('dev-tools/i18n/stem_artstudio_en.json', 'utf8'));
    for (const key of ['contrast_pass', 'contrast_fail', 'contrast_badge_aa_large', 'contrast_badge_aa_normal', 'contrast_badge_aaa_normal', 'contrast_sample_sizes']) {
      expect(section[key], key).toBeTruthy();
      expect(mirror[key], key).toBe(section[key]);
      expect(catalog[key], key).toBe(section[key]);
    }
  });
});
