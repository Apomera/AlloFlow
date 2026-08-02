import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_titration.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_titration.js';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

describe('Titration Lab WCAG affordances', () => {
  it('keeps the source and public mirrors byte-identical', () => {
    const source = read(sourcePath);
    const mirror = read(publicPath);
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('provides pause and extension controls for the timed safety drill', () => {
    const source = read(sourcePath);
    expect(source).toContain('var drillPaused = !!d.drillPaused;');
    expect(source).toContain('drillExtraSeconds: drillExtraSeconds + 15');
    expect(source).toContain('drillPaused: true, drillPausedTimeLeft: drillTimeLeft');
    expect(source).toContain('drillPaused: false,');
    expect(source).toContain('aria-label": drillPaused');
    expect(source).toContain('stem.titration.add_fifteen_seconds');
    expect(source).toContain('aria-pressed": drillPaused');
  });

  it('names the diagrams and scopes the observation table headers', () => {
    const source = read(sourcePath);
    expect(source).toContain('stem.titration.safety_equipment_map');
    expect(source).toContain('stem.titration.safety_drill_countdown');
    expect(source).toContain('stem.titration.flask_diagram');
    expect(source).toContain("scope: 'col'");
  });
});
