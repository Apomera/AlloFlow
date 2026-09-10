const fs=require('fs');
const p='doc_pipeline_source.jsx';const raw=fs.readFileSync(p,'utf8');let s=raw.replace(/\r\n/g,'\n');
const replace=(a,b)=>{if(!s.includes(a))throw Error('Missing anchor '+a.slice(0,90));s=s.replace(a,b);};
const a=s.indexOf('        const hides = style =>'),b=s.indexOf('        const sourceTableNodes =',a);
if(a<0||b<0)throw Error('Missing visibility boundaries');
s=s.slice(0,a)+`        const hiddenContent = doc => {
          const hidden = new Set(nodes(doc, '[hidden],[inert],[aria-hidden]').filter(el => el.hasAttribute('hidden') || el.hasAttribute('inert') || String(el.getAttribute('aria-hidden')).toLowerCase() === 'true'));
          // Resolve ordinary static CSS declarations without running document scripts.
          // Unsupported selectors/conditional rules remain conservative; rendered
          // export checks still own external styles and dynamic visibility.
          const properties = ['display', 'visibility', 'content-visibility', 'opacity'];
          const styles = new Map();
          const applyStyle = (el, declarations, specificity) => {
            const parser = doc.createElement('span'); parser.setAttribute('style', declarations);
            let state = styles.get(el); if (!state) { state = {}; styles.set(el, state); }
            for (const property of properties) {
              const value = parser.style.getPropertyValue(property).trim().toLowerCase();
              if (!value) continue;
              const rank = (parser.style.getPropertyPriority(property) === 'important' ? 1e9 : 0) + specificity;
              if (!state[property] || rank >= state[property].rank) state[property] = { value, rank };
            }
          };
          for (const sheet of nodes(doc, 'style')) {
            for (const rule of (sheet.textContent || '').replace(/\\/\\*[\\s\\S]*?\\*\\//g, '').matchAll(/([^{}]+)\\{([^{}]*)\\}/g)) {
              if (!/(?:display|visibility|content-visibility|opacity)\\s*:/i.test(rule[2])) continue;
              for (const selector of rule[1].trim().split(',')) {
                // Simple compound/descendant selectors have predictable specificity.
                // Do not approximate functional pseudo-class specificity as lower.
                if (/[:|\\\\]/.test(selector)) throw Error('Uncheckable visibility selector');
                const ids = (selector.match(/#[\\w-]+/g) || []).length;
                const classes = (selector.match(/\\.[\\w-]+|\\[[^\\]]+\\]/g) || []).length;
                const types = (selector.replace(/#[\\w-]+|\\.[\\w-]+|\\[[^\\]]+\\]/g, '').match(/[a-zA-Z][\\w-]*/g) || []).length;
                const specificity = ids * 10000 + classes * 100 + types;
                for (const el of nodes(doc, selector.trim())) applyStyle(el, rule[2], specificity);
              }
            }
          }
          for (const el of nodes(doc, '[style]')) applyStyle(el, el.getAttribute('style') || '', 1e6);
          for (const [el, state] of styles) {
            const value = key => state[key] && state[key].value;
            if (value('display') === 'none' || /^(hidden|collapse)$/.test(value('visibility') || '')
              || value('content-visibility') === 'hidden' || (value('opacity') && Number(value('opacity')) === 0)) hidden.add(el);
          }
          // Track each word occurrence in document order, including visible copies.
          // A hidden duplicate in another section cannot authorize hiding this one.
          let text = ''; const masks = [];
          const append = (value, masked) => { text += value; for (let i = 0; i < value.length; i++) masks.push(masked); };
          const walk = (node, masked) => {
            const isHidden = masked || hidden.has(node);
            if (node.nodeType === 1 && /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT)$/.test(node.tagName)) return;
            if (node.nodeType === 3) append(String(node.nodeValue || '').normalize('NFKC'), isHidden);
            if (node.nodeType === 1 && /^(IMG|INPUT|SELECT|TEXTAREA|MATH)$/.test(node.tagName)) append(' asset:' + node.tagName + ':' + (node.getAttribute('src') || node.getAttribute('name') || '') + ' ', isHidden);
            const block = node.nodeType === 1 && /^(P|DIV|SECTION|ARTICLE|MAIN|H[1-6]|LI|TD|TH|TR|BR|LABEL)$/.test(node.tagName);
            if (block) append(' ', isHidden);
            for (const child of Array.from(node.childNodes || [])) walk(child, isHidden);
            if (block) append(' ', isHidden);
          };
          walk(doc.body, false);
          const occurrences = new Map(), result = new Set();
          for (const match of text.matchAll(/\\S+/g)) {
            const word = match[0], count = (occurrences.get(word) || 0) + 1;
            occurrences.set(word, count);
            if (masks.slice(match.index, match.index + word.length).some(Boolean)) result.add(JSON.stringify([word, count]));
          }
          return result;
        };
        const sourceHidden = hiddenContent(before);
        for (const key of hiddenContent(after)) {
          if (!sourceHidden.has(key)) return rejectAt('source-visibility-changed', 'document');
        }
`+s.slice(b);
replace("if (scope && ac.length > 1 && scope !== bc[ci].getAttribute('scope')) return rejectAt('table-semantics-changed', loc);",`if (scope && ac.length > 1 && scope !== bc[ci].getAttribute('scope')) {
              // A simple first row consisting entirely of unspanned headers can
              // correct row scope to column scope; complex grids stay conservative.
              const rows = nodes(a, 'tr').filter(row => row.closest('table') === a);
              const first = rows[0], rowCells = first ? Array.from(first.children).filter(el => /^(TD|TH)$/.test(el.tagName)) : [];
              const simpleColumnRepair = scope === 'row' && bc[ci].getAttribute('scope') === 'col'
                && ac[ci].parentElement === first && rows.length > 1 && rowCells.length > 1
                && rowCells.every(el => el.tagName === 'TH' && el.rowSpan === 1 && el.colSpan === 1)
                && rows.slice(1).every(row => Array.from(row.children).filter(el => /^(TD|TH)$/.test(el.tagName)).length === rowCells.length)
                && ac.every(el => el.rowSpan === 1 && el.colSpan === 1 && !el.hasAttribute('headers'));
              if (!simpleColumnRepair) return rejectAt('table-semantics-changed', loc);
            }`);
