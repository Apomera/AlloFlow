import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Toolkit data-management accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalToolkitExport(props) {');
  const end = source.indexOf('  function MyToolkitHub(props) {', start);
  const section = source.slice(start, end);

  it('uses accurate scoped data-management framing', () => {
    expect(section).toContain('Review, download, import, or clear toolkit records available in this browser session.');
    expect(section).toContain('This screen manages the toolkit records currently provided to it.');
    expect(section).not.toContain('Your data lives in YOUR browser');
  });

  it('does not promise that no other copies exist', () => {
    expect(section).toContain('other copies may exist');
    expect(section).toContain('does not manage every possible copy');
    expect(section).not.toContain('stored only in this browser');
  });

  it('warns that backups may contain sensitive information', () => {
    expect(section).toContain('Treat backups as sensitive data');
    expect(section).toContain('journals, health or disability information, plans, contacts, school or workplace details');
  });

  it('reports exact record scope and approximate size in text', () => {
    expect(section).toContain("toolkitKeys.length + ' toolkit record'");
    expect(section).toContain('approximately ' + "' + formattedSize(approximateBytes)");
    expect(section).toContain('does not prove that every app record is represented');
  });

  it('exports only sorted mytk records', () => {
    expect(section).toContain("key.indexOf('mytk') === 0; }).sort()");
    expect(section).toContain('toolkitKeys.forEach(function(key) { exportObject[key] = allData[key]; })');
  });

  it('provides backup JSON in a labeled selectable field', () => {
    expect(section).toContain("htmlFor: 'learning-lab-toolkit-export-json'");
    expect(section).toContain("id: 'learning-lab-toolkit-export-json', value: exportJson, readOnly: true");
  });

  it('warns about download and clipboard exposure', () => {
    expect(section).toContain('downloads folder, device, cloud storage, email, or clipboard');
  });

  it('uses a temporary hidden download link and revokes the URL', () => {
    expect(section).toContain("document.body.appendChild(link); link.click(); document.body.removeChild(link)");
    expect(section).toContain('URL.revokeObjectURL(url)');
  });

  it('offers a real manual export fallback', () => {
    expect(section).toContain('Copy the backup JSON from the labeled field instead.');
    expect(section).toContain("focusById('learning-lab-toolkit-export-json', true)");
  });

  it('supports asynchronous backup copying and manual fallback', () => {
    expect(section).toContain('Promise.resolve(navigator.clipboard.writeText(exportJson))');
    expect(section).toContain('The backup JSON is selected; use Control+C or Command+C.');
  });

  it('replaces prompt import with a named native form', () => {
    expect(section).toContain("hh('form', { onSubmit: importJson");
    expect(section).toContain("'aria-labelledby': 'learning-lab-toolkit-import-heading'");
    expect(section).not.toContain("prompt('Paste exported JSON here:')");
  });

  it('supports a visibly labeled JSON file input', () => {
    expect(section).toContain("htmlFor: 'learning-lab-toolkit-import-file'");
    expect(section).toContain("type: 'file', accept: '.json,application/json'");
    expect(section).toContain('Selected file: ');
  });

  it('supports a visibly labeled bounded paste field', () => {
    expect(section).toContain("htmlFor: 'learning-lab-toolkit-import-json'");
    expect(section).toContain('required: true, maxLength: 2000000');
  });

  it('associates import errors with the paste field', () => {
    expect(section).toContain("'aria-invalid': importError ? 'true' : undefined");
    expect(section).toContain("id: 'learning-lab-toolkit-import-error', role: 'alert'");
    expect(section).toContain("focusById('learning-lab-toolkit-import-json')");
  });

  it('rejects empty, oversized, non-object, and empty-object imports', () => {
    expect(section).toContain('Paste backup JSON or choose a JSON file before importing.');
    expect(section).toContain('larger than the 2,000,000-character import limit');
    expect(section).toContain('must be a JSON object containing toolkit keys');
    expect(section).toContain('contains no toolkit records');
  });

  it('rejects every unsupported key rather than silently importing it', () => {
    expect(section).toContain("key.indexOf('mytk') !== 0");
    expect(section).toContain('Only keys beginning with “mytk” can be imported.');
  });

  it('reports JSON parse details without a blocking alert', () => {
    expect(section).toContain('The backup is not valid JSON: ');
    expect(section).not.toContain('alert(');
  });

  it('enforces a 2 MB file limit before FileReader', () => {
    expect(section).toContain('if (file.size > 2000000)');
    expect(section).toContain('larger than the 2 MB import limit');
  });

  it('provides FileReader unavailable and error fallbacks', () => {
    expect(section).toContain("typeof FileReader === 'undefined'");
    expect(section).toContain('Paste the JSON into the text field instead.');
    expect(section).toContain('reader.onerror = function()');
  });

  it('focuses the populated paste field after loading a file', () => {
    expect(section).toContain('Selected file loaded into the import field.');
    expect(section).toContain("focusById('learning-lab-toolkit-import-json')");
  });

  it('uses a native radio group for merge versus replace', () => {
    expect(section).toContain("hh('fieldset'");
    expect(section).toContain("type: 'radio', name: 'learning-lab-toolkit-import-mode'");
    expect(section).toContain("var ms = R.useState('merge')");
  });

  it('explains merge and replace behavior before submission', () => {
    expect(section).toContain('Merge — selected by default');
    expect(section).toContain('Replace matching records and keep current records');
    expect(section).toContain('Clear every current “mytk” record, then write only records from the backup.');
  });

  it('uses accessible confirmation for both import modes', () => {
    expect(section).toContain("title: importMode === 'replace' ? 'Replace toolkit data?' : 'Merge toolkit data?'");
    expect(section).toContain("confirmText: importMode === 'replace' ? 'Replace data' : 'Merge data'");
    expect(section).not.toContain("confirm('This will OVERWRITE");
  });

  it('implements actual replacement by clearing all current keys first', () => {
    expect(section).toContain("if (importMode === 'replace') toolkitKeys.forEach(function(key) { setData(key, null); })");
    expect(section).toContain('result.keys.forEach(function(key) { setData(key, result.parsed[key]); })');
  });

  it('reports import completion and restores heading focus', () => {
    expect(section).toContain("'Toolkit data replaced' : 'Toolkit data merged'");
    expect(section).toContain("focusById('learning-lab-toolkit-import-heading')");
  });

  it('requires a persistent wipe acknowledgment checkbox', () => {
    expect(section).toContain("type: 'checkbox', checked: wipeAcknowledged");
    expect(section).toContain('I understand that clearing these records cannot be undone here');
  });

  it('disables wiping without acknowledgment or data', () => {
    expect(section).toContain('disabled: !wipeAcknowledged || !toolkitKeys.length');
    expect(section).toContain('disabled: !toolkitKeys.length');
  });

  it('uses accessible final confirmation for wiping', () => {
    expect(section).toContain("title: 'Clear all toolkit data?', confirmText: 'Clear all data'");
    expect(section).not.toContain("confirm('This will DELETE ALL");
    expect(section).not.toContain("confirm('Really sure?");
  });

  it('accurately limits wipe scope and preserves downloaded copies', () => {
    expect(section).toContain('A downloaded backup is not deleted.');
    expect(section).toContain('Other account, synced, downloaded, or device backups are not deleted');
  });

  it('announces wipe completion and restores heading focus', () => {
    expect(section).toContain('All toolkit records available to this screen were cleared.');
    expect(section).toContain("focusById('learning-lab-toolkit-wipe-heading')");
  });

  it('uses alert semantics for errors and status semantics for success', () => {
    expect(section).toContain("role: status.kind === 'error' ? 'alert' : 'status'");
    expect(section).toContain("'aria-live': status.kind === 'error' ? 'assertive' : 'polite'");
    expect(section).toContain("'aria-atomic': 'true'");
  });

  it('uses responsive layouts and 44-pixel controls', () => {
    expect(section).toContain("display: 'flex', flexWrap: 'wrap'");
    expect(section).toContain('minWidth: 44, minHeight: 44');
    expect(section).toContain("width: '100%', minHeight: 44");
  });

  it('wraps long JSON and permits vertical review', () => {
    expect(section).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
    expect(section).toContain("resize: 'vertical'");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
