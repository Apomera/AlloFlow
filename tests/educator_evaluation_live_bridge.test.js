// Exercise the shipped portal against production Code.gs, with fictional Google
// services only. Unlike a canned bridge, every browser save is authorized,
// revision checked, committed, and projected by the real repository.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { expect, it } from 'vitest';
import { repositoryFixture, EVALUATOR, TEACHER_ONE, TEACHER_TWO } from './helpers/educator_evaluation_gs_harness.js';

const OUT = path.resolve('reports/educator-evaluation-review-2026-09-07');
const PORTAL = fs.readFileSync('apps_script/educator_evaluation/Portal.html', 'utf8');

it('completes separate-account formal, SPM, and annual release through the real repository', async () => {
  const harness = repositoryFixture();
  const browser = await chromium.launch({ headless: true });
  const errors = [], calls = [];
  fs.mkdirSync(OUT, { recursive: true });
  const boot = (email) => { harness.setActiveEmail(email); return harness.invoke('bootstrap'); };
  const open = async (email, viewport = { width: 1440, height: 1000 }) => {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', error => errors.push(String(error)));
    await page.exposeFunction('evaluationRpc', (name, request) => {
      harness.setActiveEmail(email);
      try {
        const result = harness.invoke(name, ...(request === undefined ? [] : [request]));
        calls.push({ email, name, ok: result?.ok !== false });
        return result;
      } catch (error) {
        calls.push({ email, name, error: String(error.message), attemptedWalkthroughs: request?.workspace?.walkthroughs, savedWalkthroughs: harness.invoke('bootstrap').workspace.walkthroughs });
        return { ok: false, code: error.code, error: error.message };
      }
    });
    await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}</style></head><body><div id="educator-evaluation-root"></div><script>
      const runner = () => new Proxy({
        withSuccessHandler(fn) { this.ok = fn; return this; },
        withFailureHandler(fn) { this.fail = fn; return this; }
      }, { get(target, name, proxy) {
        if (name in target) return Reflect.get(target, name, proxy);
        return (request) => window.evaluationRpc(name, request).then(value => target.ok(value), error => target.fail({ message: error.message }));
      }});
      window.google = { script: { get run() { return runner(); } } };
    </script>${PORTAL}</body></html>`);
    await page.locator('.ae-tabs').waitFor();
    return page;
  };
  const saved = async page => {
    await expect.poll(async () => page.locator('.ae-remote-banner').innerText(), { timeout: 15000 }).toContain('Saved to district repository');
  };
  const tab = async (page, name) => page.locator('#ae-tab-' + ({ Overview: 'overview', Formal: 'formal', SPM: 'spm' }[name])).click();
  const refresh = async page => { await page.getByRole('button', { name: 'Refresh', exact: true }).click(); await saved(page); };
  const fill = async (page, label, value) => { await page.getByLabel(label, { exact: false }).fill(value); await saved(page); };
  const click = async (page, name) => { await page.getByRole('button', { name, exact: true }).click(); await saved(page); };
  const review = async (page, name) => {
    const dialog = page.locator('[role="dialog"]', { has: page.locator('#ae-action-review-title') });
    await dialog.waitFor();
    await dialog.locator('input[type="checkbox"]').check();
    await dialog.getByRole('button', { name, exact: true }).click();
    await saved(page);
  };
  let evaluator, teacher;
  try {
    evaluator = await open(EVALUATOR);
    teacher = await open(TEACHER_ONE);
    const other = await open(TEACHER_TWO, { width: 390, height: 844 });
    expect(boot(TEACHER_TWO).workspace.teachers.map(t => t.id)).toEqual(['t2']);
    expect(await other.locator('body').innerText()).not.toContain('Teacher One');
    expect(boot(TEACHER_ONE).workspace.walkthroughs.some(w => w.id === 'walk-t1-private')).toBe(false);
    await other.close();
    await tab(evaluator, 'Formal'); await tab(teacher, 'Formal');
    await fill(teacher, 'Lesson / unit plan summary', 'Fictional inquiry lesson comparing solution strategies.');
    await fill(teacher, 'Expected student learning outcomes', 'Explain two strategies using evidence.');
    await click(teacher, 'Submit pre-observation materials');
    await refresh(evaluator);
    await fill(evaluator, 'Pre-conference notes', 'Private planning discussion about lesson supports.');
    await click(evaluator, 'Mark pre-conference complete');
    await click(evaluator, 'Start observation');
    await fill(evaluator, 'Time-stamped factual evidence', '10:04 - Fictional groups compare two strategies and explain their reasoning.');
    expect(boot(TEACHER_ONE).workspace.observations.find(o => o.id === 'obs-t1').evidence).toBe('');
    await evaluator.getByLabel('I reviewed the evidence and removed student-identifying information.', { exact: true }).check(); await saved(evaluator);
    await click(evaluator, 'Publish evidence to teacher'); await review(evaluator, 'Publish formal evidence');
    await refresh(teacher);
    await fill(teacher, 'Reflection / self-assessment', 'The comparison supported reasoning; next time I will model a counterexample.');
    await click(teacher, 'Submit reflection');
    await refresh(evaluator);
    await fill(evaluator, 'Post-conference discussion and follow-up', 'Collect a follow-up sample after modeling counterexamples.');
    await click(evaluator, 'Mark post-conference complete');
    for (let i = 0; i < 4; i++) {
      await evaluator.locator('.ae-rating-grid select').nth(i).selectOption('2'); await saved(evaluator);
      await evaluator.locator('.ae-rating-grid textarea').nth(i).fill('The published fictional evidence supports this human-selected judgment.'); await saved(evaluator);
    }
    expect(boot(TEACHER_ONE).workspace.observations.find(o => o.id === 'obs-t1').ratings.d1).toBeNull();
    await click(evaluator, 'Sign evaluator assessment'); await review(evaluator, 'Sign assessment');
    await refresh(teacher);
    await teacher.getByLabel('I received this record and had an opportunity to discuss it. I understand acknowledgment does not mean agreement.', { exact: true }).check(); await saved(teacher);
    await click(teacher, 'Acknowledge receipt');
    await refresh(evaluator);
    await click(evaluator, 'Finalize formal observation'); await review(evaluator, 'Finalize observation');
    expect(boot(EVALUATOR).workspace.observations.find(o => o.id === 'obs-t1').finalizedAt).toBeTruthy();
    await evaluator.screenshot({ path: path.join(OUT, 'formal-finalized.png'), fullPage: true });

    await refresh(teacher); await tab(teacher, 'SPM'); await click(teacher, '+ Start SPM proposal');
    for (const label of ['Classroom context and priority learning need', 'Baseline', 'Unit / goal statement and expected outcomes', 'Performance measures and indicators', 'Action plan, supports, and evidence sources']) {
      await fill(teacher, label, 'Fictional group evidence, measurable learning goal, and planned instructional support.');
    }
    await click(teacher, 'Submit plan for approval');
    await refresh(evaluator); await tab(evaluator, 'SPM'); await saved(evaluator);
    await fill(evaluator, 'Reason if returning', 'Clarify the success criterion.');
    await click(evaluator, 'Return for revision');
    await refresh(teacher);
    await fill(teacher, 'Performance measures and indicators', 'Fictional rubric: 80 percent meet the two-point criterion.');
    await click(teacher, 'Submit plan for approval');
    await refresh(evaluator);
    await click(evaluator, 'Approve plan'); await review(evaluator, 'Approve plan version');
    await refresh(teacher);
    await fill(teacher, 'Year-end results', 'Fictional result: 85 percent met the two-point criterion.');
    await fill(teacher, 'Teacher reflection', 'Modeling and feedback supported the agreed learning goal.');
    await click(teacher, 'Submit results and reflection');
    await refresh(evaluator);
    await evaluator.getByLabel(/Human-selected (SPM|SLG) rating/).selectOption('2'); await saved(evaluator);
    await fill(evaluator, 'Rating rationale', 'The agreed measures and fictional results support this rating.');
    await click(evaluator, 'Review rating & lock'); await review(evaluator, 'Rate and lock record');
    const final = boot(EVALUATOR).workspace;
    expect(final.spms.find(s => s.teacherId === 't1').status).toBe('locked');
    expect(final.teachers.find(t => t.id === 't1').ratings.lea).toBe(2);
    await refresh(teacher); await teacher.setViewportSize({ width: 390, height: 844 });
    await teacher.screenshot({ path: path.join(OUT, 'educator-spm-mobile.png'), fullPage: true });
    expect(await teacher.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await teacher.setViewportSize({ width: 1440, height: 1000 });
    await tab(teacher, 'Overview');
    await fill(teacher, 'Statement', 'Fictional educator statement: I will continue modeling evidence-based reasoning.');
    await click(teacher, 'Save statement');
    await refresh(evaluator); await tab(evaluator, 'Overview');
    const annual = evaluator.locator('#ae-annual-rating-composer');
    for (let i = 0; i < 4; i++) {
      await annual.locator('.ae-rating-grid select').nth(i).selectOption('2'); await saved(evaluator);
      const card = annual.locator('.ae-rating-card').nth(i);
      await card.locator('textarea').fill('The published fictional cycle evidence supports this human-selected annual judgment.'); await saved(evaluator);
      await card.locator('fieldset input[type="checkbox"]').first().check(); await saved(evaluator);
    }
    const measures = annual.locator('input[type="number"]');
    for (let i = 0; i < await measures.count(); i++) { await measures.nth(i).fill('2'); await saved(evaluator); }
    await annual.getByText(/I confirm the official (final rating form|summative rating)/).locator('..').locator('input[type="checkbox"]').check(); await saved(evaluator);
    await click(evaluator, 'Review final release'); await review(evaluator, 'Confirm final release');
    expect(boot(EVALUATOR).workspace.teachers.find(t => t.id === 't1').finalizedAt).toBeTruthy();
    await evaluator.screenshot({ path: path.join(OUT, 'annual-finalized.png'), fullPage: true });
    await refresh(teacher); await tab(teacher, 'Overview');
    const statement = teacher.locator('section', { has: teacher.getByRole('heading', { name: 'Your statement for the record', exact: true }) });
    expect(await statement.innerText()).toContain('Frozen at finalization');
    expect(await statement.innerText()).toContain('Fictional educator statement: I will continue modeling evidence-based reasoning.');
    expect(await statement.locator('textarea, input, button').count()).toBe(0);
    expect(errors).toEqual([]);
    expect(calls.filter(c => c.error || c.ok === false)).toEqual([]);
    fs.writeFileSync(path.join(OUT, 'live-bridge-results.json'), JSON.stringify({ ok: true, calls: calls.length, formalFinalized: true, spmLocked: true, annualFinalized: true, educatorStatementLocked: true, privateDraftsHidden: true, crossEducatorAccessBlocked: true, mobileOverflow: false, errors }, null, 2));
  } catch (error) {
    if (evaluator) await evaluator.screenshot({ path: path.join(OUT, 'bridge-evaluator-failure.png'), fullPage: true });
    if (teacher) await teacher.screenshot({ path: path.join(OUT, 'bridge-educator-failure.png'), fullPage: true });
    fs.writeFileSync(path.join(OUT, 'bridge-failure.json'), JSON.stringify({ error: String(error), calls, errors }, null, 2));
    throw error;
  } finally { await browser.close(); }
}, 240000);
