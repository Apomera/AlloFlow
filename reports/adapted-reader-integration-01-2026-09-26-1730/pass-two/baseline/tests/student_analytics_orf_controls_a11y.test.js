import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'student_analytics_module.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/student_analytics_module.js'), 'utf8');
const start = source.indexOf('orfProbeActive &&');
const end = source.indexOf('orfProbeResults &&', start);
const orf = source.slice(start, end);

describe('Student Analytics ORF controls', () => {
  it('keeps source and deploy mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });

  it('uses native, target-sized word buttons with programmatic state and names', () => {
    expect(orf).not.toContain('role: "button"');
    expect(orf.match(/React\.createElement\("button", \{ type: "button"/g)).toHaveLength(2);
    expect(orf).toContain('"aria-pressed": item.error');
    expect(orf).toContain("'Select ' + item.word + ' as the last word read'");
    expect(orf.match(/min-w-8 min-h-8/g)).toHaveLength(2);
  });

  it('uses input-neutral instructions', () => {
    expect(orf).toContain('Select words read incorrectly');
    expect(orf).toContain('Select a word to toggle its error mark');
    expect(orf).toContain("Select the last word the student read");
    expect(orf).not.toMatch(/Tap (?:a word|words|the LAST word)/);
  });

  it('exposes the timer and progress values without announcing every second', () => {
    expect(orf).toContain('role: "timer"');
    expect(orf).toContain('"aria-live": orfProbeTimer <= 10 ? "polite" : "off"');
    expect(orf).toContain('"aria-valuenow": Math.round((60 - orfProbeTimer) / 60 * 100)');
    expect(orf).toContain('"aria-valuetext": (60 - orfProbeTimer) + " seconds elapsed"');
    expect(orf).toContain('min-h-11 px-3');
  });
});
