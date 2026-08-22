// Characterization and render-contract tests for accessibility_lab_module.js.
// The suite distinguishes semantic debugging from real assistive-technology
// testing and covers modal behavior, authentic renderer handoff, persistent
// review sessions, and artifact-level accessibility scorecards.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let A, ReactLib, ReactDOMClient;
beforeAll(() => {
  ReactLib = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ReactDOMClient = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.React = window.React = ReactLib;
  // The module early-returns unless window.ReactDOM.createPortal exists.
  window.ReactDOM = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom'));
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('accessibility_evidence_module.js');
  loadAlloModule('accessibility_lab_module.js');
  A = window.AlloModules.AccessibilityLabInternals;
  if (!A || !A.composeAnnouncement) throw new Error('AccessibilityLabInternals seam not present');
});

afterEach(() => {
  document.body.innerHTML = '';
  window.localStorage.removeItem('alloflow_accessibility_review_scorecards_v1');
});

const el = (tag, attrs = {}, text) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
};

describe('getScreenReaderRole', () => {
  it('native element roles', () => {
    expect(A.getScreenReaderRole(el('button'))).toBe('button');
    expect(A.getScreenReaderRole(el('a', { href: '#' }))).toBe('link');
    expect(A.getScreenReaderRole(el('a'))).toBeNull();           // no href → not a link
    expect(A.getScreenReaderRole(el('select'))).toBe('combo box');
    expect(A.getScreenReaderRole(el('h2'))).toBe('heading level 2');
    expect(A.getScreenReaderRole(el('nav'))).toBe('navigation');
  });
  it('input type → role', () => {
    expect(A.getScreenReaderRole(el('input', { type: 'checkbox' }))).toBe('checkbox');
    expect(A.getScreenReaderRole(el('input', { type: 'text' }))).toBe('edit');
    expect(A.getScreenReaderRole(el('input', { type: 'range' }))).toBe('slider');
  });
  it('img alt="" is decorative (null); alt text → graphic', () => {
    expect(A.getScreenReaderRole(el('img', { alt: '' }))).toBeNull();
    expect(A.getScreenReaderRole(el('img', { alt: 'Logo' }))).toBe('graphic');
  });
  it('explicit role wins, with friendly aliases', () => {
    expect(A.getScreenReaderRole(el('div', { role: 'tab' }))).toBe('tab');
    expect(A.getScreenReaderRole(el('div', { role: 'progressbar' }))).toBe('progress bar');
  });
  it('section is a region only when labelled', () => {
    expect(A.getScreenReaderRole(el('section'))).toBeNull();
    expect(A.getScreenReaderRole(el('section', { 'aria-label': 'Intro' }))).toBe('region');
  });
});

describe('getScreenReaderName', () => {
  it('aria-label wins', () => {
    expect(A.getScreenReaderName(el('button', { 'aria-label': 'Save' }, 'X'))).toBe('Save');
  });
  it('falls back to text content', () => {
    expect(A.getScreenReaderName(el('button', {}, 'Click me'))).toBe('Click me');
  });
  it('img → alt', () => {
    expect(A.getScreenReaderName(el('img', { alt: 'A cat' }))).toBe('A cat');
  });
  it('input placeholder is flagged as a placeholder', () => {
    expect(A.getScreenReaderName(el('input', { type: 'text', placeholder: 'Email' }))).toBe('Email (placeholder fallback)');
  });
  it('resolves aria-labelledby from the document', () => {
    const lbl = el('span', { id: 'lbl-1' }, 'My Label');
    document.body.appendChild(lbl);
    const target = el('div', { role: 'button', 'aria-labelledby': 'lbl-1' });
    expect(A.getScreenReaderName(target)).toBe('My Label');
    lbl.remove();
  });
});

