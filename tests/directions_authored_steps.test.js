import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = file => readFileSync(resolve(process.cwd(), file), 'utf8');
const host = read('AlloFlowANTI.txt');
const helpers = host.slice(host.indexOf('const TEACHER_ONLY_TYPES = ['), host.indexOf('let globalAudioCtx'));
const adapterStart = host.indexOf('function _alloBuildDirectionsResultAdapter(');
const adapterSource = host.slice(adapterStart, host.indexOf('let globalMuteEnabled', adapterStart));
const adapter = new Function('window', 'sanitizeHtml', helpers + '\n' + adapterSource + '\nreturn _alloBuildDirectionsResultAdapter;')({ AlloModules: {} }, value => String(value));

function build(choices) {
  const item = { id: 'start', type: 'directions', title: 'Start here', data: { body: 'Prepare, then practice.', choiceBoard: { enabled: true, choices } } };
  const history = [item,
    { id: 'model', type: 'directions', title: 'Notice and try', data: { body: 'A short model.' } },
    { id: 'notes', type: 'note-taking', title: 'Our record', data: {} },
    { id: 'later', type: 'directions', title: 'Later practice', data: { body: 'Optional.' } },
    { id: 'teacher', type: 'lesson-plan', title: 'Teacher answers', data: {} },
  ];
  return adapter({ item, history, progress: {}, signals: {}, t: () => '', parseMarkdownToHTML: text => '<p>' + text + '</p>' });
}

describe('authored directions steps in a lesson route', () => {
  it('opens an explicitly linked model directions page and recommends it before the later notebook', () => {
    const result = build([{ resourceRef: 'model', label: 'Notice and try' }, { resourceRef: 'notes', label: 'Keep a record' }]);
    expect(result.viewProps.choiceBoardView.items.map(item => item.resourceId)).toEqual(['model', 'notes']);
    expect(result.viewProps.choiceBoardView.missingCount).toBe(0);
    expect(result.choiceById.get('model').resource.type).toBe('directions');
    expect(result.stationById.get('model').title).toBe('Notice and try');
    expect(result.viewProps.recommendationView.nextId).toBe('model');
    expect(result.viewProps.stationViews.map(item => item.id)).toEqual(['model', 'notes']);
  });

  it('keeps the current directions, teacher-only resources and missing IDs out of both navigation maps', () => {
    const result = build([
      { resourceRef: 'start', label: 'Self' },
      { resourceRef: 'teacher', label: 'Teacher answers' },
      { resourceRef: 'missing', label: 'Unavailable' },
      { resourceRef: 'model', label: 'Model' },
      { resourceRef: 'notes', label: 'Record' },
    ]);
    for (const id of ['start', 'teacher', 'missing', 'later']) {
      expect(result.stationById.has(id), id).toBe(false);
      expect(result.choiceById.has(id), id).toBe(false);
    }
    expect(result.viewProps.choiceBoardView.missingCount).toBe(3);
  });

  it('leaves unreferenced directions out of the default map and retains ordinary resource ordering', () => {
    const result = build([{ resourceRef: 'notes', label: 'Record' }, { resourceRef: 'missing', label: 'Unavailable' }]);
    expect(result.viewProps.stationViews.map(item => item.id)).toEqual(['notes']);
    expect(result.viewProps.recommendationView.nextId).toBe('notes');
  });

  it('keeps all three host adapters synchronized without changing the presentation module', () => {
    for (const file of ['desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const mirror = read(file);
      const start = mirror.indexOf('function _alloBuildDirectionsResultAdapter(');
      expect(mirror.slice(start, mirror.indexOf('let globalMuteEnabled', start)).replace(/\r\n/g, '\n')).toBe(adapterSource.replace(/\r\n/g, '\n'));
    }
  });
});
