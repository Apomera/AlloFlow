import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.React = React;
window.AlloIcons = new Proxy({}, {
  get: () => (props) => React.createElement('span', { 'aria-hidden': 'true', ...(props && props.className ? { className: props.className } : {}) }, ''),
});

const roots = [];

function readRepoFile(relPath) {
  return readFileSync(resolve(process.cwd(), relPath), 'utf8');
}

function assertMirrorsMatch(relPath) {
  const src = readRepoFile(relPath);
  for (const prefix of ['desktop/web-app/public/', 'desktop/web-app/build/', 'desktop/app-build/']) {
    expect(readRepoFile(prefix + relPath), prefix + relPath).toBe(src);
  }
  return src;
}

function loadViewModule(relPath, exportName) {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules[exportName];
  new Function('window', readRepoFile(relPath))(window);
  expect(typeof window.AlloModules[exportName]).toBe('function');
  return window.AlloModules[exportName];
}

async function runAxe(container) {
  const result = await axe.run(container, {
    iframes: false,
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

function mountHost(Component, props = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push({ root, host });
  return {
    host,
    async render(nextProps = props) {
      await React.act(async () => {
        root.render(React.createElement(Component, nextProps));
      });
    },
    async unmount() {
      const idx = roots.findIndex((entry) => entry.root === root);
      if (idx !== -1) roots.splice(idx, 1);
      await React.act(async () => { root.unmount(); });
      host.remove();
    },
  };
}

afterEach(async () => {
  while (roots.length) {
    const { root, host } = roots.pop();
    await React.act(async () => { root.unmount(); });
    host.remove();
  }
  delete window.__alloMuted;
  delete window.AlloSpeechPlayer;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Other resources polish wave 52 (Core UDL Writing & Thinking Views: Brainstorm, Concept Sort, Outline, Sentence Frames)', () => {
  it('polishes view_brainstorm_module.js across mirrors (scoped CSS, global-mute speech guard, talk-stem SR announcement, 44px rubric editor fields, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('view_brainstorm_module.js');
    expect(src).toContain('allo-brainstorm-a11y-css');
    expect(src).toContain('@media (forced-colors:active)');
    expect(src).toContain('.theme-contrast [data-help-key="brainstorm_panel"] :focus-visible');

    document.getElementById('allo-brainstorm-a11y-css')?.remove();
    const BrainstormView = loadViewModule('view_brainstorm_module.js', 'BrainstormView');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const speakSpy = vi.fn(() => Promise.resolve());
    window.AlloSpeechPlayer = { speak: speakSpy, stop: vi.fn() };
    const announcements = [];

    const discussionResource = {
      id: 'bs-1',
      type: 'brainstorm',
      data: [{
        kind: 'discussion',
        title: 'Water Cycle Debate',
        protocol: 'think-pair-share',
        grouping: 'Pairs',
        openingQuestion: 'Why does condensation matter?',
        questionSets: [{ depth: 'inferential', questions: ['How would drought change local clouds?'] }],
        talkStems: { agree: ['I agree because...'], build: ['Building on that idea...'] },
        rubric: {
          title: 'Discussion Rubric',
          criteria: [{ criterion: 'Evidence', weight: 100, levels: { '4': 'Strong', '3': 'Clear', '2': 'Partial', '1': 'Emerging' } }],
        },
      }],
    };

    function StudentHost() {
      const [responses, setResponses] = React.useState({ 'bs-1': {} });
      return React.createElement(BrainstormView, {
        t: () => '',
        generatedContent: discussionResource,
        isTeacherMode: false,
        studentResponses: responses,
        handleStudentInput: (resId, k, v) => setResponses((prev) => ({ ...prev, [resId]: { ...(prev[resId] || {}), [k]: v } })),
        announceToSR: (m) => announcements.push(m),
      });
    }

    const studentMount = mountHost(StudentHost);
    await studentMount.render();
    expect(document.getElementById('allo-brainstorm-a11y-css')).toBeTruthy();
    expect(Array.from(studentMount.host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button')).toEqual([]);

    // Global mute must block Listen speech
    window.__alloMuted = true;
    await React.act(async () => {
      studentMount.host.querySelector('button[data-brainstorm-listen="discussion"]').click();
    });
    expect(speakSpy).not.toHaveBeenCalled();

    // Talk stem insertion updates answer and announces politely
    const stemBtn = studentMount.host.querySelector('button[data-talk-stem="I agree because..."]');
    expect(stemBtn).toBeTruthy();
    await React.act(async () => { stemBtn.click(); });
    expect(announcements.some((m) => /Inserted talk stem: I agree because/i.test(m))).toBe(true);
    expect(studentMount.host.querySelector('[role="status"][aria-live="polite"]').textContent).toMatch(/Inserted talk stem/i);
    await runAxe(studentMount.host);
    await studentMount.unmount();

    // Teacher rubric editor: 44px fields & 0 axe violations
    const teacherMount = mountHost(() => React.createElement(BrainstormView, {
      t: () => '',
      generatedContent: discussionResource,
      isTeacherMode: true,
      isEditingBrainstorm: true,
      handleBrainstormChange: vi.fn(),
      handleToggleIsEditingBrainstorm: vi.fn(),
      handleGenerateGuide: vi.fn(),
      handleGenerateWorksheet: vi.fn(),
      handleGenerateBrainstormRubric: vi.fn(),
    }));
    await teacherMount.render();
    const rubricTitle = teacherMount.host.querySelector('input[data-brainstorm-rubric-title="0"]');
    expect(rubricTitle).toBeTruthy();
    expect(rubricTitle.className).toContain('min-h-11');
    await runAxe(teacherMount.host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes view_concept_sort_module.js across mirrors (expanded scoped CSS & forced-colors, aria-controls reasoning drawer, slider aria-valuetext, 44px filter clear & IME-safe Escape, AA clear-image ink, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('view_concept_sort_module.js');
    expect(src).toContain('touch-action:manipulation;box-sizing:border-box');
    expect(src).toContain('.theme-contrast [data-help-key="concept_sort_panel"] :focus-visible');
    expect(src).toContain('aria-valuetext');

    const ConceptSortView = loadViewModule('view_concept_sort_module.js', 'ConceptSortView');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const sampleContent = {
      id: 'cs-1',
      type: 'concept-sort',
      data: {
        categories: [{ id: 'c1', label: 'Mammals', color: 'bg-indigo-500' }, { id: 'c2', label: 'Birds', color: 'bg-emerald-500' }],
        items: [
          { id: 'i1', content: 'Otter', categoryId: 'c1', image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E' },
          { id: 'i2', content: 'Whale', categoryId: 'c1' },
          { id: 'i3', content: 'Fox', categoryId: 'c1' },
          { id: 'i4', content: 'Eagle', categoryId: 'c2' },
          { id: 'i5', content: 'Owl', categoryId: 'c2' },
          { id: 'i6', content: 'Robin', categoryId: 'c2' },
        ],
      },
    };

    // 1) Student screen: reasoning toggle uses aria-controls -> panel id
    const studentMount = mountHost(() => React.createElement(ConceptSortView, {
      t: () => '',
      isTeacherMode: false,
      isIndependentMode: false,
      generatedContent: sampleContent,
      handleSetIsConceptSortGameToTrue: vi.fn(),
    }));
    await studentMount.render();
    const toggleBtn = studentMount.host.querySelector('button[data-concept-sort-reasoning-toggle]');
    expect(toggleBtn.getAttribute('aria-controls')).toBe('concept-sort-reasoning-panel');
    await React.act(async () => { toggleBtn.click(); });
    expect(studentMount.host.querySelector('#concept-sort-reasoning-panel')).toBeTruthy();
    await runAxe(studentMount.host);
    await studentMount.unmount();

    // 2) Teacher pre-activity review: slider aria-valuetext, 44px clear filter, IME-safe Escape, AA amber-800 clear-image button
    const teacherMount = mountHost(() => React.createElement(ConceptSortView, {
      t: () => '',
      isTeacherMode: true,
      isIndependentMode: false,
      generatedContent: sampleContent,
      conceptSortImageScale: 1.75,
      csRefineItemImage: vi.fn(),
      setConceptSortImageScale: vi.fn(),
      handleSetIsConceptSortGameToTrue: vi.fn(),
    }));
    await teacherMount.render();
    expect(Array.from(teacherMount.host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button')).toEqual([]);
    const slider = teacherMount.host.querySelector('#concept-sort-image-scale-rv');
    expect(slider.getAttribute('aria-valuetext')).toBe('1.75 times');

    const filterInput = teacherMount.host.querySelector('input[data-concept-sort-filter]');
    expect(filterInput).toBeTruthy();
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(filterInput, 'Otter');
      filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const clearBtn = teacherMount.host.querySelector('button[data-concept-sort-filter-clear]');
    expect(clearBtn).toBeTruthy();
    expect(clearBtn.className).toContain('min-h-11');
    expect(clearBtn.className).toContain('min-w-11');

    // Composing Escape must NOT clear filter
    const imeEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(imeEsc, 'isComposing', { value: true });
    await React.act(async () => { filterInput.dispatchEvent(imeEsc); });
    expect(filterInput.value).toBe('Otter');

    // Plain Escape clears filter
    await React.act(async () => {
      filterInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(filterInput.value).toBe('');

    const clearImgBtn = teacherMount.host.querySelector('button[aria-label="Clear image: Otter"]');
    expect(clearImgBtn).toBeTruthy();
    expect(clearImgBtn.className).toContain('text-amber-800');
    await runAxe(teacherMount.host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes view_outline_module.js across mirrors (scoped CSS, named toolbar group, AA orange-800 buttons, IME-safe Escape clear & SR concept announcements, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('view_outline_module.js');
    expect(src).toContain('allo-outline-a11y-css');
    expect(src).toContain('@media (forced-colors:active)');
    expect(src).toContain('.theme-contrast [data-outline-view="true"] :focus-visible');

    document.getElementById('allo-outline-a11y-css')?.remove();
    const OutlineView = loadViewModule('view_outline_module.js', 'OutlineView');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const announcements = [];

    function OutlineHost() {
      const [mapAddInput, setMapAddInput] = React.useState('Photosynthesis');
      const [branches, setBranches] = React.useState([{ title: 'Roots', items: [] }]);
      return React.createElement(OutlineView, {
        t: (k) => k,
        isTeacherMode: true,
        isInteractiveMap: true,
        isConceptMapReady: false,
        isChallengeActive: false,
        gradeLevel: '6',
        mapAddInput,
        setMapAddInput,
        handleAddToMapList: (text) => {
          setBranches((prev) => prev.concat([{ title: text.trim(), items: [] }]));
          setMapAddInput('');
        },
        handleRemoveFromMapList: (idx) => setBranches((prev) => prev.filter((_, i) => i !== idx)),
        handleInitializeMap: vi.fn(),
        announceToSR: (m) => announcements.push(m),
        generatedContent: { id: 'ol-1', data: { structureType: 'Key Concept Map', main: 'Plants', branches } },
      });
    }

    const mount = mountHost(OutlineHost);
    await mount.render();
    expect(document.getElementById('allo-outline-a11y-css')).toBeTruthy();
    expect(mount.host.querySelector('[role="group"][aria-label="Graphic organizer controls"]')).toBeTruthy();
    expect(Array.from(mount.host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button')).toEqual([]);

    const conceptInput = mount.host.querySelector('input[data-outline-add-concept-input]');
    expect(conceptInput.style.touchAction).toBe('manipulation');

    // Composing Escape must NOT clear concept input
    const imeEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(imeEsc, 'isComposing', { value: true });
    await React.act(async () => { conceptInput.dispatchEvent(imeEsc); });
    expect(conceptInput.value).toBe('Photosynthesis');

    // Plain Escape clears concept input
    await React.act(async () => {
      conceptInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(conceptInput.value).toBe('');

    // Removing a concept announces politely
    const removeBtn = mount.host.querySelector('button[data-outline-remove-concept]');
    await React.act(async () => { removeBtn.click(); });
    expect(announcements.some((m) => /Removed concept Roots/i.test(m))).toBe(true);
    await runAxe(mount.host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes view_sentence_frames_module.js across mirrors (scoped CSS, polite SR announcements for word bank, tier filter & copy actions, focus-visible edit textareas, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('view_sentence_frames_module.js');
    expect(src).toContain('allo-sentence-frames-a11y-css');
    expect(src).toContain('@media (forced-colors:active)');
    expect(src).toContain('.theme-contrast [data-sentence-frames-view="true"] :focus-visible');

    document.getElementById('allo-sentence-frames-a11y-css')?.remove();
    const SentenceFramesView = loadViewModule('view_sentence_frames_module.js', 'SentenceFramesView');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const announcements = [];
    const copySpy = vi.fn();

    const scaffoldResource = {
      id: 'sf-1',
      data: {
        mode: 'list',
        wordBank: ['ecosystem', 'producers'],
        items: [
          { text: 'In an ecosystem, ___ depend on sunlight.', tier: 'emerging' },
          { text: 'Energy flows through the food web because ___.', tier: 'expanding' },
        ],
        rubric: 'Score 4: Explains energy transfer clearly.',
      },
    };

    function StudentScaffoldHost() {
      const [responses, setResponses] = React.useState({ 'sf-1': { 0: 'plants' } });
      return React.createElement(SentenceFramesView, {
        t: () => '',
        generatedContent: scaffoldResource,
        isTeacherMode: false,
        studentResponses: responses,
        handleStudentInput: (resId, k, v) => setResponses((prev) => ({ ...prev, [resId]: { ...(prev[resId] || {}), [k]: v } })),
        handleResetScaffolds: vi.fn(),
        copyToClipboard: copySpy,
        announceToSR: (m) => announcements.push(m),
      });
    }

    const mount = mountHost(StudentScaffoldHost);
    await mount.render();
    expect(document.getElementById('allo-sentence-frames-a11y-css')).toBeTruthy();
    expect(Array.from(mount.host.querySelectorAll('button')).filter((b) => b.getAttribute('type') !== 'button')).toEqual([]);

    // Word bank click inserts term and announces politely
    const wbBtn = mount.host.querySelector('button[aria-label*="Insert word: ecosystem"]');
    expect(wbBtn).toBeTruthy();
    await React.act(async () => { wbBtn.click(); });
    expect(announcements.some((m) => /Inserted word: ecosystem/i.test(m))).toBe(true);

    // Tier filter click announces selected level
    const tierBtn = mount.host.querySelector('button[data-tier-filter="emerging"]');
    await React.act(async () => { tierBtn.click(); });
    expect(announcements.some((m) => /Showing Emerging writing supports/i.test(m))).toBe(true);

    // Copy draft announces copy
    const copyBtn = mount.host.querySelector('button[data-scaffolds-copy-draft]');
    await React.act(async () => { copyBtn.click(); });
    expect(copySpy).toHaveBeenCalled();
    expect(announcements.some((m) => /Draft copied to clipboard/i.test(m))).toBe(true);
    await runAxe(mount.host);
    await mount.unmount();

    // Teacher edit mode: focus-visible textareas & 0 axe violations
    const teacherMount = mountHost(() => React.createElement(SentenceFramesView, {
      t: () => '',
      generatedContent: scaffoldResource,
      isTeacherMode: true,
      isEditingScaffolds: true,
      handleToggleIsEditingScaffolds: vi.fn(),
      handleScaffoldChange: vi.fn(),
      handleScaffoldTextChange: vi.fn(),
      copyToClipboard: copySpy,
      announceToSR: (m) => announcements.push(m),
    }));
    await teacherMount.render();
    const editArea = teacherMount.host.querySelector('textarea[aria-label="Edit scaffold item 1"]');
    expect(editArea).toBeTruthy();
    expect(editArea.className).toContain('focus-visible:outline-2');
    await runAxe(teacherMount.host);
    expect(errSpy).not.toHaveBeenCalled();
  });
});
