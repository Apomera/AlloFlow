// @vitest-environment jsdom
// Behavioral regression suite for deferred zero-UX-impact security hardening (2026-11-15):
//   1. _alloSanitizeHtmlDom strips <template> and <math> tags in AlloFlowANTI.txt.
//   2. toggleBionic() in view_pdf_audit_source.jsx renders/reverts bionic spans via DOM text nodes (no innerHTML/outerHTML XSS).
//   3. _latexToOmml() in view_pdf_audit_source.jsx fails soft without CDN fetches on bundled desktop /app/ origins.
//   4. TeacherDashboard student work preview routes generateResourceHTML output through window.sanitizeHtml.
//   5. SubmissionCrypto.decryptSubmission enforces 12-byte GCM IV, pre-decode length bounds, and prototype-safe JSON parsing.
//   6. SubmissionInbox promotes authenticated inner decrypted nickname & docTitle over tampered outer wrapper metadata.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const modulesDir = resolve(ROOT, 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
const { act } = require(resolve(modulesDir, 'react-dom/test-utils'));

const ANTI = readFileSync(resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');
const SANITIZE_BLOCK = sliceBetween(ANTI, '// __ALLO_SANITIZE_HTML_BEGIN__', '// __ALLO_SANITIZE_HTML_END__', { file: 'AlloFlowANTI.txt' });
// eslint-disable-next-line no-new-func
const realSanitizeHtml = new Function('DOMParser', SANITIZE_BLOCK + '\nreturn sanitizeHtml;')(globalThis.DOMParser);

const roots = [];
const timerTick = () => new Promise(r => setTimeout(r, 15));

beforeAll(() => {
  if (!window.crypto || !window.crypto.subtle) {
    Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true, writable: true });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
  while (roots.length) {
    const { root, host } = roots.pop();
    act(() => root.unmount());
    host.remove();
  }
});

describe('1. _alloSanitizeHtmlDom strips <template> and <math>', () => {
  it('removes <template> and <math> subtrees completely', () => {
    const out1 = realSanitizeHtml('<p>Safe</p><template><script>alert(1)</script><img src=x onerror=alert(1)></template>');
    expect(out1).toBe('<p>Safe</p>');

    const out2 = realSanitizeHtml('<p>Ok</p><math><mtext><img src=x onerror=alert(1)></mtext></math>');
    expect(out2).toBe('<p>Ok</p>');
  });
});

