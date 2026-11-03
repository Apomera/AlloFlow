import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
const { act } = React;

// Exercise the guide without starting its 3D animation loops.
const source = readFileSync(process.env.ISS_STATION_SOURCE || 'stem_lab/stem_tool_spacestation.js', 'utf8');
const guideStart = source.indexOf('  var ISS_COMPONENT_GUIDE =');
const guideEnd = source.indexOf('  // ── Inside the station', guideStart);
const modulesMatch = source.match(/  var MODULES = ([\s\S]*?\n  \]);/);
if (guideStart < 0 || guideEnd < guideStart || !modulesMatch) {
  throw new Error('Space Station component guide or module inventory is missing from the source');
}
const { entries, Guide, modules } = runInNewContext(
  `var MODULES = ${modulesMatch[1]};\n` + source.slice(guideStart, guideEnd) +
  '\n({entries:ISS_COMPONENT_GUIDE,Guide:IssComponentGuide,modules:MODULES});',
  { document, ISS_TRUSS_Y: 0 }, { filename: 'space-station-component-guide.js' }
);
const byId = Object.fromEntries(entries.map(entry => [entry.id, entry]));
const entryText = entry => [entry.purpose, entry.science, entry.connection, entry.model,
  entry.milestone.date, entry.milestone.text, entry.metric.value, entry.metric.label].join(' ');
const moduleIds = ['zarya', 'unity', 'zvezda', 'destiny', 'quest', 'harmony', 'columbus',
  'kibo', 'tranquility', 'cupola', 'leonardo', 'nauka', 'truss'];
const officialDomains = ['nasa.gov', 'esa.int', 'jaxa.jp', 'asc-csa.gc.ca', 'roscosmos.ru',
  'energia.ru', 'asi.it', 'spacex.com', 'northropgrumman.com', 'ams02.space', 'home.cern'];

const fixtures = [];
let previousActEnvironment;
beforeAll(() => {
  previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });
afterEach(() => {
  for (const { root, host } of fixtures.splice(0)) {
    // jsdom retains styles from removed subtrees; direct removal releases them.
    host.querySelectorAll('style').forEach(style => style.remove());
    act(() => root.unmount());
    host.remove();
  }
});

