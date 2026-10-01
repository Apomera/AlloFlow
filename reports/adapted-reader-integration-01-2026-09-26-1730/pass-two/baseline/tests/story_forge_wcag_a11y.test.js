import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');
const source = read('story_forge_source.jsx');
const built = read('story_forge_module.js');
const deployed = read('desktop/web-app/public/story_forge_module.js');

describe('Story Forge WCAG focus and motion safeguards', () => {
  it('keeps generated artifacts synchronized', () => {
    expect(deployed).toBe(built);
  });

  it('does not suppress native focus outlines', () => {
    expect(source).not.toContain('outline-none');
  });

  it('provides a strong scoped focus-visible indicator for every interactive control', () => {
    expect(source).toContain('.sf-modal-root :is(button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])):focus-visible');
    expect(source).toContain('outline:3px solid #fff!important');
    expect(source).toContain('box-shadow:0 0 0 5px #0f172a!important');
    expect(source).toContain('@media (forced-colors:active)');
    expect(source).toContain('outline-color:Highlight!important');
  });

  it('disables every animated status directly when reduced motion is requested', () => {
    const animatedStatuses = source.match(/(?<!\.)animate-(?:pulse|spin|bounce)/g) || [];
    const protectedStatuses = source.match(/(?<!\.)animate-(?:pulse|spin|bounce) motion-reduce:animate-none/g) || [];
    expect(animatedStatuses).toHaveLength(10);
    expect(protectedStatuses).toHaveLength(animatedStatuses.length);
  });
});
