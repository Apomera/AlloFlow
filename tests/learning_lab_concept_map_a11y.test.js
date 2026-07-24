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

  it('uses a bounded native create form with inline errors and privacy guidance', () => {
    expect(conceptMap).toContain("hh('form', { 'aria-labelledby': 'learning-lab-new-concept-map-heading', onSubmit: createMap, noValidate: true }");
    expect(conceptMap).toContain("htmlFor: 'learning-lab-concept-map-title'");
    expect(conceptMap).toContain("required: true, maxLength: 160");
    expect(conceptMap).toContain("id: 'learning-lab-concept-map-title-error', role: 'alert'");
    expect(conceptMap).toContain("id: 'learning-lab-concept-map-privacy'");
    expect(conceptMap).toContain("focusId('learning-lab-concept-map-title')");
  });

  it('preserves sibling data for every map write', () => {
    expect(conceptMap.match(/setData\(Object\.assign\(\{\}, data, \{ maps:/g)).toHaveLength(3);
    expect(conceptMap).not.toContain('setData({ maps:');
  });

  it('provides equivalent native concept and connection lists', () => {
    expect(conceptMap).toContain("'aria-labelledby': 'learning-lab-concepts-heading'");
    expect(conceptMap).toContain("'data-concept-id': node.id");
    expect(conceptMap).toContain("'aria-pressed': selectedNode === node.id ? 'true' : 'false'");
    expect(conceptMap).toContain("'aria-labelledby': 'learning-lab-connections-heading'");
    expect(conceptMap).toContain("'aria-label': 'Delete connection: ' + text");
  });

  it('treats the scalable SVG as an optional visual equivalent', () => {
    expect(conceptMap).toContain("viewBox: '0 0 600 480', 'aria-hidden': 'true', focusable: 'false'");
    expect(conceptMap).toContain("height: 'auto', maxHeight: 480, aspectRatio: '5 / 4'");
    expect(conceptMap).not.toContain("role: 'button', tabIndex: 0");
    expect(conceptMap).not.toContain("role: 'group'");
  });

  it('supports safe connection creation and prevents duplicates', () => {
    expect(conceptMap).toContain("some(function(edge) { return edge.from === connectFrom && edge.to === nodeId; })");
    expect(conceptMap).toContain("llAnnounce('That connection already exists.')");
    expect(conceptMap).toContain("title: 'Describe the relationship'");
    expect(conceptMap).toContain("label: 'Relationship label', required: false, maxLength: 80");
  });

  it('restores focus and announces meaningful state changes', () => {
    for (const id of [
      'learning-lab-concept-map-editor-heading',
      'learning-lab-concept-map-list-heading',
      'learning-lab-concepts-heading',
      'learning-lab-connections-heading'
    ]) expect(conceptMap).toContain("focusId('" + id + "')");
    expect(conceptMap).toContain("'learning-lab-add-concept'");
    expect(conceptMap).toContain("llAnnounce('Concept deleted: '");
    expect(conceptMap).toContain("llAnnounce('Connection deleted'");
    expect(conceptMap).toContain("' moved ' + direction + ' '");
    expect(conceptMap).toContain("llAnnounce('Color changed for '");
    expect(conceptMap).not.toContain("setView('list'); return null;");
  });

  it('confirms destructive actions and supplies 44-pixel controls', () => {
    expect(conceptMap).toContain("title: 'Delete this concept map?', confirmText: 'Delete map'");
    expect(conceptMap).toContain("title: 'Delete this concept?', confirmText: 'Delete concept'");
    expect(conceptMap).toContain("title: 'Delete this connection?', confirmText: 'Delete connection'");
    expect(conceptMap.match(/minHeight: 44/g)?.length).toBeGreaterThanOrEqual(9);
  });

  it('qualifies evidence and avoids prescriptive efficacy claims', () => {
    expect(conceptMap).toContain('Concept mapping may support organizing relationships in some learning contexts');
    expect(conceptMap).toContain('was not one of the ten learning techniques rated in Dunlosky et al. (2013)');
    expect(conceptMap).toContain('not an assessment or a guarantee of learning');
    expect(conceptMap).not.toContain('Strong evidence for synthesis-heavy material');
    expect(conceptMap).not.toContain('Try mapping every chapter or unit');
  });

  it('updates discovery copy and keeps the deployed mirror identical', () => {
    expect(source).toContain("desc: 'Flexible visual and text relationship organizer'");
    expect(source).toContain('Equivalent visual and text views for exploring relationships between ideas.');
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
