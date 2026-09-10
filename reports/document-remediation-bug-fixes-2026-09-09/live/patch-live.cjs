const fs = require('node:fs');
const file = 'doc_pipeline_source.jsx';
let text = fs.readFileSync(file, 'utf8');
function replace(oldText, newText) {
  if (!text.includes(oldText)) throw Error('Missing source anchor: ' + oldText.slice(0, 100));
  text = text.replace(oldText, newText);
}
replace("const _PIPELINE_PROMPT_VERSION = '20260909-4'", "const _PIPELINE_PROMPT_VERSION = '20260909-5'");
replace("          const cells = table => nodes(table, 'td,th').filter(el => el.closest('table') === table);", `          // ARIA role tokens use the first recognized concrete role. Invalid
          // fallback tokens do not override a native table header.
          const concreteRoles = new Set(('alert alertdialog application article banner blockquote button caption cell checkbox code columnheader combobox complementary contentinfo definition deletion dialog directory document emphasis feed figure form generic grid gridcell group heading img insertion link list listbox listitem log main marquee math menu menubar menuitem menuitemcheckbox menuitemradio meter navigation none note option paragraph presentation progressbar radio radiogroup region row rowgroup rowheader scrollbar search searchbox separator slider spinbutton status strong subscript superscript switch tab table tablist tabpanel term textbox time timer toolbar tooltip tree treegrid treeitem').split(' '));
          const headerRole = el => role(el).split(/\\s+/).find(value => concreteRoles.has(value))
            || (/^(row|rowgroup)$/i.test(el.getAttribute('scope') || '') ? 'rowheader' : 'columnheader');
          const cells = table => nodes(table, 'td,th').filter(el => el.closest('table') === table);`);
replace("            if (ac[ci].tagName === 'TH' && (bc[ci].tagName !== 'TH' || /^(none|presentation)$/.test(role(bc[ci])))) return rejectAt('table-semantics-changed', loc);\n            const scope = ac[ci].getAttribute('scope');", `            const sourceHeaderRole = headerRole(ac[ci]), outputHeaderRole = headerRole(bc[ci]);
            if (ac[ci].tagName === 'TH' && (bc[ci].tagName !== 'TH'
              || (/^(rowheader|columnheader)$/.test(sourceHeaderRole) && !/^(rowheader|columnheader)$/.test(outputHeaderRole)))) return rejectAt('table-semantics-changed', loc);
            const scope = ac[ci].getAttribute('scope');
            let allowedScopeRepair = ac.length === 1 && scope === 'row' && bc[ci].getAttribute('scope') === 'col';`);
replace("              if (!simpleColumnRepair) return rejectAt('table-semantics-changed', loc);", "              if (!simpleColumnRepair) return rejectAt('table-semantics-changed', loc);\n              allowedScopeRepair = simpleColumnRepair;");
replace("            const headers = (cell, all) =>", `            if (ac[ci].tagName === 'TH' && /^(rowheader|columnheader)$/.test(sourceHeaderRole)
              && sourceHeaderRole !== outputHeaderRole && !(allowedScopeRepair && outputHeaderRole === 'columnheader')) return rejectAt('table-semantics-changed', loc);
            const headers = (cell, all) =>`);
replace("          const namedRefs = (el.getAttribute('aria-labelledby') || '').trim().split(/\\s+/).map(id => doc.getElementById(id)).filter(Boolean);\n          const accessibleName = namedRefs.length ? namedRefs.map(ref => norm(ref.getAttribute('aria-label') || ref.textContent)).join(' ') : el.getAttribute('aria-label') || '';", `          const references = attr => (el.getAttribute(attr) || '').trim().split(/\\s+/).map(id => doc.getElementById(id)).filter(Boolean);
          const referenceText = ref => norm(ref.getAttribute('aria-label') || ref.textContent);
          const namedRefs = references('aria-labelledby');
          const nativeName = labels.join(' ') || (el.tagName === 'BUTTON' ? norm(el.textContent)
            : el.tagName === 'INPUT' && /^(button|submit|reset)$/.test(el.type) ? norm(el.value || (el.type === 'submit' ? 'Submit' : el.type === 'reset' ? 'Reset' : ''))
            : el.tagName === 'INPUT' && el.type === 'image' ? norm(el.getAttribute('alt')) : '');
          const primaryName = namedRefs.length ? namedRefs.map(referenceText).join(' ') : norm(el.getAttribute('aria-label')) || nativeName;
          const accessibleName = namedRefs.length ? primaryName : primaryName || norm(el.getAttribute('title'))
            || (/^(INPUT|TEXTAREA)$/.test(el.tagName) ? norm(el.getAttribute('placeholder')) : '');
          const describedRefs = references('aria-describedby');
          const accessibleDescription = describedRefs.length ? describedRefs.map(referenceText).join(' ')
            : norm(el.getAttribute('aria-description')) || (primaryName ? norm(el.getAttribute('title')) : '');
          // Resolved text keeps ID renaming valid while retaining the source's
          // ordered description/details/error associations. Empty source targets
          // may acquire wording during a legitimate accessibility repair.
          const relationships = ['aria-describedby', 'aria-details', 'aria-errormessage'].map(attr => references(attr).map(referenceText));`);
replace("          return { accessibleName, state:", "          return { accessibleName, accessibleDescription, relationships, state:");
replace("            || (af[i].accessibleName && af[i].accessibleName !== bf[i].accessibleName) || af[i].labels.some(label => !bf[i].labels.includes(label))", `            || (af[i].accessibleName && af[i].accessibleName !== bf[i].accessibleName)
            || (af[i].accessibleDescription && af[i].accessibleDescription !== bf[i].accessibleDescription)
            || af[i].relationships.some((refs, ri) => refs.some((value, vi) => value && value !== bf[i].relationships[ri][vi]))
            || af[i].labels.some(label => !bf[i].labels.includes(label))`);
replace("          return [el.tagName, cellText(clone.textContent)];", `          const containingLink = el.closest('a[href]');
          let attachment = null;
          if (containingLink) {
            // Link wording normalization later detaches these nodes. Capture the
            // link and text preceding each script first, including the base to
            // which it is attached; inline wrappers do not change this evidence.
            const range = el.ownerDocument.createRange();
            range.setStart(containingLink, 0); range.setEndBefore(el);
            attachment = [links.indexOf(containingLink), cellText(range.cloneContents().textContent)];
          }
          return [el.tagName, cellText(clone.textContent), attachment];`);
fs.writeFileSync(file, text);
console.log('Updated live source gate to policy 20260909-5.');
