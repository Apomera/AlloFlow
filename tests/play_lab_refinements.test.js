import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_playlab.js';
const TOOL_ID = 'playlab';

function loadPlayLab() {
  resetStemLab();
  return loadTool(FILE, TOOL_ID);
}

function renderPlayLab(state) {
  loadPlayLab();
  return renderTool(TOOL_ID, state || {});
}

function soccerState() {
  return {
    playlab: {
      sport: 'soccer',
      formationId: '433',
      conceptId: 'tikitaka',
      shapeId: 'midblock',
      playId: 'slant',
      coverageId: 'cover2',
      savedPlays: [],
      customPositions: {},
      badgesEarned: {},
      drillStats: {},
      showRoutes: true,
      showOpen: true,
      showXG: true,
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Play Lab refinements', () => {
  it('keeps the field-first layout contract', () => {
    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');

    expect(source).toContain('allo-playlab-field-polish-css');
    expect(source).toContain('.playlab-field-layout');
    expect(source).toContain('.playlab-field-canvas');
    expect(source).toContain('data-playlab-gameplan');
    expect(source).toContain('key: opts.key');
  });

  it('renders the football field workspace without list-key warnings', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = renderPlayLab({});

    expect(html).toContain('data-playlab-field-layout="true"');
    expect(html).toContain('data-playlab-canvas="true"');
    expect(html).toContain('Run Play');

    const messages = err.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(messages).not.toMatch(/unique "key" prop/i);
  });

  it('renders the soccer field workspace without list-key warnings', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = renderPlayLab(soccerState());

    expect(html).toContain('Soccer Tactics');
    expect(html).toContain('data-playlab-field-layout="true"');
    expect(html).toContain('data-playlab-canvas="true"');

    const messages = err.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(messages).not.toMatch(/unique "key" prop/i);
  });
});
