import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const originalMatchMedia = window.matchMedia;
const originalThree = window.THREE;
const originalAlloModules = window.AlloModules;
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeThree() {
  class Scene {
    constructor() {
      this.children = [];
    }
    add(item) {
      this.children.push(item);
    }
    remove(item) {
      this.children = this.children.filter((entry) => entry !== item);
    }
    traverse() {}
  }
  class PerspectiveCamera {
    constructor() {
      this.position = { set: vi.fn() };
      this.lookAt = vi.fn();
    }
  }
  class WebGLRenderer {
    constructor() {
      this.setSize = vi.fn();
      this.render = vi.fn();
      this.dispose = vi.fn();
      this.forceContextLoss = vi.fn();
    }
  }
  class DirectionalLight {
    constructor() {
      this.position = { set: vi.fn() };
    }
  }
  return {
    Scene,
    Color: class Color {},
    PerspectiveCamera,
    WebGLRenderer,
    AmbientLight: class AmbientLight {},
    DirectionalLight,
    GridHelper: class GridHelper {},
  };
}

function makePrim3D() {
  return {
    PRESETS: [{ id: 'robot', label: 'Robot', emoji: '\uD83E\uDD16' }],
    SHAPES: ['box'],
    normalizeRecipe: (recipe) => recipe,
    getPreset: () => ({ name: 'Robot', parts: [{ shape: 'box', color: '#ff0000' }] }),
    buildObject: () => ({ traverse: () => {} }),
    addPart: (_recipe, shape) => ({ name: 'Custom', parts: [{ shape, color: '#ff0000' }] }),
  };
}

