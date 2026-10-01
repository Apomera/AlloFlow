import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const copilot = require('../walkthrough_copilot_module.js');
const fixtures = require('../walkthrough_copilot_fixtures.js');

const root = process.cwd();
const NOW = '2026-09-15T13:00:00.000Z';
const NOTES = fixtures.SAMPLE_NOTES;
const GOOD_URL = 'https://script.google.com/macros/s/AKfycbxSAMPLE_id-123/exec';

function approvedDraft(overrides) {
  const created = copilot.createDraft(
    Object.assign(
      {
        framework: fixtures.PORTLAND_FRAMEWORK,
        sourceNotes: NOTES,
        context: fixtures.SAMPLE_CONTEXT,
        mode: 'approved',
        approval: { providerApproved: true, scopeConfirmed: true, affirmedBy: 'Named approver' },
      },
      overrides || {}
    ),
    { now: NOW }
  );
  if (!created.ok) throw new Error(JSON.stringify(created.errors));
  const analyzed = copilot.validateSuggestions(created.value, fixtures.goodSuggestions(NOTES));
  return analyzed.value.suggestions.reduce((current, s) => {
    const report = copilot.decideSuggestion(current, s.id, 'accepted');
    return report.value;
  }, analyzed.value);
}

function demoDraft() {
  const created = copilot.createDraft(
    { framework: fixtures.PORTLAND_FRAMEWORK, sourceNotes: NOTES, context: fixtures.SAMPLE_CONTEXT },
    { now: NOW }
  );
  const analyzed = copilot.validateSuggestions(created.value, fixtures.goodSuggestions(NOTES));
  return analyzed.value.suggestions.reduce((current, s) => {
    return copilot.decideSuggestion(current, s.id, 'accepted').value;
  }, analyzed.value);
}

// Records what the client would send, so the test asserts on the wire payload
// rather than on the client's internals.
function recorder(responses) {
  const sent = [];
  const post = (url, body) => {
    sent.push({ url, body });
    const next = responses[body.action];
    return Promise.resolve(typeof next === 'function' ? next(body) : next);
  };
  return { sent, post };
}

function codes(report) {
  return report.errors.map((e) => e.code);
}

describe('walkthrough copilot deployment URL validation', () => {
  it('accepts a real Apps Script web app URL', () => {
    expect(copilot.validateExecUrl(GOOD_URL).ok).toBe(true);
    expect(copilot.validateExecUrl('  ' + GOOD_URL + '  ').value).toBe(GOOD_URL);
  });

  it('rejects the URLs people actually paste by mistake', () => {
    // The editor URL rather than the deployment URL is the classic error.
    expect(codes(copilot.validateExecUrl('https://script.google.com/home/projects/abc/edit'))).toContain('url-shape');
    // A /dev URL works only for the author and breaks for everyone else.
    expect(codes(copilot.validateExecUrl('https://script.google.com/macros/s/abc/dev'))).toContain('url-shape');
    expect(codes(copilot.validateExecUrl(''))).toContain('url-empty');
    expect(codes(copilot.validateExecUrl('http://script.google.com/macros/s/abc/exec'))).toContain('url-insecure');
    expect(codes(copilot.validateExecUrl('https://example.com/exec'))).toContain('url-shape');
  });
});

describe('walkthrough copilot recipient validation', () => {
  it('requires a real address, because feedback is never shared by link', () => {
    expect(copilot.validateRecipient('teacher@school.org').value).toBe('teacher@school.org');
    expect(copilot.validateRecipient('  Teacher@School.org ').value).toBe('teacher@school.org');
    expect(codes(copilot.validateRecipient(''))).toContain('recipient-invalid');
    expect(codes(copilot.validateRecipient('not-an-address'))).toContain('recipient-invalid');
  });

  it('warns when the address leaves the school domain', () => {
    expect(copilot.validateRecipient('teacher@school.org', 'school.org').ok).toBe(true);
    const outside = copilot.validateRecipient('teacher@gmail.com', 'school.org');
    expect(outside.ok).toBe(false);
    expect(codes(outside)).toContain('recipient-domain');
    expect(outside.errors[0].message).toContain('school.org');
  });
});

