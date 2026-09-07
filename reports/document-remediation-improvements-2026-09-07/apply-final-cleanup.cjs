const fs = require('node:fs');
function edit(file, fn) {
  const before = fs.readFileSync(file, 'utf8');
  const next = fn(before);
  if (fs.readFileSync(file, 'utf8') !== before) throw new Error('Concurrent edit: ' + file);
  fs.writeFileSync(file, next);
}
function replace(s, from, to, count = 1) {
  if (s.split(from).length - 1 !== count) throw new Error('Unexpected matches: ' + from);
  return s.split(from).join(to);
}
edit('doc_pipeline_source.jsx', s => replace(s, "const _PIPELINE_PROMPT_VERSION = '20260907-preservation-1';", "// 2026-09-07: strict fragment/asset preservation and physical-page OCR evidence.\n  const _PIPELINE_PROMPT_VERSION = '20260907-1';"));
edit('tests/pdf_audit_stall_guard.test.js', s => replace(s, String.raw`/_stall \? (null|'') : /`, String.raw`/_stall \? (null|''|"") : /`));
edit('view_pdf_audit_source.jsx', s => {
  s = replace(s, "t('pdf_audit.knowbility.wcag_label') || 'WCAG 2.2 Level AA'", "t('pdf_audit.knowbility.wcag_label') || 'WCAG 2.1 Level AA'");
  return replace(s, "t('pdf_audit.knowbility.deadline_range') || 'April 2026 to April 2027'", "t('pdf_audit.knowbility.deadline_range') || 'April 2027 to April 2028'");
});
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  edit(file, s => replace(s, '"deadline_range": "April 2026 to April 2027"', '"deadline_range": "April 2027 to April 2028"'));
}
console.log('Final cache version, quote-insensitive test, and consistent legal fallback cleanup applied.');
