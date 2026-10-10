import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let pipeline, sources, readings;
const citation = '[Document 1](#allo-doc-plant-notes)';
const body = `Plants use light to grow ${citation}.`;
const privateText = `${body}\n\n### Your Document References:\n\nPrivate assessment title\n\n> Unshared learner details.\n\n### Research Review:\n\nTeacher-only search notes.\n\n#### Nested audit details\n\nExcluded source decisions.`;
const cfg = { includeSimplified: true, includeOriginalReading: true, includeAnalysis: true, includeTeacherKey: false };
const dom = html => new DOMParser().parseFromString(html, 'text/html');
const adapted = (data = privateText, studentSources) => ({
  id: 'student-reading', type: 'simplified', title: 'Plants', data,
  instructionalText: { role: 'supplemental', form: 'adapted' },
  ...(studentSources ? { studentSources } : {}),
  sourceProvenance: { researchEvidence: { private: 'RAW_REPORT_SENTINEL' } },
  config: { generationInputText: 'PRIVATE_INPUT_SENTINEL', researchEvidence: { private: 'NESTED_REPORT_SENTINEL' } },
});

beforeAll(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('doc_pipeline_module.js');
  sources = window.AlloModules.StudentSources;
  readings = window.AlloModules.InstructionalContext;
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: () => undefined, isRtlLang: () => false, updateExportPreview: () => {},
    getDefaultTitle: () => 'Reading', state: { leveledTextLanguage: 'English', exportConfig: {}, currentUiLanguage: 'English' },
  });
});

function permittedRecord(text = privateText, shareExcerpt = true) {
  return { version: 1, writingMode: 'synthesis', bodyKey: sources.bodyKey(text), sources: [{
    citationHref: '#allo-doc-plant-notes', title: 'Shared plant notes', shareExcerpt,
    passages: [{ text: 'Plants grew toward the light.', evidenceType: 'Document passage', locatorLabel: 'Page 2' }],
  }] };
}

