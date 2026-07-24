import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('teacher_source.jsx', 'utf8');
const moduleSource = fs.readFileSync('teacher_module.js', 'utf8');
const publicModule = fs.readFileSync('desktop/web-app/public/teacher_module.js', 'utf8');

describe('Teacher interface control semantics', () => {
  it('uses exactly one explicit type for every native button', () => {
    expect(source.match(/<button\b/g)).toHaveLength(89);
    expect(source.match(/<button\s+type="button"/g)).toHaveLength(88);
    expect(source.match(/<button\s+type="submit"/g)).toHaveLength(1);
  });

  it('exposes the donut visualization as a named progress value', () => {
    expect(source).toContain('role="progressbar" aria-label={label}');
    expect(source).toContain('aria-valuemin={0} aria-valuemax={100}');
    expect(source).toContain('aria-valuenow={Math.round(safePercent)}');
  });

  it('names data charts and scopes every table column header', () => {
    expect(source).toContain('<svg role="img" aria-label={data.map');
    expect(source).toContain('<svg role="img" aria-label={(t(');
    expect(source).toContain('<svg aria-hidden="true" focusable="false"');
    expect(source.match(/<th scope="col"/g)).toHaveLength(16);
  });
});

describe('Teacher and Escape Room motion and focus', () => {
  it('provides a local fallback for every animation and transition utility', () => {
    expect(source.match(/motion-reduce:animate-none/g)).toHaveLength(41);
    expect(source.match(/motion-reduce:transition-none/g)).toHaveLength(102);
  });

  it('suppresses custom confetti when reduced motion is requested', () => {
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain('.confetti-particle { animation: none !important; display: none !important; }');
    expect(source).toContain('motion-reduce:hidden');
  });

  it('keeps visible focus on programmatically focused Escape Room states', () => {
    expect(source.match(/focus:ring-4 focus:ring-inset focus:ring-white/g)).toHaveLength(5);
    expect(source).toContain("if (event.key === 'Tab')");
    expect(source).toContain('pauseDialogRef.current?.focus();');
  });

  it('keeps generated root and public modules synchronized', () => {
    expect(moduleSource).toContain('motion-reduce:animate-none');
    expect(moduleSource).toContain('aria-valuenow');
    expect(publicModule).toBe(moduleSource);
  });
});
