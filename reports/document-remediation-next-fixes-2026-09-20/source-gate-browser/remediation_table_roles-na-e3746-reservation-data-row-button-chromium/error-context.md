# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remediation_table_roles.spec.ts >> native table role preservation: data-row-button
- Location: tests\e2e\remediation_table_roles.spec.ts:9:32

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "cell"
Received: "generic"
```

# Page snapshot

```yaml
- main [ref=e2]:
  - table [ref=e3]:
    - rowgroup [ref=e4]:
      - row "Group Score" [ref=e5]:
        - columnheader "Group" [ref=e6]
        - columnheader "Score" [ref=e7]
      - row "North 95" [ref=e8]:
        - cell "North" [ref=e9]
        - cell "95" [ref=e10]
  - paragraph [ref=e11]: Read the original instructions carefully and record observations in your notebook.
  - paragraph [ref=e12]: Read the original instructions carefully and record observations in your notebook.
  - paragraph [ref=e13]: Read the original instructions carefully and record observations in your notebook.
  - paragraph [ref=e14]: Read the original instructions carefully and record observations in your notebook.
  - paragraph [ref=e15]: Read the original instructions carefully and record observations in your notebook.
  - paragraph [ref=e16]: Read the original instructions carefully and record observations in your notebook.
  - paragraph [ref=e17]: Read the original instructions carefully and record observations in your notebook.
  - paragraph [ref=e18]: Read the original instructions carefully and record observations in your notebook.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import * as fs from 'node:fs';
  3  | import * as path from 'node:path';
  4  | const cases = require('../fixtures/remediation_table_roles.json');
  5  | const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
  6  | const program = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC ='))
  7  |   + '\nreturn "const sourceFunctions = " + JSON.stringify(sourceFunctions) + ";\\n" + harness.toString();')(fs, path);
  8  | 
  9  | for (const entry of cases) test('native table role preservation: ' + entry.id, async ({ page }, testInfo) => {
  10 |   await page.route('**/*', route => route.abort());
  11 |   const result = await page.evaluate(async ({ program, source, candidate }) => {
  12 |     const h = new Function(program + '\nreturn harness;')()(() => candidate);
  13 |     return { decision: h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' }), repaired: await h.run(source) };
  14 |   }, { program, source: entry.source, candidate: entry.candidate });
  15 |   expect(result.decision.accepted).toBe(entry.accepted);
  16 |   if (!entry.accepted) expect(result.decision.reason).toBe('table-semantics-changed');
  17 |   expect(result.repaired).toBe(entry.accepted ? entry.candidate : entry.source);
  18 |   const session = await page.context().newCDPSession(page);
  19 |   const observe = async (html: string) => {
  20 |     await page.setContent(html);
  21 |     const { root } = await session.send('DOM.getDocument');
  22 |     const facts: Record<string, any> = {};
  23 |     for (const id of ['row', 'datum']) {
  24 |       const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#' + id });
  25 |       const { nodes } = await session.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
  26 |       facts[id] = { role: nodes[0].role?.value, name: nodes[0].name?.value, ignored: nodes[0].ignored };
  27 |     }
  28 |     return facts;
  29 |   };
  30 |   try {
  31 |     const source = await observe(entry.source), candidate = await observe(entry.candidate), repaired = await observe(result.repaired);
  32 |     expect(source.datum.role).toBe(entry.before);
> 33 |     expect(candidate.datum.role).toBe(entry.after);
     |                                  ^ Error: expect(received).toBe(expected) // Object.is equality
  34 |     expect(source.row.role).toBe(entry.rowBefore);
  35 |     expect(candidate.row.role).toBe(entry.rowAfter);
  36 |     expect(repaired).toEqual(entry.accepted ? candidate : source);
  37 |     if (!entry.accepted) expect(candidate).not.toEqual(source);
  38 |     fs.writeFileSync(testInfo.outputPath('table-roles.json'), JSON.stringify({ decision: result.decision, source, candidate, repaired }, null, 2));
  39 |   } finally { await session.detach(); }
  40 | });
  41 | 
```