import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const toolPath = process.env.ART_STUDIO_GUIDE_SOURCE || 'stem_lab/stem_tool_artstudio.js';

function guideMode(html) {
  const match = html.match(/data-artstudio-guide-prompts="(simple|detailed)"/);
  return match ? match[1] : null;
}
function pressed(html, id) {
  const re = new RegExp('data-artstudio-guide-wording="' + id + '"[^>]*aria-pressed="(true|false)"');
  const match = html.match(re);
  return match ? match[1] : null;
}
const base = { artStudio: { tab: 'pixel', studioHome: false, showTour: true } };

describe('Art Studio guide wording default follows the grade band', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(toolPath, 'artStudio');
  });

  it('starts younger learners on simple wording when nothing was chosen', () => {
    for (const gradeLevel of ['Kindergarten', '2nd Grade', '5th Grade']) {
      const html = renderTool('artStudio', base, { gradeLevel });
      expect(guideMode(html), gradeLevel).toBe('simple');
      expect(pressed(html, 'simple'), gradeLevel).toBe('true');
    }
  });

  it('starts older learners on detailed wording when nothing was chosen', () => {
    for (const gradeLevel of ['6th Grade', '8th Grade', '11th Grade', 'College']) {
      const html = renderTool('artStudio', base, { gradeLevel });
      expect(guideMode(html), gradeLevel).toBe('detailed');
      expect(pressed(html, 'detailed'), gradeLevel).toBe('true');
    }
  });

  it('prefers the host grade band over the grade label when both are present', () => {
    expect(guideMode(renderTool('artStudio', base, { gradeLevel: '5th Grade', gradeBand: 'g912' }))).toBe('detailed');
    expect(guideMode(renderTool('artStudio', base, { gradeLevel: '10th Grade', gradeBand: 'k2' }))).toBe('simple');
  });

  it('keeps an explicit choice regardless of grade', () => {
    const detailedYoung = { artStudio: { ...base.artStudio, studioGuideWording: 'detailed' } };
    const simpleOld = { artStudio: { ...base.artStudio, studioGuideWording: 'simple' } };
    expect(guideMode(renderTool('artStudio', detailedYoung, { gradeLevel: '1st Grade' }))).toBe('detailed');
    expect(guideMode(renderTool('artStudio', simpleOld, { gradeLevel: '12th Grade' }))).toBe('simple');
  });

  it('falls back to detailed when the grade is unknown', () => {
    expect(guideMode(renderTool('artStudio', base, { gradeLevel: undefined }))).toBe('detailed');
    expect(guideMode(renderTool('artStudio', base, { gradeLevel: 'Mixed ages' }))).toBe('detailed');
  });
});

describe('Art Studio headings choose one ink class per theme', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(toolPath, 'artStudio');
  });

  function headingClass(html, id) {
    const match = html.match(new RegExp('id="' + id + '"[^>]*class="([^"]*)"')) ||
      html.match(new RegExp('class="([^"]*)"[^>]*id="' + id + '"'));
    return match ? match[1] : null;
  }

  it('paints the home headings white on the contrast surface and dark elsewhere', () => {
    const home = { artStudio: { studioHome: true } };
    const contrastHtml = renderTool('artStudio', home, { isContrast: true, theme: 'contrast' });
    const lightHtml = renderTool('artStudio', home, { isContrast: false });
    for (const id of ['artstudio-starting-points-title', 'artstudio-threads-title']) {
      const contrast = headingClass(contrastHtml, id);
      const light = headingClass(lightHtml, id);
      expect(contrast, id).toContain('text-white');
      expect(contrast, id).not.toMatch(/text-slate-9/);
      expect(light, id).toMatch(/text-slate-9/);
      expect(light, id).not.toContain('text-white');
    }
  });

  it('paints the coach heading white on the contrast surface', () => {
    const coach = { artStudio: { tab: 'watercolor', studioHome: false, showTour: true } };
    const contrast = headingClass(renderTool('artStudio', coach, { isContrast: true, theme: 'contrast' }), 'artstudio-coach-title');
    expect(contrast).toContain('text-white');
    expect(contrast).not.toContain('text-slate-950');
  });
});
