import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
const cases = require('../fixtures/remediation_table_roles.json');
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const program = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC ='))
  + '\nreturn "const sourceFunctions = " + JSON.stringify(sourceFunctions) + ";\\n" + harness.toString();')(fs, path);

for (const entry of cases) test('native table role preservation: ' + entry.id, async ({ page }, testInfo) => {
  await page.route('**/*', route => route.abort());
  const result = await page.evaluate(async ({ program, source, candidate }) => {
    const h = new Function(program + '\nreturn harness;')()(() => candidate);
    return { decision: h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' }), repaired: await h.run(source) };
  }, { program, source: entry.source, candidate: entry.candidate });
  expect(result.decision.accepted).toBe(entry.accepted);
  if (!entry.accepted) expect(result.decision.reason).toBe('table-semantics-changed');
  expect(result.repaired).toBe(entry.accepted ? entry.candidate : entry.source);
  const session = await page.context().newCDPSession(page);
  const observe = async (html: string) => {
    await page.setContent(html);
    const { root } = await session.send('DOM.getDocument');
    const facts: Record<string, any> = {};
    for (const id of ['row', 'datum']) {
      const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#' + id });
      const { nodes } = await session.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      facts[id] = { role: nodes[0].role?.value, name: nodes[0].name?.value, ignored: nodes[0].ignored };
    }
    return facts;
  };
  try {
    const source = await observe(entry.source), candidate = await observe(entry.candidate), repaired = await observe(result.repaired);
    expect(source.datum.role).toBe(entry.before);
    expect(candidate.datum.role).toBe(entry.after);
    expect(source.row.role).toBe(entry.rowBefore);
    expect(candidate.row.role).toBe(entry.rowAfter);
    expect(repaired).toEqual(entry.accepted ? candidate : source);
    if (!entry.accepted) expect(candidate).not.toEqual(source);
    fs.writeFileSync(testInfo.outputPath('table-roles.json'), JSON.stringify({ decision: result.decision, source, candidate, repaired }, null, 2));
  } finally { await session.detach(); }
});
