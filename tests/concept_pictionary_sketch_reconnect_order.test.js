import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('concept_pictionary_source.jsx', 'utf8');

describe('Sketch Response reconnect ordering', () => {
  it('sends authoritative round state before replaying private stroke history', () => {
    const openStart = source.indexOf('dc.onopen = () => {');
    const openEnd = source.indexOf('dc.onmessage = (msg) => {', openStart);
    const block = source.slice(openStart, openEnd);

    expect(openStart).toBeGreaterThan(-1);
    expect(block.indexOf("type: 'roundStart'")).toBeGreaterThan(-1);
    expect(block.indexOf("type: 'strokeHistory'")).toBeGreaterThan(block.indexOf("type: 'roundStart'"));
    expect(block.indexOf("type: 'roundSync'")).toBeLessThan(block.indexOf("type: 'strokeHistory'"));
  });

  it('restores a consumed revision attempt from private reconnect feedback', () => {
    expect(source).toContain(
      'setSketchAttempt((prior) => Math.max(Number(prior) || 1, Number(feedback.attempt) >= 2 ? 2 : 1))',
    );
    expect(source).toContain(
      "this.sketchFeedbackByUid.set(senderUid, { ...priorFeedback, attempt: 2, allowRevision: false })",
    );
  });
});
