import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('generate_dispatcher_source.jsx', 'utf8');
const audit = new Function(source.slice(0, source.indexOf('const handleGenerate')) + `
  return { extractAuditArtifactText, summarizeAuditCitations, computeAudioCoverage,
    computeContentAccessibility, collectAuditText, _auditFingerprint, _splitAuditSentences };
`)();
const original = '  Water supports life.\r\nIt moves through a cycle.\r\n';
function analysis() {
  return { id: 'analysis-source', type: 'analysis', config: { language: 'English' },
    data: { analysisSourceVersion: 1, originalText: original, rawEnglishText: original,
      reportLanguage: 'English', sourceLanguage: 'English', displayReportLanguage: 'English',
      readingLevel: { range: 'Grade 3', explanation: 'Short source sentences.' }, concepts: ['Water cycle'],
      accuracy: { rating: 'High', reason: 'Supported by evidence.', discrepancies: [], verifiedFacts: ['Water evaporates [⁽¹⁾](https://example.org/source).'], citations: 'Original citation details.' },
      grammar: ['No grammar issues.'], localStats: { score: '2.7', words: 10, sentences: 2 },
      reportTranslations: {}, sourceTranslations: {} } };
}
function translatedReport() {
  return { readingLevel: { range: 'Forged grade', explanation: 'Oraciones breves.' }, concepts: ['Ciclo del agua'],
    accuracy: { rating: 'Forged rating', reason: 'Respaldado por pruebas.', discrepancies: [], verifiedFacts: ['El agua se evapora [⁽¹⁾](https://example.org/source).'], citations: 'Forged citations.' },
    grammar: ['Sin errores.'], originalText: 'FORGED SOURCE' };
}
const text = item => audit.extractAuditArtifactText(item);
const fingerprint = item => audit._auditFingerprint([item], '3');

