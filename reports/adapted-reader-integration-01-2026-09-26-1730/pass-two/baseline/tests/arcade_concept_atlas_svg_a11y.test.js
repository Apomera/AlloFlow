import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const atlas = readFileSync('arcade_mode_concept_atlas.js', 'utf8');
const host = readFileSync('allohaven_module.js', 'utf8');
const publicHost = readFileSync('desktop/web-app/public/allohaven_module.js', 'utf8');

describe('Concept Atlas SVG alternatives', () => {
  it('describes concepts and relationships rather than counts alone', () => {
    expect(atlas).toContain("var nodeSummary = nodes.slice(0, 20).map");
    expect(atlas).toContain("var relationSummary = edges.slice(-20).map");
    expect(atlas).toContain("'Concepts: ' + nodeSummary");
    expect(atlas).toContain("'Relationships: ' + relationSummary");
    expect(atlas.match(/h\('desc'/g)?.length).toBe(2);
  });

  it('names full and empty diagrams as images', () => {
    expect(atlas.match(/h\('svg', \{ role: 'img'/g)?.length).toBe(2);
    expect(atlas).toContain("diagramName + ', empty concept atlas'");
    expect(atlas).toContain("diagramName + ': ' + nodes.length + ' concepts and ' + edges.length + ' relationships'");
    expect(atlas.match(/focusable: 'false'/g)?.length).toBe(2);
  });

  it('hides miniature diagrams duplicated by adjacent atlas text', () => {
    expect(atlas).toContain("'aria-hidden': isMini ? 'true' : undefined");
    expect(host).toContain("'aria-hidden': 'true',\n            style: { width: '64px'");
    expect(host).not.toContain("'aria-label': 'Atlas mini-diagram preview'");
  });

  it('keeps host mirrors synchronized', () => {
    expect(publicHost).toBe(host);
  });
});
