import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Concept Map accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalConceptMapMaker(props) {');
  const end = source.indexOf('  function PersonalNotesWorkbench(props) {', start);
  const conceptMap = source.slice(start, end);

  it('associates the required map title and reports errors inline', () => {
    expect(conceptMap).toContain("htmlFor: 'learning-lab-concept-map-title'");
    expect(conceptMap).toContain("id: 'learning-lab-concept-map-title', type: 'text', value: newTitle, required: true");
    expect(conceptMap).toContain("id: 'learning-lab-concept-map-title-error', role: 'alert'");
    expect(conceptMap).toContain("document.getElementById('learning-lab-concept-map-title')");
    expect(conceptMap).not.toContain("alert('Need a map title.')");
  });

  it('uses accessible form dialogs for concepts and relationship labels', () => {
    expect(conceptMap).toContain("title: 'Add a concept'");
    expect(conceptMap).toContain("fields: [{ name: 'label', label: 'Concept name', required: true");
    expect(conceptMap).toContain("title: 'Describe the relationship'");
    expect(conceptMap).toContain("label: 'Relationship label', required: false");
    expect(conceptMap).not.toContain("prompt('Concept name?')");
    expect(conceptMap).not.toContain("prompt('Relationship label?");
  });

  it('makes SVG concepts keyboard operable with visible focus and state', () => {
    expect(conceptMap).toContain("role: 'button', tabIndex: 0, focusable: 'true', 'data-ll-focusable': true");
    expect(conceptMap).toContain("'aria-label': 'Concept: ' + n.label");
    expect(conceptMap).toContain("'aria-pressed': isSel");
    expect(conceptMap).toContain("event.key === 'Enter' || event.key === ' '");
    expect(conceptMap).toContain('activateConceptNode(n.id)');
  });

  it('provides keyboard instructions and associates them with the SVG', () => {
    expect(conceptMap).toContain("id: 'learning-lab-concept-map-instructions'");
    expect(conceptMap).toContain("'aria-describedby': 'learning-lab-concept-map-instructions'");
    expect(conceptMap).toContain('Use Tab to reach concepts. Press Enter or Space');
    expect(conceptMap).toContain("role: 'status'");
  });

  it('provides a semantic connection list with safe deletion', () => {
    expect(conceptMap).toContain("'aria-labelledby': 'learning-lab-connections-heading'");
    expect(conceptMap).toContain("id: 'learning-lab-connections-heading'");
    expect(conceptMap).toContain("'aria-label': 'Delete connection: ' + connectionText");
    expect(conceptMap).toContain("title: 'Delete this connection?', confirmText: 'Delete connection'");
    expect(conceptMap).not.toContain("confirm('Delete this connection?')");
  });

  it('provides named 44-pixel movement controls', () => {
    for (const direction of ['left', 'up', 'down', 'right']) {
      expect(conceptMap).toContain(`'aria-label': 'Move ${direction} '`);
    }
    expect(conceptMap.match(/minWidth: 44, minHeight: 44/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it('confirms destructive map and concept deletion', () => {
    expect(conceptMap).toContain("title: 'Delete this concept map?', confirmText: 'Delete map'");
    expect(conceptMap).toContain("title: 'Delete this concept?', confirmText: 'Delete concept'");
    expect(conceptMap).not.toContain("confirm('Delete this concept map?')");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