describe('getScreenReaderState', () => {
  it('checkbox checked / unchecked / indeterminate', () => {
    const c = el('input', { type: 'checkbox' }); c.checked = true;
    expect(A.getScreenReaderState(c)).toContain('checked');
    const u = el('input', { type: 'checkbox' });
    expect(A.getScreenReaderState(u)).toContain('not checked');
    const i = el('input', { type: 'checkbox' }); i.indeterminate = true;
    expect(A.getScreenReaderState(i)).toContain('partially checked');
  });
  it('aria-expanded / aria-pressed', () => {
    expect(A.getScreenReaderState(el('button', { 'aria-expanded': 'true' }))).toContain('expanded');
    expect(A.getScreenReaderState(el('button', { 'aria-expanded': 'false' }))).toContain('collapsed');
    expect(A.getScreenReaderState(el('button', { 'aria-pressed': 'true' }))).toContain('pressed');
  });
  it('disabled / required', () => {
    const d = el('button'); d.disabled = true;
    expect(A.getScreenReaderState(d)).toContain('disabled');
    expect(A.getScreenReaderState(el('input', { type: 'text', 'aria-required': 'true' }))).toContain('required');
  });
  it('aria-hidden → null (skipped entirely)', () => {
    expect(A.getScreenReaderState(el('div', { 'aria-hidden': 'true', role: 'button' }))).toBeNull();
  });
});

describe('composeAnnouncement — name, role, state', () => {
  it('labelled button', () => {
    expect(A.composeAnnouncement(el('button', { 'aria-label': 'Save' }))).toBe('Save, button');
  });
  it('checked checkbox with a label', () => {
    const c = el('input', { type: 'checkbox', 'aria-label': 'Agree' }); c.checked = true;
    expect(A.composeAnnouncement(c)).toBe('Agree, checkbox, checked');
  });
  it('expandable menu button (collapsed)', () => {
    expect(A.composeAnnouncement(el('button', { 'aria-label': 'Menu', 'aria-expanded': 'false' }))).toBe('Menu, button, collapsed');
  });
  it('roleless element → null (nothing announced)', () => {
    expect(A.composeAnnouncement(el('span', {}, 'just text'))).toBeNull();
    expect(A.composeAnnouncement(el('div', { 'aria-hidden': 'true', role: 'button' }))).toBeNull();
  });
});


describe('standards-aligned accessible names', () => {
  it('aria-labelledby takes precedence over aria-label', () => {
    const label = el('span', { id: 'priority-label' }, 'Visible priority label');
    document.body.appendChild(label);
    const target = el('button', { 'aria-labelledby': 'priority-label', 'aria-label': 'Fallback label' });
    expect(A.getScreenReaderName(target)).toBe('Visible priority label');
  });

  it('uses native label associations for form controls', () => {
    const label = el('label', { for: 'student-name' }, 'Student name');
    const input = el('input', { id: 'student-name', type: 'text' });
    document.body.append(label, input);
    expect(A.getElementLabel(input)).toBe('Student name');
    expect(A.getScreenReaderName(input)).toBe('Student name');
  });

  it('does not name a landmark from its entire descendant subtree', () => {
    const main = el('main', {}, 'A very long lesson body');
    expect(A.getScreenReaderName(main)).toBe('');
    expect(A.composeAnnouncement(main)).toBe('main');
  });

  it('includes accessible descriptions and current values', () => {
    const description = el('p', { id: 'save-help' }, 'Persists the current lesson');
    document.body.appendChild(description);
    const button = el('button', { 'aria-label': 'Save', 'aria-describedby': 'save-help' });
    expect(A.composeAnnouncement(button)).toBe('Save, button, description: Persists the current lesson');

    const select = el('select', { 'aria-label': 'Reading level' });
    select.append(el('option', { value: 'grade-4' }, 'Grade 4'));
    expect(A.composeAnnouncement(select)).toContain('value Grade 4');
  });
});

