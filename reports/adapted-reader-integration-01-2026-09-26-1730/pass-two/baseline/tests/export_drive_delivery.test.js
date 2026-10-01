// "Send to my Drive" client (export preview -> Class Mailbox v24). The pure
// helpers live at module scope in view_export_preview_source.jsx between two
// markers, so they can be exercised here without mounting the 8k-line view:
// mailbox config discovery (both /exec URL shapes), the text/plain protocol and
// its error translation, the quiz -> Google Form item mapping, and the UI
// wiring pins (group present, setup fallback, sink-aware Office export, and the
// host hook that opens the mailbox setup).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(ROOT, 'view_export_preview_source.jsx'), 'utf8');
const builtModule = fs.readFileSync(path.join(ROOT, 'view_export_preview_module.js'), 'utf8');
const publicModule = fs.readFileSync(path.join(ROOT, 'desktop', 'web-app', 'public', 'view_export_preview_module.js'), 'utf8');
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');

function sliceBetween(text, startMarker, endMarker) {
    const start = text.indexOf(startMarker);
    const end = text.indexOf(endMarker, start);
    if (start === -1 || end === -1) throw new Error('markers not found');
    return text.slice(start + startMarker.length, end);
}

function loadHelpers() {
    const body = sliceBetween(source, '// __ALLO_DRIVE_DELIVERY_BEGIN__', '// __ALLO_DRIVE_DELIVERY_END__');
    const sandbox = {};
    vm.runInNewContext(
        body + '\nthis.helpers = { readMailboxConfig: _alloReadMailboxConfig, deliverCall: _alloMailboxDeliverCall, quizToFormItems: _alloQuizToFormItems, formQuizzesFromHistory: _alloFormQuizzesFromHistory, DOCX: ALLO_DRIVE_DOCX_MIME };',
        sandbox,
        { filename: 'drive-delivery-helpers.js' },
    );
    return sandbox.helpers;
}

const storageOf = (entries) => ({ getItem: (k) => (Object.prototype.hasOwnProperty.call(entries, k) ? entries[k] : null) });

describe('mailbox config discovery', () => {
    const { readMailboxConfig } = loadHelpers();

    it('accepts both the personal and the Workspace /exec shapes and requires the admin token', () => {
        const personal = 'https://script.google.com/macros/s/AKfycbx_abc-123/exec';
        const workspace = 'https://script.google.com/a/macros/portlandschools.org/s/AKfycbx_abc-123/exec';
        expect(readMailboxConfig(storageOf({ alloflow_session_mailbox_url: personal, alloflow_session_mailbox_admin: 'tok' }))).toEqual({ url: personal, admin: 'tok' });
        expect(readMailboxConfig(storageOf({ alloflow_session_mailbox_url: workspace, alloflow_session_mailbox_admin: 'tok' }))).toEqual({ url: workspace, admin: 'tok' });
        expect(readMailboxConfig(storageOf({ alloflow_session_mailbox_url: personal }))).toBeNull();
        expect(readMailboxConfig(storageOf({ alloflow_session_mailbox_url: 'https://script.google.com/macros/s/AKfycbx/dev', alloflow_session_mailbox_admin: 'tok' }))).toBeNull();
        expect(readMailboxConfig(storageOf({ alloflow_session_mailbox_url: 'https://evil.example/exec', alloflow_session_mailbox_admin: 'tok' }))).toBeNull();
        expect(readMailboxConfig({ getItem: () => { throw new Error('blocked'); } })).toBeNull();
        expect(readMailboxConfig(null)).toBeNull();
    });
});

describe('mailbox delivery protocol', () => {
    const { deliverCall } = loadHelpers();
    const config = { url: 'https://script.google.com/macros/s/x/exec', admin: 'admin-token' };

    it('posts text/plain JSON with the admin token and returns the reply', async () => {
        const calls = [];
        const fetchImpl = async (url, options) => { calls.push({ url, options }); return { json: async () => ({ ok: true, url: 'https://docs.google.com/document/d/1/edit' }) }; };
        const reply = await deliverCall(config, { a: 'deliver', name: 'x.docx', mime: 'm', b64: 'AAA', convert: 'doc' }, fetchImpl);
        expect(reply.url).toContain('docs.google.com');
        expect(calls).toHaveLength(1);
        expect(calls[0].url).toBe(config.url);
        expect(calls[0].options.method).toBe('POST');
        expect(calls[0].options.headers).toEqual({ 'Content-Type': 'text/plain;charset=utf-8' });
        expect(JSON.parse(calls[0].options.body)).toEqual({ a: 'deliver', name: 'x.docx', mime: 'm', b64: 'AAA', convert: 'doc', admin: 'admin-token' });
    });

    it('translates protocol refusals into teacher-readable messages', async () => {
        const replying = (body) => async () => ({ json: async () => body });
        await expect(deliverCall(config, { a: 'deliver' }, replying({ ok: false, e: 'not-admin' }))).rejects.toThrow(/Reconnect the mailbox/);
        await expect(deliverCall(config, { a: 'deliver' }, replying({ ok: false, e: 'bad-action' }))).rejects.toThrow(/predates v24/);
        await expect(deliverCall(config, { a: 'deliverform' }, replying({ ok: false, e: 'forms-scope' }))).rejects.toThrow(/Forms scope/);
        await expect(deliverCall(config, { a: 'deliver' }, replying({ ok: false, e: 'drive-error', d: 'Insufficient Permission' }))).rejects.toThrow(/Drive refused the file\. Insufficient Permission/);
        await expect(deliverCall(config, { a: 'deliver' }, replying({ ok: false, e: 'weird' }))).rejects.toThrow(/Mailbox error: weird/);
        await expect(deliverCall(config, { a: 'deliver' }, async () => ({ json: async () => { throw new Error('html'); } }))).rejects.toThrow(/did not answer/);
    });
});

