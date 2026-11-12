// Export preflight reminds the teacher about unchecked Memory Aid facts (2026-11-11).
//
// Unchecked cards export with "Your teacher is still checking these facts" and no
// recall practice. That is the right gate, but nothing told the teacher before
// export, so shipped packs went out with most cards in that state.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { loadAlloModule } from './setup.js';

const source = readFileSync('view_export_preview_source.jsx', 'utf8');
const preflight = new Function(source.slice(source.indexOf('const _BUILDER_STYLE_GALLERY'), source.indexOf('function ExportPreviewView')) + '\nreturn _builderExportPreflight;')();

let pipeline;
beforeAll(() => {
  globalThis.React = window.React = createRequire(import.meta.url)(process.cwd() + '/desktop/web-app/node_modules/react');
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {},
    t: (key) => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: (type) => type, state: {},
  });
}, 60000);

const card = (id, verified) => ({ id, target: 'Target ' + id, essentialFacts: ['Fact for ' + id + '.'], factLocked: true, factVerified: verified, type: 'acronym', mode: 'scaffolded' });
const memoryAid = (cards) => ({ id: 'ma', type: 'memory-aid', title: 'Memory', data: { title: 'Memory', cards } });
const issuesFor = (cards) => {
  const doc = new JSDOM(pipeline.generateFullPackHTML([memoryAid(cards)], 'Pack', false, {}, { annotations: [] })).window.document;
  return { doc, issue: preflight(doc, 'html').issues.find((entry) => entry.code === 'memory-aid-facts') };
};

describe('memory aid facts in export preflight', () => {
  it('counts the cards whose facts the teacher has not checked', () => {
    expect(window.AlloModules.MemoryAid?.exportRules?.isCardVerified).toBeTypeOf('function');
    const { doc, issue } = issuesFor([card('a', true), card('b', false), card('c', false)]);
    expect(doc.querySelector('.memory-aid-export').getAttribute('data-allo-facts-pending')).toBe('2');
    expect(issue).toMatchObject({ severity: 'warning', count: 2 });
    expect(issue.message).toMatch(/^2 Memory Aid cards have facts/);
  });

  it('says nothing when every card is checked', () => {
    const { doc, issue } = issuesFor([card('a', true), card('b', true)]);
    expect(doc.querySelector('.memory-aid-export').hasAttribute('data-allo-facts-pending')).toBe(false);
    expect(issue).toBeUndefined();
  });
});
