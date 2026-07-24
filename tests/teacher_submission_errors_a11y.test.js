import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('teacher_source.jsx', 'utf8');
const built = readFileSync('teacher_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/teacher_module.js', 'utf8');

describe('Teacher offline-submission setup errors', () => {
  it('routes both setup failures into the focus-managed submission alert dialog', () => {
    expect(source.match(/setSubmissionDialog\(\{ kind: 'error', message:/g) || []).toHaveLength(2);
    expect(source).toContain("submissionDialog.kind === 'error' ? 'Offline submission setup failed'");
    expect(source).toContain('{submissionDialog.message}');
    expect(source).toContain("submissionDialog.kind === 'error' ? 'Close' : 'Done'");
  });

  it('does not fall back to blocking native alerts for crypto failures', () => {
    expect(source).not.toContain("else alert('Submission crypto module not loaded yet.");
    expect(source).not.toContain("else alert('Could not set up submissions:");
  });

  it('keeps generated and deployed teacher modules synchronized', () => {
    expect(built).toBe(deployed);
    expect(built).toContain('Offline submission setup failed');
    expect(built).not.toContain("else alert('Submission crypto module not loaded yet.");
  });
});
