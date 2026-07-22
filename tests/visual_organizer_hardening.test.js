import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const renderer = fs.readFileSync('view_renderers_source.jsx', 'utf8');
const dispatcher = fs.readFileSync('generate_dispatcher_source.jsx', 'utf8');

describe('Visual organizer hardening', () => {
  it('uses stable registered component identities for every organizer game', () => {
    const games = [
      'CauseEffectSortGame',
      'PipelineBuilderGame',
      'TChartSortGame',
      'ConceptMapSortGame',
      'OutlineSortGame',
      'FishboneSortGame',
      'ProblemSolutionSortGame',
      'FrayerSortGame',
      'SeeThinkWonderSortGame',
      'StoryMapSortGame',
    ];
    games.forEach(name => {
      expect(renderer).toContain(`? window.AlloModules.${name} : _GameLoadingFallback`);
    });
    expect(renderer).not.toMatch(/const (?:CauseEffect|TChart|ConceptMap|Outline|Fishbone|ProblemSolution|Frayer|SeeThinkWonder|StoryMap)SortGame[^\n]+React\.memo/);
  });

  it('renders Claim-Evidence-Reasoning as a dedicated connected relationship', () => {
    expect(renderer).toContain("if (type === 'Claim-Evidence-Reasoning' && !isEditingOutline)");
    expect(renderer).toContain("t('outline.cer_flow_aria')");
    expect(renderer).toContain('Claim, Evidence, and Reasoning relationship');
    expect(renderer).toContain("t('outline.cer_reasoning_caption')");
  });

  it('uses stable semantic roles and positional fallback for translated Cause-and-Effect data', () => {
    expect(dispatcher).toContain("role='cause', role='effect', or role='chain'");
    expect(dispatcher).toContain('"role": "cause|effect|chain"');
    expect(renderer).toContain("const semanticRole = (branch)");
    expect(renderer).toContain('causes = [branches[0]]');
    expect(renderer).toContain('effects = [branches[1]]');
  });

  it('validates strict organizer schemas instead of inventing empty sections', () => {
    expect(renderer).toContain("if (branches.length !== 4)");
    expect(renderer.match(/if \(branches\.length !== 3\)/g)).toHaveLength(3);
    expect(renderer).toContain("if (branches.length !== 5)");
    expect(renderer).toContain("t('outline.story_map_invalid_title')");
    expect(renderer).toContain('const renderOrganizerFallback');
  });

  it('provides writable, device-local KWL responses', () => {
    expect(renderer).toContain('const KwlResponseBoard');
    expect(renderer).toContain('alloflow_kwl_notes_');
    expect(renderer).toContain('window.localStorage.setItem(storageKey');
    expect(renderer).toContain("t('outline.kwl_personal_response')");
    expect(renderer).toContain('React.createElement(KwlResponseBoard');
  });

  it('guards organizer pulse animation for reduced motion', () => {
    expect(renderer).not.toContain(' transition-all animate-[pulse_3s_ease-in-out_infinite]');
    expect((renderer.match(/motion-safe:animate-\[pulse_3s_ease-in-out_infinite\]/g) || []).length).toBeGreaterThanOrEqual(10);
  });

  it('keeps the duplicate Fishbone skeleton decorative for screen readers', () => {
    const fishboneStart = renderer.indexOf('{/* SVG fishbone skeleton');
    const fishboneEnd = renderer.indexOf('{/* Cards below:', fishboneStart);
    const fishboneSvg = renderer.slice(fishboneStart, fishboneEnd);
    expect(fishboneSvg).toContain('aria-hidden="true"');
    expect(fishboneSvg).toContain('focusable="false"');
    expect(fishboneSvg).not.toContain('role="img"');
  });
});
