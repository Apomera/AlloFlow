// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);

// Leveled text with "data visualization" on: the model's [[CHART: {...}]] directive
// must render as a chart even when the JSON is wrapped across lines or run into a
// paragraph. It used to reach the reader as raw text (with glossary underlines on
// words inside the JSON) because the parser only looked at whole lines.
let React, renderToStaticMarkup, render;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ renderToStaticMarkup } = require(resolve('desktop/web-app/node_modules/react-dom/server')));
  global.React = window.React = React;
  loadAlloModule('view_renderers_module.js');
  const deps = {
    sanitizeTruncatedCitations: (s) => s, warnLog: () => {}, normalizeResourceLinks: (s) => s, t: (k) => null,
    formatInlineText: (s) => React.createElement('span', null, s),
    SimpleBarChart: ({ data }) => React.createElement('div', { 'data-bar-chart': JSON.stringify(data) }),
    SimpleDonutChart: ({ percentage }) => React.createElement('div', { 'data-donut-chart': percentage })
  };
  render = (text) => renderToStaticMarkup(React.createElement(React.Fragment, null, window.AlloModules.ViewRenderers.renderFormattedText(text, true, false, deps)));
});

const chartJson = '{ "type": "bar", "title": "U.S. Treaties with American Indian Nations", "data": [{"label": "Total Ratified", "value": 370}] }';

describe('Leveled text chart directives', () => {
  it('renders a one-line directive as a bar chart', () => {
    const html = render('Intro paragraph.\n\n[[CHART: ' + chartJson + ']]\n\n| Term | Definition |\n| --- | --- |\n| Treaty | An agreement |');
    expect(html).toContain('data-bar-chart="[{&quot;label&quot;:&quot;Total Ratified&quot;,&quot;value&quot;:370}]"');
    expect(html).toContain('U.S. Treaties with American Indian Nations');
    expect(html).not.toContain('[[CHART');
    expect(html).toContain('<table');
  });

  it('renders a directive whose JSON wraps across lines, and one run into the end of a paragraph', () => {
    const wrapped = chartJson.replace('"data":', '"data":\n');
    const html = render('The U.S. has ratified more than 370 treaties.\n\n[[CHART: ' + wrapped + ']]\n\n| Term | Definition |\n| --- | --- |\n| Treaty | An agreement |');
    expect(html).toContain('data-bar-chart=');
    expect(html).not.toContain('[[CHART');
    expect(html).not.toContain('Total Ratified", "value"');   // no JSON reaching the reader as prose
    const inline = render('They protect rights for many years. [[CHART: ' + wrapped + ']] The table below has the terms.');
    expect(inline).toContain('data-bar-chart=');
    expect(inline).toContain('They protect rights for many years.');
    expect(inline).toContain('The table below has the terms.');
    expect(inline).not.toContain('[[CHART');
  });

  it('still renders a donut directive and leaves malformed directives visible rather than dropping them', () => {
    expect(render('[[CHART: { "type": "donut", "title": "Share", "percentage": 75, "label": "75%" }]]')).toContain('data-donut-chart="75"');
    expect(render('[[CHART: { not json }]]')).toContain('[[CHART');
  });
});
