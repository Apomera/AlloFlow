import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let pipeline;
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('generation_matrix_module.js');
  loadAlloModule('generate_dispatcher_module.js');
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

function factAnalysis(legacy = false) {
  const item = analysis();
  const atlas = 'https://evidence.example/atlas', survey = 'https://evidence.example/survey';
  const references = [{ number: 1, title: 'River atlas', url: atlas }, { number: 2, title: 'Field survey', url: survey }];
  item.data.accuracy = {
    rating: 'High', reason: 'Two claims have search sources.', discrepancies: [],
    ...(legacy ? { citations: `1. [River atlas](${atlas})\n2. [Field survey](${survey})` }
      : { verification: 'web-search', sourceReferences: references }),
    verifiedFacts: [`The river bends [⁽¹⁾](${atlas}).`, `The banks flooded [⁽²⁾](${survey}).`, 'The current doubled.'],
    unsourcedFacts: ['The channel widened.'],
  };
  item.data.reportTranslations.Spanish.accuracy = { reason: 'Dos afirmaciones tienen fuentes.',
    sourceReferences: [{ number: 1, title: 'Invented source', url: 'https://wrong.example/invented' }],
    verifiedFacts: [`El río gira [⁽¹⁾](${atlas}).`, 'Las orillas se inundaron [⁽¹⁾](https://wrong.example/invented).', `La corriente se duplicó [⁽¹⁾](${atlas}).`],
    unsourcedFacts: ['El canal se ensanchó [⁽²⁾](https://wrong.example/invented).'],
  };
  return item;
}

function sectionedAnalysis({ complete = false, privateAppendix = false } = {}) {
  const item = analysis();
  const opening = 'Headwaters feed the river. '.repeat(235);
  const ending = privateAppendix ? '\n\n### Research Review\n\nPrivate learner notes.' : 'The current carries sediment. '.repeat(85).trimEnd();
  const originalText = opening + ending;
  const report = concept => ({
    readingLevel: { range: '5th Grade', explanation: 'Terms used here.' }, concepts: [concept],
    accuracy: { rating: 'High', reason: concept + ' finding.' }, grammar: [],
  });
  const sections = [{ start: 0, end: opening.length, report: report('Headwater context') }];
  if (complete) sections.push({ start: opening.length, end: originalText.length, report: report(privateAppendix ? 'Private appendix finding' : 'Sediment transport') });
  Object.assign(item.data, { originalText, rawEnglishText: originalText, analysisIncomplete: !complete,
    localStats: { words: 960, sentences: 320, syllables: 1530, score: '6.7' },
    analysisCoverage: { sourceFingerprint: window.AlloModules.InstructionalContext.fingerprintText(originalText), sections } });
  return item;
}