function mountGuide(overrides = {}) {
  const host = document.createElement('div');
  host.setAttribute('data-iss-map', '');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  fixtures.push({ root, host });
  const onModuleSelect = vi.fn();
  const blueprint = vi.fn(id => React.createElement('div', { 'data-guide-blueprint': id }));
  let props = { React, moduleId: 'zarya', onModuleSelect, blueprint, ...overrides };
  const render = next => {
    props = { ...props, ...next };
    act(() => root.render(React.createElement(Guide, props)));
  };
  render();
  return {
    host, render, onModuleSelect, blueprint,
    topic: () => host.querySelector('[data-iss-component-guide]').getAttribute('data-iss-component-guide'),
    choose(id) {
      const select = host.querySelector('select');
      act(() => {
        select.value = id;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
    },
    click(selector) {
      const control = host.querySelector(selector);
      expect(control, selector).not.toBeNull();
      act(() => control.click());
    }
  };
}

function addCamera(view) {
  const stage = document.createElement('div');
  stage.className = 'iss-station-stage';
  const canvas = document.createElement('canvas');
  canvas.tabIndex = 0;
  canvas._issFocusModule = vi.fn();
  canvas._issFitCamera = vi.fn();
  stage.scrollIntoView = vi.fn();
  stage.appendChild(canvas);
  view.host.appendChild(stage);
  return canvas;
}

describe('Space Station component guide evidence', () => {
  it('covers every modeled module, the separate Prichal hub, all visitors and twelve hardware topics', () => {
    expect(entries).toHaveLength(29);
    expect(new Set(entries.map(entry => entry.id)).size).toBe(29);
    expect(modules.map(module => module.id).sort()).toEqual([...moduleIds].sort());
    const linked = entries.filter(entry => Object.hasOwn(entry, 'moduleId'));
    expect(linked.map(entry => entry.moduleId).sort()).toEqual([...moduleIds].sort());
    expect(linked.every(entry => entry.id === entry.moduleId)).toBe(true);
    expect(byId.prichal.group).toBe('Modules');
    expect(Object.hasOwn(byId.prichal, 'moduleId')).toBe(false);
    expect(entries.filter(entry => entry.group === 'Visitors').map(entry => entry.id).sort())
      .toEqual(['cygnus', 'dragon', 'progress']);
    expect(entries.filter(entry => !['Modules', 'Visitors'].includes(entry.group)).map(entry => entry.id).sort())
      .toEqual(['ams02', 'arrays', 'canadarm2', 'cmgs', 'comms', 'docking', 'earth', 'elc', 'irosa', 'power-storage', 'radiators', 'shields']);
  });

  it('gives each topic meaningful context, a dated milestone, a model limit and primary references', () => {
    for (const entry of entries) {
      for (const key of ['name', 'tag', 'purpose', 'science', 'connection', 'model']) {
        expect(typeof entry[key], `${entry.id}.${key}`).toBe('string');
        expect(entry[key].trim().length, `${entry.id}.${key}`).toBeGreaterThan(3);
      }
      for (const [part, keys] of [['metric', ['value', 'label']], ['milestone', ['date', 'text']]]) {
        for (const key of keys) expect(String(entry[part][key]).trim().length, `${entry.id}.${part}.${key}`).toBeGreaterThan(0);
      }
      if (entry.id === 'earth') {
        expect(entry.milestone.date).toMatch(/(?:about|roughly|approximately).*92\s*minutes/i);
        expect(entry.milestone.text).toMatch(/altitude/i);
      } else expect(entry.milestone.date, entry.id).toMatch(/\b(?:19|20)\d{2}\b/);
      expect(entry.sources.length, entry.id).toBeGreaterThanOrEqual(2);
      expect(new Set(entry.sources.map(item => item.url)).size, entry.id).toBe(entry.sources.length);
      for (const item of entry.sources) {
        const url = new URL(item.url);
        expect(url.protocol, entry.id).toBe('https:');
        expect(officialDomains.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain)), item.url).toBe(true);
        expect(item.label.trim().length, entry.id).toBeGreaterThan(3);
      }
    }
  });

  it('distinguishes the verified Columbus exposure result and the dated water-recovery demonstration', () => {
    const columbus = entryText(byId.columbus);
    expect(columbus).toMatch(/lichen/i);
    expect(columbus).toMatch(/18\s*months/i);
    expect(columbus).not.toMatch(/tardigrade/i);
    expect(JSON.stringify(modules.find(module => module.id === 'columbus'))).not.toMatch(/tardigrade/i);
    const water = entryText(byId.tranquility);
    expect(water).toMatch(/98\s*%/);
    expect(water).toMatch(/2023/);
    expect(water).toMatch(/demonstrat/i);
    expect(water).toMatch(/brine/i);
  });

  it('keeps window diameter, original wing count and truss length distinct from array span', () => {
    expect(entryText(byId.cupola)).toMatch(/80\s*cm/);
    const arrays = entryText(byId.arrays);
    expect(arrays).toMatch(/\b(?:8|eight)\b/i);
    expect(arrays).toMatch(/wing/i);
    const truss = entryText(byId.truss);
    expect(truss).toMatch(/94\s*m\b/);
    expect(truss).toMatch(/109\s*m\b/);
    expect(truss).toMatch(/span/i);
  });

  it('labels the CMG caution as a teaching limit and keeps Nauka and Prichal milestones separate', () => {
    expect(byId.cmgs.model).toMatch(/80\s*%/);
    expect(byId.cmgs.model).toMatch(/classroom|teaching|simplified/i);
    expect(byId.nauka.milestone.date).toMatch(/(?:July.*29|29.*July).*2021/);
    expect(byId.prichal.milestone.date).toMatch(/(?:November.*26|26.*November).*2021/);
    expect(byId.nauka.milestone.text).toMatch(/dock/i);
    expect(byId.prichal.milestone.text).toMatch(/dock/i);
    expect(entryText(byId.prichal)).toMatch(/November\s+24|24\s+November/);
    expect(entryText(byId.nauka)).not.toMatch(/minutes after docking|1\.5 turns/i);
  });
});