describe('walkthrough copilot delivery client', () => {
  it('refuses to build without a valid URL or a transport', () => {
    expect(codes(copilot.createDelivery({ execUrl: 'nope', post: () => {} }))).toContain('url-shape');
    expect(codes(copilot.createDelivery({ execUrl: GOOD_URL }))).toContain('transport-missing');
  });

  it('claims the script and keeps the returned token for later calls', async () => {
    const io = recorder({
      claim: { ok: true, token: 'tok-123', owner: 'principal@school.org', version: 1 },
      selftest: (body) => ({ ok: true, service: 'alloflow-walkthrough-records', echoToken: body.token }),
    });
    const delivery = copilot.createDelivery({ execUrl: GOOD_URL, post: io.post }).value;
    expect(delivery.hasToken).toBe(false);

    const claimed = await delivery.claim();
    expect(claimed.ok).toBe(true);
    expect(claimed.value.token).toBe('tok-123');

    await delivery.selfTest();
    expect(io.sent[1].body.token, 'the token must travel on subsequent calls').toBe('tok-123');
  });

  it('surfaces the script refusal rather than pretending it worked', async () => {
    const io = recorder({ claim: { ok: false, code: 'already_claimed', error: 'This script is already connected to a device.' } });
    const delivery = copilot.createDelivery({ execUrl: GOOD_URL, post: io.post }).value;
    const claimed = await delivery.claim();
    expect(claimed.ok).toBe(false);
    expect(codes(claimed)).toContain('already_claimed');
    expect(claimed.errors[0].message).toMatch(/already connected/i);
  });

  it('delivers only the approved record, never the draft', async () => {
    const io = recorder({ deliver: { ok: true, fileId: 'f1', url: 'https://drive.google.com/file/d/f1/view', sharedWith: 'teacher@school.org', notified: true, at: NOW } });
    const delivery = copilot.createDelivery({ execUrl: GOOD_URL, token: 'tok', post: io.post }).value;

    let draft = approvedDraft();
    draft = copilot.decideSuggestion(draft, 's-3b', 'rejected').value;

    const result = await delivery.deliver(draft, fixtures.SAMPLE_FIELD_MAP, { teacherEmail: 'teacher@school.org' });
    expect(result.ok).toBe(true);

    const wire = JSON.stringify(io.sent[0].body);
    // The rejected suggestion and every draft-only artifact must be absent.
    expect(wire).not.toContain('paragraph 2');
    expect(wire).not.toContain('confidence');
    expect(wire).not.toContain('sourceNotesOriginal');
    expect(wire).not.toContain('9:05 entered');
    // What the observer approved must be present, with its disclosure.
    expect(wire).toContain('Do Now');
    expect(io.sent[0].body.disclosure).toContain('AI assistance');
  });

  it('sends a named recipient and never a link-sharing instruction', async () => {
    const io = recorder({ deliver: { ok: true, fileId: 'f1', url: 'u', sharedWith: 'teacher@school.org', notified: true, at: NOW } });
    const delivery = copilot.createDelivery({ execUrl: GOOD_URL, token: 'tok', post: io.post }).value;
    await delivery.deliver(approvedDraft(), fixtures.SAMPLE_FIELD_MAP, { teacherEmail: 'Teacher@School.org' });
    expect(io.sent[0].body.teacherEmail).toBe('teacher@school.org');
    expect(io.sent[0].body.restrictToDomain).toBe(true);
    expect(JSON.stringify(io.sent[0].body)).not.toMatch(/anyone.?with.?the.?link/i);
  });

  it('refuses to deliver practice material', async () => {
    const io = recorder({ deliver: { ok: true } });
    const delivery = copilot.createDelivery({ execUrl: GOOD_URL, token: 'tok', post: io.post }).value;
    const result = await delivery.deliver(demoDraft(), fixtures.SAMPLE_FIELD_MAP, { teacherEmail: 'teacher@school.org' });
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain('demo-mode');
    expect(io.sent, 'nothing should reach the network for a demo draft').toHaveLength(0);
  });

  it('refuses to deliver an unapproved draft', async () => {
    const io = recorder({ deliver: { ok: true } });
    const delivery = copilot.createDelivery({ execUrl: GOOD_URL, token: 'tok', post: io.post }).value;
    const created = copilot.createDraft(
      {
        framework: fixtures.PORTLAND_FRAMEWORK,
        sourceNotes: NOTES,
        mode: 'approved',
        approval: { providerApproved: true, scopeConfirmed: true, affirmedBy: 'Named approver' },
      },
      { now: NOW }
    );
    const analyzed = copilot.validateSuggestions(created.value, fixtures.goodSuggestions(NOTES));
    const result = await delivery.deliver(analyzed.value, fixtures.SAMPLE_FIELD_MAP, { teacherEmail: 'teacher@school.org' });
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain('decisions-pending');
    expect(io.sent).toHaveLength(0);
  });

  it('refuses a bad recipient before contacting the script at all', async () => {
    const io = recorder({ deliver: { ok: true } });
    const delivery = copilot.createDelivery({ execUrl: GOOD_URL, token: 'tok', post: io.post }).value;
    const result = await delivery.deliver(approvedDraft(), fixtures.SAMPLE_FIELD_MAP, { teacherEmail: 'oops' });
    expect(codes(result)).toContain('recipient-invalid');
    expect(io.sent).toHaveLength(0);
  });
});