replace("return { accessibleName: el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') || '').split(/\\s+/).filter(Boolean).map(id => norm(doc.getElementById(id)?.textContent)).join(' '), state: [el.tagName, attrs.map(name => el.getAttribute(name)), owner, el.tagName === 'TEXTAREA' ? el.value : '', options], labels };",`const namedRefs = (el.getAttribute('aria-labelledby') || '').trim().split(/\\s+/).map(id => doc.getElementById(id)).filter(Boolean);
          const accessibleName = namedRefs.length ? namedRefs.map(ref => norm(ref.getAttribute('aria-label') || ref.textContent)).join(' ') : el.getAttribute('aria-label') || '';
          const attributeState = attrs.map(name => name === 'type' && el.tagName === 'INPUT' ? el.type : el.getAttribute(name));
          return { accessibleName, state: [el.tagName, attributeState, owner, el.tagName === 'TEXTAREA' ? el.value : '', options, el.matches(':disabled')], labels };`);
replace("if (!am[i] || !bm[i] || JSON.stringify(mathTree(am[i])) !== JSON.stringify(mathTree(bm[i])))",`const mathName = el => {
            const refs = el ? (el.getAttribute('aria-labelledby') || '').trim().split(/\\s+/).map(id => el.ownerDocument.getElementById(id)).filter(Boolean) : [];
            return refs.length ? refs.map(ref => norm(ref.textContent)).join(' ') : el && el.getAttribute('aria-label') || '';
          };
          if (!am[i] || !bm[i] || (mathName(am[i]) && mathName(am[i]) !== mathName(bm[i])) || JSON.stringify(mathTree(am[i])) !== JSON.stringify(mathTree(bm[i])))`);
replace("const sourceLinks = Array.from(before.querySelectorAll('a[href]'));",`// Base changes affect every relative destination, including forms and assets.
        if ((before.querySelector('base[href]')?.getAttribute('href') || '') !== (after.querySelector('base[href]')?.getAttribute('href') || '')) return rejectAt('link-destination-changed', 'document');
        const sourceLinks = Array.from(before.querySelectorAll('a[href]'));`);
replace("if (JSON.stringify(sourceLinks.map(destination)) !== JSON.stringify(outputLinks.map(destination))) {",`const boundDestination = anchor => {
          const href = destination(anchor);
          if (!href.startsWith('#')) return href;
          let id; try { id = decodeURIComponent(href.slice(1)); } catch (_) { return href; }
          const target = anchor.ownerDocument.getElementById(id);
          if (!target) return href;
          const signature = el => JSON.stringify([norm(el.textContent), nodes(el, 'img,image').map(img => img.getAttribute('src') || img.getAttribute('href') || '')]);
          const value = signature(target);
          const matches = nodes(anchor.ownerDocument, '[id]').filter(el => signature(el) === value);
          // Ambiguous or duplicate targets must retain their identifiers as well.
          return 'internal:' + value + (matches.length > 1 ? ':' + href : '');
        };
        if (JSON.stringify(sourceLinks.map(boundDestination)) !== JSON.stringify(outputLinks.map(boundDestination))) {`);
replace("destination(link) !== destination(outputLinks[i])", "boundDestination(link) !== boundDestination(outputLinks[i])");
replace("// Anchor labels can become descriptive without authorizing href changes.",`// Preserve symbolic operators in prose too. Numeric signs retain their
        // existing canonical-number policy; descriptive new captions are excluded.
        const symbols = doc => (String(doc.body.textContent || '').replace(numericPattern, '').match(/[+−=×÷<>≤≥≠±∞∑∏√∫]/g) || []).join('');
        if (symbols(before) !== symbols(after)) return rejectAt('math-content-changed', 'document');
        // Anchor labels can become descriptive without authorizing href changes.`);
replace("'20260909-2'", "'20260909-3'");
fs.writeFileSync(p,s.replace(/\n/g,raw.includes('\r\n')?'\r\n':'\n'));
console.log('Applied follow-up fidelity refinements.');
