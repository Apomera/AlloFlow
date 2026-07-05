import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const app = readFileSync(resolve(root, 'AlloFlowANTI.txt'), 'utf8');
const header = readFileSync(resolve(root, 'view_header_source.jsx'), 'utf8');
const wizard = readFileSync(resolve(root, 'quickstart_source.jsx'), 'utf8');
const phaseO = readFileSync(resolve(root, 'phase_o_misc_handlers_source.jsx'), 'utf8');
const banner = readFileSync(resolve(root, 'view_guided_mode_banner_source.jsx'), 'utf8');

function guidedTourMapEntries() {
  const start = app.indexOf('const GUIDED_TOUR_MAP = {');
  expect(start).toBeGreaterThan(-1);
  const end = app.indexOf('};', start);
  expect(end).toBeGreaterThan(start);
  const block = app.slice(start, end);
  return Array.from(block.matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)).map((m) => ({ stepId: m[1], domId: m[2] }));
}

describe('Guided Mode host wiring', () => {
  it('maps every guided step to a real host DOM anchor', () => {
    const entries = guidedTourMapEntries();
    expect(entries.length).toBeGreaterThanOrEqual(20);
    const missing = entries.filter(({ domId }) => !app.includes(`id="${domId}"`) && !app.includes(`id='${domId}'`));
    expect(missing).toEqual([]);
  });

  it('passes Guided Mode setters into HeaderBar so the setup button can start the guided path', () => {
    expect(app).toContain('setGuidedMode={setGuidedMode}');
    expect(app).toContain('setGuidedStep={setGuidedStep}');
    expect(app).toContain('setGuidedSelectedIds={setGuidedSelectedIds}');
    expect(header).toContain('setGuidedMode, setGuidedStep, setGuidedSelectedIds');
    expect(header).toContain('data-help-key="header_guided_mode_start"');
    expect(header).toContain('setShowSetupPathMenu(true)');
    expect(header).not.toContain("onClick={() => { safeRemoveItem('allo_wizard_completed'); setShowWizard(true); }}");
  });

  it('routes QuickStart file uploads through the normal completion handler before opening the file picker', () => {
    expect(wizard).toContain("onClick={() => onComplete({ ...localData, sourceMode: 'file', materialType: 'file' })}");
    expect(wizard).not.toContain('onUpload();\n                                      onClose();');
    expect(phaseO).toContain("finalData.sourceMode === 'file'");
    expect(phaseO).toContain('fileInputRef.current.click()');
    expect(phaseO).toContain("safeSetItem('allo_wizard_completed', 'true')");
  });

  it('auto-advances the guided step for generators the dispatcher map misses', () => {
    // anchor-chart / note-taking / dbq / alignment-report / persona never advanced:
    // the first three were omitted from the dispatcher's typeToGuidedId map,
    // alignment-report mapped to the retired '_final' step, and personas generate
    // inside personas_module with no guided wiring. The host watches history instead.
    const start = app.indexOf('const HISTORY_ADVANCE_STEPS = {');
    expect(start).toBeGreaterThan(-1);
    const end = app.indexOf('};', start);
    const block = app.slice(start, end);
    for (const [type, stepId] of [
      ['anchor-chart', 'anchor-chart'],
      ['note-taking', 'note-taking'],
      ['dbq', 'dbq'],
      ['alignment-report', 'alignment'],
      ['persona', 'persona'],
    ]) {
      expect(block).toContain(`'${type}': '${stepId}'`);
    }
    // The effect must index into the ACTIVE (possibly subset) step list, not GUIDED_STEPS.
    const effectStart = app.indexOf('const _guidedHistLenRef');
    expect(effectStart).toBeGreaterThan(-1);
    const effect = app.slice(effectStart, app.indexOf('[history, guidedMode, guidedStep]', effectStart));
    expect(effect).toContain('guidedActiveSteps[guidedStep]');
    expect(effect).toContain('len !== prevLen + 1');
  });

  it('keeps Guided Next step separate from explicit Skip step controls', () => {
    expect(banner).toContain('{!isLast && stepDone && <button');
    expect(banner).toContain('{!isLast && !stepDone && guidedStep > 0 && <button');
    expect(banner).not.toContain('background: guidedEngaged ?');
  });
});
