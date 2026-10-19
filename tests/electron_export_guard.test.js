import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

// The desktop app's remediation:save-files wrote any file name the renderer sent, and
// remediation:reveal-path called shell.openPath on ANY existing path. Together a compromised
// page could save "run.bat" and then launch it. Exports are now limited to document and image
// types, and only a folder this run saved into can be revealed, and only as a folder.
const MAIN = fs.readFileSync(path.resolve(process.cwd(), process.env.EXPORT_GUARD_MAIN || 'desktop/electron/main.cjs'), 'utf8');
const BLOCK = sliceBetween(MAIN, '// __ALLO_EXPORT_GUARD_BEGIN__', '// __ALLO_EXPORT_GUARD_END__', { file: 'desktop/electron/main.cjs' });
// eslint-disable-next-line no-new-func
const guard = new Function('path', 'fs', BLOCK + '\nreturn { safeExportName, safeExportFileName, isRevealableExportDir, revealableExportDirs };')(path, fs);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'allo-export-guard-'));
afterAll(() => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {} });

describe('save-files writes only what AlloFlow exports', () => {
  it.each([
    ['report_tagged.pdf', 'report_tagged.pdf'],
    ['Lesson_accessible.html', 'Lesson_accessible.html'],
    ['batch_accessibility_report.csv', 'batch_accessibility_report.csv'],
    ['telemetry.json', 'telemetry.json'],
    ['Chart.PNG', 'Chart.PNG'],
    ['name.pdf.', 'name.pdf'],
    ['sub/dir/page.html', 'sub_dir_page.html'],
    ['../../outside.pdf', '.._.._outside.pdf'],
  ])('keeps %s', (input, expected) => {
    expect(guard.safeExportFileName(input)).toBe(expected);
  });

  it.each(['run.bat', 'setup.exe', 'evil.pdf.exe', 'x.cmd', 'x.ps1', 'x.vbs', 'x.js', 'x.lnk', 'x.hta', 'x.scr', 'x.msi', 'x.svg', 'noextension', 'CON.pdf', 'nul', 'LPT1.txt', '...', '', null])('refuses %s', (input) => {
    expect(guard.safeExportFileName(input), String(input) + ' would be written').toBeNull();
  });

  it('never lets the folder name climb out of the chosen folder', () => {
    expect(guard.safeExportName('..', 120)).toBeNull();
    expect(guard.safeExportName('.', 120)).toBeNull();
    expect(guard.safeExportName('AlloFlow_Remediated_2026-10-16', 120)).toBe('AlloFlow_Remediated_2026-10-16');
  });
});

describe('reveal-path opens only a folder this run saved into', () => {
  const saved = fs.mkdtempSync(path.join(tmp, 'saved-'));
  const other = fs.mkdtempSync(path.join(tmp, 'other-'));
  const fileInside = path.join(saved, 'run.bat');
  fs.writeFileSync(fileInside, 'echo hi');
  guard.revealableExportDirs.add(fs.realpathSync(saved));

  it('opens the saved folder', () => {
    expect(guard.isRevealableExportDir(saved)).toBe(true);
  });
  it('refuses a file, even inside the saved folder (openPath would run it)', () => {
    expect(guard.isRevealableExportDir(fileInside)).toBe(false);
  });
  it('refuses any other folder, a missing path, and non-strings', () => {
    expect(guard.isRevealableExportDir(other)).toBe(false);
    expect(guard.isRevealableExportDir(path.join(tmp, 'missing'))).toBe(false);
    expect(guard.isRevealableExportDir(os.homedir())).toBe(false);
    expect(guard.isRevealableExportDir(null)).toBe(false);
    expect(guard.isRevealableExportDir({ toString: () => saved })).toBe(false);
  });
  it('resolves ".." before deciding', () => {
    expect(guard.isRevealableExportDir(path.join(saved, '..', path.basename(saved)))).toBe(true);
    expect(guard.isRevealableExportDir(path.join(saved, '..'))).toBe(false);
  });
});

describe('the IPC handlers use the guard', () => {
  const save = sliceBetween(MAIN, "handleTrustedIpc('remediation:save-files'", "handleTrustedIpc('remediation:reveal-path'", { file: 'main.cjs' });
  const reveal = sliceBetween(MAIN, "handleTrustedIpc('remediation:reveal-path'", '// ── Remediation folder ingestion', { file: 'main.cjs' });
  it('save-files filters every name and registers the folder it made', () => {
    expect(save).toContain('const safe = safeExportFileName(f.name);');
    expect(save).toContain('if (!safe) { skipped++; continue; }');
    expect(save).toContain('revealableExportDirs.add(fs.realpathSync(baseDir));');
    expect(save).toContain("safeExportName((payload && payload.folderName) || '', 120)");
  });
  it('reveal-path checks before it opens anything', () => {
    const check = reveal.indexOf('if (!isRevealableExportDir(targetPath))');
    const open = reveal.indexOf('shell.openPath(');
    expect(check, 'reveal-path no longer checks the path').toBeGreaterThan(-1);
    expect(open).toBeGreaterThan(check);
  });
});
