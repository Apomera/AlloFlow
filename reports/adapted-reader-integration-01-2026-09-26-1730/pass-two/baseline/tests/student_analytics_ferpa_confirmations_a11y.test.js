import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Student Analytics FERPA confirmations accessibility', () => {
  const source = read('student_analytics_module.js');

  it('provides a labelled modal alert dialog with background isolation', () => {
    expect(source).toContain('function askStudentAnalyticsConfirmation(message, options)');
    expect(source).toContain("dialog.setAttribute('role', 'alertdialog')");
    expect(source).toContain("dialog.setAttribute('aria-modal', 'true')");
    expect(source).toContain("entry.el.setAttribute('inert', '')");
  });

  it('contains and restores focus with safe Escape cancellation', () => {
    expect(source).toContain("document.addEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain('opener && opener.isConnected');
    expect(source).toContain('cancel.focus();');
  });

  it('uses accessible consent for both confidential CSV exports', () => {
    expect(source).toContain('const generateRTICSV = async () => {');
    expect(source).toContain("title: 'Export confidential RTI report'");
    expect(source).toContain('const exportResearchCSV = async () => {');
    expect(source).toContain("title: 'Export confidential research data'");
    expect(source).not.toContain('window.confirm("Export this RTI report');
    expect(source).not.toContain('window.confirm("Export the research data CSV');
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/student_analytics_module.js'));
  });
});

