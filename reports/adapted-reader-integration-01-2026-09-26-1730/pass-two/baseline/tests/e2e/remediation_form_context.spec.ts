import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
const cases = require('../fixtures/remediation_form_context.json');
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const harnessProgram = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC ='))
  + '\nreturn "const sourceFunctions = " + JSON.stringify(sourceFunctions) + ";\\n" + harness.toString();')(fs, path);

async function observe(page: any, html: string) {
  await page.setContent(html);
  const session = await page.context().newCDPSession(page);
  try {
    const { nodes } = await session.send('Accessibility.getFullAXTree');
    const index = new Map(nodes.map((node: any) => [node.nodeId, node]));
    // The CDP flat tree is not DOM order: a neutral wrapper changes its
    // breadth-first enumeration. Bind observations to actual control identities.
    const { root } = await session.send('DOM.getDocument');
    const { nodeIds } = await session.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'input,textarea' });
    const order = new Map();
    for (const [index, nodeId] of nodeIds.entries()) {
      const { node } = await session.send('DOM.describeNode', { nodeId });
      order.set(node.backendNodeId, index);
    }
    const names = nodes.filter((node: any) => !node.ignored && node.role?.value === 'textbox')
      .sort((a: any, b: any) => order.get(a.backendDOMNodeId) - order.get(b.backendDOMNodeId)).map((node: any) => {
      const groups = [];
      for (let ancestor: any = index.get(node.parentId); ancestor; ancestor = index.get(ancestor.parentId)) {
        if (!ancestor.ignored && ancestor.role?.value === 'group' && ancestor.name?.value) groups.unshift(ancestor.name.value);
      }
      return { name: node.name?.value || '', description: node.description?.value || '', groups };
    });
    let typed = null;
    if (await page.locator('textarea').count()) {
      await page.locator('textarea').pressSequentially('Blueberries grow well.');
      typed = await page.locator('textarea').inputValue();
    }
    return { names, typed };
  } finally { await session.detach(); }
}

for (const entry of cases) test('native form preservation: ' + entry.id, async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  await context.route('**/*', route => route.abort());
  try {
    const page = await context.newPage();
    const result = await page.evaluate(async ({ program, source, candidate }) => {
      const make = new Function(program + '\nreturn harness;')();
      const h = make(() => candidate);
      const decision = h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' });
      const repaired = await h.run(source);
      return { decision, repaired, evidence: h.evidence };
    }, { program: harnessProgram, source: entry.source, candidate: entry.candidate });
    expect(result.decision.accepted).toBe(entry.expected === 'accept');
    expect(result.repaired).toBe(entry.expected === 'accept' ? entry.candidate : entry.source);
    if (entry.expected === 'reject') expect(result.decision.reason).toBe('form-state-changed');
    const source = await observe(page, entry.source);
    const candidate = await observe(page, entry.candidate);
    const repaired = await observe(page, result.repaired);
    expect(JSON.stringify(repaired).normalize('NFC')).toBe(JSON.stringify(source).normalize('NFC'));
    if (entry.expected === 'reject') expect(candidate).not.toEqual(source);
    if (entry.id === 'maxlength-truncates-response') {
      expect(source.typed).toBe('Blueberries grow well.');
      expect(candidate.typed).toBe('Blueb');
    }
    fs.writeFileSync(testInfo.outputPath('observations.json'), JSON.stringify({ ...result, source, candidate, repaired }, null, 2));
  } finally { await context.close(); }
});

test('minimum lengths retain native user-input validity', async ({ page }) => {
  const source = '<!doctype html><html lang="en"><body><main><label>Response<input minlength="2"></label><p>Write your original observations.</p></main></body></html>';
  const candidate = source.replace('minlength="2"', 'minlength="5"');
  await page.setContent(source);
  await page.locator('input').pressSequentially('abc');
  expect(await page.locator('input').evaluate((el: HTMLInputElement) => el.validity.tooShort)).toBe(false);
  await page.setContent(candidate);
  await page.locator('input').pressSequentially('abc');
  expect(await page.locator('input').evaluate((el: HTMLInputElement) => el.validity.tooShort)).toBe(true);
  const decision = await page.evaluate(({ program, source, candidate }) => {
    const h = new Function(program + '\nreturn harness;')()(() => candidate);
    return h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' });
  }, { program: harnessProgram, source, candidate });
  expect(decision).toMatchObject({ accepted: false, reason: 'form-state-changed' });
});