function parse(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

describe('Art Studio home and workspace accessibility', () => {
  let config;
  let mountedHost;
  let mountedRoot;

  beforeEach(() => {
    resetStemLab();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    window.THREE = makeThree();
    window.AlloModules = { ...(originalAlloModules || {}), Prim3D: makePrim3D() };
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
  });

  afterEach(async () => {
    if (mountedRoot) await act(async () => mountedRoot.unmount());
    if (mountedHost) mountedHost.remove();
    vi.restoreAllMocks();
    window.THREE = originalThree;
    window.AlloModules = originalAlloModules;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('opens on an intent-led Home with six named starting points and no latent workspace', () => {
    const host = parse(renderTool('artStudio', {}));
    const home = host.querySelector('[data-artstudio-home="true"]');
    const hero = home.querySelector('section[aria-labelledby="artstudio-home-title"]');
    const starts = home.querySelector('section[aria-labelledby="artstudio-starting-points-title"]');
    const startButtons = [...starts.querySelectorAll('button[aria-label]')];

    expect(hero.querySelector('#artstudio-home-title').textContent).toBe('What do you want to make?');
    expect(home.querySelector('[role="group"][aria-label="Studio lenses"]')).not.toBeNull();
    expect(startButtons).toHaveLength(6);
    expect(startButtons.map((button) => button.getAttribute('aria-label').split('.')[0])).toEqual([
      'Paint something',
      'Make pixel art',
      'Create a pattern',
      'Build in 3D',
      'Explore an artist',
      'Design accessible color',
    ]);
    expect(startButtons.every((button) => button.type === 'button')).toBe(true);
    expect(home.querySelector('[role="tablist"]')).toBeNull();
    expect(home.querySelector('[role="tabpanel"]')).toBeNull();
    expect(home.querySelector('canvas')).toBeNull();
  });

  it('activates Design accessible color as a complete, announced workspace state', async () => {
    let latest;
    const narrate = vi.fn();
    mountedHost = document.createElement('div');
    document.body.appendChild(mountedHost);
    mountedRoot = ReactDOMClient.createRoot(mountedHost);

    function Harness() {
      const [toolData, setToolData] = React.useState({});
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, canvasNarrate: narrate }));
    }

    await act(async () => {
      mountedRoot.render(React.createElement(Harness));
      await Promise.resolve();
    });
    const path = mountedHost.querySelector('button[aria-label^="Design accessible color."]');

    await act(async () => {
      path.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(latest.artStudio).toMatchObject({
      tab: 'contrast',
      artNavGroup: 'perception',
      studioHome: false,
      studioStarted: true,
    });
    expect(mountedHost.querySelector('[data-artstudio-home="true"]')).toBeNull();
    expect(mountedHost.querySelector('#artstudio-mobile-tool-picker').value).toBe('contrast');
    expect(mountedHost.querySelector('[role="tab"][aria-selected="true"]').id).toBe('artstudio-tab-contrast');
    expect(mountedHost.querySelector('[role="tabpanel"]:not([hidden])').id).toBe('artstudio-panel-contrast');
    expect(narrate).toHaveBeenCalledWith(
      'artStudio',
      'studioStart',
      'Opened Design accessible color.',
      { debounce: 300 },
    );
  });

  it('provides a touch-sized mobile picker and a wrapping desktop group navigator', () => {
    const host = parse(renderTool('artStudio', {
      artStudio: { tab: 'watercolor', studioHome: false },
    }));
    const nav = host.querySelector('nav[data-artstudio-grouped-nav="true"]');
    const picker = nav.querySelector('#artstudio-mobile-tool-picker');
    const mobileWrapper = picker.parentElement;
    const groupBar = nav.querySelector('[role="group"][aria-label="Art Studio tool groups"]');
    const desktopWrapper = groupBar.parentElement;
    const tablist = nav.querySelector('#artstudio-group-tools[role="tablist"]');

    expect(nav.getAttribute('aria-label')).toBe('Art Studio sections');
    expect(nav.querySelector('label[for="artstudio-mobile-tool-picker"]')).not.toBeNull();
    expect(picker.value).toBe('watercolor');
    expect(picker.classList.contains('min-h-[44px]')).toBe(true);
    expect(picker.querySelectorAll('optgroup')).toHaveLength(6);
    expect(picker.querySelectorAll('option')).toHaveLength(18);
    expect(mobileWrapper.classList.contains('sm:hidden')).toBe(true);
    expect(desktopWrapper.classList.contains('hidden')).toBe(true);
    expect(desktopWrapper.classList.contains('sm:block')).toBe(true);
    expect(groupBar.querySelectorAll('button[type="button"]')).toHaveLength(6);
    expect(groupBar.classList.contains('grid-cols-3')).toBe(true);
    expect(groupBar.classList.contains('lg:grid-cols-6')).toBe(true);
    expect(tablist.classList.contains('flex-wrap')).toBe(true);
  });

  it('keeps every tab IDREF valid and contains the Watercolor canvas and controls in its panel', () => {
    const host = parse(renderTool('artStudio', {
      artStudio: { tab: 'watercolor', studioHome: false },
    }));
    const tabs = [...host.querySelectorAll('[role="tab"]')];
    const activeTab = host.querySelector('[role="tab"][aria-selected="true"]');
    const panels = [...host.querySelectorAll('[role="tabpanel"]')];
    const visiblePanels = panels.filter((panel) => !panel.hidden);

    for (const tab of tabs) {
      const panelId = tab.getAttribute('aria-controls');
      const controlledPanel = panelId && host.querySelector('#' + panelId);
      expect(controlledPanel, tab.id + ' must control an existing tabpanel').not.toBeNull();
      expect(controlledPanel.getAttribute('aria-labelledby')).toBe(tab.id);
    }

    expect(activeTab.id).toBe('artstudio-tab-watercolor');
    expect(activeTab.getAttribute('aria-controls')).toBe('artstudio-panel-watercolor');
    expect(visiblePanels).toHaveLength(1);
    expect(visiblePanels[0].id).toBe('artstudio-panel-watercolor');
    expect(visiblePanels[0].querySelector('#watercolorCanvas')).not.toBeNull();
    expect(visiblePanels[0].querySelector('[role="group"][aria-label="Core watercolor controls"]')).not.toBeNull();
  });

  it('describes Sculpt as spatial composition rather than an unrelated color-history fact', () => {
    const host = parse(renderTool('artStudio', {
      artStudio: {
        tab: 'sculpt3d',
        studioHome: false,
        sculptRecipe: { name: 'Robot', parts: [{ shape: 'box', color: '#ff0000' }] },
      },
    }, { callGemini: vi.fn() }));
    const intro = host.querySelector('[data-artstudio-tab-intro="true"]');

    expect(intro.querySelector('h3').textContent).toBe('3D Sculpture — form, balance, and space');
    expect(intro.querySelector('p').textContent).toContain('silhouette, balance, negative space, scale');
    expect(intro.textContent).not.toContain('Newton');
    expect(host.querySelector('#artstudio-panel-sculpt3d').contains(intro)).toBe(true);
  });
});
