import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const paths = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

describe('Solar System science trust and guided evidence flow', () => {
  it('keeps the reviewed source layer and model limitations visible', () => {
    paths.forEach((path) => {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain("var SOLAR_SCIENCE_REVIEWED = 'August 2026'");
      expect(source).toContain('https://ssd.jpl.nasa.gov/planets/phys_par.html');
      expect(source).toContain('https://science.nasa.gov/solar-system/planets/');
      expect(source).toContain('https://www.iau.org/static/resolutions/Resolution_GA26-5-6.pdf');
      expect(source).toContain('data-solarsystem-science-trust');
      expect(source).toContain("label: 'Measured'");
      expect(source).toContain("label: 'Modeled'");
      expect(source).toContain("label: 'Hypothesis'");
      expect(source).toContain("the clock is simulation time—not today\\'s ephemeris");
    });
  });

  it('provides three explicit scientific lenses that open the relevant evidence view', () => {
    paths.forEach((path) => {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain('data-solarsystem-model-lenses');
      expect(source).toContain('data-solarsystem-model-lens');
      expect(source).toContain("label: 'Explore'");
      expect(source).toContain("label: 'Size scale'");
      expect(source).toContain("label: 'Orbit model'");
      expect(source).toContain("lensPatch.showVisualCompare = true");
      expect(source).toContain("lensPatch.orreryMode = true");
    });
  });

  it('guides learners through observe, compare, orbit, and explanation evidence', () => {
    paths.forEach((path) => {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain('data-solarsystem-evidence-mission');
      expect(source).toContain("id: 'observe'");
      expect(source).toContain("id: 'compare'");
      expect(source).toContain("id: 'orbit'");
      expect(source).toContain("id: 'explain'");
      expect(source).toContain('Guided evidence mission progress');
      expect(source).toContain("orr_sel: 'jupiter'");
      expect(source).toContain('Open evidence journal');
    });
  });

  it('removes overconfident or internally inconsistent science claims', () => {
    paths.forEach((path) => {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain('gravity is about 2.53x standard Earth gravity');
      expect(source).toContain('model-dependent rather than known outcomes');
      expect(source).toContain('would not guarantee a thick atmosphere or oceans');
      expect(source).toContain('thought experiment, not a literal setup');
      expect(source).not.toContain('gravity is only 2.34x');
      expect(source).not.toContain('stripped away by solar wind in months');
      expect(source).not.toContain('Days would be ~8 hours long');
      expect(source).not.toContain('Mars proves this!');
      expect(source).not.toContain('Which planet could float in water?');
    });
  });
});
