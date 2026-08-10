import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(file, 'utf8');

describe('STEM static canvas accessibility contract', () => {
  it('marks Heat Lab charts as named static images with descriptions', () => {
    const source = read('stem_lab/stem_tool_heatlab.js');
    expect((source.match(/data-a11y-static/g) || []).length).toBe(3);
    expect(source).toContain("'aria-describedby': 'ht-cooling-curve-description'");
    expect(source).toContain("'aria-describedby': 'ht-heating-curve-description'");
    expect(source).toContain("'aria-describedby': 'ht-entropy-description'");
  });

  it('marks Nuclear Lab chart outputs as static and keeps the reactor reading description', () => {
    const source = read('stem_lab/stem_tool_nuclearlab.js');
    expect((source.match(/data-a11y-static/g) || []).length).toBe(8);
    ['nk-decay-description', 'nk-chain-description', 'nk-binding-description', 'nk-bio-description', 'nk-count-description', 'nk-protect-summary', 'nk-shelter-summary', 'rx-live-readings'].forEach((id) => {
      expect(source).toContain("'aria-describedby': '" + id + "'");
      expect(source).toContain("id: '" + id + "'");
    });
  });

  it('marks only non-interactive Moon Mission views as static', () => {
    const source = read('stem_lab/stem_tool_moonmission.js');
    expect((source.match(/data-a11y-static/g) || []).length).toBe(5);
    expect(source).toContain("'aria-describedby': 'mm-profile-description'");
    expect(source).toContain("'aria-describedby': 'mm-launch-description'");
    expect(source).toContain("'aria-describedby': 'mm-earth-orbit-description'");
    expect(source).toContain("'aria-describedby': 'mm-transit-description'");
    expect(source).toContain("'aria-describedby': 'mm-lunar-orbit-description'");
    expect(source).toContain("role: 'application'");
  });

  it('marks Beehive visual canvases as supplementary images with equivalent controls', () => {
    const source = read('stem_lab/stem_tool_beehive.js');
    expect((source.match(/data-a11y-static/g) || []).length).toBe(2);
    expect(source).toContain("'data-beehive-canvas': 'true'");
    expect(source).toContain("'data-beehive-queen-canvas': 'true'");
    expect(source).toContain("data-beehive-scene-actions");
  });

  it('keeps persistent STEM labels at the 10px minimum', () => {
    for (const file of ['stem_tool_dna.js', 'stem_tool_lifeskills.js', 'stem_tool_probability.js', 'stem_tool_geologyexplorer.js', 'stem_tool_beehive.js']) {
      expect(read('stem_lab/' + file)).not.toMatch(/text-\[(?:8|9)px\]/);
    }
  });

  it('keeps the deploy mirrors aligned with the canonical static-canvas fixes', () => {
    for (const file of ['stem_tool_heatlab.js', 'stem_tool_nuclearlab.js', 'stem_tool_moonmission.js']) {
      const canonical = read('stem_lab/' + file);
      const mirror = read('desktop/web-app/public/stem_lab/' + file);
      expect((mirror.match(/data-a11y-static/g) || []).length).toBe((canonical.match(/data-a11y-static/g) || []).length);
      expect((mirror.match(/aria-describedby/g) || []).length).toBe((canonical.match(/aria-describedby/g) || []).length);
    }
  });
});
