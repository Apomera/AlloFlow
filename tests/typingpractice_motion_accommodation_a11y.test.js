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

describe('Typing Practice in-app motion accommodation', () => {
  it('offers a persistent, independently named Reduce motion switch', () => {
    expect(source).toContain('reducedMotion: false');
    expect(source).toContain("renderToggleRow('Reduce motion'");
    expect(source).toContain("toggle('reducedMotion', 'Reduce motion')");
    expect(source).toContain('This works independently of the device setting.');
    expect(source).toContain("{ key: 'reducedMotion', spoken: 'Reduce motion'");
    expect(source).toContain("activeAccLabels.push('reduced motion')");
  });

  it('activates a scoped root class and stops decorative motion without hiding content', () => {
    expect(source).toContain("state.accommodations.reducedMotion ? ' tp-reduce-motion' : ''");
    expect(source).toContain("'.tp-root.tp-reduce-motion *,'");
    expect(source).toContain("'  animation-duration: 0.01ms !important;'");
    expect(source).toContain("'  transition-duration: 0.01ms !important;'");
    expect(source).toContain("'.tp-root.tp-reduce-motion .tp-fest-confetti,'");
    expect(source).toContain("'.tp-root.tp-reduce-motion .tp-clear-burst { display: none !important; }'");
    expect(source).toContain("'.tp-root.tp-reduce-motion .tp-stat-stagger > * { opacity: 1 !important;");
  });

  it('uses instant scrolling for either the app setting or the OS preference', () => {
    const scrollIntoView = vi.fn();
    const matchMedia = vi.fn(() => ({ matches: false }));
    const querySelector = vi.fn(() => ({}));
    const helper = Function(
      'window',
      'document',
      'return (' + extractFunction('scrollTypingPracticeIntoView') + ')'
    )({ matchMedia }, { querySelector });

    helper({ scrollIntoView }, 'center');

    expect(querySelector).toHaveBeenCalledWith('.tp-root.tp-reduce-motion');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
  });

  it('still uses smooth scrolling when neither motion preference is active', () => {
    const scrollIntoView = vi.fn();
    const helper = Function(
      'window',
      'document',
      'return (' + extractFunction('scrollTypingPracticeIntoView') + ')'
    )({ matchMedia: () => ({ matches: false }) }, { querySelector: () => null });

    helper({ scrollIntoView }, 'nearest');

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
  });

  it('preserves independent accommodations when applying a quick preset', () => {
    expect(source).toContain("upd('accommodations', Object.assign({}, acc, preset.apply));");
    expect(source).not.toContain("upd('accommodations', Object.assign({}, preset.apply));");
  });
});
