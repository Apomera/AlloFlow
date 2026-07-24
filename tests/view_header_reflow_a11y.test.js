import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_header_source.jsx', 'utf8');
const builder = fs.readFileSync('_build_view_header_module.js', 'utf8');

describe('header narrow-viewport reflow', () => {
  it('does not impose a max-content minimum width on the banner', () => {
    expect(source).toContain('w-full min-w-0 overflow-x-clip');
    expect(source).not.toContain('w-full min-w-max');
  });
  it('lets settings and utility groups wrap within the viewport', () => {
    expect(source).toContain('id="tour-header-settings" className={`relative z-[60] w-full sm:w-auto flex flex-wrap');
    expect(source).toContain('id="tour-header-utils" className={`relative z-[100] w-full sm:w-auto flex flex-wrap');
    expect(source).toContain('justify-start sm:justify-end relative min-w-0');
    expect(source).toContain('id="tour-header-actions" className={`w-full flex flex-wrap');
    expect(source).toContain('max-w-full scale-90 origin-left');
  });
  it('wraps source-panel actions instead of clipping Generate and Books', () => {
    const app = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
    expect(app).toContain('flex flex-wrap items-center justify-end gap-2 max-w-full min-w-0');
  });
  it('keeps the deployment mirror synchronized', () => {
    expect(builder).toContain("desktop/web-app', 'public', 'view_header_module.js");
  });
});
