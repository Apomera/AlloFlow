import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const GS = fs.readFileSync(path.join(ROOT, 'apps_script/educator_evaluation_share/Code.gs'), 'utf8');
const PANEL_SOURCE = fs.readFileSync(path.join(ROOT, 'educator_evaluation_source.jsx'), 'utf8');

function joinedArrayConstant(source, name) {
  const start = source.indexOf('const ' + name + ' = [');
  const suffix = "].join('');";
  const end = source.indexOf(suffix, start);
  if (start === -1 || end === -1) throw new Error('Missing joined-array constant: ' + name);
  return new Function(source.slice(start, end + suffix.length) + '\nreturn ' + name + ';')();
}

const PACKET_FORM_JS = joinedArrayConstant(PANEL_SOURCE, 'AE_PACKET_FORM_JS');

function educatorPacket(overrides = {}) {
  const packet = {
    kind: 'alloflow-educator-evaluation-packet',
    version: 1,
    packetType: 'educator',
    packetId: 'packet-safe-01',
    issuedAt: '2026-08-20T12:00:00.000Z',
    teacherId: 'teacher-01',
    includeNames: false,
    config: { academicYear: '2026-27', organization: 'Example District' },
    teachers: [{ id: 'teacher-01', code: 'T-01', name: 'T-01' }],
    walkthroughs: [], observations: [], spms: [], comments: [],
    ...overrides,
  };
  return '<!doctype html><html><body><script type="application/json" id="allo-evaluation-packet">'
    + JSON.stringify(packet).replaceAll('<', '\\u003c') + '</script></body></html>';
}

function finalizedAnnualPacket(options = {}) {
  const teacher = {
    id: 'teacher-01', code: 'T-01', name: 'T-01',
    finalizedAt: '2026-08-20T12:00:00.000Z', finalScore: 3.25,
    ratings: { domains: { d1: 3, d2: 3, d3: 4, d4: 3 } },
    annualRationales: {
      d1: 'Domain one rationale', d2: 'Domain two rationale',
      d3: 'Domain three rationale', d4: 'Domain four rationale',
    },
    annualEvidenceRefs: {
      d1: ['walkthrough:walk.1', 'walkthrough:walk.1'],
      d2: ['formal_observation:obs-1'],
      d3: ['spm:spm-1'],
      d4: ['walkthrough:walk.1'],
    },
    ...(options.teacher || {}),
  };
  return educatorPacket({
    teachers: [teacher],
    walkthroughs: options.walkthroughs ?? [{ id: 'walk.1', teacherId: 'teacher-01', date: '2026-05-01', publishedAt: '2026-05-02T12:00:00.000Z', subject: 'Algebra' }],
    observations: options.observations ?? [{ id: 'obs-1', teacherId: 'teacher-01', observedAt: '2026-04-10', evidencePublishedAt: '2026-04-11T12:00:00.000Z' }],
    spms: options.spms ?? [{ id: 'spm-1', teacherId: 'teacher-01', status: 'locked', lockedAt: '2026-06-01T12:00:00.000Z', goal: 'Student growth goal' }],
  });
}