describe('walkthrough records apps script contract', () => {
  const script = readFileSync(resolve(root, 'apps_script/walkthrough_records/Code.gs'), 'utf8');
  const manifest = JSON.parse(readFileSync(resolve(root, 'apps_script/walkthrough_records/appsscript.json'), 'utf8'));

  it('asks only for per-file Drive access, not the whole Drive', () => {
    expect(manifest.oauthScopes).toContain('https://www.googleapis.com/auth/drive.file');
    expect(manifest.oauthScopes, 'full Drive access would alarm an admin for no benefit')
      .not.toContain('https://www.googleapis.com/auth/drive');
  });

  it('never makes a delivered file link-accessible', () => {
    expect(script).toContain('DriveApp.Access.PRIVATE');
    expect(script).not.toMatch(/Access\.ANYONE_WITH_LINK|Access\.ANYONE\b/);
    expect(script).toContain('addViewer');
  });

  it('requires a named recipient and a disclosure before writing anything', () => {
    expect(script).toContain('bad_recipient');
    expect(script).toContain('disclosure_required');
  });

  it('refuses unauthenticated mutations once claimed, and cannot be re-claimed', () => {
    expect(script).toContain('already_claimed');
    expect(script).toContain('not_claimed');
    expect(script).toMatch(/supplied !== stored/);
  });

  it('keeps feedback text out of the notification email', () => {
    const mailBlock = script.slice(script.indexOf('MailApp.sendEmail'), script.indexOf('notified = true'));
    expect(mailBlock).toContain('intentionally contains no feedback text');
    expect(mailBlock).not.toContain('fields[');
  });

  it('finds its folder by stored id rather than searching Drive', () => {
    // Searching would require broader scope than drive.file.
    expect(script).toContain('getFolderById');
    expect(script).not.toMatch(/getFoldersByName|searchFiles|searchFolders/);
  });

  it('exposes no HTML portal, because it is a delivery endpoint', () => {
    expect(script).not.toContain('HtmlService');
  });
});

describe('shipped apps script source module', () => {
  it('matches the repository copy byte for byte', () => {
    delete global.window;
    global.window = {};
    require('../walkthrough_script_source_module.js');
    const shipped = global.window.AlloModules.WalkthroughScriptSource;
    const disk = readFileSync(resolve(root, 'apps_script/walkthrough_records/Code.gs'), 'utf8');
    expect(shipped.source).toBe(disk);
    expect(createHash('sha256').update(disk, 'utf8').digest('hex')).toBe(shipped.sha256);
  });

  it('ships the setup steps so the copy button works offline and in Canvas', () => {
    const shipped = global.window.AlloModules.WalkthroughScriptSource;
    expect(shipped.steps.length).toBeGreaterThanOrEqual(7);
    expect(Object.isFrozen(shipped)).toBe(true);
    const all = shipped.steps.map((s) => s.text).join(' ');
    expect(all).toContain('script.new');
    expect(all).toContain('Who has access: Anyone');
    expect(all, 'the unverified-app warning must not be hidden from the user').toMatch(/has not verified/i);
    expect(all).toContain('/exec');
  });
});
