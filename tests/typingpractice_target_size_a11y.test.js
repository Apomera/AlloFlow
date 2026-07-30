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

function mockReactWindow() {
  return {
    React: {
      createElement(type, props, ...children) {
        return { type, props: props || {}, children };
      }
    }
  };
}

describe('Typing Practice target-size accessibility', () => {
  it('sets a WCAG 2.2 floor for buttons and native motor controls', () => {
    expect(source).toContain("'.tp-root button:not(.tp-session-bar) { min-width: 24px; min-height: 24px; touch-action: manipulation; overflow-wrap: anywhere; white-space: normal; line-height: 1.35; }'");
    expect(source).toContain("'.tp-root button[aria-pressed] { min-width: 44px; min-height: 44px; }'");
    expect(source).toContain("'.tp-root input[type=\"checkbox\"], .tp-root input[type=\"radio\"] { min-width: 24px; min-height: 24px; }'");
    expect(source).toContain("'.tp-root input[type=\"range\"] { min-height: 44px; touch-action: manipulation; }'");
  });

  it('gives reusable navigation actions a 44px target', () => {
    const window = mockReactWindow();
    const nav = Function('window', 'return (' + extractFunction('renderNavButton') + ')')(window);
    const back = Function('window', 'return (' + extractFunction('renderBackButton') + ')')(window);

    expect(nav('Next', () => {}, {}, false).props.style.minHeight).toBe('44px');
    expect(back(() => {}, { accent: '#123456' }).props.style).toMatchObject({
      minWidth: '44px',
      minHeight: '44px',
      display: 'inline-flex',
      alignItems: 'center'
    });
  });

  it('removes selection layout shift and enlarges theme and favorite choices', () => {
    expect(source).toContain("className: 'tp-theme-quick-choice'");
    expect(source).toContain("minHeight: '44px',\n                      borderRadius: '999px'");
    expect(source).not.toContain("width: isActive ? '28px' : '24px'");
    expect(source).not.toContain("height: isActive ? '28px' : '24px'");
    expect(source).toContain("className: 'tp-favorite-toggle'");
    expect(source).toContain("width: '44px',\n          height: '44px'");
  });

  it('provides 44px settings jump links for mouse, touch, and switch users', () => {
    expect(source).toContain("'.tp-root .tp-settings-nav a { min-height: 44px;");
    expect(source).toContain('touch-action: manipulation;');
    expect(source).toContain("className: 'tp-settings-nav'");
  });

  it('retains the larger coarse-pointer fallback and chart exception', () => {
    expect(source).toContain("'@media (pointer: coarse) {'");
    expect(source).toContain("'  .tp-root button:not(.tp-session-bar),'");
    expect(source).toContain("'  .tp-root .tp-session-bar { min-width: 32px !important; }'");
  });
});
