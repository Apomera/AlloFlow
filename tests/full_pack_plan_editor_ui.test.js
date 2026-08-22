import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const strings = readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8');

describe('Full Pack educator plan editor host wiring', () => {
  it('uses functional state updates for every immutable plan mutation', () => {
    expect(host).toContain('setFullPackRun(previous => _m[method](previous, ...args))');
    expect(host).toContain("_applyFullPackPlanEdit('addFullPackPlanResource', resource, groupId)");
    expect(host).toContain("_applyFullPackPlanEdit('changeFullPackPlanResourceType', resourceKey, nextType, groupId)");
    expect(host).toContain("_applyFullPackPlanEdit('editFullPackPlanResourceDirective', resourceKey, directive, groupId)");
    expect(host).toContain("_applyFullPackPlanEdit('moveFullPackPlanResource', resourceKey, toIndex, groupId)");
    expect(host).toContain("_applyFullPackPlanEdit('setFullPackPlanPrimaryTextPolicy', policy, groupId)");
  });

  it('renders keyboard-native, section-scoped controls for the full reviewed plan', () => {
    for (const testId of [
      'full-pack-primary-policy',
      'full-pack-add-resource-select',
      'full-pack-add-resource',
      'full-pack-resource-type',
      'full-pack-resource-directive',
      'full-pack-move-up',
      'full-pack-move-down',
      'full-pack-remove-plan-row',
    ]) expect(host).toContain(`data-testid="${testId}"`);

    expect(host).toContain('const sectionGroupId = groupRuns.length > 0 ? section.groupId : null');
    expect(host).toContain('data-group-id={sectionGroupId || \'\'}');
    expect(host).toContain('maxLength={4000}');
    expect(host).toContain('disabled={index <= 0}');
    expect(host).toContain('disabled={index >= rows.length - 1}');
    expect(host).toContain('disabled={rows.length <= 1}');
  });

  it('turns the post-plan arrow into a clear motion-safe next-step cue', () => {
    expect(host).toContain('data-testid="full-pack-next-step-arrow"');
    expect(host).toContain("fullPackRun?.status === 'ready' ? 'bg-indigo-100 p-1 ring-4 ring-indigo-300/60 shadow-[0_0_18px_rgba(79,70,229,0.8)] motion-safe:animate-pulse' : ''");
    expect(host).toContain("fullPackRun?.status === 'ready' ? 'text-indigo-800 drop-shadow-sm' : 'text-indigo-300 group-hover:text-indigo-600'");
    expect(host).toContain("t('fullpack.action_generate_pack_aria') || 'Generate full pack from the reviewed plan'");
  });

  it('states the supplemental/non-replacement policy without implying an IEP decision', () => {
    expect(host).toContain('data-testid="full-pack-text-access-summary"');
    expect(host).toContain('The primary/source text remains available to anchor this pack.');
    expect(host).toContain('Number(section?.preflight?.sourceTextChars || 0) > 0');
    expect(host).toContain("Boolean(String(section?.preflight?.sourceFingerprint || '').trim())");
    expect(host).toContain('No primary-text replacement or IEP modification is inferred.');
    expect(strings).toContain('"policy_preserve_primary": "Preserve primary (recommended)"');
    expect(strings).toContain('"policy_educator_directed": "Include supplemental Adapted Text"');
    expect(strings).not.toContain('copy directly into official paperwork');
  });

  it('matches completed resources by stable identity before positional fallback', () => {
    expect(host).toContain("String(resource.key || '') === stableKey");
    expect(host).toContain('resource.type === item.type && Number(resource.index)');
  });
});
