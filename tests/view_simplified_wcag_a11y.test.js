import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_simplified_source.jsx', 'utf8');
const moduleSource = fs.readFileSync('view_simplified_module.js', 'utf8');
const publicModule = fs.readFileSync('desktop/web-app/public/view_simplified_module.js', 'utf8');

describe('Simplified View WCAG controls', () => {
  it('gives every interactive word a strong keyboard focus indicator', () => {
    expect(source.match(/focus:bg-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1/g)).toHaveLength(5);
  });

  it('uses explicit non-submit types for every native button', () => {
    expect(source.match(/<button\b/g)).toHaveLength(49);
    expect(source.match(/\btype="button"/g)).toHaveLength(49);
  });

  it('keeps cloze completion a non-modal live status', () => {
    expect(source).toContain('data-a11y-overlay="nonmodal-status" role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain('fixed inset-0 pointer-events-none');
    expect(source).not.toContain('data-a11y-overlay="nonmodal-status" role="dialog"');
    expect(source).not.toContain('data-a11y-overlay="nonmodal-status" aria-modal');
  });
});

describe('Simplified View read-aloud sentence alignment', () => {
  it('derives one normalized, reference-free body for every sentence consumer', () => {
    expect(source).toContain("if (typeof splitReferencesFromBody === 'function') split = splitReferencesFromBody(fullText) || split;");
    expect(source).toContain("return '## ' + inner.trim();");
    expect(source).toContain('var simplifiedDisplayBody = simplifiedContentParts.body;');
    expect(source).toContain('var simplifiedReadAloudText = simplifiedDisplayBody.trim();');
    expect(source).toContain('var simplifiedReferences = resolveSimplifiedReferences(simplifiedDisplayBody, simplifiedContentParts.references, simplifiedInputReferences, adaptedCitationAudit);');
    expect(source).toContain("if (!auditAllowsFallback || !simplifiedBodyHasCitationMarkers(adaptedBody)) return '';");
    expect(source).toContain("if (ownedReferences) return ownedReferences;");
    expect(source).toContain('const _references = simplifiedReferences;');
    expect(source).not.toContain('_refsInputCount > _refsContentCount');

    // Sentence enumeration is centralized so display, playback, preparation,
    // and Edit Audio cannot independently drift on bilingual/duplicate text.
    expect(source).toContain('var getReadAloudSentenceEntriesForText = function (rawText) {');
    expect(source).toContain('var parts = getSideBySideContent(text);');
    const entryConsumers =
      source.match(/getReadAloudSentenceEntriesForText\(simplifiedReadAloudText\)/g) || [];
    expect(entryConsumers.length).toBeGreaterThanOrEqual(2);

    expect(source).toContain("handleSpeak(simplifiedReadAloudText, 'simplified-main',");
    expect(source).not.toMatch(/handleSpeak\(generatedContent\?\.data,\s*'simplified-main'/);
    expect(source).not.toContain('getReadAloudSentencesForText(generatedContent && generatedContent.data)');
    expect(source).not.toContain('const paragraphs = generatedContent?.data.split(/\\n{2,}/);');
  });

  it('offsets side-by-side target indexes after non-table source sentences', () => {
    expect(source).toContain(
      "const sourceSentencesTotal = source.flatMap(p => p.trim().startsWith('|') || p.includes('\\n|') ? [] : splitTextToSentences(p)).length;"
    );
    expect(source).toContain('let currentTargetSentenceIdx = sourceSentencesTotal;');
    expect(source).toContain(
      "const sourceParaSentences = source[i] && !(source[i].trim().startsWith('|') || source[i].includes('\\n|')) ? splitTextToSentences(source[i]) : [];"
    );
    expect(source).toContain(
      "const targetParaSentences = target[i] && !(target[i].trim().startsWith('|') || target[i].includes('\\n|')) ? splitTextToSentences(target[i]) : [];"
    );
  });
});

describe('Simplified View reduced motion and generated copies', () => {
  it('adds an immediate reduced-motion fallback to every active animation token', () => {
    expect(source).not.toMatch(/animate-(?:pulse|spin)(?!\s+motion-reduce:animate-none)/);
    expect(source).not.toMatch(/animate-in(?!\s+motion-reduce:animate-none)/);
  });

  it('keeps the generated root and public modules synchronized', () => {
    expect(moduleSource).toContain('data-a11y-overlay');
    expect(moduleSource).toContain('focus-visible:ring-2');
    expect(publicModule).toBe(moduleSource);
  });
});
