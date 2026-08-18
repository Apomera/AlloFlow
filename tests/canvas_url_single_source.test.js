import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// The Canvas link is held in five places that must agree. Four of five is the dangerous state,
// because the launcher looks correct while the in-app button, or a no-JavaScript visitor reading
// the raw href, still gets a dead release. This runs the same check the updater does.
const require_ = createRequire(import.meta.url);
const tool = require_(process.cwd() + '/dev-tools/set_canvas_url.cjs');

describe('canvas url single source', () => {
  it('holds exactly one link across every place that carries it', () => {
    const found = tool.sites().map((site) => ({
      label: site.label,
      url: site.get(readFileSync(site.file, 'utf8')),
    }));

    // A null here means a pattern stopped matching, which would make the updater silently skip
    // that file: the failure mode this whole check exists to prevent.
    const unreadable = found.filter((entry) => !entry.url);
    expect(unreadable.map((entry) => entry.label)).toEqual([]);

    const distinct = [...new Set(found.map((entry) => entry.url))];
    expect(distinct).toHaveLength(1);
    expect(distinct[0]).toMatch(tool.CANVAS_PATTERN);
  });

  it('covers every site the updater knows how to write', () => {
    // If a new copy of the link is added and registered for update but not for reading, drift
    // becomes invisible again. Both directions must be defined for every site.
    tool.sites().forEach((site) => {
      expect(typeof site.get).toBe('function');
      expect(typeof site.set).toBe('function');
    });
    expect(tool.sites().length).toBeGreaterThanOrEqual(5);
  });

  it('reports agreement through the same check the command line uses', () => {
    const log = console.log;
    const error = console.error;
    console.log = () => {};
    console.error = () => {};
    try {
      expect(tool.check()).toBe(0);
    } finally {
      console.log = log;
      console.error = error;
    }
  });
});
