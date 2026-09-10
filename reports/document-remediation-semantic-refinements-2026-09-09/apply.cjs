const fs = require('fs');
const update = (file, fn) => { const raw = fs.readFileSync(file, 'utf8'); const s = raw.replace(/\r\n/g, '\n'); fs.writeFileSync(file, fn(s).replace(/\n/g, raw.includes('\r\n') ? '\r\n' : '\n')); };
const replace = (s, a, b) => { if (!s.includes(a)) throw Error('Missing anchor: ' + a.slice(0, 90)); return s.replace(a, b); };
update('doc_pipeline_source.jsx', s => {
 s = replace(s, "const norm = s => String(s || '').normalize('NFKC').replace(/\\s+/g, ' ').trim();", `const norm = s => String(s || '').normalize('NFKC').replace(/\\s+/g, ' ').trim();
        // Locations describe this comparison's source, never an unchecked current-DOM target.
        const rejectAt = (reason, sourceLocation) => ({ accepted: false, reason, sourceLocation });
        const nodes = (doc, selector) => Array.from(doc.querySelectorAll(selector));
        const elementLocation = el => 'element:' + (nodes(el.ownerDocument, 'body *').indexOf(el) + 1);
        const hides = style => /(?:^|[;{])\\s*(?:display\\s*:\\s*none|visibility\\s*:\\s*(?:hidden|collapse)|content-visibility\\s*:\\s*hidden|opacity\\s*:\\s*0(?:\\.0*)?)\\s*(?:!important\\s*)?(?:[;} ]|$)/i.test(style);
        const hiddenContent = doc => {
          const hidden = new Set(nodes(doc, '[hidden],[inert],[aria-hidden]').filter(el => el.hasAttribute('hidden') || el.hasAttribute('inert') || String(el.getAttribute('aria-hidden')).toLowerCase() === 'true'));
          nodes(doc, '[style]').filter(el => hides(el.getAttribute('style') || '')).forEach(el => hidden.add(el));
          // Static stylesheet rules are conservative across media conditions. External
          // styles and script-driven visibility require the rendered export validators.
          for (const sheet of nodes(doc, 'style')) {
            for (const rule of (sheet.textContent || '').matchAll(/([^{}]+)\\{([^{}]*)\\}/g)) {
              if (!hides(rule[2])) continue;
              try { nodes(doc, rule[1].trim()).forEach(el => hidden.add(el)); }
              catch (_) { throw Error('Uncheckable hiding selector'); }
            }
          }
          const result = [];
          const walk = (node, masked) => {
            const isHidden = masked || hidden.has(node);
            if (node.nodeType === 1 && /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT)$/.test(node.tagName)) return;
            if (isHidden && node.nodeType === 3 && norm(node.nodeValue)) result.push([norm(node.nodeValue), node.parentElement]);
            if (isHidden && node.nodeType === 1 && /^(IMG|INPUT|SELECT|TEXTAREA|MATH)$/.test(node.tagName)) result.push([node.tagName + ':' + (node.getAttribute('src') || node.getAttribute('name') || norm(node.textContent)), node]);
            for (const child of Array.from(node.childNodes || [])) walk(child, isHidden);
          };
          walk(doc.body, false); return result;
        };
        const hiddenBudget = new Map();
        hiddenContent(before).forEach(([key]) => hiddenBudget.set(key, (hiddenBudget.get(key) || 0) + 1));
        for (const [key] of hiddenContent(after)) {
          const remaining = hiddenBudget.get(key) || 0;
          if (!remaining) return rejectAt('source-visibility-changed', 'document');
          hiddenBudget.set(key, remaining - 1);
        }
        const sourceTableNodes = nodes(before, 'table'), outputTableNodes = nodes(after, 'table');
        for (let ti = 0; ti < sourceTableNodes.length; ti++) {
          const a = sourceTableNodes[ti], b = outputTableNodes[ti];
          if (!b) continue; // The grid check below reports removed tables.
          const role = el => (el.getAttribute('role') || '').trim().toLowerCase();
          if (!/^(none|presentation)$/.test(role(a)) && /^(none|presentation)$/.test(role(b))) return rejectAt('table-semantics-changed', 'table:' + (ti + 1));
          const cells = table => nodes(table, 'td,th').filter(el => el.closest('table') === table);
          const ac = cells(a), bc = cells(b);
          for (let ci = 0; ci < ac.length; ci++) {
            if (!bc[ci]) continue;
            const loc = 'table:' + (ti + 1) + '/cell:' + (ci + 1);
            if (ac[ci].tagName === 'TH' && (bc[ci].tagName !== 'TH' || /^(none|presentation)$/.test(role(bc[ci])))) return rejectAt('table-semantics-changed', loc);
            const scope = ac[ci].getAttribute('scope');
            if (scope && scope !== bc[ci].getAttribute('scope')) return rejectAt('table-semantics-changed', loc);
            const headers = (cell, all) => (cell.getAttribute('headers') || '').trim().split(/\\s+/).filter(Boolean).map(id => all.findIndex(el => el.id === id));
            const ah = headers(ac[ci], ac), bh = headers(bc[ci], bc);
            if (ah.length && ah.every(i => i >= 0) && JSON.stringify(ah) !== JSON.stringify(bh)) return rejectAt('table-semantics-changed', loc);
          }
        }
        const formState = doc => nodes(doc, 'form,input,select,textarea,button').map(el => {
          const attrs = ['name','type','value','checked','selected','multiple','disabled','readonly','required','min','max','step','pattern','action','method','enctype','formaction','formmethod','formenctype'];
          const labels = Array.from(el.labels || []).map(label => norm(label.textContent));
          const owner = el.form ? nodes(doc, 'form').indexOf(el.form) : -1;
          const options = el.tagName === 'SELECT' ? nodes(el, 'option').map(o => [o.value, o.selected, o.disabled, norm(o.textContent)]) : [];
          return { state: [el.tagName, attrs.map(name => el.getAttribute(name)), owner, el.tagName === 'TEXTAREA' ? el.value : '', options], labels };
        });
        const af = formState(before), bf = formState(after);
        for (let i = 0; i < Math.max(af.length, bf.length); i++) {
          if (!af[i] || !bf[i] || JSON.stringify(af[i].state) !== JSON.stringify(bf[i].state)
            || af[i].labels.some(label => !bf[i].labels.includes(label))) return rejectAt('form-state-changed', 'control:' + (i + 1));
        }
        const mathTree = el => {
          if (el.nodeType === 3) return norm(el.nodeValue);
          if (el.nodeType !== 1 || /^(annotation|annotation-xml)$/.test(el.localName)) return null;
          const children = Array.from(el.childNodes).map(mathTree).filter(v => v !== null && v !== '');
          return [el.localName, ['mathvariant','notation','linethickness','open','close','separators'].map(a => el.getAttribute(a)), children];
        };
        const am = nodes(before, 'math'), bm = nodes(after, 'math');
        for (let i = 0; i < Math.max(am.length, bm.length); i++) {
          if (!am[i] || !bm[i] || JSON.stringify(mathTree(am[i])) !== JSON.stringify(mathTree(bm[i]))) return rejectAt('math-content-changed', 'math:' + (i + 1));
        }`);
 s = replace(s, `if (sourceTables.length && JSON.stringify(sourceTables) !== JSON.stringify(tableGrid(after))) {
          return { accepted: false, reason: 'table-content-changed' };
        }`, `const outputTables = tableGrid(after);
        if (sourceTables.length && JSON.stringify(sourceTables) !== JSON.stringify(outputTables)) {
          for (let ti = 0; ti < sourceTables.length; ti++) {
            const rows = sourceTables[ti], otherRows = outputTables[ti];
            if (!otherRows) return rejectAt('table-content-changed', 'table:' + (ti + 1));
            for (let ri = 0; ri < rows.length; ri++) {
              for (let ci = 0; ci < rows[ri].length; ci++) {
                if (JSON.stringify(rows[ri][ci]) !== JSON.stringify(otherRows[ri] && otherRows[ri][ci]))
                  return rejectAt('table-content-changed', 'table:' + (ti + 1) + '/row:' + (ri + 1) + '/cell:' + (ci + 1));
              }
            }
          }
          return rejectAt('table-content-changed', 'document');
        }`);
 s = replace(s, `return { accepted: false, reason: 'link-destination-changed' };`, `const at = sourceLinks.findIndex((link, i) => !outputLinks[i] || destination(link) !== destination(outputLinks[i]));
          return rejectAt('link-destination-changed', 'link:' + (at < 0 ? sourceLinks.length + 1 : at + 1));`);
 s = replace(s, `return { accepted: false, reason: selector === 'figure' ? 'image-association-changed' : 'table-content-changed' };`, `return rejectAt(selector === 'figure' ? 'image-association-changed' : 'table-content-changed', (selector === 'figure' ? 'figure:' : 'table:') + (i + 1));`);
 s = replace(s, `const elementLocation = el => 'element:' + (nodes(el.ownerDocument, 'body *').indexOf(el) + 1);\n        `, '');
 s = s.replaceAll("phase, reason: decision.reason || 'content-not-preserved'", "phase, reason: decision.reason || 'content-not-preserved', ...(decision.sourceLocation ? { sourceLocation: decision.sourceLocation } : {})");
 s = replace(s, "phase: 'chunk', reason: sourceDecision.reason", "phase: 'chunk', reason: sourceDecision.reason, ...(sourceDecision.sourceLocation ? { sourceLocation: sourceDecision.sourceLocation } : {})");
 s = s.replaceAll('phase: record.phase, reason: record.reason', 'phase: record.phase, reason: record.reason, ...(record.sourceLocation ? { sourceLocation: record.sourceLocation } : {})');
 s = s.replaceAll('phase: entry.phase, reason: entry.reason', 'phase: entry.phase, reason: entry.reason, ...(entry.sourceLocation ? { sourceLocation: entry.sourceLocation } : {})');
 return replace(s, "20260909-1", "20260909-2");
});
const pattern = '^(?:document|(?:table|row|cell|link|figure|control|math):[1-9][0-9]{0,7}(?:/(?:row|cell):[1-9][0-9]{0,7}){0,2})$';
const reasons = {
 'source-visibility-changed': 'The suggestion hid source content from view or assistive technology; the original was retained.',
 'table-semantics-changed': 'Existing table headers or associations lost their meaning; the original table was retained.',
 'form-state-changed': 'A form value, state, label association, or destination changed; the original form was retained.',
 'math-content-changed': 'Mathematical notation or structure changed; the original expression was retained.'
};
update('remediation_review_helpers.js', s => {
 s = replace(s, "var reasons = {", 'var reasons = {\n' + Object.entries(reasons).map(([k,v]) => '    ' + JSON.stringify(k) + ': ' + JSON.stringify(v) + ',').join('\n'));
 s = replace(s, 'return item;', `if (typeof r.sourceLocation === 'string' && /${pattern}/.test(r.sourceLocation)) item.sourceLocation = r.sourceLocation;\n      return item;`.replace('(?:/', '(?:\\/'));
 s = replace(s, "description: reasons[r.reason] || reasons['content-not-preserved'],", "description: reasons[r.reason] || reasons['content-not-preserved'],\n        locationLabel: r.sourceLocation ? 'Location in the input for this attempt: ' + r.sourceLocation.replace(/:/g, ' ').replace(/\\//g, ', ') + '.' : '',");
 return s;
});
update('desktop/mcp/remediation_verification.cjs', s => {
 s = replace(s, "pass: { type: 'integer', minimum: 1, maximum: 1000000 },", "sourceLocation: { type: 'string', maxLength: 100, pattern: " + JSON.stringify(pattern) + " },\n      pass: { type: 'integer', minimum: 1, maximum: 1000000 },");
 s = replace(s, "'content-not-preserved']", Object.keys(reasons).map(k => JSON.stringify(k)).join(', ') + ", 'content-not-preserved']");
 return replace(s, 'records.push(record);', "if (typeof entry.sourceLocation === 'string' && fields.sourceLocation && entry.sourceLocation.length <= fields.sourceLocation.maxLength && new RegExp(fields.sourceLocation.pattern).test(entry.sourceLocation)) record.sourceLocation = entry.sourceLocation;\n      records.push(record);");
});
update('remediation_review_component.jsx', s => replace(s, '<p>{item.description}</p>', '<p>{item.description}</p>{item.locationLabel && <p className="mt-1 text-slate-600">{item.locationLabel}</p>}'));
update('view_pdf_audit_source.jsx', s => s.replaceAll("reason: String(entry.reason || '').slice(0, 120)", "reason: String(entry.reason || '').slice(0, 120), ...(typeof entry.sourceLocation === 'string' ? { sourceLocation: entry.sourceLocation.slice(0, 100) } : {})"));
console.log('Applied semantic guards and bounded source locations.');
