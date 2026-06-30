// Per-step guided examples are DISPLAY-ONLY. The maintainer's hard requirement was that an
// example shown in the panel must never end up in the resource pack / full-pack download /
// project save / end-of-tour recap. All of those are built from `history`, so the guarantee is
// structural: the example lives in a dedicated `guidedExampleId` view-state and a static
// GUIDED_EXAMPLES map, and is rendered into a badged card WITHOUT ever calling setHistory or
// setGeneratedContent. These tests read the monolith source and fail if that separation is broken.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mono = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

const EXAMPLE_STEP_IDS = [
  'analysis', 'glossary', 'simplified', 'ui-tool-wordsounds', 'outline', 'anchor-chart',
  'image', 'faq', 'sentence-frames', 'note-taking', 'brainstorm', 'persona', 'timeline',
  'concept-sort', 'dbq', 'math', 'adventure', 'quiz', 'alignment', 'lesson-plan', '_final',
];

describe('Guided examples — data + wiring present', () => {
  it('defines GUIDED_EXAMPLES with an entry for every guided step except source-input', () => {
    expect(mono).toContain('const GUIDED_EXAMPLES = {');
    const block = mono.slice(mono.indexOf('const GUIDED_EXAMPLES = {'));
    for (const id of EXAMPLE_STEP_IDS) {
      expect(block.includes(`'${id}': {`)).toBe(true);
    }
    // source-input is intentionally absent (it has the "load real text" affordance instead)
    const exampleObj = block.slice(0, block.indexOf('\n  };'));
    expect(exampleObj.includes(`'source-input':`)).toBe(false);
  });

  it('holds the example in a dedicated display-only state with a toggle handler', () => {
    expect(mono).toContain('const [guidedExampleId, setGuidedExampleId] = useState(null)');
    expect(mono).toContain('const onShowGuidedExample = (stepId) =>');
  });

  it('renders a badged example card gated on guidedExampleId', () => {
    expect(mono).toContain('guidedMode && guidedExampleId && GUIDED_EXAMPLES[guidedExampleId]');
    expect(mono).toMatch(/Example · not saved to your pack|guided\.example_badge/);
  });
});

describe("Guided examples — INTEGRITY: can't reach the resource pack", () => {
  it('never mentions the example state alongside setHistory or setGeneratedContent (no persistence path)', () => {
    const offenders = mono.split(/\r?\n/)
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) =>
        /guidedExampleId|GUIDED_EXAMPLES|setGuidedExampleId/.test(line) &&
        /setHistory\(|setGeneratedContent\(/.test(line));
    // Listing them in the assertion message makes a regression obvious.
    expect(offenders.map(o => `${o.n}: ${o.line}`)).toEqual([]);
  });

  it('clears the example when the step changes and when guided mode exits', () => {
    expect(mono).toContain('setShowGuidedTip(false); setGuidedExampleId(null);'); // step-change effect
    expect(mono).toContain('setGuidedMode(false); setGuidedExampleId(null);');    // exit handler
  });

  it('the example card markup itself contains no setHistory/setGeneratedContent call', () => {
    const cardStart = mono.indexOf('guidedMode && guidedExampleId && GUIDED_EXAMPLES[guidedExampleId]');
    expect(cardStart).toBeGreaterThan(-1);
    // the card block ends where the real analysis panel begins
    const cardEnd = mono.indexOf("isGuidedToolVisible('analysis')", cardStart);
    const cardMarkup = mono.slice(cardStart, cardEnd);
    expect(cardMarkup).not.toMatch(/setHistory\(|setGeneratedContent\(/);
  });
});
