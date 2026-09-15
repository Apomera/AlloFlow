const fs = require('fs'), path = require('path');
const target = path.join(__dirname, 'opportunity-analysis.cjs');
const original = fs.readFileSync(target, 'utf8');
const before = "const visible = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length) && !e.closest('[hidden]');";
const after = `const visible = e => {
            if (!(e.offsetWidth || e.offsetHeight || e.getClientRects().length) || e.closest('[hidden]')) return false;
            for (let parent = e.parentElement; parent; parent = parent.parentElement) {
              if (parent.tagName === 'DETAILS' && !parent.open && !parent.querySelector(':scope > summary')?.contains(e)) return false;
            }
            return true;
          };`;
if (!original.includes(before)) throw new Error('Expected analysis visibility filter not found');
fs.writeFileSync(target, original.replace(before, after));
console.log('Analysis measurement excludes content inside closed disclosures.');
