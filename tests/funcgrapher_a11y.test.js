import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_funcgrapher.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_funcgrapher.js';

describe('Function Grapher chart and inquiry semantics', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('names the graph and both inquiry textareas', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('Function graph showing the configured curve');
    expect(source).toContain('stem.funcgrapher.hypothesis_input');
    expect(source).toContain('stem.funcgrapher.explanation_input');
  });

  it('places the tool title directly below the host H1', () => {
    for (const filePath of [sourcePath, publicPath, 'desktop/app-build/stem_lab/stem_tool_funcgrapher.js']) {
      const source = fs.readFileSync(filePath, 'utf8');
      expect(source).toContain('React.createElement("h2", { className: "mt-3 text-xl font-black tracking-tight sm:text-2xl" }');
      expect(source).not.toContain('React.createElement("h3", { className: "mt-3 text-xl font-black tracking-tight sm:text-2xl" }');
      expect(source).toContain("React.createElement('h3', { className: 'text-sm font-bold text-indigo-700' }");
      expect(source).not.toContain("React.createElement('h4', { className: 'text-sm font-bold text-indigo-700' }");
    }
  });
});
