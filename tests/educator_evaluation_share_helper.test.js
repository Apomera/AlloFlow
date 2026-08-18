import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

// The share helper runs in the principal's own Google account, so the real Code.gs is executed
// against mocked Drive services. The properties worth pinning are that it files into a
// predictable folder, shares with exactly one educator, and never reports an expiry as applied
// when Drive refused it -- a principal who believes access ends when it does not is worse off
// than one who was told plainly that it does not.
const GS = fs.readFileSync(path.join(process.cwd(), 'apps_script/educator_evaluation_share/Code.gs'), 'utf8');

function makeDrive(options = {}) {
  const state = { folders: {}, files: [], permissions: [], patched: [] };
  let nextId = 0;
  function makeFolder(name, pathLabel) {
    if (state.folders[pathLabel]) return state.folders[pathLabel];
    const folder = {
      name,
      pathLabel,
      children: {},
      files: [],
      getName: () => name,
      getId: () => 'folder-' + pathLabel,
      getUrl: () => 'https://drive/' + pathLabel,
      getFoldersByName(childName) {
        const child = folder.children[childName];
        let served = false;
        return { hasNext: () => !!child && !served, next: () => { served = true; return child; } };
      },
      createFolder(childName) {
        const child = makeFolder(childName, pathLabel + '/' + childName);
        folder.children[childName] = child;
        return child;
      },
      createFile(fileName, content, mime) {
        const id = 'file-' + (++nextId);
        const file = {
          getId: () => id,
          getName: () => fileName,
          getUrl: () => 'https://drive/file/' + id,
          addViewer: (email) => { state.permissions.push({ id: 'perm-' + id, emailAddress: email, role: 'reader', fileId: id }); },
          addCommenter: (email) => { state.permissions.push({ id: 'perm-' + id, emailAddress: email, role: 'commenter', fileId: id }); },
        };
        state.files.push({ id, name: fileName, content, mime, folder: pathLabel });
        folder.files.push(file);
        return file;
      },
      getFiles() {
        let index = 0;
        return { hasNext: () => index < folder.files.length, next: () => folder.files[index++] };
      },
      getFolders() {
        const kids = Object.keys(folder.children).map((key) => folder.children[key]);
        let index = 0;
        return { hasNext: () => index < kids.length, next: () => kids[index++] };
      },
    };
    state.folders[pathLabel] = folder;
    return folder;
  }
  const root = makeFolder('root', 'root');
  const sandbox = {
    state,
    DriveApp: { getRootFolder: () => root },
    Session: { getActiveUser: () => ({ getEmail: () => 'principal@district.org' }), getScriptTimeZone: () => 'GMT' },
    Utilities: { formatDate: (date) => date.toISOString().slice(0, 10) },
    HtmlService: { createHtmlOutputFromFile: () => ({ setTitle: () => ({ addMetaTag: () => ({}) }) }) },
    Drive: options.driveAdvanced === false
      ? { Permissions: { list: () => { throw new Error('Advanced Drive is not enabled'); }, patch: () => {} } }
      : {
        Permissions: {
          list: (fileId) => ({ items: state.permissions.filter((entry) => entry.fileId === fileId) }),
          patch: (body, fileId, permissionId) => { state.patched.push({ body, fileId, permissionId }); },
        },
      },
  };
  vm.createContext(sandbox);
  vm.runInContext(GS, sandbox);
  return sandbox;
}

const basePacket = {
  academicYear: '2026-27', educatorLabel: 'T-01', educatorEmail: 'educator@district.org',
  html: '<html>packet</html>',
};

