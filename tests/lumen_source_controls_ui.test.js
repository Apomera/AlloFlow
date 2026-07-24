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

describe('Lumen active sources, labels and stored-passage viewer', () => {
  let container;
  let root;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = 'en';
    document.body.innerHTML = '<main><div id="root"></div></main>';
    container = document.getElementById('root');
  });
  afterEach(async () => {
    if (root) await act(async () => { root.unmount(); });
    root = null;
  });

  it('persists source controls, filters retrieval scope and opens exact stored context accessibly', async () => {
    const sourceText = `# Photosynthesis

Chlorophyll in chloroplasts absorbs red and blue light. Plants use that captured energy to convert carbon dioxide and water into glucose during photosynthesis.

The stored source continues with enough context for a stable evidence passage and exact-position viewer.`;
    const ctx = {
      React, update: () => {}, announceToSR: () => {}, sourceText, sourceTopic: 'Biology reader',
      storageDB: { get: async () => null, set: async () => true, del: async () => {} },
      studentNickname: 'Source controls audit'
    };
    root = ReactDOMClient.createRoot(container);
    await act(async () => { root.render(React.createElement(Study.Component, { ctx })); await settle(); });

    const active = container.querySelector('input[aria-label="Use Biology reader for study"]');
    expect(active).not.toBeNull();
    expect(active.checked).toBe(true);
    expect(container.textContent).toContain('1 in current study scope');

    const details = [...container.querySelectorAll('details')].find(item => item.textContent.includes('Edit labels'));
    await act(async () => { details.open = true; details.dispatchEvent(new Event('toggle', { bubbles: true })); });
    const labels = container.querySelector('input[id^="lumen-source-labels-"]');
    await act(async () => { setInput(labels, 'Science, Primary source, science'); });
    await act(async () => { buttonNamed(container, 'Save labels').click(); await settle(); });
    expect(container.textContent).toContain('Primary source');

    const filter = container.querySelector('#lumen-study-label-filter');
    expect([...filter.options].map(option => option.textContent)).toEqual(['All active sources', 'Primary source', 'Science']);
    await act(async () => {
      filter.value = 'Science';
      filter.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(filter.value).toBe('Science');
    expect(container.textContent).toContain('This filter affects both the source list and retrieval.');

    await act(async () => { buttonNamed(container, 'View source snapshot').click(); await settle(); });
    const viewer = container.querySelector('#lumen-source-viewer[role="region"]');
    expect(viewer).not.toBeNull();
    expect(viewer.textContent).toContain('Stored snapshot · source version 1');
    expect(viewer.textContent).toContain('passage hash');
    expect(viewer.querySelector('mark').textContent).toContain('Chlorophyll');
    expect(document.activeElement).toBe(viewer);

    const results = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
    });
    expect(results.violations.map(v => v.id + ': ' + v.help).join('\n')).toBe('');

    await act(async () => { active.click(); await settle(); });
    expect(active.checked).toBe(false);
    expect(container.textContent).toContain('0 in current study scope');
    expect(buttonNamed(container, 'Find grounded answer').disabled).toBe(true);
  });
});
