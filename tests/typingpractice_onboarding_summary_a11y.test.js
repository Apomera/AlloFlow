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

describe('Typing Practice onboarding and summary accessibility', () => {
  it('does not let the drill-intro page shortcut hijack interactive controls', () => {
    const isInteractive = Function('return (' + extractFunction('typingPracticeIsInteractiveTarget') + ')')();
    expect(isInteractive({ tagName: 'BUTTON', getAttribute: () => '' })).toBe(true);
    expect(isInteractive({ tagName: 'INPUT', getAttribute: () => '' })).toBe(true);
    expect(isInteractive({ tagName: 'DIV', getAttribute: () => 'switch' })).toBe(true);
    expect(isInteractive({ tagName: 'DIV', getAttribute: () => '' })).toBe(false);
    expect(source).toContain('if (typingPracticeIsInteractiveTarget(e.target)) return;');
  });

  it('offers direct, semantic first-run choices with full-size targets', () => {
    expect(source).toContain("'aria-labelledby': 'tp-welcome-title'");
    expect(source).toContain("'aria-describedby': 'tp-welcome-description'");
    expect(source).toContain("'aria-label': 'Welcome choices'");
    expect(source).toContain("}, 'Start Home Row')");
    expect(source).toContain("}, 'Choose supports')");
    expect(source).toContain("}, 'Browse all drills')");
    expect(source).toContain("setAnnounceText('Opening Home Row preparation.')");
  });

  it('gives drill preparation a labelled hierarchy and named quick controls', () => {
    expect(source).toContain("'aria-labelledby': 'tp-drill-intro-title'");
    expect(source).toContain("id: 'tp-session-preview-title'");
    expect(source).toContain("'aria-labelledby': 'tp-quick-adjust-title'");
    expect(source).toContain("'aria-label': opt.spoken");
    expect(source).toContain("setAnnounceText(opt.spoken + (nextOn ? ' on.' : ' off.'))");
    expect(source).toContain("width: '24px', height: '24px'");
  });

  it('turns pace buckets into deterministic numeric details and a concise summary', () => {
    const details = Function('return (' + extractFunction('typingPracticePaceDetails') + ')')();
    const summary = Function('typingPracticePaceDetails', 'return (' + extractFunction('typingPracticePaceSummary') + ')')(details);
    expect(details([10, 20])).toEqual([
      { start: 0, end: 10, characters: 10, wpm: 12 },
      { start: 10, end: 20, characters: 20, wpm: 24 }
    ]);
    expect(summary([10, 20])).toBe('Pace ranged from approximately 12 to 24 words per minute across 2 ten-second windows.');
    expect(summary([])).toBe('No pace samples recorded.');
  });

  it('provides a labelled pace figure with keyboard-expandable detail rows', () => {
    expect(source).toContain("h('figure', {");
    expect(source).toContain("'aria-labelledby': 'tp-pace-title'");
    expect(source).toContain("role: 'img'");
    expect(source).toContain("}, 'View pace details')");
    expect(source).toContain("'aria-hidden': 'true'");
    expect(source).not.toContain('Hover for approx WPM.');
  });

  it('exposes tag and reflection choices as announced pressed-button groups', () => {
    expect(source).toContain("'aria-labelledby': 'tp-summary-session-tag-title'");
    expect(source).toContain("'aria-labelledby': 'tp-summary-reflection-title'");
    expect(source).toContain("'aria-pressed': isActive ? 'true' : 'false'");
    expect(source).toContain("'Session reflection cleared.'");
    expect(source).toContain("!s.isWarmup ? h('section', {");
  });

  it('supports labelled note help, character count, keyboard save, and draft clearing', () => {
    expect(source).toContain("htmlFor: 'tp-summary-session-note'");
    expect(source).toContain("'aria-describedby': 'tp-summary-note-help tp-summary-note-count'");
    expect(source).toContain("(e.ctrlKey || e.metaKey) && e.key === 'Enter'");
    expect(source).toContain("setAnnounceText('Session note draft cleared.')");
    expect(source).toContain("setAnnounceText('Session note saved. It will appear in progress reports and exports.')");
  });
});
