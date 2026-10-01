import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
let parse, resolveOption, createScope;
const APP_SOURCES = [
  ['root', 'AlloFlowANTI.txt'],
  ['desktop mirror', 'desktop/web-app/src/AlloFlowANTI.txt'],
  ['desktop app', 'desktop/web-app/src/App.jsx'],
];

function readAppSources() {
  return APP_SOURCES.map(([label, path]) => [label, readFileSync(path, 'utf8')]);
}

function createSaveScopeFromAppSource(source, current) {
  const marker = source.indexOf('// Student-save voice scope.');
  expect(marker).toBeGreaterThan(-1);
  const start = source.indexOf('useEffect(() => {', marker);
  const endToken = '}, [showSaveModal, saveType]);';
  const end = source.indexOf(endToken, start);
  expect(start).toBeGreaterThan(marker);
  expect(end).toBeGreaterThan(start);

  let registeredScope = null;
  const localWindow = {
    AlloModules: {
      AlloCommands: {
        registerCommandScope(scope) {
          registeredScope = scope;
          return () => {};
        },
      },
    },
  };
  const runEffect = new Function(
    'useEffect',
    'showSaveModal',
    'saveType',
    'studentSaveVoiceScopeRef',
    'window',
    'setTimeout',
    'clearTimeout',
    source.slice(start, end + endToken.length),
  );
  runEffect(
    (effect) => effect(),
    true,
    'student',
    { current },
    localWindow,
    setTimeout,
    clearTimeout,
  );
  expect(registeredScope).not.toBeNull();
  return registeredScope;
}

function openingButtonTag(modalSource, clickHandler, occurrence = 0) {
  const matches = Array.from(modalSource.matchAll(new RegExp(`<button\\b[^>]*onClick=\\{${clickHandler}\\}[^>]*>`, 'gs')));
  expect(matches.length, `button using ${clickHandler}`).toBeGreaterThan(occurrence);
  return matches[occurrence][0];
}


beforeAll(() => {
  window.React = globalThis.React = React;
  window.AlloLanguageContext = React.createContext({ t: (key) => key });
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('student_interaction_module.js');
  parse = window.AlloModules.parseStudentSubmitVoiceCommand;
  resolveOption = window.AlloModules.resolveStudentSubmitVoiceOption;
  createScope = window.AlloModules.createStudentSubmitVoiceScopeSpec;
});