describe('keyboard scan and semantic queue coverage', () => {
  const makeVisible = (node) => {
    node.getBoundingClientRect = () => ({ width: 100, height: 30, top: 0, left: 0, right: 100, bottom: 30 });
    return node;
  };

  it('includes summary controls and distinguishes real labels from placeholders', () => {
    const details = el('details');
    const summary = makeVisible(el('summary', {}, 'Audit details'));
    details.appendChild(summary);
    const label = el('label', { for: 'named-input' }, 'Named input');
    const named = makeVisible(el('input', { id: 'named-input' }));
    const placeholderOnly = makeVisible(el('input', { placeholder: 'Email' }));
    const fakeButton = makeVisible(el('div', { role: 'button' }, 'Custom action'));
    document.body.append(details, label, named, placeholderOnly, fakeButton);

    const result = A.scanKeyboardAccessibility();
    expect(result.orderedFocusable).toContain(summary);
    expect(result.noLabel).not.toContain(named);
    expect(result.noLabel).toContain(placeholderOnly);
    expect(result.suspicious).toContain(fakeButton);
  });

  it('keeps disabled controls in the semantic outline and skips inert content', () => {
    const main = makeVisible(el('main', {}, 'Lesson body'));
    const disabled = makeVisible(el('button', { disabled: '' }, 'Unavailable action'));
    const inert = el('div', { inert: '' });
    const inertButton = makeVisible(el('button', {}, 'Hidden action'));
    inert.appendChild(inertButton);
    document.body.append(main, disabled, inert);

    const queue = A.buildScreenReaderQueue();
    expect(queue.some(item => item.el === main && item.text === 'main')).toBe(true);
    expect(queue.some(item => item.el === disabled && item.text.includes('disabled'))).toBe(true);
    expect(queue.some(item => item.el === inertButton)).toBe(false);
  });
});

