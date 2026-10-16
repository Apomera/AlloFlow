import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let pipeline;
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('text_pipeline_helpers_module.js');
  new Function(readFileSync('doc_pipeline_source.jsx', 'utf8'))();
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: key => key, isRtlLang: language => /^(Arabic|ar)$/i.test(language), updateExportPreview: () => {},
    getDefaultTitle: () => 'Source analysis', state: { leveledTextLanguage: 'French', exportConfig: {}, currentUiLanguage: 'English' }
  });
});

function analysis() {
  return { id: 'source-analysis', type: 'analysis', title: 'Source analysis', config: { language: 'English' }, data: {
    analysisSourceVersion: 1, originalText: 'The source has a sentence with two clauses.', sourceLanguage: 'English',
    reportLanguage: 'English', displayReportLanguage: 'Spanish',
    readingLevel: { range: '5th-7th Grade', explanation: 'Two connected clauses.' },
    accuracy: { rating: 'High', reason: 'Claims match the cited source.', citations: '[Original evidence](https://evidence.example/source)' },
    concepts: ['Sentence structure'], grammar: ['Check the comma.'],
    reportTranslations: { Spanish: {
      readingLevel: { range: 'WRONG RANGE', explanation: 'Dos cláusulas conectadas.' },
      accuracy: { rating: 'WRONG RATING', reason: 'Las afirmaciones coinciden.', citations: '[Wrong evidence](https://wrong.example/source)' },
      concepts: ['Estructura de oraciones'], grammar: ['Revisa la coma.'],
      originalText: 'FORGED REPLACEMENT SOURCE', rawEnglishText: 'FORGED RAW SOURCE'
    } },
    sourceTranslations: { Spanish: 'La fuente tiene una oración con dos cláusulas.' }
  } };
}

