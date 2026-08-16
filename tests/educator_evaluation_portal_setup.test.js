// Educator Evaluation: is it a demo or is it ready, and does the QR path work?
// (fleet 2026-08-16, C3)
//
// Two genuinely different things sit behind one Settings card:
//   - not connected: an in-browser demonstration workspace, no server, no identity
//   - connected:     a district-owned Apps Script /exec deployment, Google sign-in
//
// The card used to badge the first state "Local preview available", which does not
// tell a principal whether the tool is safe to use on real staff. These tests pin
// the distinction, the URL validation that keeps the launcher pointed at a real
// Apps Script deployment, and the fact that the QR code only ever encodes a
// connected district portal.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let anti;
let settings;
let normalizeUrl;

beforeAll(() => {
  anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  settings = readFileSync('view_project_settings_source.jsx', 'utf8');

  const start = anti.indexOf('const normalizeAlloEvaluationPortalUrl = (value) => {');
  if (start < 0) throw new Error('normalizeAlloEvaluationPortalUrl not found');
  const end = anti.indexOf('\n};', start);
  normalizeUrl = new Function(
    anti.slice(start, end + 3) + '; return normalizeAlloEvaluationPortalUrl;'
  )();
});

describe('the portal launcher only accepts a real Apps Script deployment', () => {
  const OK = 'https://script.google.com/macros/s/AKfycbxAbC-123_456/exec';

  it('accepts a district /exec deployment URL', () => {
    expect(normalizeUrl(OK)).toBe(OK);
    expect(normalizeUrl('  ' + OK + '  ')).toBe(OK);
  });

  it('rejects anything that is not script.google.com over HTTPS', () => {
    expect(normalizeUrl('http://script.google.com/macros/s/AKfycbx/exec')).toBe('');
    expect(normalizeUrl('https://script.google.com.evil.test/macros/s/AKfycbx/exec')).toBe('');
    expect(normalizeUrl('https://evil.test/macros/s/AKfycbx/exec')).toBe('');
    expect(normalizeUrl('javascript:alert(1)')).toBe('');
    expect(normalizeUrl('')).toBe('');
    expect(normalizeUrl(null)).toBe('');
  });

  it('rejects a /dev deployment, which is the author-only test URL', () => {
    expect(normalizeUrl('https://script.google.com/macros/s/AKfycbx/dev')).toBe('');
  });

  it('rejects credentials, ports, query strings and fragments', () => {
    expect(normalizeUrl('https://u:p@script.google.com/macros/s/AKfycbx/exec')).toBe('');
    expect(normalizeUrl('https://script.google.com:8443/macros/s/AKfycbx/exec')).toBe('');
    expect(normalizeUrl(OK + '?teacher=alice')).toBe('');
    expect(normalizeUrl(OK + '#record=3')).toBe('');
  });
});

describe('the QR path is real, not a stub', () => {
  it('registers the QR generator unconditionally at module scope', () => {
    // Top level, not inside a component or effect, so it is present before the
    // settings modal can ask for it.
    expect(anti).toContain("if (typeof window !== 'undefined') window.__alloMakeQrSvg = _makeAlloQrSvg;");
  });

  it('the settings card renders a QR component that waits for that generator', () => {
    expect(settings).toContain('function EvaluationPortalQr(props) {');
    expect(settings).toContain('var makeQr = window.__alloMakeQrSvg;');
    expect(settings).toContain("setState({ status: 'error', svg: '', error: 'The QR generator is not available in this build.' });");
  });

  it('only ever encodes a connected district portal, never the demo', () => {
    expect(settings).toContain("<EvaluationPortalQr url={isEvaluationPortalConnected ? evaluationPortalUrl : ''} />");
    // and the component itself refuses to render without a url
    expect(settings).toContain("if (!url) return null;");
  });

  it('says plainly that the QR code is not an access grant', () => {
    expect(settings).toContain('the QR code does not grant permission by itself');
  });

  it('does not ask a question where it meant to show progress', () => {
    expect(settings).toContain("'Preparing QR code…'");
    expect(settings).not.toContain("'Preparing QR code?'");
  });
});

describe('the card says which of the two things you are about to open', () => {
  it('badges the unconnected state as a demonstration, not a preview', () => {
    expect(settings).toContain("'Demonstration only, not connected'");
    expect(settings).not.toContain("'Local preview available'");
  });

  it('labels the button for what it opens', () => {
    expect(settings).toContain("'Open the demonstration'");
    expect(settings).toContain("'Open district portal'");
    expect(settings).not.toContain("'Open local preview'");
  });

  it('warns against entering real staff information in the demonstration', () => {
    expect(settings).toContain('is not a personnel record. Do not enter real staff information here.');
  });

  it('tells the reader where the /exec URL comes from, in the app', () => {
    expect(settings).toContain('Where does this URL come from?');
    expect(settings).toContain('<strong>This is not a self-serve setup.</strong>');
    expect(settings).toContain('Who has access: users in your domain');
    expect(settings).toContain('apps_script/educator_evaluation/README.md');
  });

  it('keeps the generated module in step with the source', () => {
    const built = readFileSync('view_project_settings_module.js', 'utf8');
    expect(built).toContain('Demonstration only, not connected');
    expect(built).toContain('Where does this URL come from?');
  });

  it('uses no em dashes or en dashes in the copy it renders', () => {
    const userFacing = settings
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
      .filter((line) => !/^\s*(\{\/\*|created at all)/.test(line));
    expect(userFacing.filter((line) => /[—–]/.test(line))).toEqual([]);
  });
});