function makeDrive(options = {}) {
  const state = {
    folders: {}, files: [], permissions: [], createdPermissions: [], removed: [],
    properties: {},
  };
  let nextId = 0;
  function makeFolder(name, pathLabel) {
    if (state.folders[pathLabel]) return state.folders[pathLabel];
    const folder = {
      children: {}, files: [], getName: () => name, getId: () => 'folder-' + pathLabel,
      getUrl: () => 'https://drive/' + pathLabel,
      getFoldersByName(childName) {
        const child = folder.children[childName]; let served = false;
        return { hasNext: () => !!child && !served, next: () => { served = true; return child; } };
      },
      createFolder(childName) {
        const child = makeFolder(childName, pathLabel + '/' + childName);
        folder.children[childName] = child; return child;
      },
      createFile(fileName, content, mime) {
        const id = 'file-' + (++nextId);
        const record = { id, name: fileName, content, mime, folder: pathLabel, description: '', trashed: false };
        const file = {
          getId: () => id, getName: () => fileName, getUrl: () => 'https://drive/file/' + id,
          getDescription: () => record.description,
          setDescription: (value) => {
            if (options.descriptionFailure) throw new Error('description write rejected');
            record.description = value;
          },
          setTrashed: (value) => { record.trashed = value; },
        };
        record.file = file; state.files.push(record); folder.files.push(file); return file;
      },
      getFiles() { let index = 0; return { hasNext: () => index < folder.files.length, next: () => folder.files[index++] }; },
      getFolders() { const kids = Object.values(folder.children); let index = 0; return { hasNext: () => index < kids.length, next: () => kids[index++] }; },
    };
    state.folders[pathLabel] = folder; return folder;
  }
  const root = makeFolder('root', 'root');
  const sandbox = {
    state,
    DriveApp: {
      getRootFolder: () => root,
      getFileById: (id) => {
        const record = state.files.find((entry) => entry.id === id);
        if (!record) throw new Error('File not found');
        return record.file;
      },
    },
    Session: {
      getActiveUser: () => ({ getEmail: () => options.blankIdentity ? '' : 'principal@district.org' }),
      getEffectiveUser: () => ({ getEmail: () => options.mismatchedIdentity ? 'other@district.org' : (options.blankIdentity ? '' : 'principal@district.org') }),
      getScriptTimeZone: () => 'GMT',
    },
    Utilities: { formatDate: (date) => date.toISOString().replace(/[:T]/g, '-').slice(0, 19) },
    HtmlService: { createHtmlOutputFromFile: () => ({ setTitle: () => ({ addMetaTag: () => ({}) }) }) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => state.properties[key] ?? null,
        setProperty: (key, value) => { state.properties[key] = value; },
        deleteProperty: (key) => { delete state.properties[key]; },
      }),
    },
  };
  if (options.driveAdvanced !== false) {
    sandbox.Drive = { Permissions: {
      create(body, fileId) {
        if (options.rejectCreate) throw new Error('edition rejected permission');
        const permission = { id: 'perm-' + (++nextId), fileId, ...body };
        state.permissions.push(permission); state.createdPermissions.push(permission);
        return { id: permission.id, emailAddress: body.emailAddress, role: body.role, expirationTime: body.expirationTime };
      },
      list(fileId, params = {}) {
        let permissions = state.permissions.filter((entry) => entry.fileId === fileId).map((entry) => ({ ...entry }));
        if (options.readbackRole && permissions.length) permissions[0].role = options.readbackRole;
        if (options.readbackExpiration !== undefined && permissions.length) permissions[0].expirationTime = options.readbackExpiration;
        if (options.paginate && permissions.length > 1 && !params.pageToken) {
          return { permissions: [permissions[0]], nextPageToken: 'page-2' };
        }
        if (options.paginate && params.pageToken === 'page-2') return { permissions: permissions.slice(1) };
        return { permissions };
      },
      remove(fileId, permissionId) {
        state.removed.push({ fileId, permissionId });
        if (options.stickyRemove) return;
        state.permissions = state.permissions.filter((entry) => !(entry.fileId === fileId && entry.id === permissionId));
      },
    } };
  }
  vm.createContext(sandbox); vm.runInContext(GS, sandbox); return sandbox;
}

const basePacket = {
  academicYear: '2026-27', educatorLabel: 'T-01', educatorEmail: 'educator@district.org',
  recipientConfirmation: 'educator@district.org', expectedDomain: 'district.org',
  policyConfirmed: true, role: 'view', html: educatorPacket(),
};

