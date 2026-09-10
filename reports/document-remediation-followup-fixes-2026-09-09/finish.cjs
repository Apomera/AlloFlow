const fs=require('fs');const p='doc_pipeline_source.jsx';let s=fs.readFileSync(p,'utf8');
s=s.replace("          // Track each word occurrence in document order, including visible copies.", "          if (!hidden.size) return new Set();\n          // Track each word occurrence in document order, including visible copies.");
s=s.replace("        const boundDestination = anchor => {", "        const targetIndexes = new Map();\n        const boundDestination = anchor => {");
s=s.replace("          const matches = nodes(anchor.ownerDocument, '[id]').filter(el => signature(el) === value);", "          let index = targetIndexes.get(anchor.ownerDocument);\n          if (!index) {\n            index = new Map();\n            for (const el of nodes(anchor.ownerDocument, '[id]')) { const key = signature(el); index.set(key, (index.get(key) || 0) + 1); }\n            targetIndexes.set(anchor.ownerDocument, index);\n          }");
s=s.replace("(matches.length > 1 ? ':' + href : '')", "((index.get(value) || 0) > 1 ? ':' + href : '')");
fs.writeFileSync(p,s);
const test='tests/remediation_source_contract_integration.test.js';let t=fs.readFileSync(test,'utf8');t=t.replace(' it.each([',` it.each([
  ['<fieldset><legend>Student</legend><input value="Ada"></fieldset>', s=>s.replace('<fieldset>', '<fieldset disabled>'), 'form-state-changed'],
  ['<span id="a">Student</span><span id="b">Teacher</span><input aria-label="Name" aria-labelledby="a" value="Ada">', s=>s.replace('aria-labelledby="a"', 'aria-labelledby="b"'), 'form-state-changed'],
  ['<p>x + y</p>', s=>s.replace('x + y','x − y'), 'math-content-changed'],
  ['<a href="#a">Read topic</a><section id="a">Original</section><section id="b">Archive</section>', s=>s.replace('id="a"','id="temp"').replace('id="b"','id="a"').replace('id="temp"','id="b"'), 'link-destination-changed'],`);
fs.writeFileSync(test,t);
