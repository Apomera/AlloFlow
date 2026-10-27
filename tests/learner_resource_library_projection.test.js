import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const activitySource = fs.readFileSync('view_brainstorm_source.jsx', 'utf8');
const projectStudentActivityResource = new Function(
  activitySource.slice(activitySource.indexOf('function projectStudentActivityResource('), activitySource.indexOf('function ActivityStructuredEditor('))
  + '\nreturn projectStudentActivityResource;'
)();
const ruleStart = source.indexOf('const TEACHER_ONLY_TYPES = [');
const ruleEnd = source.indexOf('const _alloIsStudentSafeResource =', ruleStart);
const knownUnit = source.match(/  const _isKnownUnitId =[^\n]+/)[0];
const libraryStart = source.indexOf('  const getFilteredHistory = () => {');
const libraryEnd = source.indexOf('  const sanitizeString =', libraryStart);
if ([ruleStart, ruleEnd, libraryStart, libraryEnd].some(index => index < 0)) throw new Error('Missing host library/rule extraction boundaries');

function library(history, options = {}) {
  const window = { AlloModules: { BrainstormView: { projectStudentActivityResource } } };
  if (options.transport !== false) new Function('window', fs.readFileSync('session_transport_module.js', 'utf8'))(window);
  return new Function('window', 'history', 'isTeacherMode', 'activeUnitId', 'user', 'sessionData', 'units',
    source.slice(ruleStart, ruleEnd) + '\n' + knownUnit + '\n' + source.slice(libraryStart, libraryEnd) + '\nreturn getFilteredHistory();'
  )(window, history, options.teacher === true, options.unit || 'all', options.user || null, options.session || null, options.units || [{ id: 'unit-a' }]);
}

const lesson = (id, mode) => ({
  id, type: 'lesson-plan', unitId: 'unit-a',
  ...(mode ? { config: { generationInputs: { version: 1, mode }, customInstructions: 'PRIVATE prompt' } } : {}),
  data: {
    objectives: ['Compare evidence'], directInstruction: 'Read the example.',
    teachingScripts: ['PRIVATE script'],
    closure: { text: 'Explain your reasoning.', expectedAnswer: 'PRIVATE key' }
  }
});
const notes = { id: 'notes', type: 'note-taking', unitId: 'unit-a', data: { templateType: 'cornell-notes', cues: [], notes: [] } };
const mixed = {
  id: 'activity', type: 'brainstorm', unitId: 'unit-a', teacherNotes: 'PRIVATE notes',
  data: [
    { kind: 'idea', title: 'PRIVATE teacher idea', guide: 'PRIVATE guide' },
    { kind: 'discussion', title: 'Compare ideas', openingQuestion: 'What supports your idea?', guide: 'PRIVATE guide', questionSets: [{ depth: 'literal', questions: ['What happened?'], answer: 'PRIVATE answer' }] },
    { kind: 'jigsaw', title: 'Share evidence', groupSize: 3, guide: 'PRIVATE guide', homeGroupTask: 'Compare the evidence.', chunks: [{ label: 'First source', expertPacket: 'Read the evidence.', answerKey: 'PRIVATE key' }], accountabilityCheck: [{ q: 'What supports the claim?', answer: 'PRIVATE answer' }] }
  ]
};

describe('actual host learner resource library audience rule', () => {
  it('keeps teacher and legacy plans out of an imported learner library with other teacher-only artifacts', () => {
    const imported = [notes, lesson('teacher', 'teacher'), lesson('legacy'),
      ...['udl-advice', 'alignment-report', 'video-ref', 'persona-session', 'persona-transcript'].map(type => ({ id: type, type, data: 'PRIVATE content' })),
      { id: 'review-copy', type: 'quiz', data: { submissionCopy: true } }, null, { id: 'missing-type' }];
    const before = JSON.stringify(imported);
    expect(library(imported).map(item => item.id)).toEqual(['notes']);
    expect(JSON.stringify(imported)).toBe(before);
  });

  it('preserves study and family guides as projected learner resources', () => {
    const imported = [lesson('teacher', 'teacher'), lesson('study', 'study'), lesson('family', 'family')];
    const result = library(imported);
    expect(result.map(item => item.id)).toEqual(['study', 'family']);
    for (const item of result) {
      expect(item.studentProjection).toBe(true);
      expect(item.data.directInstruction).toBe('Read the example.');
      expect(item.data.closure).toEqual({ text: 'Explain your reasoning.' });
    }
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
    expect(imported[1].data.teachingScripts).toEqual(['PRIVATE script']);
  });

  it('projects discussion and jigsaw work while excluding teacher-only activity ideas', () => {
    const result = library([mixed, { id: 'ideas', type: 'brainstorm', data: [{ kind: 'idea', title: 'PRIVATE' }] }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'activity', studentProjection: true });
    expect(result[0].data.map(item => item.kind)).toEqual(['discussion', 'jigsaw']);
    expect(result[0].data[1].chunks[0].expertPacket).toBe('Read the evidence.');
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
  });

  it('applies learner routing exclusions after audience projection without leaking teacher resources', () => {
    const imported = [notes, lesson('teacher', 'teacher'), lesson('study', 'study'), lesson('family', 'family'), mixed];
    const session = { roster: { learner: { hiddenResourceIds: ['notes', 'study', 'activity', 'teacher'] } } };
    expect(library(imported, { user: { uid: 'learner' }, session }).map(item => item.id)).toEqual(['family']);
    for (const session of [null, {}, { roster: { learner: { hiddenResourceIds: 'malformed' } } }]) {
      expect(library(imported, { user: { uid: 'learner' }, session }).map(item => item.id)).toEqual(['notes', 'study', 'family', 'activity']);
    }
  });

  it('retains full teacher resources and unit filtering regardless of learner hidden routes', () => {
    const teacherPlan = lesson('teacher', 'teacher');
    const uncategorized = { id: 'free', type: 'directions', data: 'Read this.' };
    const imported = [teacherPlan, mixed, notes, uncategorized];
    const options = { teacher: true, user: { uid: 'teacher' }, session: { roster: { teacher: { hiddenResourceIds: ['teacher', 'notes'] } } } };
    expect(library(imported, options)).toEqual(imported);
    expect(library(imported, { ...options, unit: 'unit-a' })).toEqual([teacherPlan, mixed, notes]);
    expect(library(imported, { ...options, unit: 'uncategorized' })).toEqual([uncategorized]);
    expect(library(imported, options)[0]).toBe(teacherPlan);
    // Deleted unit references remain recoverable as unfiled resources.
    expect(library(imported, { ...options, unit: 'uncategorized', units: [] })).toEqual(imported);
  });

  it('fails closed for teacher material while the optional transport module is unavailable', () => {
    expect(library([notes, lesson('teacher', 'teacher'), lesson('legacy'), mixed], { transport: false }).map(item => item.id)).toEqual(['notes', 'activity']);
    expect(library(null)).toEqual([]);
  });

  it('keeps both desktop source mirrors on the same audience-rule change', () => {
    for (const filename of ['desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const mirror = fs.readFileSync(filename, 'utf8');
      const start = mirror.indexOf('  const getFilteredHistory = () => {');
      const end = mirror.indexOf('  const sanitizeString =', start);
      expect(mirror.slice(start, end)).toBe(source.slice(libraryStart, libraryEnd));
    }
  });
});
