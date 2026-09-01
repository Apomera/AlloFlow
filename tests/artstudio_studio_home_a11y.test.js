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
const originalGetContext = window.HTMLCanvasElement.prototype.getContext;
const originalToDataURL = window.HTMLCanvasElement.prototype.toDataURL;
const originalThree = window.THREE;
const originalAlloModules = window.AlloModules;
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const canvasContextStub = new Proxy({}, { get: () => () => canvasContextStub });

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
    window.HTMLCanvasElement.prototype.getContext = function () {
      return canvasContextStub;
    };
    window.HTMLCanvasElement.prototype.toDataURL = function () {
      return 'data:image/png;base64,artstudio-test';
    };
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
    window.HTMLCanvasElement.prototype.getContext = originalGetContext;
    window.HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
  });

  it('opens on an intent-led Home with six named starting points and no latent workspace', () => {
    const host = parse(renderTool('artStudio', {}));
    const home = host.querySelector('[data-artstudio-home="true"]');
    const hero = home.querySelector('section[aria-labelledby="artstudio-home-title"]');
    const starts = home.querySelector('section[aria-labelledby="artstudio-starting-points-title"]');
    const startButtons = [...starts.querySelectorAll('button[aria-label]')];

    expect(hero.querySelector('#artstudio-home-title').textContent).toBe('What do you want to make?');
    expect(hero.querySelector('#artstudio-home-title').tagName).toBe('H2');
    expect(home.querySelector('[role="group"][aria-label="Studio lenses"]')).not.toBeNull();
    expect(home.querySelector('#artstudio-threads-title').textContent).toBe('Follow one idea through three labs');
    expect(home.querySelectorAll('section[aria-labelledby="artstudio-threads-title"] button[aria-label^="Start "]')).toHaveLength(3);
    expect(home.textContent).not.toContain('Return to your last lab');
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

  it('moves tab focus with arrow keys without loading a lab until explicit activation', async () => {
    let latest;
    mountedHost = document.createElement('div');
    document.body.appendChild(mountedHost);
    mountedRoot = ReactDOMClient.createRoot(mountedHost);

    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: { tab: 'watercolor', studioHome: false },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    await act(async () => {
      mountedRoot.render(React.createElement(Harness));
      await Promise.resolve();
    });

    const watercolorTab = mountedHost.querySelector('#artstudio-tab-watercolor');
    watercolorTab.focus();
    await act(async () => {
      watercolorTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await Promise.resolve();
    });

    const gradientTab = mountedHost.querySelector('#artstudio-tab-gradient');
    expect(document.activeElement.id).toBe('artstudio-tab-gradient');
    expect(latest.artStudio.tab).toBe('watercolor');
    expect(mountedHost.querySelector('[role="tab"][aria-selected="true"]').id).toBe('artstudio-tab-watercolor');

    await act(async () => {
      gradientTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await Promise.resolve();
    });

    expect(latest.artStudio.tab).toBe('gradient');
    expect(mountedHost.querySelector('[role="tab"][aria-selected="true"]').getAttribute('aria-label')).toBe('Gradient');
  });

  it('reports saved studies and dismisses Studio Actions with Escape', async () => {
    mountedHost = document.createElement('div');
    document.body.appendChild(mountedHost);
    mountedRoot = ReactDOMClient.createRoot(mountedHost);
    const snapshots = [
      { id: 'one', tool: 'artStudio', artStudioStudy: { schemaVersion: 1 } },
      { id: 'two', tool: 'artStudio', artStudioStudy: { schemaVersion: 1 } },
      { id: 'other', tool: 'dataStudio' },
    ];

    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: { tab: 'artistExplorer', studioHome: false },
      });
      return config.render(makeCtx({ toolData, setToolData, toolSnapshots: snapshots }));
    }

    await act(async () => {
      mountedRoot.render(React.createElement(Harness));
      await Promise.resolve();
    });

    const details = mountedHost.querySelector('details');
    const summary = details.querySelector('summary[aria-label="Studio actions"]');
    expect(mountedHost.querySelector('#artstudio-snapshot-count').textContent).toBe('2 saved studies');

    details.open = true;
    summary.focus();
    await act(async () => {
      details.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await Promise.resolve();
    });

    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });

  it('keeps every tab IDREF valid and contains the Watercolor canvas and controls in its panel', () => {
    const host = parse(renderTool('artStudio', {
      artStudio: { tab: 'watercolor', studioHome: false },
    }));
    const tabs = [...host.querySelectorAll('[role="tab"]')];
    const activeTab = host.querySelector('[role="tab"][aria-selected="true"]');
    const panels = [...host.querySelectorAll('[id^="artstudio-panel-"][role="tabpanel"]')];
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
    for (const groupName of ['Watercolor brush', 'Watercolor paper state', 'Watercolor flow direction']) {
      const group = visiblePanels[0].querySelector('[role="group"][aria-label="' + groupName + '"]');
      expect(group, groupName + ' must be named').not.toBeNull();
      expect(group.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(1);
    }
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

  it('carries a Creative Thread across labs without advancing it during free exploration', async () => {
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

    const start = mountedHost.querySelector('button[aria-label^="Start Tiny night world."]');
    await act(async () => {
      start.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    expect(latest.artStudio).toMatchObject({
      tab: 'colorWheel',
      artNavGroup: 'paint',
      studioThreadId: 'tiny-night-world',
      studioThreadStep: 0,
      studioHome: false,
    });
    let rail = mountedHost.querySelector('[data-artstudio-thread="tiny-night-world"]');
    expect(rail.querySelector('[aria-current="step"]').getAttribute('aria-label')).toContain('Choose the atmosphere, current');
    expect(mountedHost.querySelector('#artstudio-panel-colorWheel').getAttribute('aria-describedby')).toBe('artstudio-thread-current-prompt');
    expect(document.activeElement.id).toBe('artstudio-panel-colorWheel');

    const jumpAhead = rail.querySelector('button[aria-label^="Go to step 3:"]');
    await act(async () => {
      jumpAhead.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    expect(latest.artStudio.studioThreadStep).toBe(2);
    rail = mountedHost.querySelector('[data-artstudio-thread="tiny-night-world"]');
    expect(rail.querySelector('button[aria-label^="Go to step 2:"]').getAttribute('aria-label')).not.toContain('completed');

    const returnFirst = rail.querySelector('button[aria-label^="Go to step 1:"]');
    await act(async () => {
      returnFirst.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    expect(latest.artStudio.studioThreadStep).toBe(0);
    rail = mountedHost.querySelector('[data-artstudio-thread="tiny-night-world"]');
    const next = [...rail.querySelectorAll('button')].find((button) => button.textContent.includes('Save study & next'));
    await act(async () => {
      next.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    expect(latest.artStudio).toMatchObject({
      tab: 'pixel',
      artNavGroup: 'digital',
      studioThreadId: 'tiny-night-world',
      studioThreadStep: 1,
    });
    rail = mountedHost.querySelector('[data-artstudio-thread="tiny-night-world"]');
    expect(rail.querySelector('button[aria-label*="Choose the atmosphere"]').getAttribute('aria-label')).toContain('completed');
    expect(rail.querySelector('[aria-current="step"]').getAttribute('aria-label')).toContain('Reduce it to a silhouette, current');
    expect(narrate.mock.calls.some((call) => String(call[2]).includes('Make a tiny scene whose largest shapes still read'))).toBe(true);

    const picker = mountedHost.querySelector('#artstudio-mobile-tool-picker');
    await act(async () => {
      picker.value = 'gradient';
      picker.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    expect(latest.artStudio).toMatchObject({
      tab: 'gradient',
      studioThreadId: 'tiny-night-world',
      studioThreadStep: 1,
    });
    expect(mountedHost.querySelector('[data-artstudio-thread]').textContent).toContain('You are exploring Gradient');
  });

  it('opens a contextual coach, preserves its controlled ID, and restores focus on close', async () => {
    let latest;
    mountedHost = document.createElement('div');
    document.body.appendChild(mountedHost);
    mountedRoot = ReactDOMClient.createRoot(mountedHost);

    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: { tab: 'watercolor', studioHome: false },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    await act(async () => {
      mountedRoot.render(React.createElement(Harness));
      await Promise.resolve();
    });

    const learn = mountedHost.querySelector('#artstudio-learn-button');
    expect(learn.getAttribute('aria-controls')).toBe('artstudio-tour');
    expect(mountedHost.querySelector('#artstudio-tour').hidden).toBe(true);

    await act(async () => {
      learn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    const coach = mountedHost.querySelector('#artstudio-tour[role="region"]');
    expect(latest.artStudio.showTour).toBe(true);
    expect(coach.textContent).toContain('Studio coach · Watercolor');
    expect(coach.textContent).toContain('same pigment');
    expect(coach.textContent).not.toContain('Explore 28 practices');
    expect(document.activeElement.id).toBe('artstudio-coach-title');

    const close = coach.querySelector('button[aria-label="Close Studio coach"]');
    await act(async () => {
      close.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    expect(latest.artStudio.showTour).toBe(false);
    expect(mountedHost.querySelector('#artstudio-tour').hidden).toBe(true);
    expect(document.activeElement.id).toBe('artstudio-learn-button');
  });

  it('defaults Watercolor touch input to scrolling and requires an explicit finger-draw mode', async () => {
    let latest;
    mountedHost = document.createElement('div');
    document.body.appendChild(mountedHost);
    mountedRoot = ReactDOMClient.createRoot(mountedHost);

    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: { tab: 'watercolor', studioHome: false },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    await act(async () => {
      mountedRoot.render(React.createElement(Harness));
      await Promise.resolve();
    });

    let canvas = mountedHost.querySelector('#watercolorCanvas');
    const touchGroup = mountedHost.querySelector('[role="group"][aria-label="Watercolor touch interaction"]');
    const scroll = [...touchGroup.querySelectorAll('button')].find((button) => button.textContent.includes('Scroll page'));
    const draw = [...touchGroup.querySelectorAll('button')].find((button) => button.textContent.includes('Draw on paper'));

    expect(canvas.style.touchAction).toBe('pan-y');
    expect(scroll.getAttribute('aria-pressed')).toBe('true');
    expect(draw.getAttribute('aria-pressed')).toBe('false');
    expect(canvas.getAttribute('aria-describedby')).toContain('artstudio-watercolor-touch-help');
    const blockedPreventDefault = vi.fn();
    canvas.onpointerdown({
      pointerType: 'touch',
      pointerId: 1,
      clientX: 20,
      clientY: 20,
      pressure: 0.5,
      timeStamp: 1,
      preventDefault: blockedPreventDefault,
    });
    expect(blockedPreventDefault).not.toHaveBeenCalled();

    await act(async () => {
      draw.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    canvas = mountedHost.querySelector('#watercolorCanvas');
    expect(latest.artStudio.watercolorTouchMode).toBe('draw');
    expect(canvas.style.touchAction).toBe('none');
    expect(draw.getAttribute('aria-pressed')).toBe('true');
    const drawPreventDefault = vi.fn();
    canvas.onpointerdown({
      pointerType: 'touch',
      pointerId: 2,
      clientX: 24,
      clientY: 24,
      pressure: 0.5,
      timeStamp: 2,
      preventDefault: drawPreventDefault,
    });
    expect(drawPreventDefault).toHaveBeenCalledOnce();
    canvas.onpointerup();
  });
});
