import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function source(name) {
  return readFileSync(resolve(root, name), 'utf8');
}

function idsInOrder(text) {
  return Array.from(text.matchAll(/data-hub-id="([^"]+)"/g), (match) => match[1]);
}

describe('hub workflow ordering', () => {
  it('keeps educator tools in workflow and DOM order', () => {
    expect(idsInOrder(source('view_educator_hub_modal_source.jsx'))).toEqual([
      'lesson', 'lumen', 'document', 'whiteboard',
      'page-designer', 'video-studio', 'symbol-studio', 'allosheet',
      'polls-signups', 'dynamic-assessment', 'behavior-lens', 'report-writer',
      'pdf-accessibility', 'accessibility-lab',
      'community-catalog', 'professional-development', 'leadership-hub'
    ]);
  });

  it('keeps learning tools in workflow and DOM order', () => {
    expect(idsInOrder(source('view_learning_hub_modal_source.jsx'))).toEqual([
      'lumen-study', 'reading-library', 'stem-lab', 'text-inquiry',
      'lingua-practice', 'test-prep', 'sel-hub', 'screen-coach',
      'research-hub', 'throughline', 'timeline-studio',
      'storyforge', 'litlab', 'poettree', 'open-groove', 'allohaven'
    ]);
  });

  it('does not rely on visual-only CSS ordering', () => {
    expect(source('view_educator_hub_modal_source.jsx')).not.toContain('style={{ order:');
    expect(source('view_learning_hub_modal_source.jsx')).not.toContain('style={{ order:');
  });
});
