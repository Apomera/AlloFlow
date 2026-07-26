import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('arcade_mode_concept_pictionary.js', 'utf8');

describe('Solo Concept Pictionary accessible response modes', () => {
  it('offers drawing and keyboard/nonvisual description modes', () => {
    expect(source).toContain("{ id: 'draw', label: 'Draw with pointer' }");
    expect(source).toContain("{ id: 'describe', label: 'Describe with words' }");
    expect(source).toContain("'aria-pressed': selected");
    expect(source).toContain("htmlFor: 'arcade-pictionary-description'");
    expect(source).toContain("id: 'arcade-pictionary-description'");
  });

  it('uses the same AI parsing, scoring, and round flow for text clues', () => {
    expect(source).toContain("var textAI = ctx.callGemini || window.callGemini");
    expect(source).toContain("rawText = await textAI(prompt, false)");
    expect(source).toContain("var parsed = _parseGuessJSON");
    expect(source).toContain('if (isCorrect) setScore(score + 1)');
    expect(source).toContain("setLastError('Describe the idea without using the concept name.')");
  });

  it('re-renders response readiness when strokes change', () => {
    expect(source).toContain('var drawingRevisionTuple = React.useState(0)');
    expect(source.match(/setDrawingRevision\(function \(n\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toContain("disabled: aiThinking || !responseReady");
  });

  it('names the canvas and provides fallback and alternate-mode instructions', () => {
    expect(source).toContain("role: 'img'");
    expect(source).toContain("className: 'arcade-pictionary-canvas'");
    expect(source).toContain("'aria-describedby': 'arcade-pictionary-drawing-instructions'");
    expect(source).toContain('Interactive drawing canvas. Use the Describe with words mode');
  });

  it('associates Minutes with its select and announces AI results', () => {
    expect(source).toContain("htmlFor: 'arcade-pictionary-minutes'");
    expect(source).toContain("id: 'arcade-pictionary-minutes'");
    expect(source).toContain("role: 'status'");
    expect(source).toContain("'aria-live': 'polite'");
  });

  it('provides strong focus and large primary mode/action controls', () => {
    expect(source).toContain('.arcade-pictionary-control:focus-visible');
    expect(source).toContain('.arcade-pictionary-response:focus-visible');
    expect(source).toContain('@media (forced-colors: active)');
    expect(source).toContain("minHeight: '44px', minWidth: '44px'");
  });
});
