import { beforeAll, describe, expect, it } from 'vitest';
import { resetStemLab, loadTool } from './helpers/stem_widgets_smoke_harness.js';

let conceptModel, lessons;
beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_geometryworld.js', 'geometryWorld');
  conceptModel = window.StemLab.geometryWorldLessonChecks.conceptModel;
  lessons = window.StemLab.geometryWorldWorksheets.presets();
});

describe('Contextual Geometry World concept primer', () => {
  it('frames the introductory mixed lesson around layers and occupied space', () => {
    const model = conceptModel(lessons.volumeExplorer, 'volumeExplorer');
    expect(model.concept).toBe('volume');
    expect(model.relationship).toMatch(/^Solid rectangular prism:/);
    expect(model.copy).toContain('square units in one layer');
    expect(model.copy).toContain('gaps or composite shapes');
    expect(model.question).toContain('all the occupied space');
  });

  it('limits the six-face formula to closed prisms and distinguishes interior faces', () => {
    const model = conceptModel(lessons.areaSurface, 'areaSurface');
    expect(model.concept).toBe('surface');
    expect(model.relationship).toMatch(/^Full closed rectangular prism:/);
    expect(model.units).toBe('square units');
    expect(model.copy).toContain('include only the faces present');
    expect(model.copy).toContain('Shared interior faces do not count');
    expect(model.copy).toContain('cubic units');
  });

  it('uses occupied parts rather than bounding-box multiplication for composites', () => {
    const model = conceptModel(lessons.compositeVolume, 'compositeVolume');
    expect(model.concept).toBe('composite');
    expect(model.relationship).toContain('non-overlapping parts');
    expect(model.relationship).toContain('minus empty space');
    expect(model.copy).toContain('gaps inside its bounding box');
    expect(model.units).toBe('cubic units');
  });

  it('separates fractional dimensions from fractional piece counts', () => {
    const edges = conceptModel(lessons.fractionVolume, 'fractionVolume');
    const pieces = conceptModel(lessons.fractionBuilder, 'fractionBuilder');
    expect(edges.concept).toBe('fraction_dimensions');
    expect(edges.relationship).toContain('including fractional edges');
    expect(pieces.concept).toBe('fraction_pieces');
    expect(pieces.copy).toContain('Piece count and occupied volume can differ');
    expect(pieces.copy).toContain('slab or wedge');
  });

  it('states the equal-length-factor condition for area and volume scaling', () => {
    const model = conceptModel(lessons.scaleUp, 'scaleUp');
    expect(model.concept).toBe('scale');
    expect(model.relationship).toContain('area \u00d7 k\u00b2; volume \u00d7 k\u00b3');
    expect(model.copy).toContain('every length changes by the same factor');
    expect(model.copy).toContain('Changing only the height');
  });

  it('infers imported learning goals without inspecting or repeating keyed answers', () => {
    const lesson = {
      title: 'A private investigation',
      objectives: [{ text: 'Compare the surface area of open containers' }],
      npcs: [{ question: { choices: ['987654 cubic units'], correct: 0 } }]
    };
    const before = JSON.stringify(lesson);
    const model = conceptModel(lesson, 'ai_custom');
    expect(model.concept).toBe('surface');
    expect(JSON.stringify(model)).not.toContain('987654');
    expect(JSON.stringify(lesson)).toBe(before);
    expect(conceptModel({ title: 'Regroup triangular wedges' }).concept).toBe('fraction_pieces');
    expect(conceptModel({ objectives: ['Find the footprint perimeter'] }).concept).toBe('perimeter');
    expect(conceptModel({ objectives: ['Compare floor area'] }).concept).toBe('area');
    expect(conceptModel({ title: 'Planet volumes', objectives: ['Measure a real shape'] }).concept).toBe('volume');
    expect(conceptModel({ title: 'Scalene triangles', objectives: ['Compare area'] }).concept).toBe('area');
    expect(conceptModel({ title: 'Arena', objectives: ['Compare angles and symmetry'] }).concept).toBe('geometry');
  });

  it('keeps mixed exploration worlds broad enough for their full learning routes', () => {
    expect(conceptModel(lessons.geometryGarden, 'geometryGarden').concept).toBe('volume');
    expect(conceptModel(lessons.geometryHarbor, 'geometryHarbor').concept).toBe('geometry');
    expect(conceptModel(lessons.skylineCity, 'skylineCity').concept).toBe('geometry');
  });

  it('provides safe concepts for free building and incomplete or unusual input', () => {
    expect(conceptModel({ sandbox: true }).concept).toBe('build');
    expect(conceptModel(null, 'constructor').concept).toBe('geometry');
    expect(conceptModel({ objectives: [null, {}, 4] }).units).toContain('degrees');
  });
});
