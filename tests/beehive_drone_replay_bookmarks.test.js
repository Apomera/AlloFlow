import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MIRRORS = [
  'stem_lab/stem_tool_beehive.js',
  'desktop/web-app/public/stem_lab/stem_tool_beehive.js',
];

describe('Drone telemetry replay key moments', () => {
  it.each(MIRRORS)('%s exposes accessible jump points for flight evidence', (path) => {
    const source = readFileSync(resolve(process.cwd(), path), 'utf8');
    expect(source).toContain("function addReplayBookmark(id, label, index, detail)");
    expect(source).toContain("addReplayBookmark('first-hazard'");
    expect(source).toContain("addReplayBookmark('peak-altitude'");
    expect(source).toContain("addReplayBookmark('dca'");
    expect(source).toContain("'data-flight-replay-bookmarks': 'true'");
    expect(source).toContain("'data-flight-replay-bookmark': bookmark.id");
    expect(source).toContain("'aria-label': 'Jump to key flight moments'");
    expect(source).toContain("'aria-pressed': active");
    expect(source.indexOf('var xAt = function(index)')).toBeLessThan(source.indexOf('var bookmarkLines ='));
  });
});
