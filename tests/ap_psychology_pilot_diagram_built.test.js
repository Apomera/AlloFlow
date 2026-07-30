import fs from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

const root = process.cwd();
const pack = JSON.parse(fs.readFileSync(resolve(root, 'test_prep/ap_psychology_pilot.json'), 'utf8'));
const library = JSON.parse(
  fs.readFileSync(resolve(root, 'test_prep/ap_psychology_pilot_learning_library.json'), 'utf8')
);
const builtPath = resolve(root, 'test_prep_hub_module.js');
const deployPath = resolve(root, 'desktop/web-app/public/test_prep_hub_module.js');
const builtSource = fs.readFileSync(builtPath, 'utf8');
const deploySource = fs.readFileSync(deployPath, 'utf8');
let Hub;

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useRef: (value) => ({ current: value }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  if (!Hub) throw new Error('TestPrepHub did not register');
});

describe('AP Psychology diagram adapter in built Test Prep Hub', () => {
  it('ships byte-identical source and CDN modules with the concept adapter', () => {
    expect(deploySource).toBe(builtSource);
    expect(builtSource).toContain('concept-rendered');
    expect(builtSource).toContain('alloflow-diagram-v1');
    expect(builtSource).toContain("Search this pack's available content");
    expect(builtSource).not.toContain('Search the complete released pack');
    expect(builtSource).not.toContain('No released questions or learning resources match that search.');
  });

  it('indexes AP concept diagrams through the public built-module search API', () => {
    const result = Hub.searchPack(pack, library, 'transduction', { limit: 100 });
    const diagram = result.results.find((entry) => entry.type === 'diagram');
    expect(diagram).toMatchObject({
      id: 'ap-psych-diagram-001',
      title: 'From stimulation to neural interpretation',
      domain: 'Unit 1: Biological Bases of Behavior',
      reviewStatus: 'source-reviewed-editorial-pass',
    });
    expect(diagram.snippet).toBe(library.diagrams[0].accessibility.longDescription);
    expect(result.counts.diagram).toBeGreaterThanOrEqual(1);
  });
});
