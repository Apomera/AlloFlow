import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import * as EvidenceMod from '../stem_lab/stem_lumen_evidence.js';
import * as StudyMod from '../stem_lab/stem_lumen_study.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
const { act } = require(resolve(modulesDir, 'react-dom/test-utils'));
const E = EvidenceMod.default || EvidenceMod;
const Study = StudyMod.default || StudyMod;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function buttonNamed(container, name) {
  return [...container.querySelectorAll('button')].find(button => button.textContent.trim() === name);
}

function setInput(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function settle() {
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('Lumen Discover Sources interactive UI', () => {
  let container;
  let root;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = 'en';
    document.title = 'Lumen discovery test';
    document.body.innerHTML = '<main><div id="root"></div></main>';
    container = document.getElementById('root');
  });

  afterEach(async () => {
    if (root) await act(async () => { root.unmount(); });
    root = null;
  });

  it('opens an accessible disclosure-first discovery panel', async () => {
    const ctx = {
      React, update: () => {}, announceToSR: () => {},
      searchWeb: async () => ({ results: [] }),
      storageDB: { get: async () => null, set: async () => true, del: async () => {} },
      studentNickname: 'Discovery panel audit'
    };
    root = ReactDOMClient.createRoot(container);
    await act(async () => { root.render(React.createElement(Study.Component, { ctx })); await settle(); });
    await act(async () => { buttonNamed(container, 'Discover web sources').click(); await settle(); });

    expect(container.textContent).toContain('Search results are candidates, not evidence.');
    expect(container.textContent).toContain('Do not include learner names');
    expect(container.querySelector('#lumen-discover-query')).not.toBeNull();
    expect(container.querySelector('[aria-controls="lumen-discover-panel"]')).not.toBeNull();

    const results = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
    });
    expect(results.violations.map(v => v.id + ': ' + v.help).join('\n')).toBe('');
  });

  it('searches, reviews, selects and imports full page text end to end', async () => {
    const fullText = 'Vocabulary instruction is most effective when learners meet important words repeatedly in meaningful contexts. Teachers can combine student-friendly explanations, examples, retrieval practice, and discussion. This full public article contains enough readable text to become a Lumen evidence source.';
    const ctx = {
      React, update: () => {}, announceToSR: () => {},
      searchWeb: async query => ({ source: 'TestSearch', results: [{ url: 'https://example.org/vocabulary?utm_source=test', title: 'Vocabulary research', snippet: 'Search preview for ' + query }] }),
      fetchWebSource: async url => ({ text: 'Source: ' + url + '\n\n' + fullText }),
      storageDB: { get: async () => null, set: async () => true, del: async () => {} },
      studentNickname: 'Discovery import flow'
    };
    root = ReactDOMClient.createRoot(container);
    await act(async () => { root.render(React.createElement(Study.Component, { ctx })); await settle(); });
    await act(async () => { buttonNamed(container, 'Discover web sources').click(); });

    const input = container.querySelector('#lumen-discover-query');
    await act(async () => { setInput(input, 'vocabulary instruction research'); });
    await act(async () => { input.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settle(); });

    expect(container.textContent).toContain('Vocabulary research');
    expect(container.textContent).toContain('Search preview only');
    expect(container.textContent).toContain('Review and select what to import.');
    const checkbox = container.querySelector('input[type="checkbox"]');
    await act(async () => { checkbox.click(); });
    await act(async () => { buttonNamed(container, 'Import selected sources').click(); await settle(); });

    expect(container.textContent).toContain('1 source imported with full text.');
    expect(container.textContent).toContain('Project sources (1)');
    expect(container.textContent).toContain('Imported as evidence source');
    expect(container.textContent).toContain('Open original source');
    expect(container.innerHTML).not.toContain('utm_source');

    const project = E.makeProject({ id: 'sanity' });
    expect(project.sources).toEqual([]);
  });
});
