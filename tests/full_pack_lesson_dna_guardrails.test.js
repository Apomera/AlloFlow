import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');

const plannerFiles = [
  'phase_k_helpers_source.jsx',
  'phase_k_helpers_module.js',
  'desktop/web-app/public/phase_k_helpers_module.js',
];

const fullPackFiles = [
  'generation_helpers_source.jsx',
  'generation_helpers_module.js',
  'desktop/web-app/public/generation_helpers_module.js',
];

describe('full-pack and blueprint lesson DNA guardrails', () => {
  it.each(plannerFiles)('%s treats custom pack guidance as bounded teacher intent', (file) => {
    const src = read(file);

    expect(src).toContain('TEACHER PACK GUIDANCE');
    expect(src).toContain('Do not replace or contradict those anchors');
    expect(src).toContain('let it influence the emphasis of the essential question');
    expect(src).not.toContain('Prioritize this over general analysis');
    expect(src).not.toContain("USER'S SPECIAL REQUEST");
  });

  it.each(fullPackFiles)('%s fills missing lesson DNA instead of overwriting locked fields', (file) => {
    const src = read(file);

    expect(src).toContain('Array.isArray(resultItem.data.concepts) && lessonDNA.concepts.length === 0');
    expect(src).toContain('Array.isArray(resultItem.data) && lessonDNA.keyTerms.length === 0');
    expect(src).toContain('resultItem.data.essentialQuestion && !lessonDNA.essentialQuestion');
    expect(src).toContain('.filter(Boolean)');
    expect(src).not.toContain('if (resultItem.data.concepts && Array.isArray(resultItem.data.concepts))');
  });

  it('blueprint modification preserves lessonDNA unless the teacher explicitly asks for a DNA change', () => {
    const src = read('AlloFlowANTI.txt');

    expect(src).toContain('Preserve "lessonDNA" exactly unless');
    expect(src).toContain('prefer updating resourcePlan directives and resource choices');
    expect(src).toContain('Never remove "lessonDNA" from the blueprint');
  });
});
