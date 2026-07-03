import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_companionplanting.js';
const TOOL_ID = 'companionPlanting';

function loadCompanionPlanting() {
  resetStemLab();
  return loadTool(FILE, TOOL_ID);
}

function renderCompanionPlanting(toolData) {
  loadCompanionPlanting();
  return renderTool(TOOL_ID, toolData || {});
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Companion Planting refinements', () => {
  it('keeps the command-center render contract in source', () => {
    const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');

    expect(source).toContain('data-companion-tool');
    expect(source).toContain('data-companion-command');
    expect(source).toContain('data-companion-workspaces');
    expect(source).toContain('data-companion-workspace-stage');
  });

  it('renders the default Three Sisters workspace without list-key warnings', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = renderCompanionPlanting({});

    expect(html).toContain('data-companion-tool="true"');
    expect(html).toContain('data-companion-command="true"');
    expect(html).toContain('data-companion-workspaces="true"');
    expect(html).toContain('data-companion-workspace-stage="true"');
    expect(html).toContain('Quick Actions');

    const messages = consoleError.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(messages).not.toMatch(/unique "key" prop/i);
  });

  it('keeps Community Garden mode reachable without duplicating the default workspace shell', () => {
    const html = renderCompanionPlanting({
      companionPlanting: {
        gardenMode: 'community',
      },
    });

    expect(html).toContain('Community Garden Simulator');
    expect(html).toContain('Plan, plant, and manage a diverse garden ecosystem');
    expect(html).not.toContain('data-companion-command="true"');
  });
});
