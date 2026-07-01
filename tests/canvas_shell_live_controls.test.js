import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const headerFiles = [
  'view_header_source.jsx',
  'view_header_module.js',
  'prismflow-deploy/public/view_header_module.js',
].map((file) => [file, readFileSync(resolve(process.cwd(), file), 'utf8')]);

describe('Canvas shell live-session controls', () => {
  it('does not render a literal newline before the setup wizard boundary', () => {
    expect(src).not.toContain('/>\\n<ErrorBoundary fallbackMessage="The setup wizard encountered an error. Please close and try again.">');
  });

  it('does not leak PowerShell newline escapes as visible header text', () => {
    for (const [file, text] of headerFiles) {
      expect(text, file).not.toContain('`r`n');
    }
  });

  it('keeps live polling and pictionary above the bottom-right tool stack', () => {
    expect(src).toContain("bottom:'5.5rem'");
    expect(src).toContain("bottom:'8.75rem'");
    expect(src).not.toContain("bottom:'1rem',right:'1rem',zIndex:9999,background:'#1e3a8a'");
    expect(src).not.toContain("bottom:'4rem',right:'1rem',zIndex:9999,background:'#9f1239'");
  });
});