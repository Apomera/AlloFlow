// Field Journeys accessibility and registry metadata (2026-09-21).
//
// This tool was invisible to check_stem_a11y until that gate learned to look
// inside shadow roots, so nothing here had ever been checked. Two things were
// wrong once it became visible:
//
//   1. registerTool carried no `desc`. The tile entry in stem_lab_module.js had
//      a good one, but that feeds the PICKER; registerTool feeds catalog search
//      and the active-tool context label. The tool was findable by browsing and
//      not by searching.
//
//   2. Every interactive control — button, input, textarea, select — drew its
//      only visible boundary with --line (#d5dacb), which is 1.41:1 against the
//      button background. WCAG 1.4.11 wants 3:1 for the boundary of a control.
//      --line is correct for decorative dividers, so controls got their own
//      token rather than changing what dividers look like.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const TOOL = 'stem_lab/stem_tool_fieldjourneys.js';
const src = read(TOOL);

// WCAG relative luminance / contrast, so the thresholds below are computed from
// the tool's real tokens rather than asserted from memory.
function luminance(hex) {
  const parts = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((pair) => {
    const channel = parseInt(pair, 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// Read a custom property out of the tool's own stylesheet, so these tests track
// the shipped palette instead of a copy of it.
function token(name, scope) {
  const block = scope
    ? src.slice(src.indexOf(scope), src.indexOf(scope) + 400)
    : src;
  const match = block.match(new RegExp('--' + name + ':(#[0-9a-fA-F]{3,6})'));
  expect(match, `--${name} should be defined${scope ? ' in ' + scope : ''}`).toBeTruthy();
  return match[1].length === 4
    ? '#' + match[1].slice(1).split('').map((c) => c + c).join('')
    : match[1];
}

describe('the tool is findable, not just browsable', () => {
  it('registers a description for catalog search and context labels', () => {
    const block = src.slice(src.indexOf('registerTool("fieldJourneys"'), src.indexOf('registerTool("fieldJourneys"') + 700);
    const desc = block.match(/desc:\s*"([^"]+)"/);
    expect(desc, 'registerTool should carry a desc').toBeTruthy();
    // The gate's own bar: anything shorter reads as a placeholder.
    expect(desc[1].trim().length).toBeGreaterThan(11);
  });

  it('says the same thing as the tile entry, which is a separate source', () => {
    // Two registries describe this tool. They drifted once — the tile had a
    // description and registerTool did not — so pin that they agree.
    const registry = read('stem_lab/stem_lab_module.js');
    const tile = registry.slice(registry.indexOf("id: 'fieldJourneys'"), registry.indexOf("id: 'fieldJourneys'") + 500);
    const tileDesc = tile.match(/desc:\s*'([^']+)'/);
    expect(tileDesc).toBeTruthy();

    const toolBlock = src.slice(src.indexOf('registerTool("fieldJourneys"'), src.indexOf('registerTool("fieldJourneys"') + 700);
    const toolDesc = toolBlock.match(/desc:\s*"([^"]+)"/);
    expect(toolDesc[1]).toBe(tileDesc[1]);
  });

  it('keeps a specific category, not the generic bucket', () => {
    const block = src.slice(src.indexOf('registerTool("fieldJourneys"'), src.indexOf('registerTool("fieldJourneys"') + 700);
    const category = block.match(/category:\s*"([^"]+)"/);
    expect(category).toBeTruthy();
    expect(category[1]).not.toBe('general');
  });
});

describe('control boundaries meet WCAG 1.4.11 (3:1 non-text contrast)', () => {
  const paper = token('paper');
  const buttonBackground = '#fffef8'; // literal in the button rule

  it('controls use a token that passes against both grounds', () => {
    const controlLine = token('control-line');
    // A control sits on the page, and its own fill sits inside it; both edges
    // have to be perceivable.
    expect(contrast(controlLine, buttonBackground)).toBeGreaterThanOrEqual(3);
    expect(contrast(controlLine, paper)).toBeGreaterThanOrEqual(3);
  });

  it('the control rule actually uses that token', () => {
    // The fix is worthless if the rule still points at --line.
    expect(src).toContain('border:1px solid var(--control-line)');
    const rule = src.slice(src.indexOf('button{min-height:44px'), src.indexOf('button{min-height:44px') + 200);
    expect(rule).toContain('var(--control-line)');
    expect(rule).not.toContain('var(--line)');
  });

  it('documents why --line was left alone by still failing 3:1 itself', () => {
    // --line is for decorative dividers, where 1.4.11 does not apply. If someone
    // later "fixes" it to pass, that is fine — but this test records that the
    // control token exists precisely because --line does not meet the bar.
    const line = token('line');
    expect(contrast(line, paper)).toBeLessThan(3);
  });

  it('the high-contrast theme overrides the control token too', () => {
    // Without an override the control border keeps its light-mode value on a
    // black ground. It happens to still pass there, but on coincidence.
    const contrastBlock = src.slice(
      src.indexOf(':host([data-theme="contrast"]){'),
      src.indexOf(':host([data-theme="contrast"]){') + 300,
    );
    expect(contrastBlock).toContain('--control-line:');
    const overridden = token('control-line', ':host([data-theme="contrast"]){');
    expect(contrast(overridden, '#000000')).toBeGreaterThanOrEqual(3);
  });
});

describe('text colours pass AA on the light ground', () => {
  const paper = token('paper');

  it('body and secondary text clear 4.5:1', () => {
    for (const name of ['ink', 'muted', 'accent', 'warm']) {
      const value = token(name);
      expect(contrast(value, paper), `--${name} on --paper`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the focus ring is perceivable against the page', () => {
    // Focus is how a keyboard user knows where they are; 1.4.11 applies.
    const outline = src.match(/focus-visible\{outline:3px solid (#[0-9a-fA-F]{6})/);
    expect(outline).toBeTruthy();
    expect(contrast(outline[1], paper)).toBeGreaterThanOrEqual(3);
  });
});

describe('the deployed copies carry the fix', () => {
  it('every mirror matches the source', () => {
    for (const dir of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
      const mirror = path.join(ROOT, dir, 'stem_lab/stem_tool_fieldjourneys.js');
      if (!fs.existsSync(mirror)) continue;
      expect(fs.readFileSync(mirror, 'utf8'), dir).toBe(src);
    }
  });
});
