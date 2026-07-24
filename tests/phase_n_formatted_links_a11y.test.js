import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('phase_n_misc_helpers_source.jsx', 'utf8');

describe('Shared formatted-text link accessibility', () => {
  it('keeps both top-level and emphasized Markdown links as ordinary links', () => {
    expect(source.match(/<a\r?\n/g)).toHaveLength(2);
    expect(source.match(/target="_blank"/g)).toHaveLength(2);
    expect(source.match(/rel="noopener noreferrer"/g)).toHaveLength(2);
    expect(source.match(/title=\{match\[2\]\}/g)).toHaveLength(2);
    expect(source).not.toContain('role="dialog" aria-modal="true"');
  });

  it('distinguishes links without relying on color and supports visible focus', () => {
    expect(source.match(/underline decoration-2 underline-offset-2/g)).toHaveLength(2);
    expect(source.match(/focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2/g)).toHaveLength(2);
    expect(source.match(/text-sky-300 hover:text-sky-200/g)).toHaveLength(2);
    expect(source.match(/text-blue-700 hover:text-blue-900/g)).toHaveLength(2);
    expect(source).not.toContain("isCitation ? 'no-underline'");
  });

  it('keeps generated Phase N modules synchronized', () => {
    const rootModule = fs.readFileSync('phase_n_misc_helpers_module.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/public/phase_n_misc_helpers_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).not.toContain('role: "dialog"');
    expect(rootModule).not.toContain('"aria-modal": "true"');
    expect(rootModule.match(/underline decoration-2 underline-offset-2/g)).toHaveLength(2);
    expect(rootModule.match(/title: match\[2\]/g)).toHaveLength(2);
  });
});