import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8').replace(/\r\n?/g, '\n');

function sourceBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start, `missing start marker: ${startMarker}`).toBeGreaterThanOrEqual(0);
  expect(end, `missing end marker: ${endMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('shared STEAM host accessibility contracts', () => {
  it('keeps accessibility semantics source-owned instead of rewriting the rendered dialog', () => {
    const accessibilitySetup = sourceBetween(
      '// ── Keyboard Accessibility ──',
      '// ── Accessibility: aria-live feedback region ──',
    );

    expect(accessibilitySetup).not.toContain('Runtime A11Y Enhancer');
    expect(accessibilitySetup).not.toContain("root.querySelectorAll('button:not([aria-label])')");
    expect(accessibilitySetup).not.toContain("setAttribute('aria-pressed', 'true')");
    expect(accessibilitySetup).not.toContain("setAttribute('role', 'img')");
    expect(source).toContain('AS OF 2026-08-11 THIS REPORTS; IT NO LONGER REWRITES THE DOM.');
  });

  it("toggles keyboard help only for '?' and announces the resulting state", () => {
    const keyboardHandler = sourceBetween(
      '// ? key toggles keyboard help.',
      '// Keyboard shortcuts (with Alt key)',
    );

    expect(keyboardHandler).toContain("if (e.key === '?' && !e.altKey && !e.ctrlKey && !e.metaKey)");
    expect(keyboardHandler).not.toContain("e.key === '/'");
    expect(keyboardHandler).toContain('var nextHelpState = !_showKeyHelp;');
    expect(keyboardHandler).toContain('_setShowKeyHelp(nextHelpState);');
    expect(keyboardHandler).toContain("announceToSR(nextHelpState ? 'Keyboard help shown' : 'Keyboard help hidden');");
    expect(source).toContain('}, [stemLabTool, stemLabTab, _showKeyHelp]);');
  });

  it('keeps the active-tool toolbar above the scrolling workspace', () => {
    const toolbarRule = source.match(/'.stem-active-toolbar {([^']+)}'/);

    expect(toolbarRule, 'missing .stem-active-toolbar CSS rule').not.toBeNull();
    expect(toolbarRule[1]).toContain('z-index: 100');
    expect(toolbarRule[1]).toContain('flex: 0 0 auto');
    const toolbarMarkup = sourceBetween(
      'className: "stem-active-toolbar"',
      'className: "stem-active-tool-main"',
    );
    expect(toolbarMarkup).toContain('backgroundColor:');
  });
});