describe('student save and submission semantic voice workflows', () => {
  it('parses orientation, option choices, confirmation, and cancel', () => {
    expect(parse('describe submission').commandId).toBe('student_submit_describe');
    expect(parse('choose adjective number 2')).toMatchObject({ commandId: 'student_submit_select_adjective', params: { choice: '2' } });
    expect(parse('choose animal Otter')).toMatchObject({ commandId: 'student_submit_select_animal', params: { choice: 'Otter' } });
    expect(parse('submit my work').commandId).toBe('student_submit_confirm');
    expect(parse('keep reviewing').commandId).toBe('student_submit_cancel');
  });

  it('resolves private codename choices by name or one-based index', () => {
    expect(resolveOption(['Calm', 'Brave'], 'second')).toEqual({ value: 'Brave', index: 2 });
    expect(resolveOption(['Otter', 'Falcon'], 'falcon')).toEqual({ value: 'Falcon', index: 2 });
    expect(resolveOption(['Otter'], 'number 3')).toBeNull();
  });

  it('requires spoken confirmation and excludes the codename from state', async () => {
    const submit = vi.fn(async () => ({ ok: true, delivery: 'mailbox' }));
    const ref = { current: {
      isOpen: true, submitting: false, codenameReady: true, canSubmit: true,
      adjectiveCount: 2, animalCount: 2, summary: { quizzes: 1 }, submissionMethod: 'mailbox',
      submit, cancel: vi.fn(), randomize: vi.fn(),
      selectAdjective: vi.fn(() => ({ value: 'Brave', index: 2 })),
      selectAnimal: vi.fn(() => ({ value: 'Falcon', index: 2 })),
    } };
    const scope = createScope(ref);
    const command = scope.getCommands().find((item) => item.id === 'student_submit_confirm');
    expect(scope).toMatchObject({ id: 'student-submit-dialog', priority: 140 });
    expect(command).toMatchObject({ risk: 'destructive', confirmation: 'always' });
    expect(command.confirmMessage).toContain('Say yes');
    expect(JSON.stringify(scope.getState())).not.toContain('Brave');
    expect(JSON.stringify(scope.getState())).not.toContain('Falcon');
    expect(await scope.execute('student_submit_confirm', {})).toMatchObject({ ok: true });
    expect(submit).toHaveBeenCalledTimes(1);
  });
  it('makes submission confirmation destination-specific and self-contained', () => {
    const makeScope = (submissionMethod) => createScope({ current: {
      isOpen: true,
      submitting: false,
      codenameReady: true,
      canSubmit: true,
      adjectiveCount: 2,
      animalCount: 2,
      summary: {},
      submissionMethod,
      submit: vi.fn(),
      cancel: vi.fn(),
      randomize: vi.fn(),
      selectAdjective: vi.fn(),
      selectAnimal: vi.fn(),
    } });
    const confirmMessage = (scope) => scope.getCommands()
      .find((item) => item.id === 'student_submit_confirm').confirmMessage;
    const mailboxMessage = confirmMessage(makeScope('mailbox'));
    const downloadMessage = confirmMessage(makeScope('download'));

    expect(mailboxMessage).toMatch(/complete work/i);
    expect(mailboxMessage).toMatch(/teacher(?:'s)? private class mailbox/i);
    expect(downloadMessage).toMatch(/complete work/i);
    expect(downloadMessage).toMatch(/(?:download|file).*(?:device)|(?:device).*(?:download|file)/i);
    expect(downloadMessage).not.toMatch(/mailbox/i);
    expect(mailboxMessage).not.toBe(downloadMessage);
    for (const message of [mailboxMessage, downloadMessage]) {
      expect(message).toMatch(/say yes/i);
      expect(message).toMatch(/(?:say )?no/i);
      expect(message).not.toMatch(/(?:configured |described )?destination described|configured destination/i);
    }
  });

  it('hides a private-codename filename from voice while reading a benign filename', async () => {
    for (const [label, source] of readAppSources()) {
      const privateFilename = 'Student_Project_Brave_Otter_2026-08-13';
      const privateScope = createSaveScopeFromAppSource(source, {
        isOpen: true,
        filenameReady: true,
        filename: privateFilename,
        filenameContainsPrivateCodename: true,
        setFilename: vi.fn(),
        save: vi.fn(),
        cancel: vi.fn(),
      });
      const privateResult = await privateScope.execute('student_save_read_filename', {});
      expect(privateResult.ok, label).toBe(true);
      expect(privateResult.narration, label).toMatch(/(?:hidden|private|not (?:be )?spoken)/i);
      expect(privateResult.narration, label).not.toContain(privateFilename);
      expect(privateResult.narration, label).not.toMatch(/brave|otter/i);

      const benignFilename = 'biology_notes_week_2';
      const benignScope = createSaveScopeFromAppSource(source, {
        isOpen: true,
        filenameReady: true,
        filename: benignFilename,
        filenameContainsPrivateCodename: false,
        setFilename: vi.fn(),
        save: vi.fn(),
        cancel: vi.fn(),
      });
      const benignResult = await benignScope.execute('student_save_read_filename', {});
      expect(benignResult.ok, label).toBe(true);
      expect(benignResult.narration, label).toContain(benignFilename);
    }
  });

  it('prevents a second voice save while a save is already in progress', async () => {
    for (const [label, source] of readAppSources()) {
      const save = vi.fn();
      const scope = createSaveScopeFromAppSource(source, {
        isOpen: true,
        filenameReady: true,
        filename: 'biology_notes',
        filenameContainsPrivateCodename: false,
        saving: true,
        isSaving: true,
        saveInProgress: true,
        setFilename: vi.fn(),
        save,
        cancel: vi.fn(),
      });
      const result = await scope.execute('student_save_confirm', {});
      expect(result.ok, label).toBe(false);
      expect(result.narration, label).toMatch(/(?:already|in progress|saving)/i);
      expect(save, label).not.toHaveBeenCalled();
    }
  });

  it('labels the save modal cancel and save controls by their actual actions in every host', () => {
    for (const [label, source] of readAppSources()) {
      const start = source.indexOf('{showSaveModal && (');
      const end = source.indexOf('{isTranslateModalOpen && (', start);
      expect(start, label).toBeGreaterThan(-1);
      expect(end, label).toBeGreaterThan(start);
      const modalSource = source.slice(start, end);
      const cancelButton = openingButtonTag(modalSource, 'handleSetShowSaveModalToFalse', 1);
      const saveButton = openingButtonTag(modalSource, 'executeSaveFile');
      expect(cancelButton, label).toContain("aria-label={t('common.cancel')}");
      expect(saveButton, label).toContain("aria-label={t('common.save')}");
    }
  });



  it('keeps save privacy-confirmed, validation-bound, and host-synchronized', () => {
    const root = readFileSync('AlloFlowANTI.txt', 'utf8');
    const mirror = readFileSync('desktop/web-app/src/AlloFlowANTI.txt', 'utf8');
    const app = readFileSync('desktop/web-app/src/App.jsx', 'utf8');
    for (const needle of ["id: 'student-save-dialog'", "id: 'student_save_confirm'", 'privacyConfirmed: true']) {
      expect(root).toContain(needle);
      expect(mirror).toContain(needle);
      expect(app).toContain(needle);
    }
    expect(root).toContain("confirmation: 'always'");
    expect(root).toContain('codename-linked voice recordings or private reflections');
    expect(root).toContain("if (!current.filenameReady) return { ok: false, narration: 'A filename is required before saving.' }");
    expect(mirror).toBe(app);
  });
});
