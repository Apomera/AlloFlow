import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('allobot_source.jsx', 'utf8');

describe('AlloBot target, speech, and SMIL accessibility', () => {
  it('keeps every scaled orbit control at least 24 CSS pixels', () => {
    // The four orbit controls used to repeat their sizing inline; they now share
    // one `satelliteBase` string with a mouse and a touch branch. Both branches
    // still have to clear 24px AFTER scaling, so assert each one — a size class
    // counted on its own says nothing once a scale- class can sit beside it.
    const [, mouse] = source.match(/\n\s*:\s*('inline-flex min-h-8[^']*')/) || [];
    const [, touch] = source.match(/\n\s*\?\s*('inline-flex min-h-9[^']*')/) || [];
    expect(mouse, 'mouse-pointer satellite class').toBeTruthy();
    expect(touch, 'coarse-pointer satellite class').toBeTruthy();
    // 32px * scale-75 == 24px exactly.
    expect(mouse).toContain('min-h-8 min-w-8');
    expect(mouse).toContain('scale-75');
    // 36px unscaled — a scale- class here would drop it back under the floor.
    expect(touch).toContain('min-h-9 min-w-9');
    expect(touch).not.toMatch(/\bscale-(?!100\b)\d+/);
    // Touch has no hover to reveal them with, so they must not start invisible.
    expect(touch).not.toContain('opacity-0');
    // All four controls must draw from that shared definition.
    expect(source.match(/\$\{satelliteBase\}/g)).toHaveLength(4);
    expect(source).toContain('inline-flex min-h-6 items-center');
    expect(source).toContain('motion-reduce:transition-none');
  });

  it('lets a touch reach the orbit controls instead of starting a drag', () => {
    // The container owns the drag gesture and calls preventDefault() on
    // touchstart, which cancels the synthesised click outright. Stopping
    // pointerdown/mousedown does nothing for a different event type, so every
    // satellite needs its own touchstart guard or taps are swallowed.
    expect(source.match(/onTouchStart=\{stopTouch\}/g)).toHaveLength(4);
    expect(source).toContain('const stopTouch = (e) => e.stopPropagation();');
  });

  it('stops every SVG SMIL animation when motion is disabled', () => {
    const smilElements = source.match(/<(?:animate|animateMotion|animateTransform)\b[\s\S]*?\/>/g) || [];
    expect(smilElements).toHaveLength(18);
    for (const element of smilElements) {
      expect(element).toMatch(/dur=\{motionDisabled \? 'indefinite' : '[0-9.]+s'\}/);
    }
    expect(source.match(/\bdur="[0-9.]+s"/g) || []).toEqual([]);
  });

  it('announces complete speech without exposing typewriter fragments twice', () => {
    expect(source).toContain('<span role="status" aria-live="polite" aria-atomic="true" className="sr-only">{isVisible ? text : \'\'}</span>');
    expect(source).toContain('<span aria-hidden="true">{displayedText}</span>');
    expect(source).toContain('isVisible && isTruncated && displayedText.length === text?.length');
  });

  it('describes the avatar as a movable group and isolates child control keys', () => {
    expect(source).toContain('role="group"');
    expect(source).toContain('aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"');
    expect(source).toContain('if (e.target !== e.currentTarget) return;');
  });
});
