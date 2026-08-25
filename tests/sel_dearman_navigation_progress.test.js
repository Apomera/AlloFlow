import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, loadSelTool, makeCtx } from './helpers/sel_tool_harness.js';

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
});
