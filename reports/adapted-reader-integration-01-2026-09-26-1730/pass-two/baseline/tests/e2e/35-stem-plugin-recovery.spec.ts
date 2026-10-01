import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

function loaderFactorySource() {
  const shell = fs.readFileSync(path.join(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
  const start = shell.indexOf('function makeEnsureLoader(');
  const endMarker = '\n      }\n\n      window.__alloEnsureStemPluginsLoaded';
  const end = shell.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('Could not extract the production plugin loader');
  return shell.slice(start, end + '\n      }'.length);
}

const tools = [
  { id: 'heatLab', label: 'Heat & Thermodynamics Lab', file: 'stem_lab/stem_tool_heatlab.js' },
  { id: 'nuclearLab', label: 'Nuclear & Radiation Lab', file: 'stem_lab/stem_tool_nuclearlab.js' },
];

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
];

for (const viewport of viewports) {
  for (const tool of tools) {
    test(`${tool.label} recovers from a failed demand load on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      let attempts = 0;
      const requested: string[] = [];
      await page.route('https://plugins.test/**', async (route) => {
        attempts += 1;
        requested.push(route.request().url());
        if (attempts === 1) {
          await route.abort('failed');
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: `window.StemLab._registry[${JSON.stringify(tool.id)}] = true;`,
        });
      });

      await page.setContent(`
        <main>
          <h1>STEM Lab</h1>
          <button id='heatLab'>Heat &amp; Thermodynamics Lab</button>
          <button id='nuclearLab'>Nuclear &amp; Radiation Lab</button>
          <section id='tool-status' role='status' aria-live='polite'></section>
        </main>
      `);

      const bootstrap = [
        `var pluginCdnBase = 'https://plugins.test/';`,
        `var pluginCdnVersion = 'recovery-test';`,
        `window.StemLab = { _registry: {}, registerTool: function(id, value) { this._registry[id] = value || true; }, isRegistered: function(id) { return !!this._registry[id]; } };`,
        loaderFactorySource(),
        `window.__alloEnsureStemPluginsLoaded = makeEnsureLoader('Stem', ${JSON.stringify(tools.map((x) => x.file))}, function() { return true; });`,
        `window.__alloEnsureStemPluginsLoaded();`,
      ].join('\n');
      await page.addScriptTag({ content: bootstrap });

      await page.evaluate((selected) => {
        const status = document.getElementById('tool-status')!;
        const render = () => {
          const state = (window as any).__alloGetStemPluginState(selected.id);
          status.replaceChildren();
          if (!state || state.status === 'loading') {
            status.setAttribute('aria-busy', 'true');
            status.textContent = `Loading ${selected.label}…`;
            return;
          }
          status.removeAttribute('aria-busy');
          if (state.status === 'error') {
            const title = document.createElement('h2');
            title.textContent = `${selected.label} could not load`;
            const retry = document.createElement('button');
            retry.textContent = `Retry loading ${selected.label}`;
            retry.onclick = () => (window as any).__alloRetryStemPlugin(selected.id);
            status.append(title, retry);
            return;
          }
          const title = document.createElement('h2');
          title.textContent = selected.label;
          const input = document.createElement('input');
          input.type = 'range';
          input.min = '0';
          input.max = '10';
          input.value = '5';
          input.setAttribute('aria-label', 'Experiment value');
          const output = document.createElement('output');
          output.textContent = input.value;
          input.oninput = () => { output.textContent = input.value; };
          status.append(title, input, output);
        };
        window.addEventListener('allo-plugins-changed', render);
        document.getElementById(selected.id)!.addEventListener('click', () => {
          (window as any).__alloEnsureStemPluginLoaded(selected.id);
          render();
        });
      }, tool);

      await page.getByRole('button', { name: tool.label }).click();
      const retry = page.getByRole('button', { name: `Retry loading ${tool.label}` });
      await expect(page.getByRole('heading', { name: `${tool.label} could not load` })).toBeVisible();
      await retry.focus();
      await expect(retry).toBeFocused();
      await retry.click();

      await expect(page.getByRole('heading', { name: tool.label, exact: true })).toBeVisible();
      const input = page.getByRole('slider', { name: 'Experiment value' });
      await input.fill('8');
      await expect(page.locator('output')).toHaveText('8');
      expect(attempts).toBe(2);
      expect(requested.every((url) => url.includes(tool.file))).toBeTruthy();
      expect(requested[1]).toContain('retry=');
    });
  }
}
