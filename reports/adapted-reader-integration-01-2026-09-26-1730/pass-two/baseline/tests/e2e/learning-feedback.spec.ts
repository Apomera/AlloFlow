import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const local = (file: string) => path.join(root, file);
let css: string;

test.beforeAll(async () => {
  const postcss = require(local('desktop/web-app/node_modules/postcss'));
  const tailwind = require(local('desktop/web-app/node_modules/tailwindcss'));
  css = (await postcss([tailwind({
    content: ['view_adventure_source.jsx', 'view_persona_chat_source.jsx'].map(file => local(file)),
    corePlugins: { preflight: true }
  })]).process('@tailwind base; @tailwind utilities;', { from: undefined })).css;
});

async function load(page: any) {
  await page.setContent('<!doctype html><html lang="en"><head><title>Learning feedback</title></head><body><main id="root" style="max-width:680px;margin:auto;padding:16px"></main></body></html>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ path: local('desktop/web-app/node_modules/react/umd/react.development.js') });
  await page.addScriptTag({ path: local('desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
  await page.addScriptTag({ path: local('personas_module.js') });
  // Expose private presentation components from the shipped bytes solely in this fixture.
  // The surrounding single/panel/history integrations are asserted below.
  for (const [file, marker, expose] of [
    ['view_adventure_module.js', 'window.AlloModules.AdventureView = AdventureView;', 'window.__AdventureCard = AdventureConsequenceCard;'],
    ['view_persona_chat_module.js', 'window.AlloModules.PersonaChatView = PersonaChatView;', 'window.__PersonaNote = PersonaEvidenceNote;']
  ]) {
    const module = fs.readFileSync(local(file), 'utf8');
    expect(module).toContain(marker);
    await page.addScriptTag({ content: module.replace(marker, marker + expose) });
  }
  await page.addScriptTag({ path: local('desktop/web-app/public/vendor/axe-core/axe.min.js') });
}

async function checkAxe(page: any) {
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('main'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] } });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }));
  });
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

for (const immersive of [false, true]) {
  test('Adventure debrief is readable and keyboard operable ' + (immersive ? 'immersive' : 'standard'), async ({ page }, info) => {
    await page.setViewportSize({ width: 375, height: 850 });
    await load(page);
    await page.evaluate(({ immersive }) => {
      const w = window as any;
      document.body.style.background = immersive ? '#0f172a' : '#f1f5f9';
      w.ReactDOM.createRoot(document.querySelector('#root')).render(w.React.createElement(w.__AdventureCard, {
        t: (key: string) => key, immersive,
        consequence: { version: 1, choice: 'I brace the gate before releasing the stored water.', reasoning: 'strategic_success',
          explanation: 'The brace distributes the force. The release still costs energy, but your reasoning addresses the weak point.',
          chanceMode: true, chanceRoll: 1, concepts: ['Force distribution', 'Conservation'],
          changes: [{ key: 'energy', label: 'Energy', before: 100, after: 80, unit: '' }, { key: 'resource:Water', label: 'Stored water', before: 8, after: 5, unit: 'L' }] }
      }));
    }, { immersive });
    await expect(page.getByText('Effective strategy', { exact: true })).toBeVisible();
    await expect(page.getByText('Chance die: 1/20.', { exact: false })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator('summary')).toBeFocused();
    await expect(page.locator('summary')).toHaveCSS('outline-color', immersive ? 'rgb(103, 232, 249)' : 'rgb(17, 94, 89)');
    await page.keyboard.press('Enter');
    await expect(page.getByText('I brace the gate', { exact: false })).toBeVisible();
    await checkAxe(page);
    await page.screenshot({ path: info.outputPath('adventure-phone.png'), fullPage: true });
    await page.setViewportSize({ width: 1200, height: 900 });
    await checkAxe(page);
    await page.screenshot({ path: info.outputPath('adventure-desktop.png'), fullPage: true });
  });
}

test('Persona reveals a literal lesson passage, escapes markup, and rejects a changed source', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await load(page);
  await page.evaluate(() => {
    const w = window as any;
    const quote = 'Ada described how symbols could be manipulated by rules.';
    const source = { topic: 'Symbolic reasoning', excerpt: 'The engine follows operations. ' + quote + ' This is different from interpretation. <script>window.injected = true</script>' };
    const saved = w.AlloModules.PersonaEvidence.normalize(w.AlloModules.PersonaEvidence.resolve(quote, source));
    w.__renderEvidence = (changed: boolean) => {
      w.__root ||= w.ReactDOM.createRoot(document.querySelector('#root'));
      w.__root.render(w.React.createElement(w.__PersonaNote, { t: (key: string) => key,
        message: { evidenceNote: 'AI simulation. Compare the explanation with the lesson.', sourceEvidence: saved },
        source: changed ? { ...source, excerpt: source.excerpt + ' A revised lesson.' } : source
      }));
    };
    w.__renderEvidence(false);
  });
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('mark')).toHaveText('Ada described how symbols could be manipulated by rules.');
  await expect(page.getByText('A match does not verify every claim.', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => (window as any).injected)).toBeUndefined();
  await checkAxe(page);
  await page.screenshot({ path: info.outputPath('persona-phone.png'), fullPage: true });
  await page.setViewportSize({ width: 1200, height: 900 });
  await checkAxe(page);
  await page.screenshot({ path: info.outputPath('persona-desktop.png'), fullPage: true });
  await page.evaluate(() => (window as any).__renderEvidence(true));
  await expect(page.locator('mark')).toHaveCount(0);
  await expect(page.getByText('The saved passage could not be matched', { exact: false })).toBeVisible();
});

test('Both existing Adventure views and Persona modes use the shared disclosures', () => {
  const adventure = fs.readFileSync(local('view_adventure_source.jsx'), 'utf8');
  const persona = fs.readFileSync(local('view_persona_chat_source.jsx'), 'utf8');
  expect(adventure.match(/<AdventureConsequenceCard /g)).toHaveLength(2);
  expect(persona.match(/<PersonaEvidenceNote /g)).toHaveLength(2);
  expect(adventure).toContain("entry.consequence?.version === 1");
  expect(adventure).toContain("lastFeedback.consequence?.version === 1");
});
