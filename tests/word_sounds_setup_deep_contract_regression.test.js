import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');
const setupSource = read('word_sounds_setup_source.jsx');
const previewSource = read('view_word_sounds_preview_source.jsx');
const reviewSource = read('misc_components_source.jsx');

const sliceBetween = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start, `missing start marker: ${startMarker}`).toBeGreaterThanOrEqual(0);
  expect(end, `missing end marker: ${endMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
};

function loadManipulationFallback() {
  const normalizeStart = setupSource.indexOf('const normalizePackKey =');
  const normalizeEnd = setupSource.indexOf('\n', normalizeStart);
  const flatStart = setupSource.indexOf('const flatPackPhoneme =');
  const flatEnd = setupSource.indexOf('\n', flatStart);
  const estimate = sliceBetween(
    setupSource,
    'const estimatePackPhonemes =',
    '// Content language of this pack:',
  );
  const fallback = sliceBetween(
    setupSource,
    'const makePackManipulationFallback =',
    'const packTtsSource =',
  );

  expect(normalizeStart).toBeGreaterThanOrEqual(0);
  expect(flatStart).toBeGreaterThanOrEqual(0);

  return new Function(`
    ${setupSource.slice(normalizeStart, normalizeEnd)}
    ${setupSource.slice(flatStart, flatEnd)}
    ${estimate}
    const packIsEnglish = true;
    ${fallback}
    return makePackManipulationFallback;
  `)();
}

describe('Word Sounds setup session contract', () => {
  it('hands every visible session choice to the host in a versioned sixth argument', () => {
    const block = sliceBetween(
      setupSource,
      'const sessionConfig = {',
      'const configSummary =',
    );

    expect(block).toContain("schema: 'alloflow-word-sounds-session/v1'");
    expect(block).toContain('version: 1');
    expect(block).toMatch(/sessionGoal:\s*isAssessment\s*\? processed\.length/);
    expect(block).toContain('Number(wordSoundsSessionGoal)');
    expect(block).toContain('Number(orthoSessionGoal)');
    expect(block).toContain("imageVisibilityMode: isAssessment ? 'off' : imageVisibilityMode");
    expect(block).toContain('fixedForm: isAssessment');
    expect(block).toContain('probeItemCount: isAssessment ? processed.length : null');
    expect(block).toContain('studentLocked: isAssessment');
    expect(block).toContain('learnerId: probeStudentTrimmed || null');
    expect(block).toContain("probeForm: isAssessment ? (probeForm || 'A') : null");

    expect(setupSource).toContain(
      'onStartGame(processed, sequence, lessonPlanConfig, configSummary, probeOptions, sessionConfig)',
    );
  });

  it('makes a probe fixed-length, support-free, and explicitly identified', () => {
    const config = sliceBetween(
      setupSource,
      'const probeOptions = isAssessment',
      'const configSummary =',
    );

    expect(config).toContain("grade: probeGradeLevel || gradeLevel || 'K'");
    expect(config).toContain("form: probeForm || 'A'");
    expect(config).toContain('sessionGoal: isAssessment');
    expect(config).toContain('processed.length');
    expect(config).toMatch(/orthoSessionGoal:\s*isAssessment \|\| useLessonPlan\s*\? 0/);
    expect(config).toContain("imageVisibilityMode: isAssessment ? 'off'");
    expect(config).toContain('fixedForm: isAssessment');
    expect(config).toContain('studentLocked: isAssessment');
  });
});

describe('Word Sounds setup word handling', () => {
  it('accepts spaces, tabs, newlines, and commas and deduplicates case-insensitively', () => {
    const preview = sliceBetween(
      setupSource,
      'const previewList = React.useMemo',
      'const toggleSelection =',
    );

    expect(preview).toContain('customText.split(/[\\s,]+/)');
    expect(preview).toContain('word.toLocaleLowerCase()');
    expect(preview).toContain('seenWords.has(key)');
  });

  it('removes the first grapheme cluster rather than one code unit', () => {
    const makeFallback = loadManipulationFallback();

    expect(makeFallback('ship', ['sh', 'i', 'p'])).toMatchObject({
      type: 'deletion',
      targetPhoneme: 'sh',
      answer: 'ip',
    });
    expect(makeFallback('chip', [])).toMatchObject({
      targetPhoneme: 'ch',
      answer: 'ip',
    });
    expect(makeFallback('light', [])).toMatchObject({
      targetPhoneme: 'l',
      answer: 'ight',
    });
  });
});

describe('Word Sounds setup modal lifecycle and controls', () => {
  it('is a named modal dialog with focus containment, Escape close, and focus return', () => {
    expect(setupSource).toContain(
      'ref={setupDialogRef} role="dialog" aria-modal="true" aria-label=',
    );
    expect(setupSource).toContain("if (event.key === 'Escape')");
    expect(setupSource).toContain("if (event.key !== 'Tab') return");
    expect(setupSource).toContain("root.addEventListener('keydown', handleDialogKeyDown)");
    expect(setupSource).toContain('setupPreviouslyFocusedRef.current = document.activeElement');
    expect(setupSource).toContain('document.contains(previous)');
    expect(setupSource).toContain('previous.focus()');
    expect(setupSource).toContain('flex flex-col lg:flex-row');
  });

  it('cancels an in-flight generation and cannot launch after close', () => {
    const close = sliceBetween(
      setupSource,
      'const handleGeneratorClose =',
      'React.useEffect(() => {',
    );
    const start = sliceBetween(setupSource, 'const handleStart = async () => {', 'if (isMinimized) {');

    expect(close).toContain('generationEpochRef.current += 1');
    expect(close).toContain('startRunRef.current = false');
    expect(start).toContain('const generationEpoch = ++generationEpochRef.current');
    expect(start).toContain('const isGenerationActive = () => generationEpochRef.current === generationEpoch');
    expect(start).toContain('const waitWhileActive =');
    expect((start.match(/if \(!isGenerationActive\(\)\)/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(start).toMatch(/if \(!isGenerationActive\(\)\) return;\s*onStartGame\(/);
    expect(start).toMatch(/finally \{\s*if \(isGenerationActive\(\)\)/);
  });

  it('renders preview selections as native toggle buttons with an exposed state', () => {
    const list = sliceBetween(
      setupSource,
      '{previewList.map((word, i) => {',
      'No words selected',
    );

    expect(list).toContain('<button');
    expect(list).toContain('type="button"');
    expect(list).toContain('aria-pressed={isSelected}');
    expect(list).toContain("aria-label={String(word) + ': ' + (isSelected ? 'selected' : 'not selected')}");
    expect(list).not.toMatch(/<div\s+\n?\s*key=\{i\}\s+\n?\s*onClick=\{\(\) => toggleSelection/);
  });
});

describe('Word Sounds review and preview integration', () => {
  it('prepares the persisted session config on both launch paths', () => {
    expect((previewSource.match(/prepareWordSoundsSession\(\{/g) || [])).toHaveLength(2);
    expect((previewSource.match(/\.\.\.\(generatedContent\?\.sessionConfig \|\| \{\}\)/g) || [])).toHaveLength(2);
    expect((previewSource.match(/resourceId: generatedContent\?\.id \|\| null/g) || [])).toHaveLength(2);
    expect(previewSource).toContain('Teacher: Review Words &amp; Audio');
    expect(previewSource).toContain('Student: Start Practice');
  });

  it('keeps the review surface modal, named, keyboard-contained, and responsive', () => {
    expect(reviewSource).toContain(
      'role="dialog" aria-modal="true" aria-labelledby="word-sounds-review-title"',
    );
    expect(reviewSource).toContain('trapReviewFocus(event, reviewDialogRef.current, requestBackToSetup)');
    expect(reviewSource).toContain('max-h-[calc(100dvh-1rem)]');
    expect(reviewSource).toContain('flex flex-col-reverse sm:flex-row');
  });
});
