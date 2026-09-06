// The 3D surface shipped its labels as bare English literals, so a learner on
// a translated pack met the controls, the clinical explorer, the study set, the
// compare tray, the cutaway and the Find It challenge in English regardless of
// their language. This pins that those labels now go through t() with the same
// wording as before, and that the extraction did not quietly reword anything.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_brainatlas.js';
const src = readFileSync(FILE, 'utf8');

// A sample across every panel the pass covered, with the wording it must keep.
const WRAPPED = [
  ['d3_3d_anatomy_controls', '3D anatomy controls'],
  ['d3_visible_anatomy_layer', 'Visible anatomy layer'],
  ['d3_3d_camera_presets', '3D camera presets'],
  ['d3_clinical_lesion_explorer', 'Clinical lesion explorer'],
  ['d3_saved_study_set', 'Saved study set'],
  ['d3_start_custom_quiz', 'Start custom quiz'],
  ['d3_structure_comparison', 'Structure comparison'],
  ['d3_cut_depth', 'Cut depth'],
  ['d3_find_it_in_3d', 'Find It in 3D'],
  ['d3_close', 'Close'],
];

describe('brainAtlas 3D surface goes through the translator', () => {
  WRAPPED.forEach(([key, english]) => {
    it(`${key} is wrapped and keeps its wording`, () => {
      const call = "t('stem.brainatlas." + key + "', \"" + english + "\")";
      expect(src).toContain(call);
    });
  });

  it('keeps the clinical disclaimer word for word', () => {
    expect(src).toContain('Teaching association only');
    expect(src).toContain('not a diagnosis or a substitute for clinical evaluation');
    expect(src).toContain("t('stem.brainatlas.d3_teaching_association_only_not_a_diagnosis_or', \"Teaching association only");
  });

  it('wraps every label it claims to, and only whole labels', () => {
    const keys = src.match(/stem\.brainatlas\.d3_[a-z0-9_]+/g) || [];
    const unique = new Set(keys);
    expect(unique.size).toBeGreaterThanOrEqual(50);
    // a fallback that begins or ends mid-phrase would be a concatenation
    // fragment, which no translator can reassemble
    const fallbacks = src.match(/t\('stem\.brainatlas\.d3_[a-z0-9_]+', "((?:[^"\\]|\\.)*)"\)/g) || [];
    expect(fallbacks.length).toBeGreaterThanOrEqual(50);
    fallbacks.forEach((f) => {
      const text = /", "((?:[^"\\]|\\.)*)"\)$/.exec(f.replace(/^t\('stem\.brainatlas\./, '"'));
      if (!text) return;
      expect(text[1]).not.toMatch(/^\s|\s$/);
    });
  });

  it('leaves no wrapped label with an empty fallback', () => {
    const empty = src.match(/t\('stem\.brainatlas\.d3_[a-z0-9_]+', ""\)/g) || [];
    expect(empty).toHaveLength(0);
  });

  it('the desktop mirror is byte-identical', () => {
    expect(readFileSync(MIRROR, 'utf8')).toBe(src);
  });
});
