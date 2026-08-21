'use strict';

// Translation handoff for the extracted Assignment Center and Directions
// surfaces. This is intentionally a complete, non-English-safe worklist: it
// contains an explicit slot for every key in every supported pack and uses
// null for work still awaiting a human translator. Null is never an English
// fallback and the integrator can apply only reviewed, non-null values.
//
// The payload is generated in memory from the source-derived catalog so a new
// literal cannot be omitted from the handoff. Translators may replace null
// values with reviewed strings while preserving the placeholder contract.
const {
  EXTRACTED_VIEW_ADDITIONS,
  EXTRACTED_VIEW_KEYS,
  EXTRACTED_VIEW_PLACEHOLDERS,
} = require('./extracted_view_i18n_catalog.cjs');
const { LANGUAGE_CODES } = require('./main_ui_i18n_manifest.cjs');

const flatten = (value, prefix = '', out = {}) => {
  for (const [key, child] of Object.entries(value || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out);
    else out[full] = child;
  }
  return out;
};

const english = flatten(EXTRACTED_VIEW_ADDITIONS);
const translations = Object.fromEntries(
  Object.keys(LANGUAGE_CODES).map((slug) => [
    slug,
    Object.fromEntries(EXTRACTED_VIEW_KEYS.map((key) => [key, null])),
  ]),
);

const worklist = Object.fromEntries(
  Object.keys(LANGUAGE_CODES).map((slug) => [slug, {
    status: 'needs_human_translation',
    pendingKeys: [...EXTRACTED_VIEW_KEYS],
    completedKeys: [],
  }]),
);

module.exports = {
  schemaVersion: 1,
  generatedAt: '2026-08-21',
  status: 'worklist',
  namespace: ['share_collect', 'directions'],
  locales: Object.keys(LANGUAGE_CODES),
  keys: EXTRACTED_VIEW_KEYS,
  english,
  placeholders: EXTRACTED_VIEW_PLACEHOLDERS,
  translations,
  worklist,
  notes: [
    'All 120 share_collect call-site keys and all 25 directions call-site keys are represented.',
    'Null values are intentional review slots, never English fallback text.',
    'Do not apply until each locale has reviewed values with matching placeholders.',
  ],
};
