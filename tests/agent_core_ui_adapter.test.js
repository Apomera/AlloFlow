import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let C, UI;
beforeAll(() => {
  loadAlloModule('agent_core_contracts_module.js');
  loadAlloModule('agent_core_blueprint_service_module.js');
  loadAlloModule('agent_core_ui_adapter_module.js');
  C = window.AlloModules.AgentCoreContracts;
  UI = window.AlloModules.AgentCoreUIAdapter;
});

const fixture = (name) => JSON.parse(readFileSync(resolve(process.cwd(), 'test_data/agent_core', name), 'utf8'));
const context = {
  blueprintId: 'bp-ui-parity',
  gradeLevel: '5th Grade',
  language: 'English',
  standards: 'NGSS 5-ESS2-1',
  interests: ['weather', 'space'],
};

describe('Agent Core UI adapter parity', () => {
  it('normalizes UI-created and service-created Blueprints identically', async () => {
    const legacy = fixture('legacy_config.json');
    const adapter = UI.createUIAdapter({
      contracts: C,
      blueprintService: window.AlloModules.AgentCoreBlueprintService,
      autoConfigure: async () => legacy,
    });
    const created = await adapter.createDraft(context);
    const uiBlueprint = adapter.toBlueprint(legacy, context);
    expect(created.blueprint).toEqual(uiBlueprint);
    expect(created.legacyConfig).toEqual(C.toLegacyConfig(uiBlueprint));
    expect(adapter.validateLegacy(created.legacyConfig, context).ok).toBe(true);
  });

  it('routes AI revision through the service while returning the legacy UI shape', async () => {
    const legacy = fixture('legacy_config.json');
    const adapter = UI.createUIAdapter({
      contracts: C,
      blueprintService: window.AlloModules.AgentCoreBlueprintService,
      modifyBlueprint: async (current) => ({
        ...current,
        recommendedResources: [...current.recommendedResources, 'timeline'],
        resourcePlan: null,
      }),
    });
    const revised = await adapter.reviseLegacy(legacy, 'add a timeline', context);
    expect(revised.blueprint.review.state).toBe('draft');
    expect(revised.legacyConfig.recommendedResources).toEqual([
      'analysis', 'glossary', 'quiz', 'image', 'timeline', 'lesson-plan',
    ]);
    expect(revised.legacyConfig.schemaVersion).toBeUndefined();
  });

  it('requires explicit UI approval before returning an executable legacy plan', () => {
    const legacy = fixture('legacy_config.json');
    const before = JSON.stringify(legacy);
    const adapter = UI.createUIAdapter({
      contracts: C,
      blueprintService: window.AlloModules.AgentCoreBlueprintService,
    });
    const denied = adapter.prepareExecution(legacy, context, '');
    expect(denied.ok).toBe(false);
    expect(denied.errors[0].code).toBe('reviewer-required');
    const planned = adapter.prepareExecution(legacy, context, 'ui-confirmation');
    expect(planned.ok).toBe(true);
    expect(planned.blueprint.review).toEqual({ state: 'approved', reviewer: 'ui-confirmation' });
    expect(planned.legacyConfig).toEqual(C.toLegacyConfig(planned.blueprint));
    expect(JSON.stringify(legacy)).toBe(before);
  });

  it('pins the live chat and Execute seams to the adapter', () => {
    const chat = readFileSync(resolve(process.cwd(), 'udl_chat_source.jsx'), 'utf8');
    const hosts = [
      'AlloFlowANTI.txt',
      'desktop/web-app/src/App.jsx',
      'desktop/web-app/src/AlloFlowANTI.txt',
    ].map((file) => readFileSync(resolve(process.cwd(), file), 'utf8'));
    expect(chat).toContain('_createAgentCoreLegacyDraft');
    expect(chat).toContain('_reviseAgentCoreLegacyBlueprint');
    for (const host of hosts) {
      expect(host).toContain('window.AlloModules.AgentCoreUIAdapter');
      expect(host).toContain('_adapterModule.createUIAdapter');
      expect(host).toContain("prepareExecution(activeBlueprint");
      expect(host).toContain('activeBlueprint: _executionBlueprint');
    }
  });
});
