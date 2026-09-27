import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { setupDinoLab, renderTab, internals } from './helpers/dino_lab_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
let api, root, host, data;
beforeAll(() => { api = setupDinoLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { if (root) await api.React.act(async () => root.unmount()); root = null; host?.remove(); });
async function mount(initial) {
  document.body.innerHTML = ''; data = initial;
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const render = () => root.render(api.tool.cfg.render({ React: api.React, toolData: { dinoLab: data }, updateMulti: (_, patch) => { data = { ...data, ...patch }; render(); }, announceToSR() {} }));
  await api.React.act(async () => render());
}
async function click(node) { expect(node).toBeTruthy(); await api.React.act(async () => node.click()); }
const button = text => [...host.querySelectorAll('button')].find(n => n.textContent === text);

describe('fossil evidence atlas', () => {
  it('pairs all eight fossil types with a labeled schematic, an evidence limit, a question, and a source', () => {
    const items = internals().ANATOMY;
    expect(items).toHaveLength(8);
    for (const item of items) {
      document.body.innerHTML = renderTab({ tab: 'anatomy', fossilReference: item.id, fossilLibraryOpen: true });
      const detail = document.querySelector('#dino-atlas-detail');
      expect(detail.dataset.fossilDetail).toBe(item.id);
      expect(detail.querySelector('svg[role=img]').getAttribute('aria-label')).toBe(item.diagram);
      expect(item.diagram).toMatch(/^Schematic/);
      expect(detail.querySelector('.dinolab-atlas-limit').textContent).toContain(item.limit);
      expect(detail.querySelector('.dinolab-atlas-question').textContent).toContain(item.question);
      expect(detail.querySelector('a').getAttribute('href')).toBe(item.url);
      expect(item.url).toMatch(/^https:\/\//);
      expect(document.querySelectorAll('[data-fossil-type][aria-pressed=true]')).toHaveLength(1);
      expect(document.querySelectorAll('.dinolab-atlas-preview svg[aria-hidden=true]')).toHaveLength(8);
    }
  });

  it('does not turn incomplete fossil evidence into certainty', () => {
    const byId = id => internals().ANATOMY.find(item => item.id === id);
    expect(byId('bones').what).toContain('not always a complete mineral replacement');
    expect(byId('eggs').limit).toContain('alone does not establish parental care');
    expect(byId('skin').limit).toContain('does not map the whole animal');
    expect(byId('tracks').limit).toContain('not a direct measurement');
    expect(byId('gastroliths').limit).toContain('smooth pebble alone is not enough');
    expect(byId('softtissue').limit).toContain('Alteration and contamination must be tested');
  });

  it('falls back safely from invalid restored selections and does not coerce disclosure values', () => {
    for (const value of [null, {}, [], '__proto__', 4]) {
      document.body.innerHTML = renderTab({ tab: 'anatomy', fossilReference: value, fossilLibraryOpen: 'false', fossilMatchingOpen: 1 });
      expect(document.querySelector('#dino-atlas-detail').dataset.fossilDetail).toBe('bones');
      expect(document.querySelector('#dino-fossil-library').open).toBe(false);
      expect(document.querySelector('#dino-fossil-matching').open).toBe(false);
    }
  });

  it('connects a selected fossil to practice and returns feedback to its exact atlas entry without altering learner work', async () => {
    const evidenceWorkbench = { caseId: 'quills', cases: { quills: { claim: 'My own developing idea' } } };
    const notebook = { microraptor: { question: 'Gliding?' } };
    await mount({ tab: 'anatomy', fossilLibraryOpen: true, evidenceWorkbench, notebook, evidenceAnswered: true, evidencePicked: 'bones' });
    await click(host.querySelector('[data-fossil-type=eggs]'));
    expect(data.fossilReference).toBe('eggs');
    await click(button('Practice recognizing this evidence'));
    expect(data.evidenceIdx).toBe(3);
    expect(data.evidenceAnswered).toBe(false);
    expect(data.evidencePicked).toBeNull();
    expect(host.querySelector('#dino-fossil-matching').open).toBe(true);
    await click(host.querySelector('#dino-fossil-matching [aria-label="Bones. Choose this fossil."]'));
    expect(host.querySelector('#dino-fossil-matching').textContent).toContain('Eggs and nests is the best match here.');
    expect(host.querySelector('#dino-fossil-matching').textContent).toContain(internals().ANATOMY[3].limit);
    await click(host.querySelector('[data-fossil-type=teeth]'));
    await click(button('Inspect this fossil type'));
    expect(data.fossilReference).toBe('eggs');
    expect(host.querySelector('#dino-atlas-detail').dataset.fossilDetail).toBe('eggs');
    expect(data.evidenceWorkbench).toEqual(evidenceWorkbench);
    expect(data.notebook).toEqual(notebook);
    await click(host.querySelector('#dinotab-notes'));
    await click(host.querySelector('#dinotab-anatomy'));
    expect(host.querySelector('#dino-fossil-library').open).toBe(true);
    expect(host.querySelector('#dino-atlas-detail').dataset.fossilDetail).toBe('eggs');
  });

  it('keeps both English registries aligned with the shared atlas data', () => {
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const ui = JSON.parse(readFileSync(file, 'utf8')).stem.dinolab;
      for (const item of internals().ANATOMY) for (const field of ['name','tag','what','tells','limit','question','diagram','source']) expect(ui['atlas_' + item.id + '_' + field]).toBe(item[field]);
    }
  });
});
