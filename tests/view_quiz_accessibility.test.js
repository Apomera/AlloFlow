import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const sourcePath = resolve(process.cwd(), 'view_quiz_source.jsx');
const modulePath = resolve(process.cwd(), 'view_quiz_module.js');
const publicPath = resolve(process.cwd(), 'prismflow-deploy/public/view_quiz_module.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Quiz accessibility', () => {
  it('keeps the deployed generated module identical to the root module', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(readFileSync(modulePath, 'utf8'));
  });

  it('provides gradebook column and row header relationships', () => {
    const text = source();
    expect(text.match(/<th scope="col"/g)).toHaveLength(5);
    expect(text).toContain('<th scope="row" className="px-2 py-1.5 text-left font-medium text-slate-800">{row.displayName}</th>');
  });

  it('disables every flagged pulse and spin animation for reduced motion', () => {
    const text = source();
    expect(text).toContain("var quizreducedMotionClass = 'motion-reduce:animate-none'");
    const animatedLines = text.split(/\r?\n/).filter((line) => /animate-(?:pulse|spin)/.test(line));
    expect(animatedLines).toHaveLength(5);
    animatedLines.forEach((line) => expect(line).toContain('quizreducedMotionClass'));
  });

  it('places accessible names at the opening of generated form controls', () => {
    const text = source();
    expect(text).toContain('<input aria-label={t("a11y.fill_in_blank")} type="text" value={response}');
    expect(text).toContain('<textarea aria-label={typeLabel + " response"} value={response}');
    expect(text).toContain('<textarea aria-label="Image refinement instructions" value={inputValue}');
    expect(text).toContain('<input aria-label="Concept to explain" type="text" value={explainerInput}');
  });

  it('passes the repository static audit after generation', () => {
    const result = spawnSync(process.execPath, ['a11y-audit/static-audit.js', '--file', 'view_quiz_module.js'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Total findings:\s+0/);
  });
});
