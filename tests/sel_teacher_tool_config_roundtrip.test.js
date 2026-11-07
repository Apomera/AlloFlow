// SEL teacher content (station.toolConfig) survives the real project-file path (2026-11-04).
// A teacher authors culture cards / conflict scenes into an SEL Station; the station rides
// selStations in the project file. This runs the live modules: teacher Save File
// (PhaseKHelpers.executeSaveFile) -> student Load (MiscHandlers.handleLoadProject) ->
// student Save File, and checks the teacher content arrives byte-for-byte each time.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
const React = require(path.join(ROOT, 'desktop/web-app/node_modules/react'));
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const clone = (v) => JSON.parse(JSON.stringify(v));

function makeWindow() {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.invalid/' });
  const window = dom.window, downloads = [];
  window.React = React; window.AlloModules = {};
  for (const file of ['firestore_sync_module.js', 'session_transport_module.js', 'live_aac_module.js', 'view_brainstorm_module.js']) new Function('window', read(file))(window);
  let blob;
  class BlobFixture { constructor(parts) { this.parts = parts; } async text() { return this.parts.join(''); } }
  window.HTMLAnchorElement.prototype.click = function () { downloads.push(blob); };
  new Function('React', 'window', 'document', 'Blob', 'URL', read('phase_k_helpers_module.js'))(React, window, window.document, BlobFixture, { createObjectURL(value) { blob = value; return 'blob:sel-teacher-config'; }, revokeObjectURL() {} });
  class Reader { readAsText(file) { this.onload({ target: { result: file.contents } }); } abort() {} }
  new Function('window', 'FileReader', 'localStorage', 'CustomEvent', read('misc_handlers_module.js'))(window, Reader, window.localStorage, window.CustomEvent);
  return { window, downloads, close: () => window.close() };
}

function saveDeps(values) {
  return {
    saveFileName: 'sel-teacher-config', saveType: 'teacher', history: [], studentNickname: 'PracticeOwl',
    studentProgressLog: [], studentResponses: {}, studentProjectSettings: {}, adventureState: {}, escapeRoomState: {}, completedActivities: new Map(), socraticMessages: [], fluencyAssessments: [], flashcardEngagement: {}, timeOnTask: {}, pointHistory: [], probeHistory: [], interventionLogs: [], surveyResponses: [], fidelityLog: [], externalCBMScores: [], gameCompletions: {}, labelChallengeResults: [], wordSoundsHistory: [], wordSoundsBadges: {}, phonemeMastery: {}, wordSoundsDailyProgress: {}, wordSoundsConfusionPatterns: {}, wordSoundsFamilies: {}, wordSoundsAudioLibrary: {}, wordSoundsScore: {}, globalPoints: 0, sessionCounter: 1,
    addToast() {}, warnLog() {}, t: (key) => key,
    setStudentProgressLog() {}, setLastJsonFileSave() {}, setIsSaveActionPulsing() {}, setShowSaveModal() {}, getFocusRatio: () => null,
    ...values,
  };
}

async function saveFile(h, values) {
  const before = h.downloads.length;
  const outcome = await h.window.AlloModules.PhaseKHelpers.executeSaveFile(saveDeps(values));
  expect(outcome && outcome.ok, 'save succeeded').not.toBe(false);
  expect(h.downloads.length).toBe(before + 1);
  return JSON.parse(await h.downloads[h.downloads.length - 1].text());
}

async function loadFile(h, project) {
  const source = read('misc_handlers_source.jsx');
  const a = source.indexOf('const handleLoadProject ='), b = Math.max(source.indexOf('const handleRestoreView ='), source.indexOf('function handleRestoreView('));
  expect(a >= 0 && b > a, 'handleLoadProject anchors').toBe(true);
  const setters = Object.fromEntries([...new Set(source.slice(a, b).match(/\bset[A-Z][A-Za-z]+\b/g))].map((name) => [name, () => {}]));
  const deps = { ...setters, t: (k) => k, addToast() {}, warnLog() {}, hydrateHistory: (items) => clone(items), projectFileInputRef: { current: { value: 'selected' } } };
  const owner = h.window.AlloModules.MiscHandlers.handleLoadProject({ target: { files: [{ contents: JSON.stringify(project) }] } }, deps);
  expect((await owner.completion).success).toBe(true);
}

const TEACHER_STATION = {
  id: 'sel_station_teacher_content', name: 'Culture + repair week', tools: ['cultureExplorer', 'conflicttheater'], teacherNote: 'Start with the cards.',
  quests: [], createdAt: '2026-11-04T12:00:00.000Z', source: 'sel-hub-builder',
  toolConfig: {
    cultureExplorer: { version: 1, cards: [{ id: 'tc_1', subject: 'Wabanaki communities in Maine', relation: 'researched', fields: { traditions: 'Basketmaking is passed between generations; families practise it in different ways.' }, interview: { person: 'A Penobscot basketmaker (with permission)', answers: { q6: 'We are still here, and we teach our children.' } }, sources: 'Abbe Museum, Bar Harbor', note: '', checks: { source: true, noGeneralize: true, ownWords: true } }] },
    conflicttheater: { version: 1, scenes: [{ id: 'ts_1', intro: 'Two friends both wanted the same seat.', story: { version: 1, title: 'The Bus Seat', start: 's1', scenes: [
      { id: 's1', text: 'Ari and Dev both reach the last window seat.', ending: false, choices: [{ label: "'It's mine, move.'", to: 's2' }, { label: "'We both wanted it. Want to take turns?'", to: 's3' }] },
      { id: 's2', text: 'Dev sits down hard and turns away.\n\nWhat worked:\n• Pausing helps.', ending: true, choices: [] },
      { id: 's3', text: 'Dev grins. They agree on turns.\n\nWhat worked:\n• Naming both needs.', ending: true, choices: [] },
    ] } }] },
  },
};

describe('SEL station toolConfig rides the project file both ways', () => {
  it('teacher save -> student load -> student save keeps teacher content exactly', async () => {
    const teacher = makeWindow();
    const student = makeWindow();
    try {
      teacher.window.__alloflowSelStations = [clone(TEACHER_STATION)];
      const teacherFile = await saveFile(teacher, { saveType: 'teacher' });
      expect(teacherFile.selStations[0].toolConfig).toEqual(TEACHER_STATION.toolConfig);

      await loadFile(student, teacherFile);
      const restored = student.window.__alloflowSelStations;
      expect(Array.isArray(restored)).toBe(true);
      expect(restored[0].toolConfig).toEqual(TEACHER_STATION.toolConfig);
      expect(JSON.parse(student.window.localStorage.getItem('alloflow_sel_stations'))[0].toolConfig).toEqual(TEACHER_STATION.toolConfig);

      const studentFile = await saveFile(student, { saveType: 'student' });
      expect(studentFile.mode).toBe('student');
      expect(studentFile.selStations[0].toolConfig).toEqual(TEACHER_STATION.toolConfig);
    } finally { teacher.close(); student.close(); }
  });

});
