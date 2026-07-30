import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');

function extractFunction(name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('Function not found: ' + name);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated function: ' + name);
}

function snippet(marker, length = 850) {
  const start = source.indexOf(marker);
  expect(start, 'Missing marker: ' + marker).toBeGreaterThanOrEqual(0);
  return source.slice(start, start + length);
}

describe('Typing Practice contextual status accessibility', () => {
  it('adds a concise finger guide only after a learner is repeatedly stuck', () => {
    const fingerCue = Function(
      'findKeyMeta',
      'fingerLabel',
      'return (' + extractFunction('typingPracticeMistakeFingerCue') + ')'
    )(() => ({ f: 'LI' }), code => code === 'LI' ? 'left index finger' : 'unknown finger');

    expect(fingerCue({ expected: 'f', attempt: 2, advanced: false })).toBe('');
    expect(fingerCue({ expected: 'f', attempt: 3, advanced: true })).toBe('');
    expect(fingerCue({ expected: 'f', attempt: 3, advanced: false }))
      .toBe(' Finger guide: use your left index finger.');
    expect(extractFunction('typingPracticeMistakeAnnouncement'))
      .toContain('typingPracticeMistakeFingerCue(feedback)');
  });

  it('keeps the visible stuck-key coach discoverable without a second live region', () => {
    const stuck = snippet("id: 'tp-stuck-key-support'");
    expect(stuck).toContain("role: 'note'");
    expect(stuck).not.toContain("'aria-live'");
    expect(source).toContain("(showStuckKeySupport ? ' tp-stuck-key-support' : '')");
  });

  it('uses the selection action as the single comparison announcement source', () => {
    const count = snippet("id: 'tp-compare-selection-count'", 500);
    expect(count).not.toContain("role: 'status'");
    expect(count).not.toContain("'aria-live'");
    expect(source).toContain("(compareMode && compareSelections.length > 0 ? ' tp-compare-selection-count' : '')");
    expect(source).toContain("nextPicks.length + ' of 2 sessions selected for comparison.'");
  });

  it('does not re-announce Battle picker timing or pause copy', () => {
    const pickerTiming = snippet("id: 'tp-battle-picker-timing'", 350);
    const pause = snippet("id: 'tp-battle-pause-status'", 550);
    expect(pickerTiming).not.toContain("role: 'status'");
    expect(pause).toContain("role: 'note'");
    expect(pause).not.toContain("'aria-live'");
    expect(source).toContain("(battleSt.paused ? ' tp-battle-pause-status' : '')");
    expect(source).not.toContain("setAnnounceText('Attack choice ready. There is no time limit.");
  });

  it('announces incoming bot attacks while leaving acknowledged outgoing attacks as notes', () => {
    const incoming = snippet('(battleSt.incomingFlashTo > Date.now())', 450);
    const outgoing = snippet('(battleSt.outgoingFlashTo > Date.now())', 350);
    expect(incoming).toContain("role: 'status'");
    expect(incoming).toContain("'aria-live': 'polite'");
    expect(incoming).toContain("'aria-atomic': 'true'");
    expect(outgoing).toContain("role: 'note'");
    expect(source).toContain("'Attack word ' + pickedWord + ' sent. Battle resumed.'");
  });
});