describe('evaluation share helper', () => {
  it('files the packet into a predictable folder and shares it with the educator', () => {
    const gs = makeDrive();
    const result = gs.shareEvaluationPacket(basePacket);
    expect(result.folderPath).toBe('AlloFlow Evaluations / 2026-27 / T-01');
    expect(gs.state.files).toHaveLength(1);
    expect(gs.state.files[0].folder).toBe('root/AlloFlow Evaluations/2026-27/T-01');
    expect(gs.state.permissions.map((entry) => entry.emailAddress)).toEqual(['educator@district.org']);
    expect(result.role).toBe('comment');
  });

  it('reuses the same folders for a second packet rather than duplicating them', () => {
    const gs = makeDrive();
    gs.shareEvaluationPacket(basePacket);
    gs.shareEvaluationPacket(basePacket);
    expect(gs.state.files).toHaveLength(2);
    expect(Object.keys(gs.state.folders).filter((key) => key.endsWith('/T-01'))).toHaveLength(1);
  });

  it('applies an expiry when Drive allows it', () => {
    const gs = makeDrive();
    const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const result = gs.shareEvaluationPacket({ ...basePacket, expiresOn: soon });
    expect(result.expiryApplied).toBe(true);
    expect(gs.state.patched).toHaveLength(1);
    expect(gs.state.patched[0].body.expirationDate).toBeTruthy();
  });

  it('never claims an expiry was applied when Drive refuses it', () => {
    const gs = makeDrive({ driveAdvanced: false });
    const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const result = gs.shareEvaluationPacket({ ...basePacket, expiresOn: soon });
    expect(result.expiryApplied).toBe(false);
    expect(result.expiryNote).toMatch(/does not end on its own/);
    // The file is still shared: the educator can read it, the timer simply is not running.
    expect(gs.state.permissions).toHaveLength(1);
  });

  it('refuses expiry dates that are malformed, past, or beyond what Drive holds', () => {
    const gs = makeDrive();
    expect(() => gs.shareEvaluationPacket({ ...basePacket, expiresOn: '30/11/2026' })).toThrow(/look like/);
    expect(() => gs.shareEvaluationPacket({ ...basePacket, expiresOn: '2020-01-01' })).toThrow(/already in the past/);
    const farOut = new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10);
    expect(() => gs.shareEvaluationPacket({ ...basePacket, expiresOn: farOut })).toThrow(/more than a year/);
  });

  it('requires the fields it cannot guess', () => {
    const gs = makeDrive();
    expect(() => gs.shareEvaluationPacket({ ...basePacket, educatorEmail: '' })).toThrow(/required/);
    expect(() => gs.shareEvaluationPacket({ ...basePacket, educatorEmail: 'not-an-email' })).toThrow(/email address/);
    expect(() => gs.shareEvaluationPacket({ ...basePacket, html: '' })).toThrow(/required/);
  });

  it('lists what has been filed so a cycle can be handed over in one move', () => {
    const gs = makeDrive();
    gs.shareEvaluationPacket(basePacket);
    gs.shareEvaluationPacket({ ...basePacket, educatorLabel: 'T-02', educatorEmail: 'second@district.org' });
    const listing = gs.listSharedEvaluations('2026-27');
    expect(listing.educators.map((entry) => entry.educator).sort()).toEqual(['T-01', 'T-02']);
    expect(listing.educators[0].packets).toHaveLength(1);
    expect(gs.listSharedEvaluations('2099-00').educators).toEqual([]);
  });

  it('reports whether expiry is available before the principal relies on it', () => {
    expect(makeDrive().verifyShareHelper().expirySupported).toBe(true);
    const without = makeDrive({ driveAdvanced: false }).verifyShareHelper();
    expect(without.expirySupported).toBe(false);
    expect(without.note).toMatch(/will not expire on their own/);
  });

  it('is deployed private to the person who installed it', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'apps_script/educator_evaluation_share/appsscript.json'), 'utf8'));
    expect(manifest.webapp.access).toBe('MYSELF');
    expect(manifest.webapp.executeAs).toBe('USER_DEPLOYING');
    // No mail scope: this helper shares in Drive and does not send anything on anyone's behalf.
    expect(manifest.oauthScopes).not.toContain('https://www.googleapis.com/auth/script.send_mail');
  });
});
