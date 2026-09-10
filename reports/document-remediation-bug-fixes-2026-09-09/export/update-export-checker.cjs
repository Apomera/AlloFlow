'use strict';
const fs = require('node:fs');
const file = 'dev-tools/document_export_at_acceptance.cjs';
let source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const replace = (before, after) => {
  if (!source.includes(before)) throw Error('Missing patch target: ' + before.slice(0, 100));
  source = source.replace(before, after);
};
replace("    await context.route('**/*', route => { blockedNetworkRequests++; return route.abort('blockedbyclient'); });", `    // A fulfilled document origin makes relative CSS resource requests observable.
    // Only this first navigation is served; all document dependencies stay blocked.
    const entry = 'https://export-acceptance.invalid/artifacts/document.html';
    let servedDocument = false;
    await context.route('**/*', route => {
      const request = route.request();
      if (!servedDocument && request.url() === entry && request.isNavigationRequest()) {
        servedDocument = true;
        return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
      }
      blockedNetworkRequests++;
      return route.abort('blockedbyclient');
    });`);
replace('    await page.setContent(html);', "    await page.goto(entry, { waitUntil: 'load' });");
replace("    for (const [i, table] of (expected.tables || []).entries()) {\n      const actual = facts.tables[i];", `    // Match exposed roles to the actual DOM table/cells, so another accessible
    // table or a similarly named header cannot stand in for a hidden target.
    const exposedTables = await page.getByRole('table').evaluateAll(exposed => [...document.querySelectorAll('table')].map(table => exposed.includes(table)));
    const exposedHeaders = {};
    for (const role of ['columnheader', 'rowheader']) exposedHeaders[role] = await page.getByRole(role).evaluateAll(exposed =>
      [...document.querySelectorAll('table')].map(table => [...table.rows].map(row => [...row.cells].map(cell => exposed.includes(cell)))));
    for (const [i, table] of (expected.tables || []).entries()) {
      const actual = facts.tables[i];
      if (actual) actual.exposure = { table: exposedTables[i],
        columnHeaders: exposedHeaders.columnheader[i]?.[0] || [],
        rowHeaders: exposedHeaders.rowheader[i]?.slice(1).map(row => row[0]) || [] };`);
replace('      const wanted = [table.headers, ...table.rows];', '      const wanted = [table.headers, ...table.rows].map(row => row.map(normalize));');
replace("      const rowHeaders = !table.rowHeaders || actual?.rows.slice(1).every(row => row[0].role === 'TH' && row[0].scope === 'row');\n      r.add('html.table-' + (i + 1), !!actual && actual.caption === table.caption && JSON.stringify(matrix) === JSON.stringify(wanted) && headers.every(cell => cell.role === 'TH' && cell.scope === 'col') && rowHeaders,", `      const rowHeaders = !table.rowHeaders || actual?.rows.slice(1).every(row => row[0]?.role === 'TH' && row[0]?.scope === 'row');
      const exposed = actual?.exposure.table && actual.exposure.columnHeaders.length > 0 && actual.exposure.columnHeaders.every(Boolean)
        && (!table.rowHeaders || actual.exposure.rowHeaders.every(Boolean));
      r.add('html.table-' + (i + 1), !!actual && normalize(actual.caption) === normalize(table.caption) && JSON.stringify(matrix) === JSON.stringify(wanted) && headers?.length > 0 && headers.every(cell => cell.role === 'TH' && cell.scope === 'col') && rowHeaders && exposed,`);
replace("      const scripts = Array.from(document.scripts).filter(script => !/^(application\\/(?:ld\\+json|json)(?:\\s*;.*)?|text\\/plain)$/i.test(script.type.trim())).length", `      const scripts = Array.from(document.scripts).filter(script => {
        // Unknown non-JavaScript types are inert data blocks, including XML.
        // Import maps/speculation rules still affect document behavior.
        const declared = script.getAttribute('type');
        const type = declared === null
          ? (script.getAttribute('language') ? 'text/' + script.getAttribute('language') : 'text/javascript')
          : declared.trim() || 'text/javascript';
        return ['module', 'importmap', 'speculationrules'].includes(type)
          || /^(?:application\\/(?:x-)?(?:java|ecma)script|text\\/(?:(?:x-)?(?:java|ecma)script|javascript1\\.[0-5]|jscript|livescript))$/i.test(type);
      }).length`);
replace("      const animations = document.getAnimations().filter(animation => !['finished', 'idle'].includes(animation.playState)).length;\n      return { scripts, unresolved: resources, animations };", String.raw`      // Inactive rules and hidden elements may not request their assets. Inspect
      // parsed declarations as well as actual requests, retaining embedded data
      // and same-document SVG references as self-contained resources.
      const cssReferences = new Set();
      const decodeCss = value => value.replace(/\\(?:([0-9a-f]{1,6})\s?|([^\r\n]))/gi, (_, hex, char) =>
        hex ? String.fromCodePoint(Math.min(parseInt(hex, 16) || 0xfffd, 0x10ffff)) : char);
      const addCssReference = value => {
        const decoded = decodeCss(value).trim();
        if (decoded && !decoded.startsWith('#') && external(decoded)) cssReferences.add(decoded);
      };
      const inspectStyle = style => {
        if (!style) return;
        for (const property of style) {
          const value = style.getPropertyValue(property);
          const urls = /url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|((?:\\.|[^)\\])*))\s*\)/gi;
          for (const match of value.matchAll(urls)) addCssReference(match[1] ?? match[2] ?? match[3]);
          // CSS image-set permits bare string URLs in addition to url().
          if (/(?:^|[^\w-])(?:-webkit-)?image-set\(/i.test(value)) {
            for (const match of value.matchAll(/(?:image-set\(|,)\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')/gi)) addCssReference(match[1] ?? match[2]);
          }
        }
      };
      const inspectRules = rules => {
        for (const rule of rules) {
          if (rule.type === CSSRule.IMPORT_RULE) addCssReference(rule.href);
          inspectStyle(rule.style);
          if (rule.cssRules) inspectRules(rule.cssRules);
        }
      };
      elements.forEach(element => inspectStyle(element.style));
      let inaccessibleStyleSheets = 0;
      for (const sheet of document.styleSheets) {
        try { inspectRules(sheet.cssRules); } catch { inaccessibleStyleSheets++; }
      }
      const animations = document.getAnimations().filter(animation => !['finished', 'idle'].includes(animation.playState)).length;
      return { scripts, unresolved: resources + cssReferences.size + inaccessibleStyleSheets, animations };`);
replace('      const wanted = [table.headers, ...table.rows];', '      const wanted = [table.headers, ...table.rows].map(row => row.map(normalize));');
fs.writeFileSync(file, source);