function render(item, fullPack = false, teacher = false) {
  const config = { includeAnalysis: true, includeTeacherKey: true, includeOriginalReading: true };
  const html = fullPack ? pipeline.generateFullPackHTML([item], 'Analysis', false, {}, config)
    : pipeline.generateResourceHTML(item, teacher, {}, config);
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('analysis report language in exported resources', () => {
  it.each([false, true])('exports the saved report selection with canonical source and evidence (full pack: %s)', fullPack => {
    const item = analysis(), before = JSON.stringify(item), doc = render(item, fullPack);
    const report = doc.querySelector('.analysis-report');
    expect(report.dataset.reportLanguage).toBe('Spanish');
    for (const content of ['Dos cláusulas conectadas.', 'Las afirmaciones coinciden.', 'Estructura de oraciones', 'Revisa la coma.', '5th-7th Grade', 'High']) expect(report.textContent).toContain(content);
    for (const forbidden of ['WRONG RANGE', 'WRONG RATING', 'FORGED REPLACEMENT', 'FORGED RAW', 'Wrong evidence']) expect(doc.body.textContent).not.toContain(forbidden);
    expect(doc.querySelector('.analysis-original-source').textContent).toBe(item.data.originalText);
    expect(doc.querySelector('a[href="https://evidence.example/source"]')).not.toBeNull();
    expect(doc.querySelector('a[href="https://wrong.example/source"]')).toBeNull();
    expect(JSON.stringify(item)).toBe(before);
  });

  it.each(['English', 'French', 'toString'])('falls back to the base report for selection %s', language => {
    const item = analysis(); item.data.displayReportLanguage = language;
    const report = render(item).querySelector('.analysis-report');
    expect(report.dataset.reportLanguage).toBe('English');
    expect(report.textContent).toContain('Two connected clauses.');
    expect(report.textContent).not.toContain('Dos cláusulas conectadas.');
  });

  it('labels companion source translations separately and suppresses same-source copies', () => {
    const item = analysis();
    item.data.sourceTranslations.English = 'An unnecessary same-language rewrite.';
    item.data.sourceTranslations.French = '  ' + item.data.originalText.replace(/ /g, '  ') + '  ';
    const doc = render(item), companion = doc.querySelector('.analysis-source-translation');
    expect(doc.querySelectorAll('.analysis-source-translation')).toHaveLength(1);
    expect(companion.querySelector('h3').textContent).toBe('Translated passage · Spanish');
    expect(companion.textContent).toContain('does not replace the original source');
    expect(companion.textContent).toContain(item.data.sourceTranslations.Spanish);
    expect(doc.querySelector('.analysis-original-source').textContent).toBe(item.data.originalText);
  });

  it('uses report and companion directions independently of original and current app settings', () => {
    const item = analysis();
    item.data.reportTranslations.Arabic = item.data.reportTranslations.Spanish;
    item.data.displayReportLanguage = 'Arabic';
    item.data.sourceTranslations.Arabic = 'يتضمن المصدر جملة.';
    const doc = render(item);
    expect(doc.querySelector('.analysis-report').getAttribute('dir')).toBe('rtl');
    expect(doc.querySelector('.analysis-original-source').getAttribute('dir')).toBe('ltr');
    expect(doc.querySelector('[data-source-translation="Arabic"]').getAttribute('dir')).toBe('rtl');
  });

  it('keeps current resolved grammar status when exporting a saved translated report', () => {
    const item = analysis();
    item.data.grammar = ['✓ DISMISSED: Check the comma.'];
    expect(render(item).querySelector('.analysis-report').textContent).toContain('✓ DISMISSED: Revisa la coma.');
    item.data.grammar = ['✓ FIXED: Check the comma.'];
    expect(render(item).querySelector('.analysis-report').textContent).toContain('✓ FIXED: Revisa la coma.');
  });

  it('excludes old companion translations of private source appendices from student output', () => {
    const item = analysis();
    item.data.originalText += '\n\n### Research Review\n\nPrivate learner notes.';
    item.data.sourceTranslations.Spanish += '\n\n### Revisión de investigación\n\nNotas privadas del estudiante.';
    const before = JSON.stringify(item), student = render(item), teacher = render(item, false, true);
    expect(student.querySelector('.analysis-source-translation')).toBeNull();
    expect(student.body.textContent).not.toContain('Private learner notes');
    expect(student.body.textContent).not.toContain('Notas privadas');
    expect(teacher.body.textContent).toContain('Private learner notes');
    expect(teacher.body.textContent).toContain('Notas privadas');
    expect(JSON.stringify(item)).toBe(before);
  });

  it('applies student source filtering to each companion independently', () => {
    const item = analysis();
    item.data.sourceTranslations.Spanish += '\n\n### Your Document References\n\nPrivate companion notes.';
    const student = render(item), teacher = render(item, false, true);
    expect(student.querySelector('.analysis-source-translation').textContent).toContain('La fuente tiene');
    expect(student.body.textContent).not.toContain('Private companion notes');
    expect(teacher.body.textContent).toContain('Private companion notes');
  });

  it('rejects malformed translated fields and escapes saved report prose and language labels', () => {
    const item = analysis();
    item.data.reportTranslations.Spanish.concepts = ['Valid', { injected: true }];
    item.data.reportTranslations.Spanish.grammar = null;
    item.data.reportTranslations.Spanish.readingLevel.explanation = '<img src=x onerror=alert(1)> quoted text';
    item.data.sourceTranslations['French <img src=x onerror=alert(1)>'] = 'Un texte traduit.';
    const doc = render(item), report = doc.querySelector('.analysis-report');
    expect(report.textContent).toContain('Sentence structure');
    expect(report.textContent).toContain('Check the comma.');
    expect(report.textContent).toContain('<img src=x onerror=alert(1)> quoted text');
    expect(doc.querySelector('img,[onerror]')).toBeNull();
    expect(doc.querySelectorAll('.analysis-source-translation')[1].querySelector('h3').textContent).toContain('French <img');
  });
});