describe('analysis report language in exported resources', () => {
  it.each([[false, false], [true, false], [false, true], [true, true]])(
    'exports each translated claim beside its canonical source and flags only uncited claims (pack: %s, legacy: %s)', (fullPack, legacy) => {
      const item = factAnalysis(legacy), doc = render(item, fullPack);
      const groups = [...doc.querySelectorAll('[data-analysis-facts="verified"]')];
      expect(groups.length).toBeGreaterThan(0);
      for (const group of groups) {
        const rows = [...group.querySelectorAll(':scope > ul > li')];
        expect(rows).toHaveLength(2);
        for (const [i, [claim, title, url]] of [
          ['El río gira.', 'River atlas', 'https://evidence.example/atlas'],
          ['The banks flooded.', 'Field survey', 'https://evidence.example/survey'],
        ].entries()) {
          expect(rows[i].textContent).toContain(claim);
          expect([...rows[i].querySelectorAll('a')].map(a => [a.textContent, a.getAttribute('href')])).toEqual([[title, url]]);
        }
        const needs = group.closest('.section').querySelector('[data-analysis-facts="unsourced"]');
        expect(needs.querySelector('h4').textContent).toBe('Needs a source');
        expect([...needs.querySelectorAll('li')].map(li => li.textContent)).toEqual(['The current doubled.', 'El canal se ensanchó.']);
        expect(needs.querySelector('a')).toBeNull();
      }
      expect(doc.querySelector('a[href="https://wrong.example/invented"]')).toBeNull();
    });

  it('exports AI-only claims as needing sources even if citation-like links were saved', () => {
    const item = factAnalysis();
    item.data.accuracy.verification = 'ai-estimate';
    const doc = render(item);
    expect(doc.querySelector('[data-analysis-facts="verified"]')).toBeNull();
    const needs = doc.querySelector('[data-analysis-facts="unsourced"]');
    expect(needs.querySelectorAll('li')).toHaveLength(4);
    expect(needs.querySelector('a')).toBeNull();
  });

  it('omits claims and their source links from student output when they may depend on a private appendix', () => {
    const item = factAnalysis(true);
    item.data.originalText += '\n\n### Research Review\n\nPrivate learner notes.';
    const student = render(item), teacher = render(item, false, true);
    expect(teacher.querySelector('[data-analysis-facts="verified"]').textContent).toContain('El río gira.');
    expect(teacher.querySelector('[data-analysis-facts="unsourced"]').textContent).toContain('El canal se ensanchó.');
    expect(student.querySelector('[data-analysis-facts]')).toBeNull();
    expect(student.body.textContent).not.toContain('Private learner notes.');
    expect(student.querySelector('a[href="https://evidence.example/atlas"]')).toBeNull();
    expect(student.querySelector('a[href="https://evidence.example/survey"]')).toBeNull();
  });

  it.each([false, true])('exports only checked ranges of a partial report while preserving the full reading (full pack: %s)', fullPack => {
    const item = sectionedAnalysis(), { originalText, analysisCoverage } = item.data;
    const doc = render(item, fullPack), end = analysisCoverage.sections[0].end;
    expect(doc.querySelector('[data-analysis-needs-recheck]').textContent).toContain('Partial analysis');
    const coverageLines = [...doc.querySelectorAll('[data-analysis-coverage]')];
    expect(coverageLines.length).toBeGreaterThan(0);
    for (const line of coverageLines) {
      expect(line.textContent).toContain(`AI checked ${end} of ${originalText.length} characters`);
      expect(line.textContent).toContain('readability estimate uses the full passage');
      const rows = line.closest('.section').querySelectorAll('[data-analysis-section]');
      expect(rows).toHaveLength(1);
      expect(rows[0].textContent).toContain(`characters 1–${end}`);
      expect(rows[0].textContent).toContain('Headwater context');
      expect(rows[0].textContent).not.toContain('Sediment transport');
    }
    expect(doc.querySelector('.analysis-report')).toBeNull();
    expect(doc.querySelector('.analysis-original-source').textContent).toContain('The current carries sediment.');
  });

  it.each([false, true])('exports the findings for every completed section with its own range (full pack: %s)', fullPack => {
    const item = sectionedAnalysis({ complete: true });
    const { originalText, analysisCoverage } = item.data, doc = render(item, fullPack);
    expect(doc.querySelector('[data-analysis-needs-recheck]')).toBeNull();
    const coverageLines = [...doc.querySelectorAll('[data-analysis-coverage]')];
    expect(coverageLines.length).toBeGreaterThan(0);
    for (const line of coverageLines) {
      expect(line.textContent).toContain(`AI checked ${originalText.length} of ${originalText.length}`);
      const rows = line.closest('.section').querySelectorAll('[data-analysis-section]');
      expect(rows).toHaveLength(2);
      expect(rows[0].textContent).toContain('Headwater context');
      expect(rows[0].textContent).not.toContain('Sediment transport');
      expect(rows[1].textContent).toContain(`characters ${analysisCoverage.sections[0].end + 1}–${originalText.length}`);
      expect(rows[1].textContent).toContain('Sediment transport');
      expect(rows[1].textContent).not.toContain('Headwater context');
    }
  });

  it('withholds section findings for a different passage and private appendix findings from student exports', () => {
    const item = sectionedAnalysis({ complete: true, privateAppendix: true });
    expect(render(item, false, true).body.textContent).toContain('Private appendix finding');
    expect(render(item).body.textContent).not.toContain('Private appendix finding');
    item.data.originalText = item.data.originalText.replace('Headwaters', 'Waterflows');
    const changed = render(item, false, true);
    expect(changed.querySelector('[data-analysis-section]')).toBeNull();
    expect(changed.querySelector('[data-analysis-coverage]').textContent).toContain(`AI checked 0 of ${item.data.originalText.length}`);
    expect(changed.body.textContent).not.toContain('Headwater context');
  });

  it('exports an incomplete first check with its passage and without placeholders', () => {
    const item = analysis();
    item.data.analysisIncomplete = true;
    const doc = render(item);
    expect(doc.querySelector('[data-analysis-needs-recheck]').textContent).toContain('Analysis incomplete');
    expect(doc.querySelector('.analysis-original-source').textContent).toContain(item.data.originalText);
    expect(doc.querySelector('.analysis-report')).toBeNull();
  });
  it.each([false, true])('exports the updated passage without obsolete verification (full pack: %s)', fullPack => {
    const item = analysis();
    Object.assign(item.data, { originalText: 'Seeds need water.', analysisNeedsRecheck: true });
    const doc = render(item, fullPack);
    expect(doc.querySelector('[data-analysis-needs-recheck]').textContent).toContain('Needs recheck');
    expect(doc.querySelector('.analysis-original-source').textContent).toContain('Seeds need water.');
    expect(doc.querySelector('.analysis-report')).toBeNull();
  });
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
