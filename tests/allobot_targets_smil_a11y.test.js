import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('allobot_source.jsx', 'utf8');

describe('AlloBot target, speech, and SMIL accessibility', () => {
  it('keeps every scaled orbit control at least 24 CSS pixels', () => {
    expect(source.match(/min-h-8 min-w-8/g)).toHaveLength(4);
    expect(source).toContain('inline-flex min-h-6 items-center');
    expect(source).toContain('motion-reduce:transition-none');
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