describe('analysis audit measures the saved report view', () => {
  it('does not change text, citations, audio coverage, or review keys when hidden reports are cached', () => {
    const item = analysis();
    const sentences = audit._splitAuditSentences(text(item), 'en');
    item.karaokeAudio = { sentences: Object.fromEntries(sentences.map(sentence => [sentence, 'base64-audio'])) };
    const before = structuredClone(item);
    const coverage = audit.computeAudioCoverage([before], 'en');
    expect(coverage.preparedSentenceCoveragePct).toBe(100);
    item.data.reportTranslations = { Spanish: translatedReport(), French: { concepts: ['Hidden [⁽²⁾](https://example.org/hidden)'] } };
    expect(text(item)).toBe(text(before));
    expect(audit.summarizeAuditCitations([item])).toEqual(audit.summarizeAuditCitations([before]));
    expect(audit.computeAudioCoverage([item], 'en')).toEqual(coverage);
    expect(fingerprint(item)).toBe(fingerprint(before));
    item.data.reportTranslations.Spanish.accuracy.reason = 'The red section. See the image.';
    expect(audit.computeContentAccessibility([item], {}, '3')).toEqual(audit.computeContentAccessibility([before], {}, '3'));
    expect(fingerprint(item)).toBe(fingerprint(before));
  });

  it('switches only report prose while retaining canonical findings, citations, and source', () => {
    const item = analysis(); item.data.reportTranslations.Spanish = translatedReport();
    const base = structuredClone(item); item.data.displayReportLanguage = 'Spanish';
    const before = JSON.stringify(item), output = text(item);
    expect(output).toContain('Oraciones breves.'); expect(output).toContain('Ciclo del agua');
    expect(output).toContain('Respaldado por pruebas.'); expect(output).toContain('Sin errores.');
    expect(output).not.toContain('Short source sentences.'); expect(output).not.toContain('Supported by evidence.');
    expect(output).toContain('Grade 3'); expect(output).toContain('High'); expect(output).toContain('Original citation details.');
    expect(output).not.toMatch(/Forged|FORGED/);
    expect(output.split('Water supports life.')).toHaveLength(2);
    expect(audit.summarizeAuditCitations([item]).markers).toBe(1);
    expect(fingerprint(item)).not.toBe(fingerprint(base));
    expect(audit.collectAuditText([item]).sourceText).toBe(audit.collectAuditText([base]).sourceText);
    expect(item.data.originalText).toBe(original);
    expect(JSON.stringify(item)).toBe(before);
  });

  it.each(['Missing', 'Spanish', 'English', 'toString'])('falls back to the base report for an unavailable or malformed selection: %s', selected => {
    const item = analysis(), baseline = text(item);
    item.data.displayReportLanguage = selected;
    item.data.reportTranslations = { Spanish: [], English: translatedReport() };
    expect(text(item)).toBe(baseline);
  });

  it('ignores inherited translation entries', () => {
    const item = analysis(), baseline = text(item);
    item.data.reportTranslations = Object.create({ Spanish: translatedReport() });
    item.data.displayReportLanguage = 'Spanish';
    expect(text(item)).toBe(baseline);
  });

  it('does not audit malformed nested fields that the report view cannot display', () => {
    const item = analysis(); item.data.displayReportLanguage = 'Spanish';
    item.data.reportTranslations.Spanish = {
      readingLevel: { explanation: { text: 'HIDDEN EXPLANATION' } },
      concepts: [{ text: 'HIDDEN CONCEPT' }, 'Visible concept'],
      accuracy: { reason: { text: 'HIDDEN REASON' }, discrepancies: [{ text: 'HIDDEN CLAIM' }], verifiedFacts: [{ text: 'HIDDEN FACT' }] },
      grammar: [null]
    };
    expect(text(item)).not.toContain('HIDDEN');
    expect(text(item)).toContain('Visible concept');
    expect(text(item)).toContain('No grammar issues.');
  });

  it('keeps distinct reader companions but excludes aliases, language labels, and hidden same-language passages', () => {
    const item = analysis(); item.originalText = original;
    item.data.sourceTranslations = { Spanish: 'El agua sostiene la vida.', French: 'Water supports life. It moves through a cycle.', English: 'Hidden same-language passage.', German: '' };
    const before = structuredClone(item), output = text(item);
    expect(output).toContain('El agua sostiene la vida.');
    expect(output.split('Water supports life.')).toHaveLength(2);
    expect(output).not.toMatch(/Hidden same-language|English|Spanish|French|2\.7/);
    expect(item).toEqual(before);
    const withoutCompanion = analysis();
    expect(fingerprint(item)).not.toBe(fingerprint(withoutCompanion));
  });

  it('retains the visible original-language block in legacy translated analyses', () => {
    const item = analysis(); delete item.data.analysisSourceVersion;
    item.data.originalText = 'El agua sostiene la vida.';
    item.data.translatedText = item.data.originalText;
    expect(text(item)).toContain(original.trim());
    expect(text(item).split(item.data.translatedText)).toHaveLength(2);
    delete item.data.translatedText;
    expect(text(item)).not.toContain(original.trim());
  });

  it('still invalidates reviews when canonical evidence changes behind a translated report', () => {
    const item = analysis(); item.data.reportTranslations.Spanish = translatedReport(); item.data.displayReportLanguage = 'Spanish';
    const before = fingerprint(item);
    item.data.accuracy.reason = 'New canonical evidence.';
    expect(fingerprint(item)).not.toBe(before);
    const updated = fingerprint(item); item.data.localStats.words++;
    expect(fingerprint(item)).not.toBe(updated);
  });

  it('retains resolved grammar status on translated explanations and leaves other resource types unchanged', () => {
    const item = analysis(); item.data.reportTranslations.Spanish = translatedReport(); item.data.displayReportLanguage = 'Spanish';
    item.data.grammar = ['✓ DISMISSED: No grammar issues.'];
    expect(text(item)).toContain('✓ DISMISSED: Sin errores.');
    expect(text({ type: 'quiz', data: { question: 'Question?', answers: ['Answer.'] } })).toBe('Question?\n\nAnswer.');
  });
});
