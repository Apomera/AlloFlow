import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const read = (file) => readFileSync(resolve(ROOT, file), 'utf8');
const catalog = require(resolve(ROOT, 'dev-tools/i18n/extracted_view_i18n_catalog.cjs'));
const manifest = require(resolve(ROOT, 'dev-tools/i18n/main_ui_i18n_manifest.cjs'));
const payload = require(resolve(ROOT, 'dev-tools/i18n/extracted_views_hand_payload_20260821.cjs'));

const flatten = (value, prefix = '', out = {}) => {
  for (const [key, child] of Object.entries(value || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out);
    else out[full] = child;
  }
  return out;
};

const placeholders = (value) => [...String(value).matchAll(/\{[^{}]+\}/g)]
  .map((match) => match[0]).sort();
const english = flatten(catalog.EXTRACTED_VIEW_ADDITIONS);

describe('extracted view localization catalog', () => {
  it('covers every current extracted-view call site', () => {
    const assignment = read('view_assignment_center_source.jsx');
    const directions = read('view_directions_result_source.jsx');
    const assignmentKeys = [...new Set(
      [...assignment.matchAll(/\btx\('([^']+)'/g)]
        .map((match) => match[1]).filter((key) => key.startsWith('share_collect.')),
    )].sort();
    const directionKeys = [...new Set(
      [...directions.matchAll(/\btext\('([^']+)'/g)]
        .map((match) => catalog.DIRECTION_ALIASES[match[1]] || match[1])
        .map((key) => key.startsWith('directions.') ? key : `directions.${key}`),
    )].sort();

    expect(assignmentKeys).toHaveLength(120);
    expect(directionKeys).toHaveLength(25);
    expect(catalog.ASSIGNMENT_KEYS).toEqual(assignmentKeys);
    expect(catalog.DIRECTION_KEYS).toEqual(directionKeys);
    expect(catalog.EXTRACTED_VIEW_KEYS).toHaveLength(145);
    expect(flatten(manifest.ENGLISH_ADDITIONS)).toEqual(expect.objectContaining(english));
  });

  it('keeps root and desktop/public language mirrors byte-identical', () => {
    expect(read('desktop/web-app/public/view_assignment_center_module.js'))
      .toBe(read('view_assignment_center_module.js'));
    expect(read('desktop/web-app/public/view_directions_result_module.js'))
      .toBe(read('view_directions_result_module.js'));
    for (const slug of Object.keys(manifest.LANGUAGE_CODES)) {
      expect(read(`desktop/web-app/public/lang/${slug}.js`), `${slug} mirror drift`)
        .toBe(read(`lang/${slug}.js`));
    }
  });

  it('requires reviewed payload values to preserve placeholders and never copy English', () => {
    expect(payload.locales).toEqual(Object.keys(manifest.LANGUAGE_CODES));
    expect(payload.keys).toEqual(catalog.EXTRACTED_VIEW_KEYS);
    expect(payload.status).toBe('worklist');

    for (const slug of payload.locales) {
      const entries = payload.translations[slug];
      expect(Object.keys(entries).sort(), `${slug} payload coverage`)
        .toEqual([...payload.keys].sort());
      for (const key of payload.keys) {
        const value = entries[key];
        // null is an explicit human-review slot, not an English fallback.
        if (value === null) continue;
        expect(typeof value).toBe('string');
        expect(value.trim(), `${slug}:${key} is empty`).not.toBe('');
        expect(value, `${slug}:${key} copied English`).not.toBe(english[key]);
        expect(placeholders(value), `${slug}:${key} placeholders`)
          .toEqual(catalog.EXTRACTED_VIEW_PLACEHOLDERS[key]);
      }
    }
  });

  it('keeps representative locale worklists explicit until human translations land', () => {
    for (const slug of ['spanish_castilian', 'french', 'chinese_simplified', 'arabic']) {
      expect(payload.worklist[slug].status).toBe('needs_human_translation');
      expect(payload.worklist[slug].pendingKeys).toEqual(payload.keys);
      expect(payload.worklist[slug].completedKeys).toEqual([]);
      expect(Object.values(payload.translations[slug]).every((value) => value === null)).toBe(true);
    }
  });
});
