import fs from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const core = require('../text_inquiry/text_inquiry_core.js');
const html = fs.readFileSync('text_inquiry/text_inquiry.html', 'utf8');
const learningHubSource = fs.readFileSync('view_learning_hub_modal_source.jsx', 'utf8');
const manifest = JSON.parse(fs.readFileSync('tool_integrations_manifest.json', 'utf8'));
describe('Text Inquiry Studio reference integration', () => {
  it('computes transparent term frequencies and bounded concordance contexts', () => {
    const analysis = core.analyzeText('Home is remembered. Home is questioned. Another place is called home.', { topTermLimit: 10 });
    expect(analysis.wordCount).toBe(11);
    expect(analysis.topTerms.find((row) => row.term === 'home')).toEqual({ term: 'home', count: 3 });
    const rows = core.concordance(analysis, 'home', 2);
    expect(rows).toHaveLength(2);
    expect(rows[0].excerpt).toContain('Home is remembered');
  });
  it('creates stable source identifiers without retaining source text', () => {
    expect(core.stableSourceId(['Title', 'Author', 'Edition'])).toBe(core.stableSourceId(['Title', 'Author', 'Edition']));
    expect(core.stableSourceId(['Title', 'Author', 'Edition'])).not.toBe(core.stableSourceId(['Other', 'Author', 'Edition']));
  });
  it('declares a humanities contract, pinned open-source dependency, and bounded capture', () => {
    expect(html).toContain("id: 'text_inquiry_studio'");
    expect(html).toContain("supportedMethodPacks: ['humanistic_interpretation', 'civic_policy', 'creative_cultural']");
    expect(html).toContain("sanitizerId: 'text_inquiry_excerpt_guard_v1'");
    expect(html).toContain('compromise 14.15.1, MIT license');
    expect(html).toContain("'full source text omitted from capture'");
    expect(html).toContain('Counter-reading or exception');
    expect(html).toContain('../annotation_inquiry_bridge.js');
    expect(html).toContain('Annotation Suite · Close Reading');
    expect(html).toContain('bounded concordance excerpts converted to portable Annotation Suite notes');
    expect(html).toContain('data: {\n            source: source,');
    expect(html).not.toContain('data: { sourceText:');
  });
  it('provides explicit labels, live status, approval, and popup-blocked feedback', () => {
    for (const id of ['sourceTitle', 'sourceCreator', 'sourceEdition', 'sourceUrl', 'sourceContext', 'sourceText', 'queryTerm', 'patternClaim', 'counterReading', 'limitation', 'nextQuestion', 'annotationExcerpt', 'annotationStance', 'annotationNote']) expect(html).toMatch(new RegExp(`<label[^>]+for="${id}"`));
    expect(html).toContain('role="status" aria-live="polite"');
    expect(html).toContain('id="approvalCheck" type="checkbox"');
    expect(learningHubSource).toContain('data-help-key="learning_hub_text_inquiry_card"');
    expect(learningHubSource).toContain('The Text Inquiry Studio window was blocked');
  });
  it('registers the SDK, fixtures, pinned assets, and two reference integrations', () => {
    expect(manifest.sdk.version).toBe('1.0.0');
    expect(manifest.thirdPartyAssets[0]).toMatchObject({ id: 'compromise', version: '14.15.1', license: 'MIT' });
    expect(manifest.integrations.map((entry) => entry.contract.id)).toEqual(['alphafold_explorer', 'text_inquiry_studio']);
    for (const entry of manifest.integrations) expect(entry.captureFixturePath).toMatch(/\.capture\.json$/);
  });
});
