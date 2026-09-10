'use strict';
const fs = require('node:fs');
const file = 'dev-tools/document_export_at_acceptance.cjs';
let source = fs.readFileSync(file, 'utf8');
const eol = source.includes('\r\n') ? '\r\n' : '\n';
source = source.replace(/\r\n/g, '\n');
const start = source.indexOf('    const facts = await page.evaluate(() => ({');
const end = source.indexOf("    r.add('html.table-count'", start);
if (start < 0 || end < 0) throw Error('Export heading/table block not found');
const replacement = `    const facts = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('th,td')], rows = [...document.querySelectorAll('tr')];
      return {
        title: document.title, language: document.documentElement.lang,
        text: document.body.innerText,
        headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(e => ({ level: Number(e.tagName[1]), name: e.textContent.trim() })),
        positiveTabIndex: [...document.querySelectorAll('[tabindex]')].filter(e => e.tabIndex > 0).length,
        tables: [...document.querySelectorAll('table')].map(table => ({
          caption: table.caption?.textContent.trim() || '',
          rowIndices: [...table.rows].map(row => rows.indexOf(row)),
          rows: [...table.rows].map(row => [...row.cells].map(cell => ({ text: cell.textContent.trim(), role: cell.tagName, scope: cell.getAttribute('scope'), cellIndex: cells.indexOf(cell) }))),
        })),
      };
    });
    // Match native accessibility nodes back to their DOM identities. Name-only
    // lookup lets an unrelated exposed element stand in for a hidden target and
    // exact string lookup does not account for canonical Unicode equivalence.
    let native = { headings: [], tables: [], rows: [], cells: [], all: [] };
    if (facts.headings.length || facts.tables.length) {
      const session = await context.newCDPSession(page);
      try {
        await session.send('Accessibility.enable');
        const { root } = await session.send('DOM.getDocument', { depth: -1 });
        const domById = new Map();
        const visit = node => { domById.set(node.nodeId, node.backendNodeId); (node.children || []).forEach(visit); };
        visit(root);
        const { nodes } = await session.send('Accessibility.getFullAXTree');
        const axById = new Map(nodes.map(node => [node.nodeId, node]));
        const axByDom = new Map(nodes.filter(node => !node.ignored).map(node => [node.backendDOMNodeId, node]));
        const ancestor = (node, roles) => {
          const seen = new Set();
          for (let parent = axById.get(node?.parentId); parent && !seen.has(parent.nodeId); parent = axById.get(parent.parentId)) {
            seen.add(parent.nodeId);
            if (!parent.ignored && roles.includes(parent.role?.value)) return parent.backendDOMNodeId ?? null;
          }
          return null;
        };
        const observation = (node, backendDOMNodeId) => ({
          backendDOMNodeId, exposed: !!node, role: node?.role?.value || null, name: normalize(node?.name?.value),
          level: node?.properties?.find(property => property.name === 'level')?.value?.value ?? null,
          row: ancestor(node, ['row']), table: ancestor(node, ['table', 'grid', 'treegrid']),
        });
        for (const [kind, selector] of [['headings', 'h1,h2,h3,h4,h5,h6'], ['tables', 'table'], ['rows', 'tr'], ['cells', 'th,td']]) {
          const { nodeIds } = await session.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
          native[kind] = nodeIds.map(id => { const backend = domById.get(id); return observation(axByDom.get(backend), backend); });
        }
        native.all = nodes.filter(node => !node.ignored).map(node => observation(node, node.backendDOMNodeId));
      } finally { await session.detach(); }
    }
    r.add('html.document-identity', facts.title === expected.title && facts.language === expected.language, { title: facts.title, language: facts.language }, { title: expected.title, language: expected.language });
    r.add('html.main-landmark', await page.getByRole('main').count() === 1, await page.getByRole('main').count(), 1);
    const headings = (expected.headings || []).map(heading => ({ level: heading.level, name: normalize(heading.name) }));
    const observedHeadings = facts.headings.map(heading => ({ level: heading.level, name: normalize(heading.name) }));
    const namedHeadings = headings.map(heading => native.all.filter(node => node.role === 'heading' && node.name === heading.name && node.level === heading.level).length);
    const ownHeadingNames = observedHeadings.every((heading, index) => native.headings[index]?.role === 'heading' && native.headings[index]?.level === heading.level && native.headings[index]?.name === heading.name);
    r.add('html.heading-navigation-semantics', JSON.stringify(observedHeadings) === JSON.stringify(headings) && namedHeadings.every(n => n === 1) && ownHeadingNames, observedHeadings, headings);
    r.add('html.reading-order', ordered(facts.text, expected.readingOrder || []), { anchorsInOrder: ordered(facts.text, expected.readingOrder || []) }, expected.readingOrder || []);
    r.add('html.no-positive-tabindex', facts.positiveTabIndex === 0, facts.positiveTabIndex, 0);
    for (const [i, table] of (expected.tables || []).entries()) {
      const actual = facts.tables[i], nativeTable = native.tables[i];
      const wanted = [table.headers, ...table.rows].map(row => row.map(normalize));
      if (actual) {
        actual.accessibility = actual.rows.map((row, rowIndex) => row.map((cell, columnIndex) => {
          const node = native.cells[cell.cellIndex], nativeRow = native.rows[actual.rowIndices[rowIndex]];
          const requiredRole = rowIndex === 0 ? 'columnheader' : table.rowHeaders && columnIndex === 0 ? 'rowheader' : 'cell';
          return { exposed: !!node?.exposed, role: node?.role || null, name: node?.name || '', requiredRole,
            inRow: !!node?.row && node.row === nativeRow?.backendDOMNodeId && nativeRow?.role === 'row',
            inTable: !!node?.table && node.table === nativeTable?.backendDOMNodeId && nativeRow?.table === nativeTable?.backendDOMNodeId };
        }));
        actual.exposure = { table: nativeTable?.role === 'table',
          columnHeaders: actual.accessibility[0]?.map(cell => cell.exposed && cell.role === 'columnheader') || [],
          rowHeaders: actual.accessibility.slice(1).map(row => !!row[0]?.exposed && row[0]?.role === 'rowheader') };
        delete actual.rowIndices;
        actual.rows.forEach(row => row.forEach(cell => { delete cell.cellIndex; }));
      }
      // Image-only headers have no DOM text. Their native name is valid header
      // content; any nonempty authored text must still match independently.
      const matrix = actual?.rows.map((row, rowIndex) => row.map((cell, columnIndex) => normalize(cell.text) || (cell.role === 'TH' ? actual.accessibility[rowIndex][columnIndex].name : '')));
      const headers = actual?.rows[0];
      const rowHeaders = !table.rowHeaders || actual?.rows.slice(1).every(row => row[0]?.role === 'TH' && row[0]?.scope === 'row');
      const exposed = actual?.exposure.table && actual.accessibility.every((row, rowIndex) => row.every((cell, columnIndex) =>
        cell.exposed && cell.role === cell.requiredRole && cell.inRow && cell.inTable && cell.name === wanted[rowIndex]?.[columnIndex]));
      r.add('html.table-' + (i + 1), !!actual && normalize(actual.caption) === normalize(table.caption) && JSON.stringify(matrix) === JSON.stringify(wanted) && headers?.length > 0 && headers.every(cell => cell.role === 'TH' && cell.scope === 'col') && rowHeaders && exposed,
        actual || null, table);
    }
`;
source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(file, source.replace(/\n/g, eol));
