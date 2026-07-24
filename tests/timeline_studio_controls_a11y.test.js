import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('timeline_studio_module.js', 'utf8');

describe('Timeline Studio control accessibility', () => {
  it('names and describes the modal from visible content', () => {
    expect(source).toContain("'aria-labelledby': 'timeline-studio-title'");
    expect(source).toContain("'aria-describedby': 'timeline-studio-description'");
    expect(source).toContain("id: 'timeline-studio-title'");
    expect(source).toContain("id: 'timeline-studio-description'");
  });

  it('provides explicit buttons, large targets, and visible focus', () => {
    expect(source.match(/type: 'button'/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toContain("className: 'min-h-11 px-3 py-1.5");
    expect(source).toContain("className: 'min-h-11 px-4 py-2.5");
    expect(source).toContain('focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2');
    expect(source).toContain("id: 'allo-timeline-grade'");
    expect(source).toContain("htmlFor: 'allo-timeline-grade'");
  });

  it('keeps the busy generation control focused and accurately exposed', () => {
    expect(source).toContain("'aria-disabled': busy ? 'true' : 'false'");
    expect(source).toContain("'aria-busy': busy ? 'true' : 'false'");
    expect(source).not.toContain('disabled: busy');
    expect(source).toContain("'aria-describedby': 'timeline-studio-status timeline-studio-summary'");
    expect(source).not.toContain("'aria-label': isTopic");
    expect(source).toContain('title: isTopic');
  });

  it('announces generation and research summaries as named status regions', () => {
    expect(source).toContain("id: 'timeline-studio-status', role: 'status'");
    expect(source).toContain("id: 'timeline-studio-summary', role: 'status'");
    expect(source.match(/'aria-live': 'polite', 'aria-atomic': 'true'/g)).toHaveLength(2);
  });

  it('keeps the deployment copy synchronized', () => {
    expect(fs.readFileSync('desktop/web-app/public/timeline_studio_module.js', 'utf8')).toBe(source);
  });
});
