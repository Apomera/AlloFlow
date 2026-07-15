import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('story_forge_source.jsx', 'utf8');

describe('Story Forge target size and motion preferences', () => {
  it('guarantees every in-app button meets the WCAG 2.2 minimum target size', () => {
    expect(source).toContain('.sf-modal-root button{min-width:24px;min-height:24px}');
  });

  it('disables persistent and entrance animations when motion is reduced', () => {
    expect(source).toContain('.sf-modal-root .animate-bounce,.sf-modal-root .animate-in{animation:none!important}');
  });

  it('disables transition utilities when motion is reduced', () => {
    expect(source).toContain('.sf-modal-root [class*="transition-"]{transition:none!important}');
  });
});
