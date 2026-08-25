import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CELL_PLAY_PATHS = [
  'stem_lab/stem_tool_cell.js',
  'desktop/web-app/public/stem_lab/stem_tool_cell.js',
];

const ORGANISM_IDS = [
  'amoeba', 'paramecium', 'euglena', 'wbc', 'bacterium', 'plantcell',
  'diatom', 'volvox', 'stentor', 'tardigrade', 'spirillum',
];

describe('cell simulator organism play tutorials', () => {
  beforeEach(() => resetStemLab());

  it('keeps an organism-specific briefing for every playable model in both mirrors', () => {
    const source = readFileSync(CELL_PLAY_PATHS[0], 'utf8');
    const mirror = readFileSync(CELL_PLAY_PATHS[1], 'utf8');
    expect(mirror).toBe(source);

    const tutorialSection = source.split('var CELL_PLAY_TUTORIALS = {')[1].split('function cellPlayTutorialFor')[0];
    ORGANISM_IDS.forEach((id) => {
      expect(tutorialSection).toMatch(new RegExp('\\b' + id + ': \\{'));
    });
    expect(tutorialSection.match(/classification:/g)).toHaveLength(ORGANISM_IDS.length);
    expect(tutorialSection.match(/movement:/g)).toHaveLength(ORGANISM_IDS.length);
    expect(tutorialSection.match(/connection:/g)).toHaveLength(ORGANISM_IDS.length);
    expect(tutorialSection.match(/note:/g)).toHaveLength(ORGANISM_IDS.length);
    expect(tutorialSection).toContain("plantcell: { classification: 'Eukaryotic plant tissue cell'");
    expect(tutorialSection).toContain('stationary: true');
    const reflectionSection = source.split('var CELL_PLAY_REFLECTIONS = {')[1].split('function cellPlayTutorialFor')[0];
    ORGANISM_IDS.forEach((id) => expect(reflectionSection).toMatch(new RegExp('\\b' + id + ': ')));
    expect(reflectionSection).toContain('How does legged animal locomotion differ');
    const evidenceSection = source.split('var CELL_PLAY_EVIDENCE = {')[1].split('var CELL_PLAY_FOCUS_STRUCTURES')[0];
    ORGANISM_IDS.forEach((id) => expect(evidenceSection).toMatch(new RegExp('\\b' + id + ': ')));
    expect(evidenceSection.match(/: '/g)).toHaveLength(ORGANISM_IDS.length);
  });

  it('renders a clear mobile-friendly mission briefing and learning link for a moving organism', () => {
    CELL_PLAY_PATHS.forEach((filePath) => {
      resetStemLab();
      loadTool(filePath, 'cell');
      const html = renderTool('cell', { cell: {
        mode: 'play',
        selectedOrganism: 'amoeba',
        playAsOrganism: 'amoeba',
        showPlayInstructions: true,
      } });

      expect(html).toContain('60-second mission briefing: Amoeba');
      expect(html).toContain('1  |  Mission: Phagocytosis');
      expect(html).toContain('2  |  Control the biology');
      expect(html).toContain('3  |  Learning link');
      expect(html).toContain('4  |  Predict, then explain');
      expect(html).toContain('Engulf 3 green food particles.');
      expect(html).toContain('data-cell-direction-pad="true"');
      expect(html).toContain('data-cell-play-hud="true"');
      expect(html).toContain('data-cell-target-legend="true"');
      expect(html).toContain('data-cell-mission-progress="true"');
      expect(html).toContain('data-cell-mission-checkpoint="true"');
      expect(html).toContain('data-cell-organism-chooser="true"');
      expect(html).toContain('data-cell-learning-link="true"');
      expect(html).toContain('How the gameplay teaches the biology');
      expect(html).toContain('Control \u2192 Observe \u2192 Explain');
      expect(html).toContain('0/3 evidence');
      expect(html).toContain('Current player');
      expect(html).toContain('data-cell-mastery-summary="true"');
      expect(html).toContain('0 / 11 missions complete');
      expect(html).not.toContain('aria-label="Cell type visibility filters"');
    });
  });

  it('surfaces biology evidence, saved mastery, and the next unfinished organism', () => {
    CELL_PLAY_PATHS.forEach((filePath) => {
      resetStemLab();
      loadTool(filePath, 'cell');
      const html = renderTool('cell', { cell: {
        mode: 'play',
        selectedOrganism: 'amoeba',
        playAsOrganism: 'amoeba',
        showPlayInstructions: false,
        playMission: { organismId: 'amoeba', startSuccess: 9, reflected: true },
        playFeedback: {
          organismId: 'amoeba',
          count: 3,
          text: 'Particle engulfed: pseudopods model phagocytosis.',
          evidenceComplete: true,
        },
        _cellExt: {
          successByOrganism: { amoeba: 12 },
          completedMissions: { amoeba: true },
        },
      } });

      expect(html).toContain('data-cell-evidence-feedback="true"');
      expect(html).toContain('What just happened biologically?');
      expect(html).toContain('Evidence 3/3');
      expect(html).toContain('1 / 11 missions complete');
      expect(html).toContain('data-cell-mission-mastered="amoeba"');
      expect(html).toContain('Next: Paramecium');
    });
  });

  it('uses inspection rather than movement for plant cells and wires all play feedback paths', () => {
    resetStemLab();
    loadTool(CELL_PLAY_PATHS[0], 'cell');
    const plantHtml = renderTool('cell', { cell: {
      mode: 'play',
      selectedOrganism: 'plantcell',
      playAsOrganism: 'plantcell',
      showPlayInstructions: true,
    } });
    expect(plantHtml).toContain('60-second mission briefing: Plant Cell');
    expect(plantHtml).toContain('Locate 3 different structures.');
    expect(plantHtml).toContain('inspection controls instead of movement controls');
    expect(plantHtml).not.toContain('data-cell-direction-pad="true"');

    CELL_PLAY_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain("var spd = def.id === 'plantcell' ? 0 : def.speed * 1.5;");
      expect(source).toContain("activeTutorial.targetKind === 'food' || activeTutorial.targetKind === 'pathogen'");
      expect(source).toContain("activeTutorial.targetKind === 'light'");
      expect(source).toContain('function rewardPlantStructure(o, anatomy)');
      expect(source).toContain('canvasEl._cellSimMoveKey = function (key, pressed)');
      expect(source).toContain('A short fading path makes movement style and direction easier to read.');
      expect(source).toContain('successByOrganism: {}');
      expect(source).toContain('function beginCellPlayMission(organismId)');
      expect(source).toContain('function recordCellPlayReflection(organismId)');
      expect(source).toContain("canvasEl._cellSimSetPlayAs = function (orgId, resetMission)");
      expect(source).toContain("height: '680px'");
      expect(source).toContain('completedMissions: {}');
      expect(source).toContain('nextExt.completedMissions[organismId] = true');
      expect(source).toContain('cel.playFeedback = {');
      expect(source).toContain('var CELL_PLAY_EVIDENCE = {');
      expect(source).toContain('data-cell-evidence-feedback');
    });
  });
});
