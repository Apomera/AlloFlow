const fs = require('node:fs');
const filename = require('node:path').join(__dirname, 'verify-generation.cjs');
const input = fs.readFileSync(filename, 'utf8');
eval(input.replace("}catch(error){report.failure=error.stack;", "}catch(error){report.requestTrace=await page.evaluate(()=>window.__generationRequests.map(r=>({start:r.prompt.slice(0,180),issues:r.prompt.includes('Issues:')?r.prompt.slice(r.prompt.indexOf('Issues:'),r.prompt.indexOf('Previous response:')):'No repair issues'}))).catch(()=>[]);console.log(JSON.stringify(report.requestTrace));report.failure=error.stack;"));