describe('artifact accessibility scorecards', () => {
  const completedChecks = {
    keyboard: 'pass', focus: 'pass', reflow: 'pass', text_spacing: 'pass',
    errors: 'pass', motion: 'pass', media: 'not_applicable', assistive_tech: 'pass',
  };

  it('normalizes legacy data and reports pass, findings, untested, and N/A separately', () => {
    const item = { id: 'artifact-1', type: 'quiz', title: 'Knowledge check' };
    const card = A.normalizeReviewScorecard({
      checks: { keyboard: 'pass', focus: 'fail', media: 'not_applicable', reflow: 'unknown' },
      notes: 'Evidence',
    }, item);
    const summary = A.summarizeReviewScorecard(card);
    expect(card.artifactId).toBe('artifact-1');
    expect(card.currentBinding).toMatchObject({ algorithm: 'SHA-256', scope: 'interactive-artifact' });
    expect(card.currentFingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(card.checks.reflow).toBe('untested');
    expect(card.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'manual', ruleId: 'manual:focus', status: 'open', wcag: '2.4.3, 2.4.7, 2.4.11' }),
    ]));
    expect(summary).toMatchObject({ pass: 1, fail: 1, not_applicable: 1, untested: 5, total: 8, complete: false });
  });

  it('fingerprints semantic content deterministically and ignores transient timestamps', () => {
    const first = {
      id: 'artifact-fingerprint', type: 'quiz', title: 'Equivalent quiz', timestamp: '2026-01-01T00:00:00.000Z',
      data: { prompt: 'Choose one', answers: { b: false, a: true } },
    };
    const reordered = {
      id: 'artifact-fingerprint', type: 'quiz', title: 'Equivalent quiz', timestamp: '2026-07-25T12:30:00.000Z',
      data: { answers: { a: true, b: false }, prompt: 'Choose one' },
    };
    const changed = { ...reordered, data: { answers: { a: false, b: true }, prompt: 'Choose one' } };
    expect(A.artifactFingerprint(first)).toBe(A.artifactFingerprint(reordered));
    expect(A.artifactFingerprint(changed)).not.toBe(A.artifactFingerprint(first));
  });

  it('invalidates an approval after content changes and preserves it in review history', () => {
    const firstRevision = { id: 'artifact-revision', type: 'quiz', title: 'Revision test', data: { prompt: 'Original' } };
    const secondRevision = { ...firstRevision, data: { prompt: 'Updated' } };
    const initial = A.normalizeReviewScorecard({ checks: completedChecks, notes: 'Reviewed with NVDA.' }, firstRevision);
    const completed = A.completeReviewScorecard(initial, '2026-07-24T10:00:00.000Z');
    expect(completed.reviewedFingerprint).toBe(A.artifactFingerprint(firstRevision));
    expect(A.summarizeReviewScorecard(completed).complete).toBe(true);

    const stale = A.normalizeReviewScorecard(completed, secondRevision);
    expect(stale).toMatchObject({
      isStale: true, notes: '', reviewedFingerprint: completed.reviewedFingerprint,
      currentFingerprint: A.artifactFingerprint(secondRevision),
    });
    expect(Object.values(stale.checks).every(value => value === 'untested')).toBe(true);
    expect(stale.reviewHistory).toHaveLength(1);
    expect(stale.reviewHistory[0]).toMatchObject({
      reviewedFingerprint: A.artifactFingerprint(firstRevision),
      lastReviewedAt: '2026-07-24T10:00:00.000Z', notes: 'Reviewed with NVDA.',
    });

    const rereviewed = A.completeReviewScorecard({ ...stale, checks: completedChecks, notes: 'Retested updated content.' }, '2026-07-25T10:00:00.000Z');
    expect(rereviewed.isStale).toBe(false);
    expect(rereviewed.reviewedFingerprint).toBe(A.artifactFingerprint(secondRevision));
    expect(rereviewed.reviewHistory).toHaveLength(1);
  });

  it('treats completed legacy records without fingerprints as stale evidence', () => {
    const item = { id: 'artifact-legacy', type: 'outline', title: 'Legacy outline', data: 'Current content' };
    const migrated = A.normalizeReviewScorecard({
      checks: completedChecks, notes: 'Legacy approval', lastReviewedAt: '2025-12-01T08:00:00.000Z',
      automated: { engine: 'axe-core', violationRules: 0 },
    }, item);
    expect(migrated.isStale).toBe(true);
    expect(A.summarizeReviewScorecard(migrated).complete).toBe(false);
    expect(migrated.reviewHistory).toHaveLength(1);
    expect(migrated.reviewHistory[0].notes).toBe('Legacy approval');
    expect(migrated.automated).toBeNull();
    expect(Object.values(migrated.checks).every(value => value === 'untested')).toBe(true);
  });

  it('attaches automated axe evidence to the active artifact scorecard', () => {
    const fingerprint = A.artifactFingerprint({ id: 'artifact-audit', type: 'quiz', title: 'Audited quiz' });
    const saved = A.persistAutomatedAuditForReview({
      itemId: 'artifact-audit', artifactType: 'quiz', artifactTitle: 'Audited quiz',
      artifactFingerprint: fingerprint, rendererRevision: 'test-renderer',
      startedAt: '2026-01-01T00:00:00.000Z',
    }, {
      violations: [{ id: 'button-name', nodes: [{}, {}] }],
      passes: [{ id: 'document-title' }, { id: 'html-has-lang' }],
      incomplete: [{ id: 'color-contrast' }],
    }, '4.12.1');
    expect(saved.automated).toMatchObject({
      engine: 'axe-core', engineVersion: '4.12.1', standard: 'WCAG 2.2 A/AA',
      violationRules: 1, affectedElements: 2, passedRules: 2, needsReview: 1,
      ruleIds: ['button-name'],
      artifactFingerprint: fingerprint,
      rendererRevision: 'test-renderer',
    });
    expect(saved.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'axe', ruleId: 'axe:button-name', status: 'open', count: 2 }),
    ]));
    expect(saved.verification).toMatchObject({
      profile: 'accessibility-lab', verificationState: 'partial', outcomeState: 'fail',
    });
    expect(saved.verification.evidenceProvenance).toMatchObject({
      profile: 'accessibility-lab',
      artifactFingerprint: expect.stringMatching(/^sha256:/),
      evidenceDigest: expect.stringMatching(/^sha256:/),
    });
    expect(saved.evidenceProvenance).toMatchObject({ profile: 'accessibility-lab' });
    expect(A.loadReviewScorecards()['artifact-audit'].automated.affectedElements).toBe(2);
  });
});

