// A second skip link goes straight to the resource.
//
// WHY (2026-09-24 audit): "Skip to Content" targets <main>, which also holds
// the sidebar, so a keyboard user still tabbed through about 14 (student) to 35
// (teacher) sidebar and toolbar controls before reaching any resource.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const hosts = { ANTI: readFileSync(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8'), 'App.jsx': readFileSync('desktop/web-app/src/App.jsx', 'utf8') };
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));

describe.each(Object.entries(hosts))('%s', (_, source) => {
  it('offers "Skip to resource" right after "Skip to Content", before the main area', () => {
    const content = source.indexOf("{t('a11y.skip_content')}");
    const resource = source.indexOf('href="#allo-resource"');
    const main = source.indexOf('id="main-content"');
    expect(content).toBeGreaterThan(-1);
    expect(resource).toBeGreaterThan(content);
    expect(resource).toBeLessThan(main);
    expect(source.slice(content, resource)).not.toMatch(/<(button|input|select)\b/);
  });
  it('lands on the resource area, which takes focus and is a named region', () => {
    const at = source.indexOf('ref={contentAreaRef}');
    const tag = source.slice(at, source.indexOf('>', source.indexOf('data-allo-anno-host', at)));
    expect(tag).toContain('id="allo-resource"');
    expect(tag).toContain('tabIndex={-1}');
    expect(tag).toContain('role="region"');
    expect(tag).toContain("aria-label={t('a11y.resource_region')");
    expect(source.split('id="allo-resource"')).toHaveLength(2);
  });
});

it('the new words can be translated', () => {
  expect(strings.a11y.skip_resource).toBe('Skip to resource');
  expect(strings.a11y.resource_region).toBe('Current resource');
});
