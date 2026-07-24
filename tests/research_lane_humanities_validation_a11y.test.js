import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('research_lane_humanities_source.jsx', 'utf8');
const built = readFileSync('research_lane_humanities_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/research_lane_humanities_module.js', 'utf8');

describe('Humanities composition validation announcements', () => {
  it('routes all six validation failures into a persistent alert', () => {
    expect(source).toContain("var _validationError = useState('');");
    expect(source).toContain('{validationError && (');
    expect(source).toContain('<div role="alert"');
    expect(source.match(/setValidationError\(/g) || []).toHaveLength(9);
    expect(source).not.toContain('window.alert(');
  });

  it('clears stale validation errors after valid genre, save, and handoff checks', () => {
    expect(source.match(/setValidationError\(''\);/g) || []).toHaveLength(3);
  });

  it('keeps generated and deployed Humanities lane modules synchronized', () => {
    expect(built).toBe(deployed);
    expect(built).toContain('validationError');
    expect(built).not.toContain('window.alert(');
  });
});
