import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, loadSelTool, makeCtx, renderSelTool } from './helpers/sel_tool_harness.js';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_dearman.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_dearman.js');
const source = () => readFileSync(sourcePath, 'utf8');
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));

beforeAll(() => {
  loadSelTool('sel_tool_dearman.js');
});

describe('DEAR MAN navigation and progress', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('uses contrast-safe mnemonic accents on dark and high-contrast shells', () => {
    const text = source();
    expect(text).toContain("var _de_FGD = {'#0ea5e9':'#38bdf8','#a855f7':'#d8b4fe','#ec4899':'#f9a8d4','#6366f1':'#a5b4fc'}");
    expect(text).toContain("'#6366f1':'#ffff00'");
  });

  it('provides roving tabs and labelled panels', () => {
    const text = source();
    expect(text).toContain("role: 'tablist', 'aria-label': 'DEAR MAN sections'");
    expect(text).toContain("id: 'dearman-tab-' + t.id");
    expect(text).toContain("'aria-controls': 'dearman-panel-' + t.id");
    expect(text).toContain('tabIndex: active ? 0 : -1');
    expect(text).toContain("event.key === 'ArrowRight' || event.key === 'ArrowDown'");
    expect(text).toContain("event.key === 'Home'");
    expect(text).toContain("event.key === 'End'");
    expect(text).toContain("id: 'dearman-panel-' + view, role: 'tabpanel'");
    expect(text).toContain("'aria-labelledby': 'dearman-tab-' + view");
  });

  it('announces seven-step drafting progress', () => {
    const text = source();
    expect(text).toContain('var draftedSteps = LETTERS.filter');
    expect(text).toContain('var dearManProgressText = draftedSteps === 0');
    expect(text).toContain("'aria-label': 'DEAR MAN progress'");
    expect(text).toContain("draftedSteps + ' of ' + LETTERS.length + ' DEAR MAN steps drafted.'");
    expect(text).toContain("role: 'progressbar', 'aria-label': 'Drafting progress'");
    expect(text).toContain("'aria-valuenow': draftedSteps");
    expect(text).toContain("'data-dearman-review-summary': reviewCount");
    expect(text).toContain("'data-dearman-review-step-state': isDrafted ? 'drafted' : 'optional'");
    expect(text).toContain("'data-dearman-copy-script': 'true'");
    expect(text).toContain('function renderPractice()');
    expect(text).toContain("{ id: 'practice', label: 'Rehearse'");
    expect(text).toContain("else if (view === 'practice') body = renderPractice();");
  });

  it('offers a focused guided path and an all-steps overview', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    function DearManHost() {
      const [toolData, setToolData] = React.useState({
        dearMan: {
          view: 'home', ask: '', audience: '', responses: {},
          buildMode: 'guided', activeStep: 0, practiceCount: 0
        }
      });
      const ctx = Object.assign({}, makeCtx({ toolData }), { toolData, setToolData });
      return window.SelHub.renderTool('dearMan', ctx);
    }

    const root = createRoot(host);
    try {
      await React.act(async () => { root.render(React.createElement(DearManHost)); });
      expect(host.querySelectorAll('[data-dearman-step-index]')).toHaveLength(7);
      expect(host.querySelectorAll('textarea')).toHaveLength(1);
      expect(host.querySelector('textarea')?.id).toBe('dm-describe');
      expect(host.querySelector('[data-dearman-step-state="current"]')?.textContent).toContain('Describe');

      await React.act(async () => {
        host.querySelector('[data-dearman-step-index="1"]').click();
      });
      await React.act(async () => {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
      });
      expect(host.querySelectorAll('textarea')).toHaveLength(1);
      expect(host.querySelector('textarea')?.id).toBe('dm-express');
      expect(document.activeElement?.id).toBe('dm-express');

      await React.act(async () => {
        host.querySelector('[data-dearman-build-mode="all"]').click();
      });
      expect(host.querySelectorAll('textarea')).toHaveLength(7);
      expect(host.querySelector('[data-dearman-step-navigator]')).toBeNull();

      await React.act(async () => {
        host.querySelector('[data-dearman-build-mode="guided"]').click();
      });
      expect(host.querySelectorAll('textarea')).toHaveLength(1);
      expect(host.querySelector('textarea')?.id).toBe('dm-express');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      globalThis.IS_REACT_ACT_ENVIRONMENT = false;
    }
  });

  it('keeps undrafted review steps visible and opens the selected step for editing', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    function ReviewHost() {
      const [toolData, setToolData] = React.useState({
        dearMan: {
          view: 'script', ask: 'Ask for a quieter study space', audience: 'My teacher',
          responses: { describe: 'The room has been loud during study time.' },
          buildMode: 'guided', activeStep: 0, practiceCount: 0
        }
      });
      const ctx = Object.assign({}, makeCtx({ toolData }), { toolData, setToolData });
      return window.SelHub.renderTool('dearMan', ctx);
    }

    const root = createRoot(host);
    try {
      await React.act(async () => { root.render(React.createElement(ReviewHost)); });
      expect(host.querySelector('[data-dearman-review-summary]')?.getAttribute('data-dearman-review-summary')).toBe('1');
      expect(host.querySelectorAll('[data-dearman-review-step]')).toHaveLength(7);
      expect(host.querySelectorAll('[data-dearman-review-step-state="drafted"]')).toHaveLength(1);
      expect(host.querySelectorAll('[data-dearman-review-step-state="optional"]')).toHaveLength(6);
      expect(host.querySelector('[data-dearman-copy-script]')).toBeTruthy();

      const addExpress = host.querySelector('[data-dearman-review-step="express"] button');
      expect(addExpress?.getAttribute('aria-label')).toBe('Add Express step');
      await React.act(async () => { addExpress.click(); });
      await React.act(async () => {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
      });
      expect(host.querySelector('textarea')?.id).toBe('dm-express');
      expect(document.activeElement?.id).toBe('dm-express');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      globalThis.IS_REACT_ACT_ENVIRONMENT = false;
    }
  });

  it('guides rehearsal through drafted cues and logs practice only when finished', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const announcements = [];

    function PracticeHost() {
      const [toolData, setToolData] = React.useState({
        dearMan: {
          view: 'script', ask: 'Ask for more planning time', audience: 'My group',
          responses: {
            describe: 'We have had one short planning meeting.',
            assert: 'I would like one more meeting before we present.'
          },
          buildMode: 'guided', activeStep: 0, practiceStep: 0, practiceCount: 0
        }
      });
      const ctx = Object.assign({}, makeCtx({ toolData }), {
        toolData,
        setToolData,
        announceToSR(message) { announcements.push(message); }
      });
      return window.SelHub.renderTool('dearMan', ctx);
    }

    const root = createRoot(host);
    try {
      await React.act(async () => { root.render(React.createElement(PracticeHost)); });
      await React.act(async () => { host.querySelector('[data-dearman-start-practice]').click(); });
      expect(host.querySelector('[data-dearman-practice-view]')).toBeTruthy();
      expect(host.querySelectorAll('[data-dearman-practice-step]')).toHaveLength(2);
      expect(host.querySelector('[data-dearman-practice-text]')?.getAttribute('data-dearman-practice-text')).toBe('describe');
      expect(host.querySelector('[data-dearman-practice-controls] button')?.disabled).toBe(true);
      expect(host.querySelector('[data-dearman-practice-controls] [role="status"]')?.textContent).toContain('Step 1 of 2');
      expect(host.querySelectorAll('[data-dearman-practice-support]')).toHaveLength(3);
      expect(host.querySelector('[data-dearman-practice-support="full"]')?.checked).toBe(true);
      expect(host.querySelector('[data-dearman-practice-text]')?.textContent).toBe('We have had one short planning meeting.');
      expect(host.querySelector('[data-dearman-practice-step]')?.style.minHeight).toBe('44px');

      await React.act(async () => { host.querySelector('[data-dearman-practice-support="starter"]').click(); });
      expect(host.querySelector('[data-dearman-practice-support="starter"]')?.checked).toBe(true);
      expect(host.querySelector('[data-dearman-practice-cue-state="starter"]')?.textContent).toBe('What happened? Stick to observable facts.');
      expect(host.querySelector('[data-dearman-practice-cue-state="starter"]')?.textContent).not.toContain('planning meeting');
      let reveal = host.querySelector('[data-dearman-practice-reveal]');
      expect(reveal?.getAttribute('aria-expanded')).toBe('false');
      expect(reveal?.getAttribute('aria-controls')).toBe('dearman-practice-cue');

      await React.act(async () => { reveal.click(); });
      expect(host.querySelector('[data-dearman-practice-cue-state="revealed"]')?.textContent).toBe('We have had one short planning meeting.');
      expect(host.querySelector('[data-dearman-practice-reveal]')?.getAttribute('aria-expanded')).toBe('true');

      await React.act(async () => { host.querySelector('[data-dearman-practice-support="memory"]').click(); });
      expect(host.querySelector('[data-dearman-practice-cue-state="memory"]')?.textContent).toBe('Your drafted words are hidden for this try.');
      expect(host.querySelector('[data-dearman-practice-view]')?.textContent).not.toContain('We have had one short planning meeting.');
      expect(host.querySelector('[data-dearman-practice-view] details')).toBeNull();

      await React.act(async () => { host.querySelector('[data-dearman-practice-reveal]').click(); });
      expect(host.querySelector('[data-dearman-practice-cue-state="revealed"]')?.textContent).toBe('We have had one short planning meeting.');

      await React.act(async () => { host.querySelector('[data-dearman-practice-next]').click(); });
      await React.act(async () => {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
      });
      expect(host.querySelector('[data-dearman-practice-text]')?.getAttribute('data-dearman-practice-text')).toBe('assert');
      expect(host.querySelector('[data-dearman-practice-support="memory"]')?.checked).toBe(true);
      expect(host.querySelector('[data-dearman-practice-cue-state="memory"]')?.textContent).toBe('Your drafted words are hidden for this try.');
      expect(host.querySelector('[data-dearman-practice-view]')?.textContent).not.toContain('I would like one more meeting before we present.');
      expect(document.activeElement?.id).toBe('dearman-practice-card');
      expect(announcements.at(-1)).toContain('Rehearsal step 2 of 2: Assert.');

      await React.act(async () => { host.querySelector('[data-dearman-practice-next]').click(); });
      expect(host.querySelector('[data-dearman-practice-view]')).toBeNull();
      expect(host.textContent).toContain('Practice count: 1');
      expect(announcements.at(-1)).toBe('Rehearsal complete. Returning to your script.');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      globalThis.IS_REACT_ACT_ENVIRONMENT = false;
    }
  });

  it('offers a build-first rehearsal empty state', () => {
    const html = renderSelTool('dearMan', {
      toolData: { dearMan: { view: 'practice', responses: {}, practiceStep: 0 } }
    });
    expect(html).toContain('Add one idea before rehearsing');
    expect(html).toContain('Start with Describe');
    expect(html).not.toContain('data-dearman-practice-next');
  });
});
