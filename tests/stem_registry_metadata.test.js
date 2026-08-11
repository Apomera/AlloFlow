import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(file, 'utf8');

const tools = {
  accessLens: ['stem_tool_accesslens.js', 'accessibility'],
  archStudio: ['stem_tool_archstudio.js', 'engineering'],
  circuitShelf: ['stem_tool_circuitshelf.js', 'engineering'],
  codingPlayground: ['stem_tool_coding.js', 'creative'],
  cyberDefense: ['stem_tool_cyberdefense.js', 'technology'],
  dataLab: ['stem_tool_datalab.js', 'data'],
  dinoLab: ['stem_tool_dinolab.js', 'biology'],
  evoLab: ['stem_tool_evolab.js', 'biology'],
  geologyExplorer: ['stem_tool_geologyexplorer.js', 'geology'],
  geometryWorld: ['stem_tool_geometryworld.js', 'math'],
  moleculeShelf: ['stem_tool_moleculeshelf.js', 'chemistry'],
  nutritionLab: ['stem_tool_nutritionlab.js', 'biology'],
  simShelf: ['stem_tool_simshelf.js', 'science'],
  timelineStudio: ['stem_tool_timeline.js', 'history'],
  weldLab: ['stem_tool_weldlab.js', 'engineering'],
  zoomGallery: ['stem_tool_zoomgallery.js', 'creative']
};

function configSource(source, id) {
  const start = source.indexOf("registerTool('" + id + "', {");
  expect(start).toBeGreaterThanOrEqual(0);
  const ends = ['\n    questHooks:', '\n    render:', '\n    init:']
    .map((marker) => source.indexOf(marker, start))
    .filter((index) => index >= 0);
  return source.slice(start, Math.min(...ends));
}

describe('STEM registry metadata contract', () => {
  it('gives every previously flagged tool a useful description, category, and aliases', () => {
    for (const [id, [file, category]] of Object.entries(tools)) {
      const config = configSource(read('stem_lab/' + file), id);
      expect(config).toMatch(/desc:\s*['"][^'"]{12,}['"]/, id + ' description');
      expect(config).toContain("category: '" + category + "'");
      expect(config).toMatch(/aliases:\s*\[[^\]]+\]/, id + ' aliases');
    }
  });

  it('keeps the deploy mirror metadata aligned', () => {
    for (const [id, [file]] of Object.entries(tools)) {
      const canonical = configSource(read('stem_lab/' + file), id);
      const mirror = configSource(read('desktop/web-app/public/stem_lab/' + file), id);
      expect(mirror).toContain("category: '" + (canonical.match(/category:\s*'([^']+)'/) || [])[1] + "'");
      expect((mirror.match(/aliases:/g) || []).length).toBe(1);
      expect((canonical.match(/aliases:/g) || []).length).toBe(1);
    }
  });
});
