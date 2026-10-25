import { afterEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const temporary = [];
afterEach(() => { for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function audit(source, help) {
  const dir = mkdtempSync(join(tmpdir(), 'alloflow-help-'));
  temporary.push(dir);
  copyFileSync(resolve('_audit_help_keys.cjs'), join(dir, '_audit_help_keys.cjs'));
  writeFileSync(join(dir, 'fixture_source.jsx'), source);
  writeFileSync(join(dir, 'help_strings.js'), JSON.stringify(help));
  const result = spawnSync(process.execPath, [join(dir, '_audit_help_keys.cjs')], { encoding: 'utf8', windowsHide: true });
  return { status: result.status, report: readFileSync(join(dir, 'a11y-audit/help_audit.txt'), 'utf8') };
}
const pdfHelp = Object.fromEntries(['single', 'batch', 'web'].map(mode => [`pdf_audit_view_mode_${mode}_btn`, 'Help']));
describe('dynamic help-key coverage', () => {
  it('checks every complete key in JSX and compiled finite families', () => {
    const source = `<button data-help-key={'pdf_audit_view_mode_' + mode + '_btn'} />;\nReact.createElement('button', { 'data-help-key': 'pdf_audit_view_mode_' + mode + '_btn' });`;
    expect(audit(source, pdfHelp).status).toBe(0);
    const missing = { ...pdfHelp }; delete missing.pdf_audit_view_mode_batch_btn;
    const result = audit(source, missing);
    expect(result.status).toBe(1);
    expect(result.report).toContain('pdf_audit_view_mode_batch_btn');
  });
  it('does not silently ignore unknown dynamic prefixes or bare prefix literals', () => {
    for (const source of [`<button data-help-key={'unknown_step_' + step} />`, `<button data-help-key="pdf_audit_view_mode_" />`]) {
      expect(audit(source, pdfHelp).status).toBe(1);
    }
  });
});
