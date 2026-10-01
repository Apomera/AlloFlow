import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_playlab.js';
const PUBLIC_FILE = 'desktop/web-app/public/stem_lab/stem_tool_playlab.js';
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
  it('keeps source and public copies aligned', () => {
    expect(readFileSync(resolve(process.cwd(), PUBLIC_FILE), 'utf8')).toBe(readFileSync(resolve(process.cwd(), FILE), 'utf8'));
  });

  it('keeps the field-first layout contract', () => {
    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');

    expect(source).toContain('allo-playlab-field-polish-css');
    expect(source).toContain('.playlab-field-layout');
    expect(source).toContain('.playlab-field-canvas');
    expect(source).toContain('.playlab-setup-panel');
    expect(source).toContain('data-playlab-gameplan');
    expect(source).toContain('data-playlab-setup');
    expect(source).toContain('key: opts.key');
  });

  it('keeps PlayLab buttons and setup controls at accessible contrast', () => {
    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');

    expect(source).toContain('function playLabChoiceButtonStyle');
    expect(source).toContain('function playLabSecondaryButtonStyle');
    expect(source).toContain('function playLabNativeControlStyle');
    expect(source).toContain("background: sel ? accent : '#0f172a'");
    expect(source).toContain("color: sel ? activeText : '#f8fafc'");
    expect(source).toContain(".playlab-run-button:disabled{cursor:wait;background:#334155;color:#e2e8f0");
    expect(source).toContain("color: earned ? '#facc15' : '#cbd5e1'");
    expect(source).not.toContain("color: earned ? '#fbbf24' : '#475569'");
    expect(source).not.toContain("border: 'none', background: 'linear-gradient(135deg, #16a34a, #06b6d4)'");
  });

  it('renders the football field workspace without list-key warnings', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = renderPlayLab({});

    expect(html).toContain('data-playlab-field-layout="true"');
    expect(html).toContain('data-playlab-canvas="true"');
    expect(html).toContain('data-playlab-setup="true"');
    expect(html).toContain('Football setup');
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
    expect(html).toContain('data-playlab-setup="true"');
    expect(html).toContain('Chance analysis');

    const messages = err.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(messages).not.toMatch(/unique "key" prop/i);
  });
});
