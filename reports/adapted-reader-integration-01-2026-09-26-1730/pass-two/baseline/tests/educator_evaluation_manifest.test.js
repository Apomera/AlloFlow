// Educator Evaluation portal manifest: the scope list must cover every Google
// service the script actually calls, or the deployer hits a runtime permission
// error on a code path the tests never exercise (DocumentApp.create in the
// release-evaluation path shipped for a while with no documents scope). The
// deployment posture (domain-only, executes as the deploying district account)
// is what keeps the OAuth consent to ONE person; pin it too.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'apps_script', 'educator_evaluation');
const manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'appsscript.json'), 'utf8'));
const code = fs.readFileSync(path.join(DIR, 'Code.gs'), 'utf8');

// Apps Script service -> the OAuth scope it needs (any one of the listed scopes
// satisfies it). Services that need no scope are omitted on purpose.
const SERVICE_SCOPES = [
    { service: 'DocumentApp.', scopes: ['https://www.googleapis.com/auth/documents'] },
    { service: 'SpreadsheetApp.', scopes: ['https://www.googleapis.com/auth/spreadsheets'] },
    { service: 'DriveApp.', scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file'] },
    { service: 'MailApp.', scopes: ['https://www.googleapis.com/auth/script.send_mail'] },
    { service: 'GmailApp.', scopes: ['https://www.googleapis.com/auth/gmail.send', 'https://mail.google.com/'] },
    { service: 'UrlFetchApp.', scopes: ['https://www.googleapis.com/auth/script.external_request'] },
    { service: 'FormApp.', scopes: ['https://www.googleapis.com/auth/forms'] },
    { service: 'CalendarApp.', scopes: ['https://www.googleapis.com/auth/calendar'] },
    { service: 'Session.getActiveUser', scopes: ['https://www.googleapis.com/auth/userinfo.email'] },
];

describe('educator evaluation manifest', () => {
    it('lists a scope for every Google service the script calls', () => {
        const missing = SERVICE_SCOPES
            .filter(({ service }) => code.includes(service))
            .filter(({ scopes }) => !scopes.some(scope => manifest.oauthScopes.includes(scope)))
            .map(({ service }) => service);
        expect(missing).toEqual([]);
    });

    it('does not request scopes for services the script never touches', () => {
        const unused = manifest.oauthScopes.filter(scope => {
            const owners = SERVICE_SCOPES.filter(({ scopes }) => scopes.includes(scope));
            return owners.length > 0 && !owners.some(({ service }) => code.includes(service));
        });
        expect(unused).toEqual([]);
    });

    it('keeps the domain-only, execute-as-deployer posture so only the deployer ever consents', () => {
        expect(manifest.webapp).toEqual({ access: 'DOMAIN', executeAs: 'USER_DEPLOYING' });
        expect(manifest.runtimeVersion).toBe('V8');
        expect(code).toContain('DocumentApp.create(');
        expect(manifest.oauthScopes).toContain('https://www.googleapis.com/auth/documents');
    });
});
