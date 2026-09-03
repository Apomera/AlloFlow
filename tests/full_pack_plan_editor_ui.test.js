import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
// Full Pack run view was extracted from ANTI into its own CDN view module; pins follow the code.
const fullPackRun = readFileSync(resolve(process.cwd(), 'view_full_pack_run_source.jsx'), 'utf8');
const strings = readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8');

describe('Full Pack educator plan editor host wiring', () => {
  it('uses functional state updates for every immutable plan mutation', () => {
    expect(host).toContain('setFullPackRun(previous => _m[method](previous, ...args))');
    expect(host).toContain("_applyFullPackPlanEdit('addFullPackPlanResource', resource, groupId)");
    expect(host).toContain("_applyFullPackPlanEdit('changeFullPackPlanResourceType', resourceKey, nextType, groupId)");
    expect(host).toContain("_applyFullPackPlanEdit('editFullPackPlanResourceDirective', resourceKey, directive, groupId)");
    expect(host).toContain("_applyFullPackPlanEdit('moveFullPackPlanResource', resourceKey, toIndex, groupId)");
    expect(host).toContain("_applyFullPackPlanEdit('setFullPackPlanPrimaryTextPolicy', policy, groupId)");
    expect(host).toContain("_applyFullPackPlanEdit('setFullPackPlanAdaptedTextPolicy', policy, groupId)");
  });

  it('renders keyboard-native, section-scoped controls for the full reviewed plan', () => {
    for (const testId of [
      'full-pack-adapted-policy',
      'full-pack-add-resource-select',
      'full-pack-add-resource',
      'full-pack-resource-type',
      'full-pack-resource-directive',
      'full-pack-move-up',
      'full-pack-move-down',
      'full-pack-remove-plan-row',
    ]) expect(fullPackRun).toContain(`data-testid="${testId}"`);

    expect(fullPackRun).toContain('const sectionGroupId = groupRuns.length > 0 ? section.groupId : null');
    expect(fullPackRun).toContain('data-group-id={sectionGroupId || \'\'}');
    expect(fullPackRun).toContain('maxLength={4000}');
    expect(fullPackRun).toContain('disabled={index <= 0}');
    expect(fullPackRun).toContain('disabled={index >= rows.length - 1}');
    expect(fullPackRun).toContain('disabled={rows.length <= 1}');
  });

  it('turns the post-plan arrow into a clear motion-safe next-step cue', () => {
    expect(fullPackRun).toContain('data-testid="full-pack-next-step-arrow"');
    expect(fullPackRun).toContain("fullPackRun?.status === 'ready' ? 'bg-indigo-100 p-1 ring-4 ring-indigo-300/60 shadow-[0_0_18px_rgba(79,70,229,0.8)] motion-safe:animate-pulse' : ''");
    expect(fullPackRun).toContain("fullPackRun?.status === 'ready' ? 'text-indigo-800 drop-shadow-sm' : 'text-indigo-300 group-hover:text-indigo-600'");
    expect(fullPackRun).toContain("t('fullpack.action_generate_pack_aria') || 'Generate full pack from the reviewed plan'");
  });

  it('states the supplemental/non-replacement policy without implying an IEP decision', () => {
    expect(fullPackRun).toContain('data-testid="full-pack-text-access-summary"');
    expect(fullPackRun).toContain('The source text remains available as the primary reference for this pack.');
    expect(fullPackRun).toContain('The source text is the required primary text for standards alignment and assessment evidence.');
    expect(fullPackRun).toContain('Number(section?.preflight?.sourceTextChars || 0) > 0');
    expect(fullPackRun).toContain("Boolean(String(section?.preflight?.sourceFingerprint || '').trim())");
    expect(fullPackRun).toContain('No primary-text replacement or IEP modification is inferred.');
    expect(strings).toContain('"policy_include_adapted": "Include supplemental Adapted Text (recommended)"');
    expect(strings).toContain('"policy_omit_adapted": "Omit Adapted Text"');
    expect(strings).toContain('"policy_adapted_prohibited": "Adaptation prohibited by sourced standard"');
    expect(strings).not.toContain('copy directly into official paperwork');
  });

  it('matches completed resources by stable identity before positional fallback', () => {
    expect(fullPackRun).toContain("String(resource.key || '') === stableKey");
    expect(fullPackRun).toContain('resource.type === item.type && Number(resource.index)');
  });
});
