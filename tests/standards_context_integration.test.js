import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let Context, Contracts, BlueprintService, Graph;

beforeAll(() => {
  loadAlloModule('standards_context_module.js');
  loadAlloModule('agent_core_contracts_module.js');
  loadAlloModule('agent_core_blueprint_service_module.js');
  loadAlloModule('concept_graph_engine_module.js');
  Context = window.AlloModules.StandardsContext;
  Contracts = window.AlloModules.AgentCoreContracts;
  BlueprintService = window.AlloModules.AgentCoreBlueprintService;
  Graph = window.AlloModules.ConceptGraphEngine;
  if (!Context || !Contracts || !BlueprintService || !Graph) throw new Error('Standards context dependencies failed to register');
});

describe('shared standards context', () => {
  it('normalizes raw teacher input without claiming external verification', () => {
    const context = Context.resolve('NGSS 5-ESS2-1; CCSS.ELA-LITERACY.RI.5.1');
    expect(context.version).toBe('standards-context/v1');
    expect(context.standards.map((entry) => entry.label)).toEqual([
      'NGSS 5-ESS2-1',
      'CCSS.ELA-LITERACY.RI.5.1',
    ]);
    expect(context.promptText).toContain('NGSS 5-ESS2-1');
    expect(context.resolutionStatus).toBe('unresolved');
    expect(context.provider).toBe('user-input');
  });

  it('preserves a resolved provider snapshot through Blueprint validation and revision', async () => {
    const context = Context.resolve({
      inputText: '5-ESS2-1',
      standards: [{ code: '5-ESS2-1', label: 'Earth systems', text: 'Develop a model...', sourceUrl: 'https://example.edu/standard' }],
      provider: 'local-standards-cache',
      datasetVersion: '2026-01',
      resolutionStatus: 'resolved',
      provenance: { provider: 'local-standards-cache', datasetVersion: '2026-01', license: 'CC BY' },
    });
    const service = BlueprintService.createBlueprintService({ contracts: Contracts });
    const draft = await service.createDraft({
      blueprintId: 'bp-standards-context',
      gradeLevel: '5th Grade',
      standards: '5-ESS2-1',
      standardsContext: context,
      plan: ['analysis', 'lesson-plan'],
    });
    expect(draft.standardsContext.provider).toBe('local-standards-cache');
    expect(draft.standardsContext.datasetVersion).toBe('2026-01');
    expect(draft.standardsContext.standards[0].code).toBe('5-ESS2-1');

    const revised = service.revise(draft, { lessonDNA: { essentialQuestion: 'How do Earth systems interact?' } });
    expect(revised.ok).toBe(true);
    expect(revised.value.standardsContext).toEqual(draft.standardsContext);
  });

  it('exposes the same context provenance in the audit graph used by Alignment Map', () => {
    const context = Context.resolve({
      standards: [{ code: '5-ESS2-1', label: 'Earth systems' }],
      provider: 'local-standards-cache',
      datasetVersion: '2026-01',
      snapshotId: 'snap-5e',
    });
    const graph = Graph.fromAlignmentAudit({
      standards: {
        status: 'Partially Aligned',
        standardsContext: context,
        perStandard: [{
          standard: '5-ESS2-1',
          status: 'Partially Aligned',
          analysis: {
            textAlignment: { status: 'Aligned', evidence: 'Lesson plan models Earth systems.' },
            activityAlignment: { status: 'Partially Aligned', evidence: 'Activity needs a model revision.' },
            assessmentAlignment: { status: 'Aligned', evidence: 'Quiz checks the target concept.' },
          },
          gaps: ['Add a revision task.'],
        }],
      },
    });
    expect(graph.meta.alignmentAudit.provider).toBe('local-standards-cache');
    expect(graph.meta.alignmentAudit.datasetVersion).toBe('2026-01');
    expect(graph.meta.alignmentAudit.snapshotId).toBe('snap-5e');
    expect(graph.meta.alignmentAudit.standardsContext.promptText).toContain('5-ESS2-1');
    expect(graph.edges.some((edge) => edge.type === 'assessedBy')).toBe(true);
  });
});

describe('standards context integration seams', () => {
  it('keeps the context layer above Blueprint and direct/full-pack generation', () => {
    const root = process.cwd();
    const dispatcher = readFileSync(resolve(root, 'generate_dispatcher_module.js'), 'utf8');
    const fullPack = readFileSync(resolve(root, 'generation_helpers_module.js'), 'utf8');
    const blueprint = readFileSync(resolve(root, 'phase_o_misc_handlers_module.js'), 'utf8');
    const loader = readFileSync(resolve(root, 'AlloFlowANTI.txt'), 'utf8');
    expect(dispatcher).toContain('standardsContext: _isolatedContext ? null');
    expect(dispatcher).toContain('content.comprehensive.standardsContext');
    expect(dispatcher).toContain('standardsContext: _ambientStandardsContext');
    expect(dispatcher).toContain('_ambientStandardsContext || _ambientStandardsPromptString');
    expect(fullPack).toContain('standardsContext: activeStandardsContext');
    expect(fullPack).toContain('standardsContext && Array.isArray(standardsContext.standards)');
    expect(blueprint).toContain('standardsContext: standardsContext');
    expect(loader).toContain("loadModule('StandardsContext'");
  });
});
