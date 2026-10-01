import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');
const moduleSource = read('student_analytics_module.js');
const banks = JSON.parse(read('psychometric_probes.json')).BENCHMARK_PROBE_BANKS;

function loadFinalizer() {
  const start = moduleSource.indexOf('const finalizeWordSoundsProbeForm =');
  const end = moduleSource.indexOf('\n  try {', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return new Function(`
    ${moduleSource.slice(start, end)}
    return finalizeWordSoundsProbeForm;
  `)();
}

describe('Assessment Center fixed Word Sounds forms', () => {
  const finalize = loadFinalizer();

  it('retains exact bank length and order while stamping stable unique identity', () => {
    let checkedForms = 0;

    for (const [grade, forms] of Object.entries(banks || {})) {
      for (const [form, activities] of Object.entries(forms || {})) {
        for (const [activity, rawItems] of Object.entries(activities || {})) {
          if (!Array.isArray(rawItems)) continue;
          checkedForms += 1;
          const input = rawItems.map((raw, priorIndex) => ({ raw, priorIndex }));
          const launch = finalize(input, grade, activity, form);

          expect(launch.items).toHaveLength(rawItems.length);
          expect(launch.items.map((item) => item.priorIndex)).toEqual(
            input.map((item) => item.priorIndex),
          );
          expect(launch.config).toMatchObject({
            schema: 'alloflow-word-sounds-probe/v1',
            version: 1,
            grade,
            probeGrade: grade,
            form,
            probeForm: form,
            activity,
            probeActivity: activity,
            formId: `${grade}:${form}:${activity}`,
            fixedForm: true,
            itemCount: rawItems.length,
            probeItemCount: rawItems.length,
            sessionGoal: rawItems.length,
          });
          expect(launch.config.itemIds).toHaveLength(rawItems.length);
          expect(new Set(launch.config.itemIds).size).toBe(rawItems.length);

          launch.items.forEach((item, index) => {
            expect(item).toMatchObject({
              probeIndex: index,
              probeItemId: `${grade}:${form}:${activity}:${String(index + 1).padStart(2, '0')}`,
              probeFormId: `${grade}:${form}:${activity}`,
              probeGrade: grade,
              probeForm: form,
              probeActivity: activity,
              probeItemCount: rawItems.length,
              probeFixedForm: true,
            });
          });
        }
      }
    }

    expect(checkedForms).toBeGreaterThan(0);
  });

  it('maps spelling only at the runtime activity boundary', () => {
    const launch = finalize([{ targetWord: 'ship' }], '2', 'spelling', 'C');

    expect(launch.config.activity).toBe('spelling');
    expect(launch.config.runtimeActivity).toBe('spelling_bee');
    expect(launch.items[0].probeActivity).toBe('spelling');
    expect(launch.items[0].probeRuntimeActivity).toBe('spelling_bee');
  });

  it('passes the selected form and complete fixed configuration through the host callbacks', () => {
    const start = moduleSource.indexOf('const launchBenchmarkProbe');
    const end = moduleSource.indexOf('const launchScreeningSession', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const launcher = moduleSource.slice(start, end);

    expect(launcher).toContain('finalizeWordSoundsProbeForm(probeWords, grade, activity, form)');
    expect(launcher).toContain('setProbeForm(probeConfig.form)');
    expect(launcher).toContain('setWsPreloadedWords(fixedProbeWords)');
    expect(launcher).toContain('prepareWordSoundsSession(probeConfig)');
    expect(launcher).toContain('wordSoundsProbeConfig: persistedProbeConfig');
    expect(launcher).toContain('sessionConfig: persistedProbeConfig');
    expect(launcher).toContain('setWordSoundsActivity(probeConfig.runtimeActivity)');
  });

  it('uses the Word Sounds form callback for literacy without mutating math form state', () => {
    const start = moduleSource.indexOf("t('probes.benchmark_battery')");
    const end = moduleSource.indexOf("t('probes.math_fluency')", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const literacy = moduleSource.slice(start, end);

    expect(literacy).toContain('value: wordSoundsProbeForm');
    expect(literacy).toContain('setProbeForm(e.target.value)');
    expect(literacy).toContain('launchBenchmarkProbe(probeGradeLevel, probeActivity, wordSoundsProbeForm)');
    expect(literacy).not.toContain('setMathProbeForm(e.target.value)');
  });

  it('keeps roster screening on the same host-selected Word Sounds form', () => {
    expect(moduleSource).toMatch(
      /launchScreeningSession\(\s*probeGradeLevel,\s*wordSoundsProbeForm,\s*nextStudent\s*\)/,
    );
  });
});
