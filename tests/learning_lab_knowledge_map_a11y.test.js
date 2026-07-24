import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Knowledge Map accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalKnowledgeMap(props) {');
  const end = source.indexOf('  // ── IIII. PERSONAL CURRICULUM BUILDER (Wave 19) ──', start);
  const map = source.slice(start, end);

  it('frames statuses as personal notes rather than assessment', () => {
    expect(map).toContain('Organize subjects and personal learning-status notes over time.');
    expect(map).toContain('Your map, not a test');
    expect(map).toContain('personal organization labels—not grades, diagnoses, or proof of ability');
    expect(map).toContain('Statuses are labels you control, not grades or assessments.');
  });

  it('uses less absolute learning-status labels', () => {
    expect(map).toContain("{ id: 'mastered', label: 'Strong confidence'");
    expect(map).toContain("{ id: 'know', label: 'Familiar'");
    expect(map).toContain("{ id: 'next', label: 'Next to explore'");
  });

  it('normalizes unknown legacy statuses to Learning', () => {
    expect(map).toContain('return STATUSES.filter(function(status) { return status.id === id; })[0] || STATUSES[2]');
  });

  it('uses a named area form with native submit behavior', () => {
    expect(map).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); addArea(); }");
    expect(map).toContain("'aria-labelledby': 'learning-lab-knowledge-area-form-heading'");
    expect(map).toContain("type: 'submit'");
  });

  it('provides visible labels for area icon and name', () => {
    expect(map).toContain("htmlFor: 'learning-lab-knowledge-area-icon'");
    expect(map).toContain("htmlFor: 'learning-lab-knowledge-area-name'");
  });

  it('bounds area icon and name while requiring only the name', () => {
    expect(map).toContain('maxLength: 12');
    expect(map).toContain('required: true, maxLength: 1000');
    expect(map).toContain('Knowledge-area name (required)');
  });

  it('reports and focuses an empty area name inline', () => {
    expect(map).toContain("setAreaError('Enter a knowledge-area name before saving.')");
    expect(map).toContain("id: 'learning-lab-knowledge-area-error', role: 'alert'");
    expect(map).toContain("'aria-invalid': areaError ? 'true' : undefined");
    expect(map).toContain("focusById('learning-lab-knowledge-area-name')");
  });

  it('trims area values and supplies an icon fallback', () => {
    expect(map).toContain('var name = form.name.trim()');
    expect(map).toContain("icon: form.icon.trim() || '📚'");
  });

  it('preserves unrelated data while adding an area', () => {
    expect(map).toContain("setData(Object.assign({}, data, { areas: [area].concat(data.areas || []) }))");
  });

  it('announces area saving and restores form focus', () => {
    expect(map).toContain("llAnnounce('Knowledge area saved: ' + name)");
    expect(map).toContain("focusById('learning-lab-knowledge-area-name')");
  });

  it('always provides a named area list and useful empty state', () => {
    expect(map).toContain("hh('section', { 'aria-labelledby': 'learning-lab-knowledge-list-heading'");
    expect(map).toContain("id: 'learning-lab-knowledge-list-heading', tabIndex: -1");
    expect(map).toContain('No knowledge areas saved yet.');
  });

  it('uses a semantic list of labeled area articles', () => {
    expect(map).toContain("hh('ul', { 'aria-label': 'Saved knowledge areas'");
    expect(map).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(map).toContain("hh('h3', { id: headingId");
  });

  it('separates Open and Remove into valid native buttons', () => {
    expect(map).toContain("'aria-label': 'Open knowledge area: '");
    expect(map).toContain("'aria-label': 'Remove knowledge area: '");
    expect(map).toContain("}, 'Open area')");
    expect(map).toContain("}, 'Remove')");
    expect(map).not.toContain("hh('span', { onClick:");
  });

  it('hides decorative area icons from assistive technology', () => {
    expect(map).toContain("hh('span', { 'aria-hidden': 'true' }, String(area.icon || '📚') + ' ')");
  });

  it('uses time semantics for area creation dates', () => {
    expect(map).toContain("hh('time', { dateTime: area.createdAt }, relDate(area.createdAt))");
  });

  it('announces area opening and focuses the detail heading', () => {
    expect(map).toContain("llAnnounce('Opened knowledge area: '");
    expect(map).toContain("focusById('learning-lab-knowledge-detail-heading')");
  });

  it('announces return navigation and restores the originating Open button', () => {
    expect(map).toContain("llAnnounce('Returned to all knowledge areas.')");
    expect(map).toContain("focusById('learning-lab-knowledge-open-' + safeDomId(previous))");
  });

  it('handles a missing active area without updating state during render', () => {
    expect(map).toContain('The selected area is no longer available.');
    expect(map).toContain('This knowledge area could not be found.');
    expect(map).not.toContain("if (!a) { setView('list'); return null; }");
  });

  it('uses a named topic form with native submit behavior', () => {
    expect(map).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); addTopic(); }");
    expect(map).toContain("'aria-labelledby': 'learning-lab-knowledge-topic-form-heading'");
  });

  it('provides visible labels for topic name and initial status', () => {
    expect(map).toContain("htmlFor: 'learning-lab-knowledge-topic-name'");
    expect(map).toContain("htmlFor: 'learning-lab-knowledge-topic-status-new'");
  });

  it('requires and bounds the topic name', () => {
    expect(map).toContain('required: true, maxLength: 2000');
    expect(map).toContain('Topic name (required)');
  });

  it('reports and focuses an empty topic inline', () => {
    expect(map).toContain("setTopicError('Enter a topic name before saving.')");
    expect(map).toContain("id: 'learning-lab-knowledge-topic-error', role: 'alert'");
    expect(map).toContain("focusById('learning-lab-knowledge-topic-name')");
  });

  it('uses full-text native options instead of icon-only status options', () => {
    expect(map).toContain("hh('option', { key: status.id, value: status.id }, status.label)");
    expect(map).toContain("hh('option', { key: option.id, value: option.id }, option.label)");
    expect(map).not.toContain("}, opt.icon)");
  });

  it('preserves unrelated data for all area updates', () => {
    expect(map).toContain("setData(Object.assign({}, data, { areas: (data.areas || []).map");
  });

  it('announces topic saving and restores topic-form focus', () => {
    expect(map).toContain("llAnnounce('Topic saved: ' + text)");
    expect(map).toContain("focusById('learning-lab-knowledge-topic-name')");
  });

  it('always provides a named topic section and useful empty state', () => {
    expect(map).toContain("'aria-labelledby': 'learning-lab-knowledge-topics-heading'");
    expect(map).toContain("id: 'learning-lab-knowledge-topics-heading', tabIndex: -1");
    expect(map).toContain('No topics saved in this area yet.');
  });

  it('uses semantic status groups, lists, and labeled topic articles', () => {
    expect(map).toContain("hh('h4', { id: statusHeadingId");
    expect(map).toContain("hh('ul', { 'aria-label': status.label + ' topics'");
    expect(map).toContain("hh('h5', { id: headingId");
  });

  it('gives each existing topic status select a contextual visible label', () => {
    expect(map).toContain("htmlFor: 'learning-lab-knowledge-topic-status-' + domId");
    expect(map).toContain("'Learning status for ' + String(topic.text || 'this topic')");
  });

  it('announces status changes and restores select focus', () => {
    expect(map).toContain("llAnnounce('Learning status changed to ' + normalized.label");
    expect(map).toContain("focusById('learning-lab-knowledge-topic-status-' + safeDomId(topic.id))");
  });

  it('uses time semantics for added and updated topic dates', () => {
    expect(map).toContain("hh('time', { dateTime: topic.addedAt || undefined }, relDate(topic.addedAt))");
    expect(map).toContain("hh('time', { dateTime: topic.updatedAt }, relDate(topic.updatedAt))");
  });

  it('confirms topic removal and restores topic-section focus', () => {
    expect(map).toContain("title: 'Remove this topic?', confirmText: 'Remove topic'");
    expect(map).toContain("'aria-label': 'Remove knowledge topic: '");
    expect(map).toContain("llAnnounce('Knowledge topic removed.')");
    expect(map).toContain("focusById('learning-lab-knowledge-topics-heading')");
  });

  it('confirms area removal and preserves unrelated data', () => {
    expect(map).toContain("title: 'Remove this knowledge area?', confirmText: 'Remove area'");
    expect(map).toContain('This cannot be undone.');
    expect(map).toContain("setData(Object.assign({}, data, { areas: (data.areas || []).filter");
  });

  it('announces area removal and restores list focus', () => {
    expect(map).toContain("llAnnounce('Knowledge area and its topics removed.')");
    expect(map).toContain("focusById('learning-lab-knowledge-list-heading')");
  });

  it('wraps long text and uses responsive 44-pixel controls', () => {
    expect(map).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
    expect(map).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'");
    expect(map).toContain('minWidth: 44, minHeight: 44');
    expect(map).toContain("width: '100%', minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
