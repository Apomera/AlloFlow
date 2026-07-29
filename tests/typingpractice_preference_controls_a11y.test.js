import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

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

function snippetAfter(marker, length = 520) {
  const start = source.indexOf(marker);
  expect(start, 'Missing marker: ' + marker).toBeGreaterThanOrEqual(0);
  return source.slice(start, start + length);
}

describe('Typing Practice preference control accessibility', () => {
  it('moves focus as well as scroll position when a settings jump link is used', () => {
    const scroll = vi.fn();
    const focus = vi.fn();
    const helper = Function('scrollTypingPracticeIntoView', 'return (' + extractFunction('focusTypingPracticeSettingsSection') + ')')(scroll);
    helper({ focus });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(scroll).toHaveBeenCalledWith(expect.any(Object), 'start');

    expect(source).toContain("h('nav', {");
    expect(source).toContain("className: 'tp-settings-nav'");
    expect(source).toContain("'aria-label': 'Settings sections'");
    expect(source).toContain('focusTypingPracticeSettingsSection(el)');
  });

  it('uses visible programmatically focusable headings as settings destinations', () => {
    const anchor = extractFunction('renderTypingPracticeSettingsAnchor');
    expect(anchor).toContain("return h('h4'");
    expect(anchor).toContain('tabIndex: -1');
    expect(anchor).toContain("className: 'tp-settings-anchor'");

    const targets = ['tp-s-toggles', 'tp-s-sight', 'tp-s-rest', 'tp-s-appearance', 'tp-s-sample-len', 'tp-s-pace', 'tp-s-student', 'tp-s-clinician', 'tp-s-profile'];
    for (const id of targets) expect(source).toContain("renderTypingPracticeSettingsAnchor('" + id + "'");
  });

  it('names every pill-choice group and exposes each selected state', () => {
    const groups = [
      'tp-sound-theme-label', 'tp-sight-read-label', 'tp-rest-break-label',
      'tp-visual-theme-label', 'tp-accent-color-label', 'tp-sample-length-label',
      'tp-pace-target-label'
    ];
    for (const id of groups) expect(source).toContain("'aria-labelledby': '" + id + "'");

    const choiceMarkers = [
      "key: 'theme-' + themeId", "key: 'sight-' + opt", "key: 'rest-' + opt",
      "key: 'theme-' + opt.id", "key: 'accent-' + opt.id",
      "key: 'slen-' + (opt.id || 'any')", "key: 'pace-' + opt"
    ];
    for (const marker of choiceMarkers) expect(snippetAfter(marker)).toContain("'aria-pressed': isActive ? 'true' : 'false'");
  });

  it('announces preference changes without moving focus', () => {
    expect(source).toContain("setAnnounceText((label || key) + ' ' + (newAcc[key] ? 'on.' : 'off.'))");
    expect(source).toContain("setAnnounceText('Sound theme set to '");
    expect(source).toContain("'Sight-read count-in set to '");
    expect(source).toContain("'Rest-break reminder set to '");
    expect(source).toContain("'Visual theme set to '");
    expect(source).toContain("'Accent color set to '");
    expect(source).toContain("'Sample length set to '");
    expect(source).toContain("'Pace reference set to '");
  });

  it('keeps settings usable at high zoom and preserves independent daily-goal fields', () => {
    expect(source).toContain(".tp-root .tp-settings-nav { position: static !important; }");
    expect(source).toContain("role: 'group', 'aria-labelledby': 'tp-daily-goal-label', 'aria-describedby': 'tp-daily-goal-help'");
    expect(source).toContain("var next = Object.assign({}, cur, { targetSessions: value });");
    expect(source).toContain("upd('dailyGoal', next.targetSessions || next.targetWpm ? next : null);");
    expect(source).toContain("'aria-describedby': 'tp-clinician-help'");
  });
});
