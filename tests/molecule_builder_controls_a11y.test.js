import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(rootDir, 'stem_lab', 'stem_tool_molecule.js');
const deployPath = path.join(rootDir, 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_molecule.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Molecule builder equivalent controls', () => {
  let host;
  let reactRoot;
  let config;

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_molecule.js', 'molecule');
    host = document.createElement('div');
    document.body.appendChild(host);
    reactRoot = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => reactRoot.unmount());
    host.remove();
    vi.restoreAllMocks();
  });

  async function renderHarness() {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        molecule: {
          moleculeMode: 'build',
          tutorialDismissed: true,
          buildAtoms: [
            { el: 'C', x: 140, y: 150, color: '#1e293b' },
            { el: 'O', x: 240, y: 150, color: '#ef4444' },
          ],
          buildBonds: [[0, 1, 1]],
          buildBondFrom: null,
        },
      });
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => {
      reactRoot.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  async function settle() {
    await act(async () => {
      await Promise.resolve();
    });
  }

  it('exposes large keyboard-operable equivalents for small SVG actions', async () => {
    await renderHarness();

    const removeButtons = host.querySelectorAll('[data-molecule-remove-atom]');
    const cycleButton = host.querySelector('[data-molecule-cycle-bond="0"]');
    expect(removeButtons).toHaveLength(2);
    expect(removeButtons[0].className).toContain('min-h-11');
    expect(cycleButton.className).toContain('min-h-11');
    expect(cycleButton.getAttribute('aria-label')).toContain('is a single bond. Change to double');
  });

  it('cycles bond order and removes atoms through the equivalent buttons', async () => {
    await renderHarness();

    await act(async () => host.querySelector('[data-molecule-cycle-bond="0"]').click());
    await settle();
    expect(host.querySelector('[data-molecule-cycle-bond="0"]').getAttribute('aria-label'))
      .toContain('is a double bond. Change to triple');

    await act(async () => host.querySelector('[data-molecule-remove-atom="1"]').click());
    await settle();
    expect(host.querySelectorAll('[data-molecule-remove-atom]')).toHaveLength(1);
    expect(host.querySelector('[data-molecule-cycle-bond]')).toBeNull();
  });

  it('exposes an accurate pressed state for bond drawing mode', async () => {
    await renderHarness();

    const button = Array.from(host.querySelectorAll('button'))
      .find((item) => item.textContent.includes('Draw Bond'));
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await act(async () => button.click());
    await settle();

    const activeButton = Array.from(host.querySelectorAll('button'))
      .find((item) => item.textContent.includes('Exit Bond Mode'));
    expect(activeButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('documents focus visibility and preserves deploy parity', () => {
    expect(source).toContain("const isFocused = d.buildFocusedAtom === i");
    expect(source).toContain("stroke: isFocused ? '#0f172a'");
    expect(source).toContain("'data-molecule-cycle-bond': String(bondIndex)");
    expect(source).toContain("'data-molecule-remove-atom': String(atomIndex)");
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
