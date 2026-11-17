import { beforeEach as beforeEachProtectedWorkspace } from 'vitest';
import { installReportWriterWorkspaceFixture } from './helpers/report_writer_workspace_fixture.js';
beforeEachProtectedWorkspace(() => installReportWriterWorkspaceFixture(React));

// The Report Writer step bar must scroll, not squeeze.
//
// WHY (2026-11-16): seen in a real browser. The module injects its own
// minimum-size rule, "#rw-dialog-surface button { min-width: 24px }". Giving a
// flex item an explicit min-width removes the default that stops it shrinking
// below its content, so the ten step buttons shrank to fit the bar (to 24px
// each on a phone), their labels ran over each other, and a click on the
// middle of "Export & Save" landed on the label of the step before it, which
// is disabled until the report exists. The click did nothing.
//
// jsdom has no layout, so this only pins the two things the fix rests on: the
// rule that causes it is still there, and every step button refuses to shrink.
// The behaviour itself was checked in Chromium at 1100px and 390px.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot;
beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
});

let mounted = null;
afterEach(async () => { if (mounted) { await React.act(async () => mounted.root.unmount()); mounted.host.remove(); mounted = null; } });

describe('Report Writer step bar', () => {
  it('has ten steps in a bar that scrolls sideways, and no step is allowed to shrink', async () => {
    localStorage.clear();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    mounted = { host, root };
    await React.act(async () => root.render(React.createElement(window.AlloModules.ReportWriter, {
      onClose() {}, callGemini: async () => '{}', addToast() {}, t: key => key,
      studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
    })));
    const nav = host.querySelector('nav[aria-label="Report Writer steps"]');
    const steps = Array.from(nav.querySelectorAll('button'));
    expect(steps).toHaveLength(10);
    expect(nav.className).toContain('overflow-x-auto');
    for (const step of steps) {
      expect(step.className, step.textContent).toContain('flex-shrink-0');
      expect(step.className, step.textContent).toContain('whitespace-nowrap');
    }
    // The rule that makes flex-shrink-0 necessary. If it goes, this test can go with it.
    expect(document.getElementById('rw-a11y-css').textContent).toContain('#rw-dialog-surface button');
    expect(document.getElementById('rw-a11y-css').textContent).toContain('min-width: 24px');

    // The one other row a browser sweep of all ten steps found squeezed (on a
    // phone): the report name box beside Save Report and Start a new report.
    await React.act(async () => { steps[9].dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const name = host.querySelector('input[placeholder="Report name (optional)..."]');
    const row = name.parentElement;
    expect(row.className).toContain('flex-wrap');
    const rowButtons = Array.from(row.querySelectorAll('button'));
    expect(rowButtons).toHaveLength(2);
    for (const button of rowButtons) expect(button.className, button.textContent).toContain('flex-shrink-0');
  });
});
