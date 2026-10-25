import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
const start = source.indexOf('    migrationStyle.textContent = [');
const end = source.indexOf("    ].join('\\n');", start);
if (start < 0 || end < start) throw new Error('Migration stylesheet not found');
// Evaluate the stylesheet's literal array, without executing the simulation.
const css = new Function('return [' + source.slice(start + '    migrationStyle.textContent = ['.length, end) + '].join("\\n");')();
const focusStart = css.indexOf('/* WCAG focus remains visible');
if (focusStart < 0) throw new Error('Migration focus rules not found');
const focusCss = css.slice(focusStart, css.indexOf('@media (any-pointer:coarse)', focusStart));

function declaration(block, name) {
  const match = block.match(new RegExp('(?:^|[;{])' + name + ':([^;}]+)'));
  if (!match) throw new Error('Missing CSS declaration: ' + name);
  return match[1];
}
function block(selector, within = css) {
  const first = within.indexOf(selector + '{');
  if (first < 0) throw new Error('Missing CSS selector: ' + selector);
  return within.slice(first + selector.length, within.indexOf('}', first) + 1);
}
function luminance(hex) {
  const digits = hex.slice(1);
  const full = digits.length === 3 ? [...digits].map(char => char + char).join('') : digits;
  const values = full.match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
function contrast(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
const lightFocus = declaration(block('.migration-tool-shell', focusCss), '--mg-focus');
const darkFocus = declaration(block('.migration-tool-shell .migration-command', focusCss), '--mg-focus');
const contrastFocus = declaration(block('.migration-tool-shell[data-migration-theme="contrast"] .migration-command', focusCss), '--mg-focus');
const lightTheme = css.match(/\.migration-tool-shell\{max-width:1280px;[^}]+\}/)[0];
const darkTheme = block('.migration-tool-shell[data-migration-theme="dark"]');
const contrastTheme = block('.migration-tool-shell[data-migration-theme="contrast"]');
const focusSelector = '.migration-tool-shell[data-migration-tool="true"] :is(a,button,input,select,textarea,summary,canvas,[tabindex]):focus-visible';

describe('Migration visible focus and contrast', () => {
  it('does not introduce color or focus transitions when reduced motion is requested', () => {
    expect(source).toContain('transition-duration: 0s !important; scroll-behavior: auto !important;');
    expect(source).toContain('transition-duration:0s!important}}');
    expect(source).not.toMatch(/transition-duration:\s*0\.01ms/);
  });
  it.each([
    ['light canvas', lightFocus, declaration(lightTheme, '--mg-canvas')],
    ['light panel', lightFocus, declaration(lightTheme, '--mg-panel')],
    ['dark canvas', darkFocus, declaration(darkTheme, '--mg-canvas')],
    ['dark panel', darkFocus, declaration(darkTheme, '--mg-panel')],
    ['flight controls', darkFocus, '#123a4d'],
    ['pressed flight controls', darkFocus, '#156773'],
    ['contrast panel', contrastFocus, declaration(contrastTheme, '--mg-panel')]
  ])('has at least 3:1 focus contrast against the %s', (_, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(3);
  });

  it('covers native controls, links and focusable reading regions with a three-pixel indicator', () => {
    const rule = block(focusSelector, focusCss);
    expect(declaration(rule, 'outline')).toBe('3px solid var(--mg-focus)');
    expect(declaration(rule, 'outline-offset')).toBe('3px');
  });

  it('places focus inside the clipping boundary of disclosures, canvas and reading panels', () => {
    const selector = '.migration-tool-shell[data-migration-tool="true"] :is(summary,canvas,[role="region"],[role="tabpanel"],.migration-flight-stage,.migration-disclosure-trigger,.migration-journey-summary,.migration-journey-choice):focus-visible';
    expect(Number.parseFloat(declaration(block(selector, focusCss), 'outline-offset'))).toBeLessThanOrEqual(-3);
  });

  it('paints the scene indicator above WebGL without intercepting orbit gestures', () => {
    const rule = block('.migration-tool-shell[data-migration-tool="true"] .migration-flight-stage:focus-visible::after', focusCss);
    expect(declaration(rule, 'position')).toBe('absolute');
    expect(Number.parseInt(declaration(rule, 'z-index'))).toBeGreaterThan(10);
    expect(Number.parseInt(declaration(rule, 'inset'))).toBeGreaterThanOrEqual(2);
    expect(declaration(rule, 'pointer-events')).toBe('none');
    expect(declaration(rule, 'box-shadow')).toMatch(/#071827/);
    expect(contrast(darkFocus, '#071827')).toBeGreaterThanOrEqual(3);
  });

  it('uses a bright inset indicator on the night sky even when the page theme is light', () => {
    const navigationFocus = declaration(block('.migration-tool-shell [data-migration-workspace="navigate"] canvas', focusCss), '--mg-focus');
    expect(contrast(navigationFocus, '#020617')).toBeGreaterThanOrEqual(3);
    expect(contrast(navigationFocus, '#0f172a')).toBeGreaterThanOrEqual(3);
  });

  it('preserves focus and pressed-state distinctions when colors are replaced by the operating system', () => {
    const forced = focusCss.slice(focusCss.indexOf('@media(forced-colors:active)'));
    expect(declaration(block(focusSelector, forced), 'outline-color')).toBe('Highlight');
    const stateRule = block('.migration-tool-shell[data-migration-tool="true"] :is(button,[role="tab"]):is([aria-pressed="true"],[aria-selected="true"],[aria-current="step"])', forced);
    expect(declaration(stateRule, 'border')).toBe('3px double ButtonText!important');
    expect(forced).not.toContain('forced-color-adjust:none');
  });

  it('derives tab label color from current selection even when an old render left inline colors', () => {
    const active = declaration(block('.migration-tool-shell .migration-route-tab[aria-selected="true"]'), 'color');
    const inactive = declaration(block('.migration-tool-shell .migration-route-tab[aria-selected="false"]'), 'color');
    expect(active).toBe('#fff!important');
    expect(inactive).toBe('var(--mg-muted)!important');
    expect(declaration(block('.migration-tool-shell .migration-route-tab>span'), 'color')).toBe('inherit!important');
    expect(contrast(active.replace('!important', ''), '#075c70')).toBeGreaterThanOrEqual(4.5);
    for (const theme of [lightTheme, darkTheme, contrastTheme]) {
      expect(contrast(declaration(theme, '--mg-muted'), declaration(theme, '--mg-panel'))).toBeGreaterThanOrEqual(4.5);
    }
  });
});
