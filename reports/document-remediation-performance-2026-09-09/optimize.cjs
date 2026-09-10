const fs=require('fs');const p='doc_pipeline_source.jsx';let s=fs.readFileSync(p,'utf8');const nl=s.includes('\r\n')?'\r\n':'\n';s=s.replace(/\r\n/g,'\n');
const start=s.indexOf("        const formState = doc => nodes(doc, 'form,input,select,textarea,button').map(el => {");const end=s.indexOf('        const af = formState(before)',start);if(start<0||end<0)throw Error('Missing form-state boundaries');
const previous=s.slice(start,end);
const next=previous.replace("const formState = doc => nodes(doc, 'form,input,select,textarea,button').map(el => {", `const formState = doc => {
          // Resolve labels once per document. Accessing every control's live
          // labels collection repeatedly walks the whole tree in some DOMs.
          // Native label.control preserves for/implicit-label and duplicate-ID rules.
          const labelsByControl = new Map();
          for (const label of nodes(doc, 'label')) {
            const control = label.control;
            if (!control) continue;
            if (!labelsByControl.has(control)) labelsByControl.set(control, []);
            labelsByControl.get(control).push(norm(label.textContent));
          }
          const formIndexes = new Map(nodes(doc, 'form').map((form, index) => [form, index]));
          return nodes(doc, 'form,input,select,textarea,button').map(el => {`)
.replace("Array.from(el.labels || []).map(label => norm(label.textContent))", "labelsByControl.get(el) || []")
.replace("const owner = el.form ? nodes(doc, 'form').indexOf(el.form) : -1;", "const form = el.form;\n          const owner = form ? (formIndexes.get(form) ?? -1) : -1;")
.replace('        });\n', '          });\n        };\n');
s=s.slice(0,start)+next+s.slice(end);fs.writeFileSync(p,s.replace(/\n/g,nl));console.log('Indexed native label associations and form owners per comparison.');
