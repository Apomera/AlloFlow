import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 2026-11-09 Create screen pass. Source buttons share one style (the five used five
// colour treatments that suggested meaning they did not have), the tool-finder note
// names its filter in a calm neutral line, and Teach Live no longer looks like the
// selected tab. A Chromium render of the real built panel checked the computed
// styles: all five pills identical, 44 px tall.
const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const COPIES = (name) => [name, `desktop/web-app/public/${name}`, `desktop/app-build/${name}`, `desktop/web-app/build/${name}`];

describe('source buttons share one style', () => {
  const source = read('view_sidebar_panels_source.jsx');
  const start = source.indexOf('const sourcePillClass');
  const region = source.slice(source.indexOf('id="tour-upload-source"'), source.indexOf('{changeOpen && <button type="button" data-source-change-cancel'));

  it('defines one pill class and uses it for Upload, Open PDF project, Link, Write with AI and Books', () => {
    expect(start).toBeGreaterThan(0);
    expect((region.match(/sourcePillClass/g) || []).length).toBe(5);
    for (const old of ['bg-amber-50', 'bg-violet-50', 'bg-indigo-50 text-indigo-600']) expect(region, old).not.toContain(old);
  });

  it('the Books button uses an icon, not an emoji that looks different on every device', () => {
    expect(region).toContain('<BookOpen size={12} aria-hidden="true" />');
    expect(region).not.toContain('\u{1F4D6}');
  });

  it('a disabled source button looks disabled', () => {
    expect(source).toContain('disabled:opacity-50 disabled:cursor-not-allowed');
  });

  it('ships in all four module copies', () => {
    for (const file of COPIES('view_sidebar_panels_module.js')) {
      const text = read(file);
      expect(text, file).toContain('sourcePillClass');
      expect(text, file).not.toContain('bg-violet-50 border border-violet-300 text-violet-800');
    }
  });
});

describe('Teach Live no longer looks like the selected tab', () => {
  const header = read('view_header_source.jsx');
  const at = header.indexOf('data-help-key="header_session_start"');
  const block = header.slice(header.lastIndexOf('<button', at), header.indexOf('</button>', at));

  it('is outlined when idle and solid green when live, with a lamp that matches', () => {
    expect(block).toContain("'bg-emerald-700 text-white border-emerald-300 hover:bg-emerald-600' : 'bg-white/10 text-white border-white/60 hover:bg-white/20'");
    expect(block).toContain("data-live-lamp={activeSessionCode ? 'on' : 'off'}");
    expect(block).not.toContain('bg-white text-indigo-950');
  });

  it('the live lamp pulses only when motion is allowed', () => {
    expect(block).toContain('animate-pulse motion-reduce:animate-none');
  });

  it('the active Dashboard tab keeps the white highlight, so the two no longer match', () => {
    expect(header).toContain("activeView === 'dashboard' ? 'bg-white text-indigo-900 shadow-lg'");
  });

  it('ships in all four module copies', () => {
    for (const file of COPIES('view_header_module.js')) expect(read(file), file).toContain('data-live-lamp');
  });
});

describe('tool finder note names its filter', () => {
  it('registers both sentences in all four string files', () => {
    for (const file of COPIES('ui_strings.js')) {
      const raw = read(file);
      const strings = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
      expect(strings.sidebar.tool_finder_filtered_group, file).toBe('{filter}: showing {shown} of {total} tools.');
      expect(strings.sidebar.tool_finder_filtered_search, file).toContain('{shown} of {total}');
    }
  });
});