describe('student-safe research document exports', () => {
  it('redacts legacy private appendices and nested audit sections without mutating the teacher artifact', () => {
    const item = adapted();
    const before = JSON.stringify(item);
    const html = pipeline.generateResourceHTML(item, false, {}, cfg);
    const text = dom(html).body.textContent;
    expect(text).toContain('Plants use light to grow');
    expect(text).toContain('Teacher-provided source');
    for (const secret of ['Private assessment title', 'Unshared learner details', 'Teacher-only search notes', 'Excluded source decisions', 'RAW_REPORT_SENTINEL', 'PRIVATE_INPUT_SENTINEL', 'NESTED_REPORT_SENTINEL']) {
      expect(html).not.toContain(secret);
    }
    expect(JSON.stringify(item)).toBe(before);
  });

  it('includes only the separately approved document excerpt and title', () => {
    const html = pipeline.generateResourceHTML(adapted(privateText, permittedRecord()), false, {}, cfg);
    const text = dom(html).body.textContent;
    expect(text).toContain('Shared plant notes');
    expect(text).toContain('Plants grew toward the light.');
    expect(text).toContain('Page 2');
    expect(text).not.toContain('Unshared learner details');
    expect(text).not.toContain('Teacher-only search notes');
  });

  it.each([false, undefined])('does not infer student permission from available excerpts (%s)', permission => {
    const record = permittedRecord(privateText, permission);
    if (permission === undefined) delete record.sources[0].shareExcerpt;
    const html = pipeline.generateResourceHTML(adapted(privateText, record), false, {}, cfg);
    expect(html).not.toContain('Shared plant notes');
    expect(html).not.toContain('Plants grew toward the light.');
  });

  it('drops approved excerpt associations when the reading has been edited', () => {
    const html = pipeline.generateResourceHTML(adapted(privateText.replace('use light', 'do not use light'), permittedRecord()), false, {}, cfg);
    expect(html).not.toContain('Shared plant notes');
    expect(html).not.toContain('Plants grew toward the light.');
  });

  it('preserves public web links and references in ordinary research exports', () => {
    const text = 'Plants use light [1](https://example.org/plants).\n\n### Source Text References\n\n1. [Plant research](https://example.org/plants)';
    const output = dom(pipeline.generateResourceHTML(adapted(text), false, {}, cfg));
    expect(output.body.textContent).toContain('Plants use light');
    expect(output.body.textContent).toContain('Plant research');
    expect(output.querySelector('a[href="https://example.org/plants"]')).toBeTruthy();
  });

  it.each(['simplified', 'analysis'])('exports saved public source passages with honest evidence labels for %s', type => {
    const text = 'Plants use light [1](https://example.org/plants).\n\n### Source Text References\n\n1. [Plant research](https://example.org/plants)\n\n### Research Review\n\nRaw teacher-only notes.';
    const studentSources = { version: 1, writingMode: 'synthesis', bodyKey: sources.bodyKey(text), sources: [{
      citationHref: 'https://example.org/plants', title: 'Plant research', shareExcerpt: true,
      passages: [
        { text: 'Plants use <strong>light</strong> & water.\nThe page continues.', evidenceType: 'Page excerpt', locatorLabel: 'Paragraph 2' },
        { text: 'Search preview of the plant article.', evidenceType: 'Search snippet', locatorLabel: '' },
        { text: 'AI-linked summary of plant growth.', evidenceType: 'Source-linked AI note', locatorLabel: '' },
        { text: 'AI-transcribed spoken words about plant growth.', evidenceType: 'AI video transcript', locatorLabel: 'AI transcript - Characters 1-50' },
      ],
    }] };
    const item = adapted(text, studentSources);
    if (type === 'analysis') { item.type = type; item.data = { originalText: text, readingLevel: '5th Grade', accuracy: { rating: 'Not checked', reason: '' }, concepts: [], grammar: [] }; }
    const output = dom(pipeline.generateResourceHTML(item, false, {}, cfg));
    const aside = output.querySelector('.reading-source-excerpts');
    expect(aside).toBeTruthy();
    expect(aside.closest('[data-ka-readable]')).toBeNull();
    expect(aside.querySelectorAll('[data-source-evidence]')).toHaveLength(4);
    expect(aside.querySelector('[data-source-evidence="Page excerpt"] blockquote').textContent).toBe(studentSources.sources[0].passages[0].text);
    expect(aside.querySelector('blockquote strong')).toBeNull();
    expect(aside.textContent).toContain('Paragraph 2');
    expect(aside.querySelector('[data-source-evidence="Search snippet"]').textContent).toContain('not a passage from a page that was read');
    const aiNote = aside.querySelector('[data-source-evidence="Source-linked AI note"]');
    expect(aiNote.textContent).toContain("not the source's exact wording");
    expect(aiNote.querySelector('blockquote')).toBeNull();
    const video = aside.querySelector('[data-source-evidence="AI video transcript"]');
    expect(video.textContent).toContain('AI video transcript');
    expect(video.textContent).toContain('not verified captions');
    expect(video.textContent).toContain('AI-transcribed spoken words about plant growth.');
    expect(video.querySelector('blockquote')).toBeNull();
    expect(output.body.textContent).not.toContain('Raw teacher-only notes');
  });

  it.each(['missing', 'stale'])('keeps exported web sources link-only when the saved record is %s', state => {
    const text = 'Plants use light [1](https://example.org/plants).\n\n### Source Text References\n\n1. [Plant research](https://example.org/plants)\n\n### Research Review\n\nA raw excerpt must never be reconstructed.';
    const record = state === 'missing' ? undefined : { version: 1, bodyKey: sources.bodyKey('A different reading.'), sources: [{
      citationHref: 'https://example.org/plants', title: 'Plant research', shareExcerpt: true,
      passages: [{ text: 'A stale saved excerpt.', evidenceType: 'Page excerpt', locatorLabel: '' }],
    }] };
    const output = dom(pipeline.generateResourceHTML(adapted(text, record), false, {}, cfg));
    expect(output.querySelector('.reading-source-excerpts')).toBeNull();
    expect(output.querySelector('a[href="https://example.org/plants"]')).toBeTruthy();
    expect(output.body.textContent).not.toContain('A raw excerpt');
    expect(output.body.textContent).not.toContain('A stale saved excerpt');
  });

  it('redacts the original-with-supports rendering without rewriting its stored source identity', () => {
    const item = readings.createSupportedReading(privateText, { id: 'original-reading' });
    const before = JSON.stringify(item);
    const output = dom(pipeline.generateResourceHTML(item, false, {}, cfg));
    expect(output.querySelector('[data-original-text="true"]').textContent).toContain('Plants use light to grow');
    expect(output.body.textContent).not.toContain('Unshared learner details');
    expect(JSON.stringify(item)).toBe(before);
    expect(readings.isSupportedOriginal(item)).toBe(true);
  });

  it('redacts student analysis excerpts while leaving the explicit teacher copy intact', () => {
    const item = { ...adapted(), type: 'analysis', data: {
      originalText: privateText, readingLevel: '5th Grade', accuracy: { rating: 'Not checked', reason: '' }, concepts: [], grammar: [],
    } };
    const student = pipeline.generateResourceHTML(item, false, {}, cfg);
    const teacher = pipeline.generateResourceHTML(item, true, {}, cfg);
    expect(student).not.toContain('Unshared learner details');
    expect(student).not.toContain('Teacher-only search notes');
    expect(teacher).toContain('Unshared learner details');
  });

  it('fails closed for private appendices when the shared privacy helper is unavailable', () => {
    const api = window.AlloModules.StudentSources;
    const helperApi = window.AlloModules.TextPipelineHelpers.studentSources;
    delete window.AlloModules.StudentSources;
    delete window.AlloModules.TextPipelineHelpers.studentSources;
    try {
      expect(() => pipeline.generateResourceHTML(adapted(), false, {}, cfg)).toThrow('Student source privacy controls are unavailable');
      expect(pipeline.generateResourceHTML(adapted('An ordinary reading.'), false, {}, cfg)).toContain('An ordinary reading.');
    } finally {
      window.AlloModules.StudentSources = api;
      window.AlloModules.TextPipelineHelpers.studentSources = helperApi;
    }
  });
});
