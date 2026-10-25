// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { renderToStaticMarkup } = require(resolve('desktop/web-app/node_modules/react-dom/server'));
const registry = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const components = {};
beforeAll(() => {
  // Expose the actual module-local components without rewriting their bodies.
  for (const [file, names] of [
    ['stem_tool_birdlab.js', ['BirdlabResidentStudio', 'BirdlabChorusTimelineStudy', 'BirdlabNestboxStudy']],
    ['stem_tool_raptorhunt.js', ['RaptorDistanceInvitation', 'RaptorSeasonalTimingStudy', 'RaptorWingProfileStudy', 'RaptorWingDesignStudy']],
  ]) {
    const source = readFileSync('stem_lab/' + file, 'utf8');
    const end = source.lastIndexOf('})();');
    expect(end).toBeGreaterThan(0);
    const capture = '\nObject.assign(capture, {' + names.join(',') + '});\n';
    new Function('window', 'document', 'capture', source.slice(0, end) + capture + source.slice(end))(window, document, components);
  }
});
afterEach(() => { document.body.innerHTML = ''; });

describe('STEM study accessible labels use the supplied translator', () => {
  it.each([
    ['BirdlabResidentStudio', {}, 'Resident studio presentation'],
    ['BirdlabChorusTimelineStudy', { phase: 0, singer: 'robin' }, 'Follow a chorus voice'],
    ['BirdlabNestboxStudy', { species: 'robin', dimensions: { robin: { floor: 14, depth: 25, hole: 4 } } }, 'Nest box space explorer'],
    ['RaptorDistanceInvitation', {}, 'Distance detail investigation invitation'],
    ['RaptorSeasonalTimingStudy', { prey: 0, demand: 0 }, 'Chart interaction'],
    ['RaptorWingProfileStudy', { lengths: [55, 65, 80, 95, 100, 97, 90, 85, 70, 60], focus: 0, species: 0 }, 'Wing profile change explorer'],
    ['RaptorWingDesignStudy', { configuration: { mass: .95, wingspan: 1.05, wingArea: .108 }, mode: 'design', parts: {} }, 'Two generic tapered wings shown from above on an equal-scale grid. Together their polygon area equals the selected wing area. Ruler controls are below and beside the wings.'],
  ])('%s retains the English label and renders a translated accessible name', (name, props, label) => {
    const calls = [];
    function translate(key, fallback) {
      const registered = key.split('.').reduce((value, part) => value?.[part], registry);
      expect(registered, key).toBe(fallback);
      calls.push({ key, fallback });
      return 'Translated: ' + fallback;
    }
    const render = extra => {
      const host = document.createElement('div');
      host.innerHTML = renderToStaticMarkup(React.createElement(components[name], { React, ...props, ...extra }));
      return [...host.querySelectorAll('[aria-label]')].map(node => node.getAttribute('aria-label'));
    };
    expect(render({})).toContain(label);
    expect(render({ translateStudy: translate, t: translate })).toContain('Translated: ' + label);
    expect(calls.some(call => call.fallback === label)).toBe(true);
  });
});
