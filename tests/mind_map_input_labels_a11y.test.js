import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'mind_map_module.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/mind_map_module.js'), 'utf8');

describe('Throughline programmatic input labels', () => {
  it('keeps source and deploy mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });

  it('names import and lesson-search controls', () => {
    expect(source).toContain("'aria-label': t('throughline.import_title') || 'Import unit file'");
    expect(source).toContain("'aria-label': t('throughline.search_lessons') || 'Search your lessons'");
  });

  it('associates the node description label explicitly', () => {
    expect(source).toContain("htmlFor: 'tl-node-description'");
    expect(source).toContain("id: 'tl-node-description'");
  });

  it('gives every generated-unit field a matching localized explicit name', () => {
    const keys = ['gen_topic', 'gen_grade', 'gen_count', 'gen_standards', 'gen_tone', 'gen_source', 'gen_notes', 'gen_unit_title', 'eq_label', 'gen_eu', 'gen_golden'];
    for (const key of keys) expect(source).toContain("'aria-label': t('throughline." + key + "')");
  });

  it('uses lesson-number-specific names for repeated lesson fields', () => {
    expect(source).toContain("(t('throughline.lesson_label') || 'Lesson') + ' ' + (i + 1) + ' ' + (t('throughline.title_label') || 'title')");
    expect(source).toContain("(t('throughline.lesson_label') || 'Lesson') + ' ' + (i + 1) + ': ' + (t('throughline.gen_objective_ph') || 'Measurable objective')");
    expect(source).toContain("(t('throughline.lesson_label') || 'Lesson') + ' ' + (i + 1) + ': ' + (t('throughline.gen_focus_ph') || 'One-line focus that steers every resource in this lesson')");
  });
});
