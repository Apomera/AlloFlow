import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => resetStemLab());

describe('BirdLab field progression and scene engagement', () => {
  it('renders the durable rank, daily assignment, and condition controls in I-Spy', () => {
    loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
    const html = renderTool('birdLab', {
      birdLab: {
        view: 'ispy',
        blXp: 425,
        blXpLedger: {},
        blFieldCondition: 'dusk',
      },
    });

    expect(html).toContain('Field Birder');
    expect(html).toContain('425 XP');
    expect(html).toContain('Field assignment');
    expect(html).toContain('Find the ');
    expect(html).toContain('Field conditions');
    expect(html).toContain('Dusk watch');
    expect(html).toContain('birdlab-condition-button');
    expect(html).toContain('birdlab-scene-hud--condition');
    expect(html).toContain('Target:');
    expect(html).toContain('Shape and flight behavior matter more than color');
    expect(html).toContain('role="progressbar"');
  });

  it('ships idempotent reward keys for every meaningful gameplay milestone', () => {
    const config = loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
    expect(typeof config.render).toBe('function');
    const source = config.render.toString();
    expect(source).toContain("'spot:' + habitatId + ':' + bird.species");
    expect(source).toContain("'clean:' + habitatId + ':' + difficulty");
    expect(source).toContain("'lifer:' + bird.species");
    expect(source).toContain("'daily:' + dailyKey");
    expect(source).toContain("'assignment:' + dailyChallenge.date");
  });
});
