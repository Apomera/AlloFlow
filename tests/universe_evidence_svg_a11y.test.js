import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_universe.js');
const publicPath = path.join(process.cwd(), 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_universe.js');

const evidenceThreads = [
  ['redshift', 'Expansion From Redshift'],
  ['cmb', 'CMB Afterglow'],
  ['lensing', 'Dark Matter By Lensing'],
  ['candles', 'Supernova Distance Ladder'],
  ['blackholes', 'Black-Hole Evidence']
];

beforeEach(() => resetStemLab());

describe('Universe evidence graphic accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it.each(evidenceThreads)('names the %s evidence SVG in rendered output', (id, title) => {
    loadTool('stem_lab/stem_tool_universe.js', 'universe');
    const html = renderTool('universe', { universe: { cosmicEvidenceThread: id, tutorialDone: true } });
    expect(html).toContain(`role="img" aria-label="${title} visual evidence signal"`);
  });

  it('defines the role and accessible name at every SVG boundary', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const explicitNames = source.match(/React\.createElement\("svg", Object\.assign\(\{\}, commonProps, \{ role: "img", "aria-label": thread\.title \+ " visual evidence signal" \}\),/g) || [];
    expect(explicitNames).toHaveLength(5);
    expect(source).not.toContain('React.createElement("svg", commonProps,');
  });
});