describe('authentic workspace host contract', () => {
  it('uses the canonical restore handler without pushing accessibility previews to live sessions', () => {
    const hostSource = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    const ownerSource = readFileSync(resolve(process.cwd(), 'misc_handlers_source.jsx'), 'utf8');
    const handlerStart = ownerSource.indexOf('function handleRestoreView(item, options = {}, deps = {}) {');
    const handlerEnd = ownerSource.indexOf('const detectClimaxArchetype', handlerStart);
    expect(handlerStart).toBeGreaterThan(-1);
    expect(handlerEnd).toBeGreaterThan(handlerStart);
    const handler = ownerSource.slice(handlerStart, handlerEnd);
    // Assert the CONTRACT, not the head-count. The rule is that no live-follow
    // call inside this handler may fire when suppressLiveFollow is set; the
    // number of such calls is an implementation detail. Pinning it to 3 broke
    // the moment a fourth — correctly guarded — path was added, reporting a
    // defect where the code was right. This form is strictly stronger: it fails
    // if ANY call site is left unguarded, however many there are.
    const liveFollowCalls = handler.match(/[^\n]*_alloFollowResourceLive\s*\(/g) || [];
    expect(liveFollowCalls.length).toBeGreaterThanOrEqual(3);
    expect(liveFollowCalls.filter((call) => !/!options\.suppressLiveFollow/.test(call))).toEqual([]);
    expect(hostSource).toContain('moduleApi.handleRestoreView(item, options, _alloMiscHandlersDeps())');
    expect(hostSource).toContain('onOpenAuthenticView: (item, reviewContext = {}) => {');
    expect(hostSource).toContain('handleRestoreView(item, { suppressLiveFollow: true })');
    expect(hostSource).toContain("const ACCESSIBILITY_REVIEW_SESSION_KEY = 'alloflow_accessibility_review_session_v1'");
    expect(hostSource).toContain('artifactFingerprint: reviewFingerprint');
    expect(hostSource).toContain('artifactBinding: reviewContext.artifactBinding || null');
    expect(hostSource).toContain("evidenceProfile: reviewContext.evidenceProfile || 'accessibility-lab'");
    expect(hostSource).toContain("loadModule('AccessibilityEvidence'");
    expect(hostSource).toContain('rendererRevision: reviewContext.rendererRevision || null');
    expect(hostSource).toContain('data-a11y-review-return="true"');
    expect(hostSource).toContain('reviewSession: accessibilityReviewSession');
    expect(hostSource).toContain('onEndReviewSession: () => setAccessibilityReviewSession(null)');
  });
});

describe('rendered Accessibility Lab modal', () => {
  it('associates every preview settings label with its select', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    await ReactLib.act(async () => {
      root.render(ReactLib.createElement(window.AlloModules.AccessibilityLab, {
        isOpen: true,
        onClose: () => {},
        history: [{ id: 'preview-1', type: 'simplified', title: 'Reading passage', data: 'Accessible content' }],
        t: key => key,
      }));
    });
    const lessonButton = [...document.querySelectorAll('button')].find(button => button.textContent.includes('Reading passage'));
    expect(lessonButton).toBeTruthy();
    await ReactLib.act(async () => { lessonButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    for (const id of ['font', 'size', 'theme', 'line-spacing', 'letter-spacing']) {
      const select = document.getElementById('a11y-lab-preview-' + id);
      expect(select).toBeTruthy();
      expect(document.querySelector('label[for="a11y-lab-preview-' + id + '"]')).toBeTruthy();
    }
    await ReactLib.act(async () => { root.unmount(); });
  });
  it('hands unsupported artifacts to the authentic renderer without exposing raw data', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const unsupported = { id: 'preview-2', type: 'interactive-unknown', title: 'Unsupported interaction', data: { privateShape: 'RAW_SENTINEL' } };
    let openedItem = null;
    let openedContext = null;
    await ReactLib.act(async () => {
      root.render(ReactLib.createElement(window.AlloModules.AccessibilityLab, {
        isOpen: true,
        onClose: () => {},
        onOpenAuthenticView: (item, context) => { openedItem = item; openedContext = context; },
        history: [
          { id: 'preview-1', type: 'simplified', title: 'Supported passage', data: 'Readable content' },
          unsupported,
        ],
        t: key => key,
      }));
    });

    expect(document.body.textContent).toContain('Supported passage');
    expect(document.body.textContent).toContain('Unsupported interaction');
    expect(document.body.textContent).not.toContain('RAW_SENTINEL');

    const unsupportedButton = [...document.querySelectorAll('button')].find(button => button.textContent.includes('Unsupported interaction'));
    expect(unsupportedButton).toBeTruthy();
    await ReactLib.act(async () => { unsupportedButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(document.body.textContent).toContain('Authentic renderer required');
    expect(document.getElementById('alloflow-a11y-preview-pane')).toBeNull();

    const openButton = [...document.querySelectorAll('button')].find(button => button.textContent.includes('Open in authentic workspace view'));
    expect(openButton).toBeTruthy();
    await ReactLib.act(async () => { openButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(openedItem).toBe(unsupported);
    expect(openedContext).toMatchObject({ artifactFingerprint: A.artifactFingerprint(unsupported) });
    expect(openedContext.artifactBinding).toMatchObject({ algorithm: 'SHA-256', scope: 'interactive-artifact' });
    expect(openedContext.evidenceProfile).toBe('accessibility-lab');
    expect(openedContext.rendererRevision).toBeTruthy();
    await ReactLib.act(async () => { root.unmount(); });
  });
  it('restores an active review, persists every check, and completes the scorecard', async () => {
    const item = { id: 'scorecard-1', type: 'simplified', title: 'Persistent review', data: 'Review content' };
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let ended = false;
    await ReactLib.act(async () => {
      root.render(ReactLib.createElement(window.AlloModules.AccessibilityLab, {
        isOpen: true,
        onClose: () => {},
        onEndReviewSession: () => { ended = true; },
        reviewSession: {
          itemId: item.id, artifactTitle: item.title, artifactFingerprint: A.artifactFingerprint(item),
        },
        history: [item],
        t: key => key,
      }));
    });

    expect(document.body.textContent).toContain('Artifact accessibility scorecard');
    expect(document.body.textContent).toContain('Persistent review');
    expect(document.querySelector('[data-a11y-evidence-provenance="true"]')).toBeTruthy();
    const exportButton = document.querySelector('[data-a11y-evidence-export="true"]');
    expect(exportButton).toBeTruthy();
    expect(exportButton.disabled).toBe(false);
    expect(document.body.textContent).toContain('Evidence provenance');
    const checkIds = ['keyboard', 'focus', 'reflow', 'text_spacing', 'errors', 'motion', 'media', 'assistive_tech'];
    for (const id of checkIds) {
      const select = document.getElementById('a11y-review-check-' + id);
      expect(select).toBeTruthy();
      await ReactLib.act(async () => {
        select.value = id === 'media' ? 'not_applicable' : 'pass';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    const completeButton = [...document.querySelectorAll('button')].find(button => button.textContent.includes('Complete and save review'));
    await ReactLib.act(async () => { completeButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const stored = JSON.parse(window.localStorage.getItem('alloflow_accessibility_review_scorecards_v1'));
    expect(stored[item.id].checks.keyboard).toBe('pass');
    expect(stored[item.id].checks.media).toBe('not_applicable');
    expect(stored[item.id].lastReviewedAt).toBeTruthy();
    expect(stored[item.id].reviewedFingerprint).toBe(A.artifactFingerprint(item));
    expect(stored[item.id].reviewedBinding).toMatchObject({ algorithm: 'SHA-256' });
    expect(stored[item.id].verification).toMatchObject({ profile: 'accessibility-lab', verificationState: 'partial' });
    expect(document.body.textContent).toContain('7 passed');
    expect(document.body.textContent).toContain('1 N/A');

    const endButton = [...document.querySelectorAll('button')].find(button => button.textContent.includes('End review session'));
    await ReactLib.act(async () => { endButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(ended).toBe(true);
    await ReactLib.act(async () => { root.unmount(); });
  });
});
