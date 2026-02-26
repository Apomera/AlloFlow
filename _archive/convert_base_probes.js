// Fix ORF_SCREENING_PASSAGES conversion
// The issue: single-quoted strings with apostrophes like 'Mrs. Patel's class'
// The simple char-by-char parser ends at the apostrophe in Patel's
// Fix: Use Node.js eval since we control the file

const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'psychometric_probes.js');
const outputPath = path.join(__dirname, '..', 'psychometric_probes.json');

const raw = fs.readFileSync(inputPath, 'utf8');

// Use Function to parse the JS file (we're running locally, not in Canvas)
const sandbox = {};
const fn = new Function('window', raw);
fn(sandbox);

console.log('Parsed via eval. Keys:', Object.keys(sandbox));

const result = {};
for (const key of Object.keys(sandbox)) {
    result[key] = sandbox[key];
    const count = typeof sandbox[key] === 'object' && !Array.isArray(sandbox[key])
        ? Object.keys(sandbox[key]).length
        : (Array.isArray(sandbox[key]) ? sandbox[key].length : 1);
    console.log(`  ${key}: ${count} entries`);
}

const json = JSON.stringify(result, null, 2);
fs.writeFileSync(outputPath, json, 'utf8');
console.log(`Written: ${outputPath} (${(json.length / 1024).toFixed(0)} KB)`);

// Verify it's valid JSON
JSON.parse(json);
console.log('Verified: valid JSON');
