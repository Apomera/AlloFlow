// Diagnosis, Evaluation & School Eligibility - non-negotiable contracts.
//
// 1. It never diagnoses a student or decides eligibility, services, or placement.
// 2. It reproduces no DSM criteria.
// 3. Federal category text comes from the date-stamped law corpus.
// 4. Its discoverable home is Educator Tools > Leadership Hub, not STEM Lab.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { loadTool, renderTool, resetStemLab, React, ReactDOMServer, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const root = process.cwd();
const requireForTest = createRequire(import.meta.url);
const { act } = requireForTest(path.join(root, 'desktop/web-app/node_modules/react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const FILE = 'stem_lab/stem_tool_eligibility.js';
const src = read(FILE);
const idea = JSON.parse(read('law_corpus/idea-part-b.json'));

// The shipped category extractor, run against the real corpus.
const cats = (() => {
  const a = src.indexOf('function categoriesFromCorpus');
  const b = src.indexOf('var SUPPORT_PATHS');
  expect(a, 'categoriesFromCorpus present').toBeGreaterThan(-1);
  expect(b, 'support paths follow category extractor').toBeGreaterThan(a);
  const box = {};
  new Function('box', '_idea', 'section', src.slice(a, b) + 'box.cats = categoriesFromCorpus;')(
    box, idea, (n) => idea.sections.find((s) => s.number === n));
  return box.cats();
})();

describe('Diagnosis, Evaluation & School Eligibility - federal definitions', () => {
  it('extracts all 13 IDEA categories from 300.8 instead of hardcoding them', () => {
    expect(cats.length).toBe(13);
    const names = cats.map((c) => c.name.toLowerCase());
    for (const must of ['autism', 'emotional disturbance', 'specific learning disability',
      'deaf-blindness', 'intellectual disability', 'other health impairment',
      'traumatic brain injury', 'speech or language impairment']) {
      expect(names.includes(must), 'missing category: ' + must).toBe(true);
    }
    expect(cats.map((c) => Number(c.n))).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13]);
  });

  it('quotes each category verbatim from the corpus', () => {
    const s300_8 = idea.sections.find((s) => s.number === '300.8');
    for (const c of cats) {
      expect(s300_8.paragraphs.includes(c.text), c.name + ' text must be a real corpus paragraph').toBe(true);
    }
  });

  it('renders nothing rather than inventing categories when the corpus is missing', () => {
    expect(src).toMatch(/rather than restating it from memory/i);
    expect(src).toContain('cats_err');
  });
});

