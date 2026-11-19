// Teacher Dashboard notes (2026-11-18): each imported student file got a new random ID, and the teacher's private
// notes were keyed to it, so after a reload and re-import every note was orphaned. Student saves now carry
// studentFileId (random, never the name, kept per nickname on the device, adopted from a loaded save), and the
// dashboard keys notes by it. Files saved before this keep the old per-import behaviour.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const phaseK = readFileSync('phase_k_helpers_source.jsx', 'utf8');
const misc = readFileSync('misc_handlers_source.jsx', 'utf8');
const teacher = readFileSync('teacher_source.jsx', 'utf8');

const helperOf = (src) => {
  const at = src.indexOf('const _alloStudentFileId = ');
  return src.slice(at, src.indexOf('\n};\n', at) + 3);
};
function device() {
  const store = new Map();
  const window = { crypto: { randomUUID: (() => { let n = 0; return () => '0000aaaa-0000-4000-8000-' + String(++n).padStart(12, '0'); })() } };
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const fn = new Function('window', 'localStorage', helperOf(phaseK) + '\nreturn _alloStudentFileId;')(window, localStorage);
  return { fn, store };
}

describe('dashboard notes find the same student again', () => {
  it('both student-side files carry the same helper', () => {
    expect(helperOf(phaseK).length).toBeGreaterThan(200);
    expect(helperOf(misc)).toBe(helperOf(phaseK));
  });
  it('one ID per nickname on a device, stable across saves, never containing the name', () => {
    const { fn, store } = device();
    const a = fn('Blue Falcon');
    expect(fn('Blue Falcon')).toBe(a);
    expect(fn('  blue falcon ')).toBe(a);
    expect(fn('Red Fox')).not.toBe(a);
    expect(a).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(store.get('allo_student_file_ids')).not.toMatch(/falcon|fox/i);
  });
  it('opening a saved file adopts its ID, so a new device keeps the same one', () => {
    const { fn } = device();
    fn('Blue Falcon', 'from-the-file-1234');
    expect(fn('Blue Falcon')).toBe('from-the-file-1234');
    expect(fn('Blue Falcon', 'bad id with spaces')).toBe('from-the-file-1234');
  });
  it('without storage, the ID still holds for the visit', () => {
    const window = { crypto: { randomUUID: () => 'abcd1234-0000-4000-8000-000000000001' } };
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    const fn = new Function('window', 'localStorage', helperOf(phaseK) + '\nreturn _alloStudentFileId;')(window, blocked);
    const a = fn('Blue Falcon');
    window.crypto.randomUUID = () => 'different-0000-4000-8000-000000000002';
    expect(fn('Blue Falcon')).toBe(a);
  });
  it('the save writes it and the load adopts it', () => {
    expect(phaseK).toContain("const studentFileId = _alloStudentFileId(studentNickname);");
    expect(phaseK).toContain('...(studentFileId ? { studentFileId } : {}),');
    expect(misc).toContain("if (rawData.mode === 'student' && rawData.studentFileId) _alloStudentFileId(savedNickname, rawData.studentFileId);");
  });
  it('the dashboard keys notes by the file ID, and old files by the import ID', () => {
    const line = teacher.split('\n').find((l) => l.includes('const _notesStudentId = '));
    const notesId = new Function(line.trim() + '\nreturn _notesStudentId;')();
    const monday = { id: 'import-1', studentFileId: '0000aaaa-0000-4000-8000-000000000001' };
    const friday = { id: 'import-2', studentFileId: '0000aaaa-0000-4000-8000-000000000001' };
    expect(notesId(monday)).toBe(notesId(friday));
    expect(notesId({ id: 'import-3' })).toBe('import-3');
    expect(notesId({ id: 'import-4', studentFileId: '<script>' })).toBe('import-4');
    for (const use of ['renderCommentsBlock(_notesStudentId(student), item.id)', 'getCommentsFor(_notesStudentId(student), item.id)',
      'studentId={_notesStudentId(selectedStudent)}', 'getCommentsFor(_notesStudentId(selectedStudent), item.id)', 'k.startsWith(`${_notesStudentId(student)}:`)']) {
      expect(teacher, use).toContain(use);
    }
    expect(teacher).not.toMatch(/getCommentsFor\((student|selectedStudent)\.id,/);
  });
});
