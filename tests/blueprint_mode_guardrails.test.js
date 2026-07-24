import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');

const plannerFiles = [
  'phase_k_helpers_source.jsx',
  'phase_k_helpers_module.js',
  'desktop/web-app/public/phase_k_helpers_module.js',
];

const executorFiles = [
  'phase_o_misc_handlers_source.jsx',
  'phase_o_misc_handlers_module.js',
  'desktop/web-app/public/phase_o_misc_handlers_module.js',
];

const chatFiles = [
  'udl_chat_source.jsx',
  'udl_chat_module.js',
  'desktop/web-app/public/udl_chat_module.js',
];

const blueprintCardFiles = [
  'persona_ui_source.jsx',
  'persona_ui_module.js',
  'desktop/web-app/public/persona_ui_module.js',
];

const hostBlueprintFiles = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
];

describe('blueprint mode guardrails', () => {
  it.each(plannerFiles)('%s keeps resourcePlan as the ordered canonical plan', (file) => {
    const src = read(file);

    expect(src).toContain('normalizePlanItem');
    expect(src).toContain('config.resourcePlan = config.resourcePlan.map');
    expect(src).toContain('config.recommendedResources = config.resourcePlan.map');
    expect(src).toContain('config.toolDirectives = config.resourcePlan.reduce');
    expect(src).not.toContain('new Set(config.resourcePlan');
  });

  it.each(executorFiles)('%s executes resourcePlan items with per-step directives', (file) => {
    const src = read(file);

    expect(src).toContain('getBlueprintResourcePlan');
    expect(src).toContain('blueprint?.resourcePlan');
    expect(src).toContain('const { type, directive: aiDirective = "" } = finalResources[i];');
    expect(src).toContain('This blueprint does not include any resources yet.');
    expect(src).toContain('did not generate');
    expect(src).not.toContain('const finalResources = activeBlueprint.recommendedResources;');
  });

  it.each(chatFiles)('%s carries pack guidance through count selection and avoids accidental execution', (file) => {
    const src = read(file);

    expect(src).toContain('pendingBlueprintContext');
    expect(src).toContain('const countOnlyPattern');
    expect(src).toContain('const blueprintContext = [guidedFlowState.pendingBlueprintContext, countStepContext]');
    expect(src).toContain('hasBlueprintEditRequest');
    expect(src).toContain('await Promise.resolve(handleExecuteBlueprint())');
    expect(src).not.toContain('const isExecutionCommand = /go|start|run|execute|confirm|yes|proceed/i.test(textToSend);');
    expect(src).not.toContain('const initialSelection = {};');
    expect(src).not.toContain('const newSelection = {};');
  });

  it.each(blueprintCardFiles)('%s edits full resourcePlan data and reads the shared tool catalog', (file) => {
    const src = read(file);

    expect(src).toContain('getPlanItems');
    expect(src).toContain('resourcePlan');
    expect(src).toContain('window.TOOL_CATALOG');
    expect(src).toContain("value: 'dbq'");
    expect(src).toContain("value: 'anchor-chart'");
    expect(src).toContain("value: 'alignment-report'");
    expect(src).toContain("entry.id === 'dbq' ? 'DBQ'");
    expect(src).not.toContain('step-${idx}-${Date.now()}');
  });

  it.each(hostBlueprintFiles)('%s normalizes blueprint AI edits back into resourcePlan', (file) => {
    const src = read(file);

    expect(src).toContain('const normalizeBlueprintPlan = (config) =>');
    expect(src).toContain('Update "resourcePlan" array to add/remove/reorder steps');
    expect(src).toContain('compatibility mirrors of "resourcePlan"');
    expect(src).toContain('return normalizeBlueprintPlan(parsed);');
    expect(src).not.toContain('Update "recommendedResources" array to add/remove tools');
  });

  it.each(hostBlueprintFiles)('%s builds Generate Unit lessons with canonical resourcePlan', (file) => {
    const src = read(file);

    expect(src).toContain("const resourcePlan = types.map(tp => ({ tool: tp, directive: _lessonFocus }));");
    expect(src).toContain('recommendedResources: resourcePlan.map(r => r.tool)');
    expect(src).toContain('toolDirectives: resourcePlan.reduce');
    expect(src).not.toContain('const blueprint = { recommendedResources: types, toolDirectives');
  });
});