describe('quiz -> Google Form items', () => {
    const { quizToFormItems, formQuizzesFromHistory } = loadHelpers();

    it('maps choice, multi-select and short-answer questions and demotes the rest to paragraphs', () => {
        const items = quizToFormItems({ questions: [
            { type: 'mcq', question: 'Which HOWL is about work quality?', options: ['Respect', 'Perseverance', 'Responsibility'], correctAnswer: 'Perseverance', explanation: 'Grading guide' },
            { question: 'Index-form answer', options: [{ text: 'a' }, { text: 'b' }], correctAnswer: 1 },
            { type: 'multi-select', question: 'Pick two', options: ['a', 'b', 'c'], correctAnswers: ['a', 'c'] },
            { type: 'short-answer', question: 'Name one micro-action', correctAnswer: 'ask for feedback' },
            { type: 'fill-blank', question: 'The ___ is high', expectedFill: 'tide' },
            { type: 'numeric-response', question: '3 + 4', correctValue: 7 },
            { type: 'self-explanation', question: 'Explain why' },
            { type: 'mcq', question: 'Too few options', options: ['only'] },
            { question: '' },
            null,
        ] });
        expect(items.map((i) => i.type)).toEqual(['mc', 'mc', 'checkbox', 'short', 'short', 'short', 'paragraph', 'paragraph']);
        expect(items[0]).toEqual({ type: 'mc', prompt: 'Which HOWL is about work quality?', options: ['Respect', 'Perseverance', 'Responsibility'], answer: [1], help: 'Grading guide', points: 1 });
        expect(items[1].answer).toEqual([1]);
        expect(items[2].answer).toEqual([0, 2]);
        expect(items[3]).toMatchObject({ prompt: 'Name one micro-action', answer: 'ask for feedback', points: 1 });
        expect(items[4].answer).toBe('tide');
        expect(items[5].answer).toBe('7');
        expect(items[6]).toEqual({ type: 'paragraph', prompt: 'Explain why', help: undefined, points: 0 });
        expect(items[7].type).toBe('paragraph');
        expect(quizToFormItems(null)).toEqual([]);
    });

    it('lists only quizzes with questions from history, newest order preserved', () => {
        const list = formQuizzesFromHistory([
            { id: 1, type: 'quiz', title: 'Tides quiz', data: { questions: [{ question: 'q' }] } },
            { id: 2, type: 'quiz', data: { questions: [] } },
            { id: 3, type: 'simplified', data: 'text' },
            { id: 4, type: 'quiz', meta: 'Grade 6', data: { questions: [{ question: 'q2' }] } },
        ]);
        expect(list.map((q) => q.key)).toEqual(['1', '4']);
        expect(list[1].title).toBe('Grade 6');
        expect(formQuizzesFromHistory(undefined)).toEqual([]);
    });
});

describe('UI wiring pins', () => {
    it('renders the Google Drive group with a setup fallback, and the sink-aware Office export', () => {
        expect(source).toContain('>Google Drive</div>');
        expect(source).toContain("'Google Doc (send to my Drive)'");
        expect(source).toContain("'Google Form (quiz, send to my Drive)'");
        expect(source).toContain('Connect your Class Mailbox to send documents to your Drive');
        expect(source).toContain('const runOfficeExport = React.useCallback(async (format, sink) => {');
        expect(source).toContain("await runOfficeExport('docx', async (result) => {");
        expect(source).toContain("convert: 'doc'");
        expect(source).toContain("{ a: 'deliverform', title: chosen.title, items, quiz: true }");
        expect(source).toContain('window.__alloOpenMailboxSetup');
        expect(source).toContain('window.AlloModules.DriveDelivery');
    });

    it('ships the same wiring in the built module and its public mirror', () => {
        for (const text of [builtModule, publicModule]) {
            expect(text).toContain('Google Doc (send to my Drive)');
            expect(text).toContain('AlloModules.DriveDelivery');
            expect(text).toContain('deliverform');
        }
        expect(builtModule).toBe(publicModule);
    });

    it('has the host hook that opens the mailbox setup from a module', () => {
        expect(anti).toContain('window.__alloOpenMailboxSetup = () => { try { setMbPanelOpen(true); } catch (_) {} };');
        expect(anti).toContain('delete window.__alloOpenMailboxSetup');
    });
});
