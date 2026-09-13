// Run an audit reply through the pipeline's strict initial-audit parser (extracted verbatim from
// doc_pipeline_source.jsx) and report which gate fails.
const fs = require('node:fs');
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const lines = fs.readFileSync(root + '/doc_pipeline_source.jsx', 'utf8').split('\n');
const start = lines.findIndex((l) => l.includes('const _AUDIT_RULE_ID_RE = '));
const pStart = lines.findIndex((l, i) => i > start && l.includes('const _parseStrictInitialAudit = (raw) => {'));
const end = lines.findIndex((l, i) => i > pStart && l.trim() === 'return parsed;');
if (start < 0 || pStart < 0 || end < 0) throw new Error('parser block not found');
// Through "return parsed;" plus the closing "};" of the arrow function.
const body = lines.slice(start, end + 2).join('\n');
const prelude = [
  'const _alloCanonicalizeAuditIssue = (i) => i;',
  'const _alloWeightedDeductions = () => 0;',
  'const _stripCodeFence = (s) => String(s).trim().replace(/^```[a-z]*\\n?/i, "").replace(/```\\s*$/, "");',
].join('\n') + '\n';
const fn = new Function(prelude + body + '\n  return { parse: _parseStrictInitialAudit, issueOk: _auditIssueRecordIsValid, langOk: _auditLanguageTagIsValid, passOk: _auditPassArrayIsValid };');
const api = fn();
const file = process.argv[2];
const text = /batch/.test(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).responses[0].text : fs.readFileSync(file, 'utf8');
const o = JSON.parse(text);
const serious = Array.isArray(o.serious) ? o.serious : o.major;
console.log('confidence ok:', /^(high|medium|low)$/i.test(String(o.confidence || '')));
console.log('pageCount ok:', Number.isInteger(o.pageCount) && o.pageCount >= 1);
console.log('booleans:', ['hasSearchableText', 'hasImages', 'hasTables', 'hasForms'].map((k) => k + '=' + typeof o[k]).join(' '));
console.log('language ok:', api.langOk(o.documentLanguage), JSON.stringify(o.documentLanguage));
console.log('passes ok:', api.passOk(o.passes), 'count', (o.passes || []).length);
for (const [bin, arr] of [['critical', o.critical], ['serious', serious], ['moderate', o.moderate], ['minor', o.minor]]) {
  console.log(bin, Array.isArray(arr) ? JSON.stringify(arr.map((i) => api.issueOk(i))) : 'NOT ARRAY');
}
try { const p = api.parse(text); console.log('PARSE OK: canonical score', p.score, 'reported', p._aiReportedScore); }
catch (e) { console.log('PARSE FAILED:', e.message); }