describe('2. view_pdf_audit toggleBionic & _latexToOmml hardening', () => {
  const pdfAuditSrc = readFileSync(resolve(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');

  it('toggleBionic uses text nodes rather than innerHTML/outerHTML on toggle ON and OFF', () => {
    const start = pdfAuditSrc.indexOf('var _bionicOn = false;');
    const end = pdfAuditSrc.indexOf('var _lineGuideOn = false;', start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const snippet = pdfAuditSrc.slice(start, end);

    const frameDoc = document.implementation.createHTMLDocument('preview');
    const p = frameDoc.createElement('p');
    const payload = '<img src=x onerror=alert(1)>';
    p.textContent = payload;
    frameDoc.body.appendChild(p);

    const btn = document.createElement('button');
    btn.id = 'btn-bionic';
    document.body.appendChild(btn);

    try {
      // eslint-disable-next-line no-new-func
      const toggleBionic = new Function('iframe', 'document', snippet + '\nreturn toggleBionic;')({ contentDocument: frameDoc }, document);

      toggleBionic(); // ON
      expect(frameDoc.querySelector('img')).toBeNull();
      expect(frameDoc.body.textContent).toBe(payload);
      expect(frameDoc.querySelectorAll('.bionic-wrap').length).toBeGreaterThan(0);

      toggleBionic(); // OFF
      expect(frameDoc.querySelector('img')).toBeNull();
      expect(frameDoc.querySelectorAll('.bionic-wrap').length).toBe(0);
      expect(frameDoc.body.textContent).toBe(payload);
    } finally {
      btn.remove();
    }
  });

  it('_latexToOmml returns null without injecting CDN scripts on bundled desktop /app/ URLs', async () => {
    const start = pdfAuditSrc.indexOf('let _ommlToolsPromise = null;');
    const end = pdfAuditSrc.indexOf("if (typeof window !== 'undefined') window.__alloLatexToOmml = _latexToOmml;", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const snippet = pdfAuditSrc.slice(start, end);

    const headScriptsBefore = document.head.querySelectorAll('script').length;
    const savedTemml = window.temml;
    const appendSpy = vi.spyOn(document.head, 'appendChild');
    delete window.temml;

    const fakeWindow = {
      location: { hostname: '127.0.0.1', pathname: '/app/index.html' },
    };
    try {
      // eslint-disable-next-line no-new-func
      const latexToOmml = new Function('window', 'document', snippet + '\nreturn _latexToOmml;')(fakeWindow, document);
      const res = await latexToOmml('x^2 + y^2 = z^2');
      expect(res).toBeNull();
      expect(appendSpy).not.toHaveBeenCalled();
      expect(document.head.querySelectorAll('script').length).toBe(headScriptsBefore);
    } finally {
      if (savedTemml !== undefined) window.temml = savedTemml;
    }
  });
});

describe('3. TeacherDashboard resource preview sanitization', () => {
  it('routes generateResourceHTML preview output through window.sanitizeHtml', async () => {
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.AlloLanguageContext = React.createContext({ t: key => key });
    window.__alloT = key => key;
    window.AlloIcons = window.AlloIcons || {};
    window.__alloFocusTrapStack = [];
    const hookStart = ANTI.indexOf('const useFocusTrap = (ref, isOpen, onEscape) => {');
    const hookEnd = ANTI.indexOf('window.__alloHooks = { useFocusTrap };', hookStart);
    window.__alloHooks = { useFocusTrap: new Function('useRef', 'useEffect', ANTI.slice(hookStart, hookEnd) + '\nreturn useFocusTrap;')(React.useRef, React.useEffect) };
    window.AlloModules = window.AlloModules || {};
    new Function(readFileSync(resolve(ROOT, 'teacher_module.js'), 'utf8'))();
    const Dashboard = window.AlloModules.TeacherDashboard;

    const sanitizeSpy = vi.fn(html => realSanitizeHtml(html));
    const savedSanitize = window.sanitizeHtml;
    window.sanitizeHtml = sanitizeSpy;

    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    roots.push({ root, host });

    try {
      const student = {
        id: 'stu-1',
        studentNickname: 'River Fox',
        timestamp: '2026-11-15T12:00:00.000Z',
        history: [{ id: 'res-1', type: 'reading', title: 'Lesson', timestamp: '2026-11-15T12:00:00.000Z', data: 'Safe' }],
        responses: {},
        stats: { totalXP: 5 },
      };
      await act(async () => {
        root.render(React.createElement(Dashboard, {
          onClose() {},
          dashboardData: [student],
          setDashboardData() {},
          addToast() {},
          setSelectedStudentId() {},
          selectedStudentId: 'stu-1',
          setDashboardView() {},
          dashboardView: 'detail',
          generateResourceHTML: () => '<p>Student Answer</p><script>alert(1)</script><template><script>alert(2)</script></template><img src="data:image/png;base64,AA==" onerror="alert(1)"><svg onload="alert(1)"><style>.x{}</style></svg>',
          onOpenBehaviorLens() {},
          callGemini: async () => '',
        }));
      });
      await timerTick();

      expect(sanitizeSpy).toHaveBeenCalled();
      const preview = host.querySelector('.prose');
      expect(preview).toBeTruthy();
      expect(preview.textContent).toContain('Student Answer');
      expect(preview.querySelector('script')).toBeNull();
      expect(preview.querySelector('template')).toBeNull();
      expect(preview.querySelector('svg')).toBeNull();
      const img = preview.querySelector('img');
      expect(img).toBeTruthy();
      expect(img.getAttribute('onerror')).toBeNull();
    } finally {
      window.sanitizeHtml = savedSanitize;
    }
  });
});

describe('4. SubmissionCrypto decryption validation & prototype-safe parsing', () => {
  let SC;

  beforeAll(() => {
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.SubmissionCrypto;
    new Function(readFileSync(resolve(ROOT, 'submission_crypto_module.js'), 'utf8'))();
    SC = window.AlloModules.SubmissionCrypto;
  });

  it('rejects non-12-byte IVs and oversized base64 blobs before decoding', async () => {
    const { publicJwk, privateJwk } = await SC.generateClassKeypair();
    const blob = await SC.encryptSubmission({ nickname: 'Hawk', answers: {} }, publicJwk);

    const longIv = btoa('1234567890123456'); // 16 bytes instead of 12
    await expect(SC.decryptSubmission({ ...blob, iv: longIv }, privateJwk)).rejects.toThrow(/12 bytes/i);

    await expect(SC.decryptSubmission({ ...blob, iv: 'A'.repeat(100) }, privateJwk)).rejects.toThrow(/maximum size/i);
    await expect(SC.decryptSubmission({ ...blob, wrappedKey: 'A'.repeat(5000) }, privateJwk)).rejects.toThrow(/maximum size/i);
  });

  it('strips __proto__, constructor, and prototype keys when parsing decrypted JSON', async () => {
    const { publicJwk, privateJwk } = await SC.generateClassKeypair();
    const subtle = window.crypto.subtle;
    const json = '{"nickname":"Otter","__proto__":{"polluted":true},"nested":{"constructor":{"bad":1},"prototype":{"evil":2},"ok":7}}';
    const aesKey = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ctBuf = await subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, new TextEncoder().encode(json));
    const pub = await subtle.importKey('jwk', publicJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
    const wrappedBuf = await subtle.encrypt({ name: 'RSA-OAEP' }, pub, await subtle.exportKey('raw', aesKey));
    const toB64 = (buf) => {
      const b = new Uint8Array(buf);
      let s = '';
      for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
      return btoa(s);
    };

    const parsed = await SC.decryptSubmission({
      wrappedKey: toB64(wrappedBuf),
      iv: toB64(iv),
      ciphertext: toB64(ctBuf),
    }, privateJwk);

    expect(parsed.nickname).toBe('Otter');
    expect(parsed.nested.ok).toBe(7);
    expect(Object.prototype.hasOwnProperty.call(parsed, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(parsed.nested, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(parsed.nested, 'prototype')).toBe(false);
    expect(({}).polluted).toBeUndefined();
  });
});

describe('5. SubmissionInbox promotes authenticated inner identity over spoofed outer metadata', () => {
  it('replaces mismatched outer nickname and docTitle with the AES-GCM-authenticated inner payload values', async () => {
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.SubmissionCrypto;
    delete window.AlloModules.SubmissionInbox;
    new Function(readFileSync(resolve(ROOT, 'submission_crypto_module.js'), 'utf8'))();
    new Function(readFileSync(resolve(ROOT, 'view_submission_inbox_module.js'), 'utf8'))();

    const SC = window.AlloModules.SubmissionCrypto;
    const SubmissionInbox = window.AlloModules.SubmissionInbox.SubmissionInbox;
    const { publicJwk, privateJwk } = await SC.generateClassKeypair();

    const innerPayload = {
      kind: 'alloflow-student-submission',
      schemaVersion: 3,
      nickname: 'Real Inner Student',
      docTitle: 'Authenticated Quiz Title',
      timestamp: '2026-11-15T12:00:00.000Z',
      responses: { 'q1': 'Water cycle' },
      answers: { 'q1': 'Water cycle' },
    };
    const encrypted = await SC.encryptSubmission(innerPayload, publicJwk);
    const outerWrapper = {
      kind: 'encrypted-worksheet',
      nickname: 'Spoofed Outer Name',
      docTitle: 'Fake Outer Title',
      timestamp: '2026-11-15T12:00:00.000Z',
      ...encrypted,
    };

    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    roots.push({ root, host });

    await act(async () => {
      root.render(React.createElement(SubmissionInbox, {
        isOpen: true,
        onClose: vi.fn(),
        rosterKey: '',
        t: (_k, fallback) => fallback || _k,
        addToast: vi.fn(),
        onOpenAlloSheet: vi.fn(),
        history: [],
      }));
      await timerTick();
    });

    const keyText = JSON.stringify({ kind: 'alloflow-class-key', privateJwk });
    const keyFile = new File([keyText], 'class-key.alloflow', { type: 'application/json' });
    Object.defineProperty(keyFile, 'text', { value: () => Promise.resolve(keyText) });
    const keyInput = host.querySelector('input[aria-label="Class key file"]');
    Object.defineProperty(keyInput, 'files', { configurable: true, value: [keyFile] });
    await act(async () => {
      keyInput.dispatchEvent(new Event('change', { bubbles: true }));
      await timerTick();
    });

    const subText = JSON.stringify(outerWrapper);
    const subFile = new File([subText], 'spoofed.json', { type: 'application/json' });
    Object.defineProperty(subFile, 'text', { value: () => Promise.resolve(subText) });
    const subInput = host.querySelector('input[aria-label="Submission files"]');
    Object.defineProperty(subInput, 'files', { configurable: true, value: [subFile] });
    await act(async () => {
      subInput.dispatchEvent(new Event('change', { bubbles: true }));
      await timerTick();
    });

    expect(host.textContent).toContain('Spoofed Outer Name');

    const decryptBtn = Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Decrypt all'));
    expect(decryptBtn).toBeTruthy();
    await act(async () => {
      decryptBtn.click();
      await timerTick();
      await timerTick();
    });

    expect(host.textContent).toContain('Real Inner Student');
    expect(host.textContent).toContain('Authenticated Quiz Title');
    expect(host.textContent).not.toContain('Spoofed Outer Name');
    expect(host.textContent).not.toContain('Fake Outer Title');
  });
});