describe('evaluation share helper', () => {
  it('validates the packet and proves the exact reviewed permission by re-reading Drive', () => {
    const gs = makeDrive();
    const result = gs.shareEvaluationPacket(basePacket);
    expect(result).toMatchObject({
      folderPath: 'AlloFlow Evaluations / 2026-27 / T-01',
      packetId: 'packet-safe-01', sharedWith: 'educator@district.org',
      role: 'view', permissionVerified: true,
    });
    expect(gs.state.files[0].folder).toBe('root/AlloFlow Evaluations/2026-27/T-01');
    expect(gs.state.permissions).toMatchObject([{ emailAddress: 'educator@district.org', role: 'reader' }]);
    expect(gs.state.files[0].content).toContain('rebuilt by the share helper from allowlisted packet fields');
    expect(gs.state.files[0].content).not.toBe(basePacket.html);
    expect(result.deliveryNote).toMatch(/notify.*download.*open/i);
  });

  it('reuses folders and creates uniquely traceable packet filenames', () => {
    const gs = makeDrive(); gs.shareEvaluationPacket(basePacket); gs.shareEvaluationPacket(basePacket);
    expect(gs.state.files).toHaveLength(2);
    expect(gs.state.files.every((file) => file.name.includes('packet-safe-01'))).toBe(true);
    expect(Object.keys(gs.state.folders).filter((key) => key.endsWith('/T-01'))).toHaveLength(1);
  });

  it('creates an expiration atomically and proves the exact returned timestamp', () => {
    const gs = makeDrive();
    const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const result = gs.shareEvaluationPacket({ ...basePacket, expiresOn: soon });
    expect(result).toMatchObject({ expiryApplied: true, expiresOn: soon, permissionVerified: true });
    expect(gs.state.createdPermissions[0].expirationTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('requires Drive v3 even for a non-expiring share so success is always provable', () => {
    const gs = makeDrive({ driveAdvanced: false });
    expect(() => gs.shareEvaluationPacket(basePacket)).toThrow(/Drive API v3.*Nothing was shared/);
    expect(gs.state.files).toHaveLength(0);
  });

  it('rejects arbitrary HTML, responses, metadata mismatches, and multi-educator packets before filing', () => {
    const gs = makeDrive();
    expect(() => gs.shareEvaluationPacket({ ...basePacket, html: '<html>not a packet</html>' })).toThrow(/not an AlloFlow educator packet/);
    expect(() => gs.shareEvaluationPacket({ ...basePacket, html: educatorPacket({ packetType: 'response' }) })).toThrow(/Only an AlloFlow educator packet/);
    expect(() => gs.shareEvaluationPacket({ ...basePacket, academicYear: '2027-28' })).toThrow(/year does not match/);
    expect(() => gs.shareEvaluationPacket({ ...basePacket, educatorLabel: 'Another educator' })).toThrow(/does not match/);
    expect(() => gs.shareEvaluationPacket({ ...basePacket, html: educatorPacket({ teachers: [{ id: 'teacher-01', code: 'T-01' }, { id: 'teacher-02', code: 'T-02' }] }) })).toThrow(/exactly one educator/);
    expect(gs.state.files).toHaveLength(0);
  });

  it('rejects caller-supplied scripts, event handlers, and javascript URLs before filing', () => {
    const gs = makeDrive();
    const packet = educatorPacket();
    expect(() => gs.shareEvaluationPacket({ ...basePacket, html: packet.replace('</body>', '<script>alert(1)</script></body>') })).toThrow(/untrusted executable/);
    expect(() => gs.shareEvaluationPacket({ ...basePacket, html: packet.replace('</body>', '<img src=x onerror="alert(1)"></body>') })).toThrow(/untrusted active markup/);
    expect(() => gs.shareEvaluationPacket({ ...basePacket, html: packet.replace('</body>', '<a href="javascript:alert(1)">x</a></body>') })).toThrow(/untrusted active markup/);
    expect(gs.state.files).toHaveLength(0);
  });

  it('escapes packet narrative while preserving the fixed response workflow', () => {
    const gs = makeDrive();
    const html = educatorPacket({ walkthroughs: [{
      id: 'walk-1', teacherId: 'teacher-01', publishedAt: '2026-08-20T12:00:00.000Z',
      evidence: '</script><img src=x onerror="alert(1)">', componentTags: ['2C'],
    }] });
    gs.shareEvaluationPacket({ ...basePacket, html });
    const filed = gs.state.files[0].content;
    expect(filed).toContain('&lt;/script&gt;&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(filed).not.toContain('</script><img src=x');
    expect((filed.match(/<script>/g) || [])).toHaveLength(1);
    expect(filed).toContain('Download my response');
  });

  it('accepts only the response script shipped by the packet exporter', () => {
    const gs = makeDrive();
    expect(gs.EE_PACKET_RESPONSE_SCRIPT).toBe(PACKET_FORM_JS);
    const html = educatorPacket().replace('</body>', '<script>' + PACKET_FORM_JS + '</script></body>');
    expect(() => gs.shareEvaluationPacket({ ...basePacket, html })).not.toThrow();
    expect(gs.state.files[0].content).toContain('<script>' + PACKET_FORM_JS + '</script>');
  });

  it('trashes the private copy when Drive rejects permission creation', () => {
    const gs = makeDrive({ rejectCreate: true });
    expect(() => gs.shareEvaluationPacket(basePacket)).toThrow(/could not be verified/);
    expect(gs.state.files[0].trashed).toBe(true);
    expect(gs.state.permissions).toHaveLength(0);
  });

  it('compensates when the live role differs from the reviewed role', () => {
    const gs = makeDrive({ readbackRole: 'commenter' });
    expect(() => gs.shareEvaluationPacket(basePacket)).toThrow(/instead of reader/);
    expect(gs.state.files[0].trashed).toBe(true);
    expect(gs.state.permissions).toHaveLength(0);
  });

  it('treats the file description as transactional metadata and compensates on write failure', () => {
    const gs = makeDrive({ descriptionFailure: true });
    expect(() => gs.shareEvaluationPacket(basePacket)).toThrow(/description write rejected/);
    expect(gs.state.files[0].trashed).toBe(true);
    expect(gs.state.permissions).toHaveLength(0);
  });

  it('blocks recipient, verified-domain, and policy mismatches', () => {
    const gs = makeDrive();
    expect(() => gs.shareEvaluationPacket({ ...basePacket, recipientConfirmation: 'other@district.org' })).toThrow(/exactly match/);
    expect(() => gs.shareEvaluationPacket({ ...basePacket, expectedDomain: 'other.org' })).toThrow(/verified deployer domain/);
    expect(() => gs.shareEvaluationPacket({ ...basePacket, educatorEmail: 'person@outside.org', recipientConfirmation: 'person@outside.org' })).toThrow(/verified district domain/);
    expect(() => gs.shareEvaluationPacket({ ...basePacket, policyConfirmed: false })).toThrow(/district approval/);
    expect(gs.state.files).toHaveLength(0);
  });

  it('validates expiration bounds before disclosure', () => {
    const gs = makeDrive();
    expect(() => gs.shareEvaluationPacket({ ...basePacket, expiresOn: '30/11/2026' })).toThrow(/look like/);
    expect(() => gs.shareEvaluationPacket({ ...basePacket, expiresOn: '2020-01-01' })).toThrow(/past/);
    const farOut = new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10);
    expect(() => gs.shareEvaluationPacket({ ...basePacket, expiresOn: farOut })).toThrow(/more than a year/);
  });

  it('revokes every matching paginated permission and proves absence', () => {
    const gs = makeDrive({ paginate: true });
    const shared = gs.shareEvaluationPacket(basePacket);
    gs.state.permissions.push({ id: 'duplicate-permission', fileId: shared.fileId, type: 'user', emailAddress: basePacket.educatorEmail, role: 'reader' });
    const result = gs.revokeEvaluationAccess({ fileId: shared.fileId, educatorEmail: basePacket.educatorEmail });
    expect(result).toMatchObject({ revokedFor: basePacket.educatorEmail, removedPermissions: 2, absenceVerified: true });
    expect(gs.state.permissions).toHaveLength(0);
    expect(gs.state.removed).toHaveLength(2);
  });

  it('does not claim revocation when Drive still reports the permission', () => {
    const gs = makeDrive({ stickyRemove: true });
    const shared = gs.shareEvaluationPacket(basePacket);
    expect(() => gs.revokeEvaluationAccess({ fileId: shared.fileId, educatorEmail: basePacket.educatorEmail })).toThrow(/did not confirm/);
    expect(gs.state.permissions).toHaveLength(1);
  });

  it('lists live permission status instead of trusting editable metadata', () => {
    const gs = makeDrive(); const shared = gs.shareEvaluationPacket(basePacket);
    let packet = gs.listSharedEvaluations('2026-27').educators[0].packets[0];
    expect(packet).toMatchObject({ sharedWith: 'educator@district.org', role: 'view', liveRole: 'view', currentlyShared: true, liveStatus: 'active_verified' });
    gs.state.permissions.find((entry) => entry.fileId === shared.fileId).role = 'commenter';
    packet = gs.listSharedEvaluations('2026-27').educators[0].packets[0];
    expect(packet).toMatchObject({ liveRole: 'comment', liveStatus: 'active_changed' });
    expect(gs.listSharedEvaluations('2099-00').educators).toEqual([]);
  });

  it('requires both a visible managed identity and Drive v3 readiness', () => {
    expect(makeDrive().verifyShareHelper()).toMatchObject({ version: 3, ready: true, managedIdentityReady: true, driveApiV3Ready: true, recommendedDomain: 'district.org' });
    expect(makeDrive({ blankIdentity: true }).verifyShareHelper()).toMatchObject({ ready: false, managedIdentityReady: false });
    const without = makeDrive({ driveAdvanced: false }).verifyShareHelper();
    expect(without).toMatchObject({ ready: false, expirySupported: false });
    expect(without.note).toMatch(/sharing stays locked/);
  });

  it('blocks every mutating or listing RPC when active and effective identities differ', () => {
    const gs = makeDrive({ mismatchedIdentity: true });
    expect(gs.verifyShareHelper()).toMatchObject({ ready: false, identityMatched: false });
    expect(() => gs.doGet()).toThrow(/identity could not be proved/);
    expect(() => gs.shareEvaluationPacket(basePacket)).toThrow(/identity could not be proved/);
    expect(() => gs.listSharedEvaluations('2026-27')).toThrow(/identity could not be proved/);
    expect(() => gs.revokeEvaluationAccess({ fileId: 'file-1', educatorEmail: basePacket.educatorEmail })).toThrow(/identity could not be proved/);
  });


  it('rebuilds finalized annual rationale and evidence provenance as escaped passive content', () => {
    const gs = makeDrive();
    const html = finalizedAnnualPacket({
      teacher: {
        annualRationales: {
          d1: 'Strong <img src=x onerror="boom">',
          d2: 'Domain two rationale', d3: 'Domain three rationale', d4: 'Domain four rationale',
        },
      },
      walkthroughs: [{
        id: 'walk.1', teacherId: 'teacher-01', date: '2026-05-01',
        publishedAt: '2026-05-02T12:00:00.000Z',
        subject: 'Algebra <script>alert(1)</script>',
      }],
    });
    gs.shareEvaluationPacket({ ...basePacket, html });
    const filed = gs.state.files[0].content;
    expect(filed).toContain('Annual rationale and evidence provenance');
    expect(filed).toContain('Strong &lt;img src=x onerror=&quot;boom&quot;&gt;');
    expect(filed).toContain('Algebra &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(filed).toContain('Published formal-observation evidence');
    expect(filed).toContain('Locked SPM / SLO');
    expect(filed).toContain('Reference: walkthrough:walk.1');
    expect(filed).not.toContain('<img src=x onerror="boom">');
    expect(filed).not.toContain('<script>alert(1)</script>');
    const block = filed.match(/<script type="application\/json" id="allo-evaluation-packet">([\s\S]*?)<\/script>/);
    const safePacket = JSON.parse(block[1]);
    expect(safePacket.teachers[0].annualEvidenceRefs.d1).toEqual(['walkthrough:walk.1']);
  });

  it('renders finalized annual provenance exactly once when no walkthrough is included', () => {
    const gs = makeDrive();
    const html = finalizedAnnualPacket({
      teacher: {
        annualEvidenceRefs: {
          d1: ['formal_observation:obs-1'],
          d2: ['formal_observation:obs-1'],
          d3: ['spm:spm-1'],
          d4: ['spm:spm-1'],
        },
      },
      walkthroughs: [],
    });
    gs.shareEvaluationPacket({ ...basePacket, html });
    const filed = gs.state.files[0].content;
    expect(filed.match(/Annual rationale and evidence provenance/g) || []).toHaveLength(1);
  });

  it('renders finalized annual provenance exactly once when two walkthroughs are included', () => {
    const gs = makeDrive();
    const html = finalizedAnnualPacket({
      walkthroughs: [
        { id: 'walk.1', teacherId: 'teacher-01', date: '2026-05-01', publishedAt: '2026-05-02T12:00:00.000Z', subject: 'Algebra' },
        { id: 'walk.2', teacherId: 'teacher-01', date: '2026-05-08', publishedAt: '2026-05-09T12:00:00.000Z', subject: 'Geometry' },
      ],
    });
    gs.shareEvaluationPacket({ ...basePacket, html });
    const filed = gs.state.files[0].content;
    expect(filed.match(/Annual rationale and evidence provenance/g) || []).toHaveLength(1);
  });

  it('keeps legacy finalized packets without annual provenance fields shareable', () => {
    const gs = makeDrive();
    const html = educatorPacket({
      teachers: [{
        id: 'teacher-01', code: 'T-01', name: 'T-01',
        finalizedAt: '2026-08-20T12:00:00.000Z',
        ratings: { domains: { d1: 3 } },
      }],
    });
    expect(() => gs.shareEvaluationPacket({ ...basePacket, html })).not.toThrow();
  });

  it('rejects pre-final or incomplete annual provenance before filing', () => {
    const gs = makeDrive();
    expect(() => gs.shareEvaluationPacket({
      ...basePacket, html: finalizedAnnualPacket({ teacher: { finalizedAt: undefined } }),
    })).toThrow(/only on a finalized educator cycle/);
    expect(() => gs.shareEvaluationPacket({
      ...basePacket, html: finalizedAnnualPacket({ teacher: { annualEvidenceRefs: undefined } }),
    })).toThrow(/requires ratings, rationales, and evidence references together/);
    expect(() => gs.shareEvaluationPacket({
      ...basePacket, html: finalizedAnnualPacket({ teacher: { annualRationales: { d1: 'Only one domain' } } }),
    })).toThrow(/Annual rationale is required for every rated domain/);
    expect(gs.state.files).toHaveLength(0);
  });

  it('rejects malformed, unresolved, unpublished, or unlocked annual evidence references before filing', () => {
    const cases = [
      {
        html: finalizedAnnualPacket({ teacher: { annualEvidenceRefs: { d1: [{ token: 'walkthrough:walk.1' }], d2: ['formal_observation:obs-1'], d3: ['spm:spm-1'], d4: ['walkthrough:walk.1'] } } }),
        error: /canonical released-record reference/,
      },
      {
        html: finalizedAnnualPacket({ teacher: { annualEvidenceRefs: { d1: ['walkthrough:missing'], d2: ['formal_observation:obs-1'], d3: ['spm:spm-1'], d4: ['walkthrough:walk.1'] } } }),
        error: /does not resolve to a released record/,
      },
      {
        html: finalizedAnnualPacket({ observations: [{ id: 'obs-1', teacherId: 'teacher-01', observedAt: '2026-04-10' }] }),
        error: /formal-observation evidence that has not been published/,
      },
      {
        html: finalizedAnnualPacket({ spms: [{ id: 'spm-1', teacherId: 'teacher-01', status: 'approved', approvedAt: '2026-05-01T12:00:00.000Z' }] }),
        error: /SPM \/ SLO record that has not been locked/,
      },
    ];
    cases.forEach((entry) => {
      const gs = makeDrive();
      expect(() => gs.shareEvaluationPacket({ ...basePacket, html: entry.html })).toThrow(entry.error);
      expect(gs.state.files).toHaveLength(0);
    });
  });
  it('pins the private deployment and Advanced Drive v3 in the manifest', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps_script/educator_evaluation_share/appsscript.json'), 'utf8'));
    expect(manifest.webapp).toEqual({ access: 'MYSELF', executeAs: 'USER_DEPLOYING' });
    expect(manifest.dependencies.enabledAdvancedServices).toContainEqual({ userSymbol: 'Drive', version: 'v3', serviceId: 'drive' });
    expect(manifest.oauthScopes).not.toContain('https://www.googleapis.com/auth/script.send_mail');
  });
});
