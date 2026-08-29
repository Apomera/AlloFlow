import { afterEach, describe, expect, it } from 'vitest';
import {
  React,
  ReactDOMServer,
  extractReactSsrStyles,
  prepareStemBrowserRender,
} from './helpers/stem_widgets_smoke_harness.js';

describe('STEM real-browser SSR stylesheet preparation', () => {
  afterEach(() => {
    document.head.querySelectorAll('style').forEach((style) => style.remove());
  });

  it('decodes React style text once while preserving stylesheet boundaries', () => {
    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement('section', null, [
      React.createElement('style', { key: 'grid' }, '.grid{grid-template-areas:"mission" "scene"}'),
      React.createElement('style', { key: 'label' }, '.label::after{content:"A & B"}'),
      React.createElement('div', { key: 'body', className: 'grid' }, 'Ready'),
    ]));

    expect(markup).toContain('&quot;mission&quot;');
    expect(markup).toContain('&amp;');

    const prepared = extractReactSsrStyles(markup);
    expect(prepared.cssSheets).toEqual([
      '.grid{grid-template-areas:"mission" "scene"}',
      '.label::after{content:"A & B"}',
    ]);
    expect(prepared.html).not.toContain('<style');
    expect(prepared.html).toContain('<div class="grid">Ready</div>');
  });

  it('keeps head-injected styles before inline tool styles', () => {
    const headStyle = document.createElement('style');
    headStyle.textContent = '.head-rule{color:blue}';
    document.head.appendChild(headStyle);
    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement('main', null, [
      React.createElement('style', { key: 'inline' }, '.inline-rule{content:"ready"}'),
      React.createElement('span', { key: 'body' }, 'Tool'),
    ]));

    expect(prepareStemBrowserRender(markup)).toEqual({
      html: '<main><span>Tool</span></main>',
      cssSheets: [
        '.head-rule{color:blue}',
        '.inline-rule{content:"ready"}',
      ],
    });
  });
});
