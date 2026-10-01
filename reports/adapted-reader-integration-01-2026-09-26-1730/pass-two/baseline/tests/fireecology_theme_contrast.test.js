import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_fireecology.js');
const publicPath = path.join(
  process.cwd(),
  'desktop',
  'web-app',
  'public',
  'stem_lab',
  'stem_tool_fireecology.js'
);

describe('Fire Ecology theme contrast', () => {
  it('keeps content surfaces theme-aware instead of mixing fixed dark panels with theme text', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const obsoleteFixedDarkSurfaces = [
      "background: expanded ? '#1e293b' : '#0f172a'",
      "background: viewed ? cs.color + '18' : '#0f172a'",
      "rgba(15,23,42,0.85)",
      "background: 'rgba(15,23,42,0.6)'",
      "background: 'rgba(15,23,42,0.7)'",
      "background: 'linear-gradient(135deg, rgba(15,23,42,1)",
      "background: '#0c1929'",
      "background: gameEvent.urgent ? '#451a03' : '#0f172a'"
    ];

    obsoleteFixedDarkSurfaces.forEach((surface) => {
      expect(source).not.toContain(surface);
    });

    expect(source).toContain(
      "'.fireecology-disclosure :where(h1,h2,h3,h4,p,div,span,strong){color:var(--fe-text)!important;}'"
    );
    expect(source).toContain(
      "background: 'var(--allo-stem-button-bg, var(--allo-stem-panel, #1e293b))'"
    );
    expect(source).toContain(
      "background: 'linear-gradient(135deg, ' + def.color + '20 0%, var(--allo-stem-canvas, #0f172a) 60%)'"
    );
  });

  it('keeps the tracked desktop mirror identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
