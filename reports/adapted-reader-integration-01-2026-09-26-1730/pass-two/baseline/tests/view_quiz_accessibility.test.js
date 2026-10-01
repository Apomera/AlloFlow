import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const sourcePath = resolve(process.cwd(), 'view_quiz_source.jsx');
const modulePath = resolve(process.cwd(), 'view_quiz_module.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/view_quiz_module.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Quiz accessibility', () => {
  it('keeps the deployed generated module identical to the root module', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(readFileSync(modulePath, 'utf8'));
  });

  it('provides gradebook column and row header relationships', () => {
    const text = source();
    expect(text.match(/<th scope="col"/g)).toHaveLength(6);
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

  it('gives every modal layer complete dialog focus behavior', () => {
    const text = source();
    expect(text.match(/role="dialog"/g)).toHaveLength(4);
    expect(text.match(/aria-modal="true"/g)).toHaveLength(4);
    expect(text).toContain('function _quizHandleDialogKeyDown(event, dialogRef, closeDialog)');
    expect(text).toContain('aria-labelledby="quiz-concept-explainer-title"');
    expect(text).toContain('aria-labelledby="quiz-review-question-title"');
    expect(text).toContain('aria-labelledby="quiz-allosheet-review-title"');
    expect(text).toContain('aria-describedby="quiz-allosheet-review-summary quiz-allosheet-review-privacy"');
    expect(text).toContain('function _quizIsolateDialog(dialog)');
    expect(text).toContain("sibling.setAttribute('aria-hidden', 'true')");
    expect(text).toContain('snapshot.element.inert = snapshot.inert');
    expect(text).toContain('previous.isConnected !== false');
    expect(text).toContain('reviewCloseBtnRef.current.focus()');
  });

  it('reviews the aggregate-only AlloSheet handoff before invoking the popup callback', () => {
    const text = source();
    expect(text).toContain('Review Quiz item analysis for AlloSheet');
    expect(text).toContain('Signal codes remain blank until at least five learners respond.');
    expect(text).toContain('learner names and IDs, question and option wording, raw answers, reflections, AI feedback');
    expect(text).toContain('module.buildQuizAlloSheetEnvelope(');
    expect(text).toContain('pending = p.onOpenAlloSheet(envelope)');
    expect(text).toContain("setHandoffFeedback('Opening AlloSheet and waiting for secure receipt…')");
    expect(text).toContain('aria-haspopup="dialog"');
    expect(text).toContain('disabled={handoffBusy}');
  });

  it('preserves visible focus, explicit button behavior, and reduced motion', () => {
    const text = source();
    expect(text).not.toContain('outline-none');
    expect(text.match(/<button(?!\s+(?:type="button"|key=\{[^}]+\}\s+type="button"))/g)).toBeNull();
    const transitionLines = text.split(/\r?\n/).filter((line) => /transition-(?:all|colors|transform|opacity)/.test(line));
    transitionLines.forEach((line) => expect(line).toContain('motion-reduce:transition-none'));
    const animationLines = text.split(/\r?\n/).filter((line) => /animate-(?!none)/.test(line));
    animationLines.forEach((line) => expect(line).toMatch(/quizreducedMotionClass|motion-reduce:animate-none/));
  });

  it('uses state-specific control names and live explainer feedback', () => {
    const text = source();
    expect(text).not.toContain(`<button type="button" aria-label={t('common.cancel')} key={optIdx}`);
    expect(text).not.toContain("aria-label={t('common.collapse')} onClick={() => togglePresentationExplanation(i)}");
    expect(text).not.toContain("aria-label={t('common.show')} onClick={() => togglePresentationAnswer(i)}");
    expect(text).toContain("aria-label={showAnswer ? t('quiz.hide_answer') : t('quiz.reveal_answer')}");
    expect(text).toContain('role="status" aria-live="polite"');
    expect(text).toContain('role="alert">{explainerModal.error}</div>');
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