describe('Space Station component guide controls', () => {
  it('renders a labeled native selector and keeps hardware reading local to the guide', () => {
    const view = mountGuide();
    const select = view.host.querySelector('select');
    expect(view.host.querySelector(`label[for="${select.id}"]`).textContent).toMatch(/component/i);
    expect(select.querySelectorAll('option')).toHaveLength(29);
    view.choose('cmgs');
    expect(view.topic()).toBe('cmgs');
    expect(view.host.querySelector('[data-iss-guide-title]').textContent).toBe(byId.cmgs.name);
    expect(view.host.querySelector('[data-iss-guide-purpose]').textContent).toBe(byId.cmgs.purpose);
    expect(view.onModuleSelect).not.toHaveBeenCalled();
    expect(view.host.querySelector('[data-guide-blueprint]')).toBeNull();
    expect(view.host.querySelector('figure svg[role="img"]').getAttribute('aria-label')).toContain(byId.cmgs.name);
    view.choose('prichal');
    expect(view.topic()).toBe('prichal');
    expect(view.onModuleSelect).not.toHaveBeenCalled();
    view.render({ moduleId: 'zarya' });
    expect(view.topic()).toBe('prichal'); // unrelated parent rerenders keep the learner's place
  });

  it('selects actual module IDs and follows a later selection made in the parent map', () => {
    const view = mountGuide();
    view.choose('quest');
    expect(view.onModuleSelect.mock.calls).toEqual([['quest']]);
    expect(view.host.querySelector('[data-guide-blueprint]').getAttribute('data-guide-blueprint')).toBe('quest');
    view.choose('arrays');
    view.render({ moduleId: 'cupola' });
    expect(view.topic()).toBe('cupola');
    expect(view.host.querySelector('select').value).toBe('cupola');
    expect(view.onModuleSelect.mock.calls).toEqual([['quest']]);
    expect(view.blueprint).toHaveBeenLastCalledWith('cupola');
    view.choose('cmgs');
    view.render({ moduleId: 'cupola', readRequest: 1 });
    expect(view.topic()).toBe('cupola'); // selecting the same map module explicitly reopens its reading
    expect(view.onModuleSelect.mock.calls).toEqual([['quest']]);
  });

  it('keeps previous and next navigation within the available topics', () => {
    const view = mountGuide({ moduleId: entries[0].id });
    const previous = '[aria-label="Previous component"]', next = '[aria-label="Next component"]';
    expect(view.host.querySelector(previous).disabled).toBe(true);
    view.click(previous);
    expect(view.topic()).toBe(entries[0].id);
    view.click(next);
    expect(view.topic()).toBe(entries[1].id);
    view.choose(entries.at(-1).id);
    expect(view.host.querySelector(next).disabled).toBe(true);
    view.click(next);
    expect(view.topic()).toBe(entries.at(-1).id);
    view.click(previous);
    expect(view.topic()).toBe(entries.at(-2).id);
  });

  it('renders every topic with its own sources, model scope and appropriate schematic', () => {
    const view = mountGuide();
    for (const entry of entries) {
      view.choose(entry.id);
      expect(view.topic()).toBe(entry.id);
      expect(view.host.querySelector('.iss-guide-model p').textContent).toBe(entry.model);
      const links = Array.from(view.host.querySelectorAll('.iss-guide-sources a'));
      expect(links.map(link => link.getAttribute('href'))).toEqual(Array.from(entry.sources, item => item.url));
      for (const link of links) {
        expect(link.target).toBe('_blank');
        expect(link.rel.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
      }
      expect(Boolean(view.host.querySelector('[data-guide-blueprint]'))).toBe(Boolean(entry.moduleId));
      expect(Boolean(view.host.querySelector('.iss-guide-frame'))).toBe(Boolean(entry.moduleId || entry.focusId));
    }
  });

  it('frames only the selected module or an explicitly mapped hardware target', () => {
    const view = mountGuide();
    const canvas = addCamera(view);
    for (const entry of entries) {
      view.choose(entry.id);
      view.onModuleSelect.mockClear();
      canvas._issFocusModule.mockClear();
      canvas._issFitCamera.mockClear();
      const frame = view.host.querySelector('.iss-guide-frame');
      if (!entry.moduleId && !entry.focusId) {
        expect(frame, entry.id).toBeNull();
        continue;
      }
      act(() => frame.click());
      expect(view.onModuleSelect, entry.id).not.toHaveBeenCalled();
      if (entry.moduleId) {
        expect(canvas._issFocusModule.mock.calls, entry.id).toEqual([[entry.moduleId]]);
        expect(canvas._issFitCamera, entry.id).not.toHaveBeenCalled();
      } else {
        expect(canvas._issFitCamera.mock.calls, entry.id).toEqual([[entry.focusId]]);
        expect(canvas._issFocusModule, entry.id).not.toHaveBeenCalled();
      }
    }
  });

  it('keeps framing with its owning map and does not fall through to another map when its canvas is missing', () => {
    const first = mountGuide(), firstCamera = addCamera(first);
    const second = mountGuide(), secondCamera = addCamera(second);
    const firstFocus = vi.spyOn(firstCamera, 'focus'), secondFocus = vi.spyOn(secondCamera, 'focus');
    const firstStage = firstCamera.parentElement, secondStage = secondCamera.parentElement;
    second.choose('dragon');
    second.click('.iss-guide-frame');
    expect(secondCamera._issFitCamera.mock.calls).toEqual([['dragon']]);
    expect(document.activeElement).toBe(secondCamera);
    expect(secondFocus).toHaveBeenCalledWith({ preventScroll: true });
    expect(secondStage.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
    expect(firstCamera._issFitCamera).not.toHaveBeenCalled();
    expect(firstCamera._issFocusModule).not.toHaveBeenCalled();
    expect(firstFocus).not.toHaveBeenCalled();
    expect(firstStage.scrollIntoView).not.toHaveBeenCalled();
    secondFocus.mockClear();
    secondStage.scrollIntoView.mockClear();
    secondCamera.parentElement.remove();
    second.choose('quest');
    const button = second.host.querySelector('.iss-guide-frame');
    button.focus();
    second.click('.iss-guide-frame');
    expect(firstCamera._issFocusModule).not.toHaveBeenCalled();
    expect(firstCamera._issFitCamera).not.toHaveBeenCalled();
    expect(secondCamera._issFocusModule).not.toHaveBeenCalled();
    expect(secondCamera._issFitCamera).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(button);
    expect(firstFocus).not.toHaveBeenCalled();
    expect(firstStage.scrollIntoView).not.toHaveBeenCalled();
    expect(secondFocus).not.toHaveBeenCalled();
    expect(secondStage.scrollIntoView).not.toHaveBeenCalled();
  });

  it.each([
    ['destiny', '_issFocusModule'],
    ['comms', '_issFitCamera']
  ])('frames %s before focusing its native canvas and revealing its stage', (id, handler) => {
    const view = mountGuide(), canvas = addCamera(view), stage = canvas.parentElement;
    view.choose(id);
    view.onModuleSelect.mockClear();
    const order = [], nativeFocus = canvas.focus.bind(canvas);
    canvas[handler].mockImplementation(() => order.push('dispatch'));
    const focus = vi.spyOn(canvas, 'focus').mockImplementation(options => { order.push('focus'); nativeFocus(options); });
    stage.scrollIntoView.mockImplementation(() => order.push('scroll'));
    view.host.querySelector('.iss-guide-frame').focus();
    view.click('.iss-guide-frame');
    expect(canvas[handler]).toHaveBeenCalledWith(id);
    expect(order).toEqual(['dispatch', 'focus', 'scroll']);
    expect(document.activeElement).toBe(canvas);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(stage.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
    expect(view.onModuleSelect).not.toHaveBeenCalled();
  });

  it.each([
    ['destiny', '_issFocusModule'],
    ['comms', '_issFitCamera']
  ])('leaves reading focus and scrolling alone when %s camera handling is unavailable', (id, handler) => {
    const view = mountGuide(), canvas = addCamera(view), stage = canvas.parentElement;
    view.choose(id);
    view.onModuleSelect.mockClear();
    const focus = vi.spyOn(canvas, 'focus'), button = view.host.querySelector('.iss-guide-frame');
    for (const unavailable of [undefined, { not: 'callable' }]) {
      canvas[handler] = unavailable;
      button.focus();
      expect(() => view.click('.iss-guide-frame')).not.toThrow();
      expect(document.activeElement).toBe(button);
      expect(focus).not.toHaveBeenCalled();
      expect(stage.scrollIntoView).not.toHaveBeenCalled();
      expect(view.onModuleSelect).not.toHaveBeenCalled();
    }
  });

  it('remains readable without a WebGL canvas and rejects an unknown native choice', () => {
    const view = mountGuide({ moduleId: 'unrecognized-module' });
    expect(view.topic()).toBe(entries[0].id);
    view.choose('cmgs');
    view.choose('not-a-guide-topic');
    expect(view.topic()).toBe('cmgs');
    expect(view.onModuleSelect).not.toHaveBeenCalled();
    view.choose('quest');
    expect(() => view.click('.iss-guide-frame')).not.toThrow();
    expect(view.topic()).toBe('quest');
  });
});
