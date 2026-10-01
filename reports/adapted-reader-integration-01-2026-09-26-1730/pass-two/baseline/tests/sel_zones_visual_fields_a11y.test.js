import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_zones.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_zones.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Zones visual and field accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('names the interactive zone wheel and daily compass as keyboard-navigable groups', () => {
    const text = source();
    expect(text).toContain("role: 'group', 'aria-label': 'Interactive four-zone wheel.");
    expect(text).toContain("role: 'group', 'aria-label': 'Interactive daily zone compass.");
    expect(text).toContain("return hour + ':00 ' + compassToday[hour] + ' zone'");
    expect(text).toContain("if (ev.key === 'Enter' || ev.key === ' '");
  });

  it('summarizes the selected body-map zone, intensity, and common sensations', () => {
    const text = source();
    expect(text).toContain('var bodyMapSummary = Object.keys(profile).map');
    expect(text).toContain("role: 'img', 'aria-label': 'Body map for the ' + bmZone + ' zone at intensity ' + bmIntensity + ' of 10. Common sensations: ' + bodyMapSummary");
  });

  it('provides explicit names for notes and both search fields', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Check-in notes'");
    expect(text).toContain("'aria-label': 'Search zone descriptors'");
    expect(text).toContain("'aria-label': 'Search prevention plan scenarios'");
  });
});
