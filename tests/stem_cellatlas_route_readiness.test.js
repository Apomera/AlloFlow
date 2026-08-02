import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_cellatlas.js';

describe('Cell Atlas evidence route readiness', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'cellAtlasLab');
  });

  it('renders the five-milestone route and a next recommended action', () => {
    const rendered = renderTool('cellAtlasLab', { cellAtlasLab: { tissue: 'pancreas', view: 'map' } });
    expect(rendered).toContain('Evidence route');
    expect(rendered).toContain('0/5 milestones');
    expect(rendered).toContain('Next recommended step');
    expect(rendered).toContain('Open the map');
  });

  it('derives route state from evidence milestones and keeps the public mirror exact', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    const mirror = fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_cellatlas.js', 'utf8');
    expect(source).toContain('var routeSteps = [');
    expect(source).toContain('done: reasoningComplete');
    expect(source).toContain("aria-valuemax': '5'");
    expect(source).toContain('function openRouteStep(step)');
    expect(source).toContain("'Core route complete'");
    expect(mirror).toBe(source);
  });
});
