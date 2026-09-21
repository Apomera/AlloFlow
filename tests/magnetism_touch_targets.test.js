// Magnetism: an inline height must not defeat the coarse-pointer rule (2026-09-21).
//
// The tool already accommodates touch. Its stylesheet says:
//
//   .mag-root button{min-height:36px}
//   @media(pointer:coarse){.mag-root button{min-height:44px}}
//
// which is the right shape: 36px with a mouse, 44px on a phone. But the shared
// btn() helper also returned an INLINE `minHeight: 36`, and an inline style
// beats a stylesheet rule no matter what media query guards it. So every one
// of the ~209 buttons built through btn() stayed at 36px (38px with its
// border) on a phone, and the tool's own accommodation never applied.
//
// Measured with dev-tools/mobile_target_probe.mjs on an emulated iPhone 12,
// before and after removing the inline value:
//
//   tab          small targets before -> after
//   field                 20 -> 5
//   motor                 30 -> 9
//   materials             24 -> 1
//
// The remaining hits are range inputs, which have their own coarse-pointer
// rule giving them a 25px thumb. That is deliberate and above the 24px WCAG
// 2.5.8 AA floor for the draggable part, so they are left alone.
//
// This is a source test rather than a rendered one on purpose: reproducing it
// needs a real engine with media-query support, which the jsdom harnesses do
// not have. jsdom reports the inline value and the stylesheet value as equal,
// which is exactly how the bug survived.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const TOOL = 'stem_lab/stem_tool_magnetism.js';
const src = readFileSync(resolve(ROOT, TOOL), 'utf8');

// The helper nearly every control in the tool is styled by.
const btnHelper = src.slice(src.indexOf('function btn(active)'), src.indexOf('function btn(active)') + 420);

describe('the shared button helper leaves height to the stylesheet', () => {
  it('sets no inline minHeight or height', () => {
    // An inline value here cannot be overridden by the coarse-pointer rule, so
    // it silently pins every button to the desktop size on a phone.
    expect(btnHelper, 'btn() must not inline a height').not.toMatch(/\bminHeight\s*:/);
    expect(btnHelper, 'btn() must not inline a height').not.toMatch(/\bheight\s*:/);
  });

  it('still sets the padding that gives the button its size', () => {
    // Guards the check above: deleting the whole style object would also pass.
    expect(btnHelper).toMatch(/padding:\s*'8px 12px'/);
    expect(btnHelper).toMatch(/borderRadius:/);
  });
});

describe('the stylesheet keeps both floors', () => {
  it('sets a base height for pointer devices', () => {
    expect(src).toContain('.mag-root button{min-height:36px}');
  });

  it('raises buttons and summaries to 44px on a coarse pointer', () => {
    // This is the rule the inline style was defeating. If it is ever removed,
    // the buttons drop to 36px on phones with nothing to catch it.
    expect(src).toContain('@media(pointer:coarse){.mag-root button{min-height:44px}');
    expect(src).toContain('.mag-root summary{min-height:44px}');
  });

  it('gives the range slider a thumb big enough to drag', () => {
    // Sliders are the one control left under 44px tall, which is fine: the
    // target that matters is the thumb, and it is raised for coarse pointers.
    const coarse = src.match(/@media\(pointer:coarse\)\{\.mag-root \.mag-range-input\{[^']*/);
    expect(coarse, 'range inputs need a coarse-pointer rule').toBeTruthy();
    const thumb = coarse[0].match(/slider-thumb\{width:(\d+)px;height:(\d+)px/);
    expect(thumb, 'the thumb should be sized for touch').toBeTruthy();
    expect(Number(thumb[1])).toBeGreaterThanOrEqual(24);
    expect(Number(thumb[2])).toBeGreaterThanOrEqual(24);
  });
});

describe('no other control inlines a height that would beat the media query', () => {
  it('has no inline sub-44px minHeight on an interactive element', () => {
    // Catches the same mistake made somewhere other than btn(). Elements that
    // are not interactive (a status line reserving vertical space, say) are
    // not target-size constrained, so only buttons/inputs/selects count.
    const offenders = [];
    src.split('\n').forEach((line, index) => {
      if (!/h\('(?:button|input|select)'/.test(line)) return;
      const match = line.match(/\bminHeight:\s*(\d+)/);
      if (match && Number(match[1]) < 44) offenders.push(`${index + 1}: minHeight ${match[1]}`);
    });
    expect(offenders, 'let the coarse-pointer rule set these').toEqual([]);
  });

  it('leaves the non-interactive status line alone', () => {
    // A role="status" region reserves space so the layout does not jump. It is
    // not a tap target, and padding it to 44px would just add a gap. Recorded
    // here so a future sweep does not "fix" it.
    const status = src.match(/role: 'status'[^}]*minHeight: (\d+)/);
    if (status) expect(Number(status[1])).toBeLessThan(44);
  });
});

describe('the deployed copies carry the fix', () => {
  it('every mirror matches the source', () => {
    for (const dir of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
      const mirror = resolve(ROOT, dir, 'stem_lab/stem_tool_magnetism.js');
      let contents;
      try {
        contents = readFileSync(mirror, 'utf8');
      } catch {
        continue; // not every mirror carries every tool
      }
      expect(contents, dir).toBe(src);
    }
  });
});