describe('Diagnosis, Evaluation & School Eligibility - safety and accuracy', () => {
  it('uses open questions in cases and never an eligibility score or verdict', () => {
    const seg = src.match(/var QUESTIONS = \[([\s\S]*?)\];/)[1];
    const qids = [...seg.matchAll(/id: '([a-z_]+)'/g)].map((m) => m[1]);
    const lists = [...src.matchAll(/questions:\s*\[([^\]]+)\]/g)];
    expect(qids.length).toBe(5);
    expect(lists.length).toBeGreaterThanOrEqual(6);
    for (const list of lists) {
      const ids = [...list[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
      for (const id of ids) expect(qids.includes(id), 'unknown question id: ' + id).toBe(true);
    }
    expect(src).not.toMatch(/\banswer:\s*'q_/);
    expect(src).not.toMatch(/correct:\s*isAns/);
    expect(src).toMatch(/There is no eligibility score/i);
    expect(src).toMatch(/not exhaustive/i);
  });

  it('contains no DSM criteria and explains the copyright boundary', () => {
    for (const tell of [
      /\bA\.\s+Persistent pattern\b/i,
      /\bfive \(or more\) of the following symptoms\b/i,
      /\bmust be present (?:for|in) at least\b/i,
      /\bDiagnostic Criteria\b/
    ]) expect(src, 'criteria-shaped prose in source').not.toMatch(tell);
    expect(src).toMatch(/copyrighted by the American Psychiatric Association/i);
  });

  it('states the IDEA definition precisely and includes easily missed limits', () => {
    expect(src).toMatch(/by reason thereof/i);
    expect(src).toMatch(/Both, not either/i);
    expect(src).toMatch(/related service and not special education/i);
    expect(src).toMatch(/developmental delay for children ages 3 through 9/i);
    expect(src).toMatch(/limited English proficiency cannot be the determinant factor/i);
  });

  it('describes Section 504 as more than accommodations', () => {
    expect(src).toMatch(/Section 504 is broader than an accommodations list/i);
    expect(src).toMatch(/regular or special education and related aids and services/i);
    expect(src).toMatch(/does not require a medical diagnosis as a precondition/i);
    expect(src).not.toMatch(/504 plan: accommodations that change HOW/i);
    const parenting = read('stem_lab/stem_tool_parentinglab.js');
    expect(parenting).toMatch(/regular or special education and related aids or services/i);
    expect(parenting).not.toMatch(/A 504 PLAN provides accommodations/i);
  });

  it('keeps private evaluations and public-expense IEEs in their true roles', () => {
    expect(src).toMatch(/meeting agency criteria must be considered/i);
    expect(src).toMatch(/not required to adopt/i);
    expect(src).toMatch(/requests an IEE at public expense/i);
    expect(src).toMatch(/without unnecessary delay either fund it or file due process/i);
  });

  it('requires comprehensive, multi-source evidence beyond grades', () => {
    expect(src).toMatch(/functional, developmental, and academic information/i);
    expect(src).toMatch(/cover all suspected areas/i);
    expect(src).toMatch(/not rely on one test or score/i);
    expect(src).toMatch(/student voice, and family priorities/i);
    expect(src).toMatch(/language, culture, disability access, opportunity to learn/i);
  });

  it('distinguishes evaluation records, Prior Written Notice, safeguards, and timelines', () => {
    expect(src).toMatch(/evaluation report describes the evaluation results/i);
    expect(src).toMatch(/eligibility documentation records the group/i);
    expect(src).toMatch(/Prior Written Notice is separate/i);
    expect(src).toMatch(/procedural-safeguards notice is not Prior Written Notice/i);
    expect(src).toMatch(/Section 504 has its own procedural safeguards/i);
    expect(src).toMatch(/60 days after parental consent or the state-established timeframe/i);
    expect(src).toContain('https://sites.ed.gov/idea/regs/b/e/300.503');
    expect(src).toContain('https://sites.ed.gov/idea/regs/b/e/300.504');
    expect(src).toContain('/section-104.36');
  });

  it('keeps the prep builder generic, transient, and free of editable student fields', () => {
    expect(src).toMatch(/selections are intentionally transient/i);
    expect(src).toMatch(/not written to toolData, storage, or a network/i);
    expect(src).toMatch(/does not request or save student names, diagnoses, notes, reports, or documents/i);
    expect(src).toMatch(/type: 'checkbox'/);
    expect(src).toMatch(/prepFieldset\('Questions for the team'/);
    expect(src).toMatch(/prepFieldset\('Evidence to review'/);
    expect(src).toMatch(/prepFieldset\('Documents and follow-up'/);
    expect(src).not.toMatch(/localStorage.*diagnosis.*eligibility/i);
    expect(src).not.toMatch(/clipboard\.read/i);
    expect(src).not.toMatch(/type:s*'file'/);
    expect(src).not.toMatch(/contentEditable|contenteditable/);
  });
  it('uses no live diagnostic-code lookup or student-data input', () => {
    expect(src).not.toMatch(/clinicaltables\.nlm\.nih\.gov/i);
    expect(src).not.toMatch(/Decode a diagnostic code/i);
    expect(src).not.toMatch(/icdSearch|ICD_API/);
    expect(src).toMatch(/No DSM text, no criteria, no diagnostic guidance, and no student data/i);
    expect(src).toMatch(/Do not enter student names or report text/i);
  });

  it('carries a clear scope disclaimer', () => {
    expect(src).toMatch(/not legal or clinical advice/i);
    expect(src).toMatch(/never diagnoses a student or decides eligibility, services, goals, or placement/i);
    expect(src).toMatch(/state and district procedures vary/i);
  });
});

describe('Diagnosis, Evaluation & School Eligibility - render and placement', () => {
  beforeEach(() => {
    resetStemLab();
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.DiagnosisEligibility;
  });

  it('renders the broader guide without a network instead of throwing', () => {
    loadTool(FILE, 'diagnosisEligibility');
    const html = renderTool('diagnosisEligibility', {});
    expect(html.length).toBeGreaterThan(2500);
    expect(html).toMatch(/Four pathways that can overlap/);
    expect(html).toMatch(/From concern to review/);
    expect(html).toMatch(/Evidence that helps a team/);
    expect(html).toMatch(/What questions and evidence are still open/);
    expect(html).toMatch(/Federal source trail/);
    expect(html).toMatch(/State and local items to confirm/);
    expect(src).toContain('focusSection');
    expect(src).toContain('scrollIntoView');
    expect(html).toMatch(/Loading the official text|could not be loaded/);
  });

  it('formats only allow-listed selected prompts with privacy and source provenance', () => {
    const cfg = loadTool(FILE, 'diagnosisEligibility');
    const guide = cfg.buildMeetingPrepText(
      ['decision_scope', 'not_a_real_prompt'],
      ['strengths'],
      ['reports']
    );
    expect(guide).toContain('What exact IDEA or Section 504 question is the team answering today?');
    expect(guide).toContain('Strengths, interests, student voice, and family priorities');
    expect(guide).toContain('Ask for the evaluation report and separate eligibility documentation');
    expect(guide).not.toContain('Which areas are suspected');
    expect(guide).not.toContain('not_a_real_prompt');
    expect(guide).toContain('Federal source links checked August 9, 2026');
    expect(guide).toContain('https://sites.ed.gov/idea/regs/b/e/300.503');
    expect(guide).toContain('requests and saves no student names');
    expect(guide).toContain('never diagnoses a student or decides eligibility');
    expect(window.AlloModules.DiagnosisEligibility.buildMeetingPrepText(
      ['decision_scope'], ['strengths'], ['reports']
    )).toContain('Meeting Preparation Guide');
  });
  it('exports a standalone Leadership dialog that reuses the tested content', () => {
    loadTool(FILE, 'diagnosisEligibility');
    const Panel = window.AlloModules.DiagnosisEligibility.DiagnosisEligibilityPanel;
    expect(typeof Panel).toBe('function');
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(Panel, {
      onClose: () => {}, onBack: () => {}, t: (key, fallback) => fallback || key,
      labToolData: {}, setLabToolData: () => {}, theme: 'light'
    }));
    expect(html).toMatch(/role="dialog"/);
    expect(html).toMatch(/Back to Leadership Hub/);
    expect(html).toMatch(/Diagnosis, Evaluation &amp; School Eligibility/);
  });

  it('mounts an accessible transient prep builder and copies/prints the same selected guide', async () => {
    loadTool(FILE, 'diagnosisEligibility');
    const Panel = window.AlloModules.DiagnosisEligibility.DiagnosisEligibilityPanel;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const viewRoot = ReactDOMClient.createRoot(container);
    const setLabToolData = vi.fn();
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard');
    const originalPrint = window.print;
    const originalGlobalFetch = globalThis.fetch;
    const originalWindowFetch = window.fetch;
    const originalExecCommand = document.execCommand;
    const fetchStub = vi.fn().mockResolvedValue({ ok: true, json: async () => idea });
    let printedText = '';

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWrite }
    });
    globalThis.fetch = fetchStub;
    window.fetch = fetchStub;
    window.print = vi.fn(() => {
      printedText = document.getElementById('allo-eligibility-prep-print')?.textContent || '';
      window.dispatchEvent(new window.Event('afterprint'));
    });

    try {
      await act(async () => {
        viewRoot.render(React.createElement(Panel, {
          onClose: () => {},
          onBack: () => {},
          t: (key, fallback) => fallback || key,
          addToast,
          announceToSR,
          labToolData: {},
          setLabToolData,
          theme: 'light'
        }));
        await Promise.resolve();
        await Promise.resolve();
      });

      const fieldsets = Array.from(container.querySelectorAll('fieldset'));
      expect(fieldsets).toHaveLength(3);
      expect(fieldsets.map((node) => node.querySelector('legend')?.textContent)).toEqual([
        'Questions for the team',
        'Evidence to review',
        'Documents and follow-up'
      ]);
      const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
      expect(checkboxes.length).toBeGreaterThan(20);
      expect(new Set(checkboxes.map((input) => input.id)).size).toBe(checkboxes.length);
      for (const input of checkboxes) {
        expect(container.querySelector('label[for="' + input.id + '"]')).not.toBeNull();
        expect(input.checked).toBe(true);
      }
      expect(container.querySelector('textarea,input[type="text"],input[type="file"],[contenteditable="true"]')).toBeNull();

      const button = (label) => Array.from(container.querySelectorAll('button'))
        .find((item) => item.textContent.trim() === label);
      const clear = button('Clear all');
      const copy = button('Copy selected guide');
      const print = button('Print / PDF');
      const quickMode = button('Quick Brief');
      const detailedMode = button('Detailed Guide');
      expect(quickMode).toBeTruthy();
      expect(detailedMode).toBeTruthy();
      act(() => quickMode.click());
      expect(quickMode.getAttribute('aria-pressed')).toBe('true');
      expect(container.querySelector('#elig-cases-title')).toBeNull();
      expect(container.textContent).toContain('Quick Brief keeps the decision path');
      act(() => detailedMode.click());
      expect(detailedMode.getAttribute('aria-pressed')).toBe('true');
      expect(container.querySelector('#elig-cases-title')).toBeTruthy();
      expect(clear).toBeTruthy();
      expect(copy).toBeTruthy();
      expect(print).toBeTruthy();

      act(() => clear.click());
      expect(checkboxes.every((input) => !input.checked)).toBe(true);
      expect(container.textContent).toContain('0 prompts included');
      expect(copy.disabled).toBe(true);
      expect(print.disabled).toBe(true);

      act(() => checkboxes[0].click());
      expect(checkboxes[0].checked).toBe(true);
      expect(container.textContent).toContain('1 prompt included');
      expect(copy.disabled).toBe(false);
      expect(print.disabled).toBe(false);
      expect(setLabToolData).not.toHaveBeenCalled();

      await act(async () => {
        copy.click();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(clipboardWrite).toHaveBeenCalledTimes(1);
      const copiedText = clipboardWrite.mock.calls[0][0];
      expect(copiedText).toContain('What exact IDEA or Section 504 question is the team answering today?');
      expect(copiedText).not.toContain('Which areas are suspected');
      expect(container.textContent).toContain('Meeting-preparation guide copied.');
      expect(announceToSR).toHaveBeenCalledWith('Meeting-preparation guide copied.');

      clipboardWrite.mockRejectedValueOnce(new Error('clipboard denied'));
      document.execCommand = vi.fn(() => false);
      await act(async () => {
        copy.click();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(container.textContent).toContain('Copy failed. Use Print / PDF or try again.');
      expect(addToast).toHaveBeenLastCalledWith('Copy failed. Use Print / PDF or try again.', 'error');
      expect(document.querySelector('body > textarea[aria-hidden="true"]')).toBeNull();

      act(() => print.click());
      expect(window.print).toHaveBeenCalledTimes(1);
      expect(printedText).toBe(copiedText);
      expect(document.getElementById('allo-eligibility-prep-print')).toBeNull();
    } finally {
      act(() => viewRoot.unmount());
      container.remove();
      if (originalClipboard) Object.defineProperty(window.navigator, 'clipboard', originalClipboard);
      else delete window.navigator.clipboard;
      window.print = originalPrint;
      globalThis.fetch = originalGlobalFetch;
      if (originalExecCommand === undefined) delete document.execCommand;
      else document.execCommand = originalExecCommand;
      if (originalWindowFetch === undefined) delete window.fetch;
      else window.fetch = originalWindowFetch;
    }
  });
  it('traps keyboard focus and closes on Escape without leaking the global listener', async () => {
    loadTool(FILE, 'diagnosisEligibility');
    const Panel = window.AlloModules.DiagnosisEligibility.DiagnosisEligibilityPanel;
    const opener = document.createElement('button');
    opener.textContent = 'Open eligibility';
    document.body.appendChild(opener);
    opener.focus();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const viewRoot = ReactDOMClient.createRoot(container);
    const onClose = vi.fn();

    try {
      await act(async () => {
        viewRoot.render(React.createElement(Panel, {
          onClose,
          onBack: () => {},
          t: (key, fallback) => fallback || key,
          labToolData: {},
          setLabToolData: () => {},
          theme: 'light'
        }));
        await Promise.resolve();
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
      const focusables = () => Array.from(dialog.querySelectorAll(
        'button:not([disabled]), summary, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      const items = focusables();
      expect(items.length).toBeGreaterThan(3);
      items[items.length - 1].focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      expect(document.activeElement).toBe(items[0]);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => { viewRoot.unmount(); await Promise.resolve(); });
      expect(document.activeElement).toBe(opener);
      container.remove();
      opener.remove();
    }
  });  it('keeps legacy progress hooks defensive for old saved links', () => {
    const cfg = loadTool(FILE, 'diagnosisEligibility');
    for (const q of cfg.questHooks) {
      expect(() => q.check({}), q.id).not.toThrow();
      expect(() => q.check(undefined), q.id).not.toThrow();
      expect(() => q.progress(undefined), q.id).not.toThrow();
    }
  });

  it('is discoverable in Leadership Hub and absent from the STEM catalog', () => {
    expect(src).toContain("registerTool('diagnosisEligibility'"); // compatibility only
    expect(src).toContain('window.AlloModules.DiagnosisEligibility');

    const stem = read('stem_lab/stem_lab_module.js');
    expect(stem).not.toContain("id: 'diagnosisEligibility'");
    expect(stem).not.toMatch(/diagnosisEligibility: '[^']*two prong/);
    expect(stem).toContain('diagnosisEligibility: true'); // hidden legacy renderer

    const admin = read('admin_hub_source.jsx');
    expect(admin).toContain("id: 'diagnosisEligibility'");
    expect(admin).toContain('Diagnosis, Evaluation & School Eligibility');

    for (const host of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const hostSrc = read(host);
      expect(hostSrc, host).toContain('__alloLazyDiagnosisEligibility');
      expect(hostSrc, host).toContain('DiagnosisEligibility.DiagnosisEligibilityPanel');
      expect(hostSrc, host).toContain("toolId === 'diagnosisEligibility'");
    }

    const checker = read('dev-tools/check_stem_tile_catalog.cjs');
    expect(checker).toMatch(/Rehomed to Educator Tools > Leadership Hub[\s\S]*'diagnosisEligibility'/);
    const build = read('build.js');
    expect(build).toContain("name: 'DiagnosisEligibility'");
    expect(build).toContain("filename: 'stem_lab/stem_tool_eligibility.js'");
    const index = JSON.parse(read('tool_index.json'));
    expect(index.tools.some((tool) => tool.id === 'diagnosisEligibility')).toBe(false);
    expect(read('desktop/web-app/public/stem_lab/stem_tool_eligibility.js')).toBe(src);
  });
});