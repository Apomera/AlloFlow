import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'student_analytics_module.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'prismflow-deploy/public/student_analytics_module.js'), 'utf8');

describe('Student Analytics research and RTI subdialogs', () => {
  it('keeps source and deploy mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });

  it('provides shared initial focus, focus containment, Escape, and focus restoration', () => {
    expect(source).toContain('function useStudentAnalyticsDialog(isOpen, onClose)');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return;");
    expect(source).toContain('if (!node.contains(document.activeElement))');
    expect(source).toContain('if (opener && opener.isConnected');
  });

  it('names all six subdialogs from visible headings', () => {
    const ids = [
      'sa-cbm-dialog-title',
      'sa-survey-dialog-title',
      'sa-custom-questions-dialog-title',
      'sa-research-setup-dialog-title',
      'sa-auto-survey-dialog-title',
      'sa-rti-settings-title',
    ];
    for (const id of ids) expect(source.split(id)).toHaveLength(3);
  });

  it('does not expose modal backdrops or dialog bodies as simulated buttons', () => {
    expect(source).not.toMatch(/fixed inset-0[^\n]*\n[^\n]*role: ['"]button/);
    const rti = source.slice(source.indexOf('showRTISettings &&'), source.indexOf('importedStudents.length > 0', source.indexOf('showRTISettings &&')));
    expect(rti).not.toContain('role: "button"');
  });

  it('uses one CBM state for both openers and the render gate', () => {
    expect(source).toContain('showCBMModal && typeof renderCBMImportModal');
    expect(source).not.toContain('onClick: () => setShowCBMImport(true)');
  });
});
