import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const { transformSync } = require('@babel/core');
const { act } = React;
const dir = process.env.ALLO_MAIN_RESOURCE_CANDIDATE || '.';
const read = file => readFileSync(resolve(dir, file), 'utf8');
const roots = [];
const t = key => ({ 'status.saved_device': 'Saved on device', 'status.cloud_saved': 'Saved to cloud', 'status.unsaved': 'Unsaved' }[key] || key);
let SaveChip, DbqView, ImageView, BrainstormView;

function mount(Component, props) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => root.render(React.createElement(Component, props)));
  return { container, root, rerender: next => act(() => root.render(React.createElement(Component, next))) };
}

beforeAll(() => {
  window.React = React;
  window.IS_REACT_ACT_ENVIRONMENT = true;
  for (const file of ['view_dbq_module.js', 'view_image_module.js', 'view_brainstorm_module.js']) new Function(read(file))();
  ({ DbqView, ImageView, BrainstormView } = window.AlloModules);
  const host = read('AlloFlowANTI.txt');
  const start = host.indexOf('{(!isCanvas || isCloudSyncEnabled) && !(saveChipHidden && !_saveChipIsWarning) && (');
  const end = host.indexOf('{/* ── Export Preview & Customization Modal', start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const declarations = host.slice(host.indexOf('  const _saveChipIsWarning ='), host.indexOf('  const [saveChipHidden,'));
  const jsx = host.slice(start, end).trim().slice(1, -1);
  const code = `function SaveChip(p) { const {isTeacherMode,isCanvas,isCloudSyncEnabled,saveChipHidden,isDraftSaving,pendingSync,studentWorkStatus,cloudSyncStatus,isStorageDisabled,t,retryStudentWorkSave}=p; ${declarations} return (${jsx}); }`;
  SaveChip = new Function('React', transformSync(code, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code + '; return SaveChip;')(React);
});

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  document.body.innerHTML = '';
  delete window.AlloModules.AltText;
  delete window.AlloModules.ImageAltField;
});

describe('truthful save feedback', () => {
  const common = { isTeacherMode: true, isCanvas: false, isCloudSyncEnabled: false, saveChipHidden: true, isDraftSaving: false, pendingSync: false, studentWorkStatus: 'saved', cloudSyncStatus: 'idle', isStorageDisabled: false, t };
  it('keeps failures visible after the success timeout and lets the learner retry', () => {
    const retry = vi.fn();
    const { container, rerender } = mount(SaveChip, { ...common, studentWorkStatus: 'error', retryStudentWorkSave: retry });
    expect(container.textContent).toContain('Save failed');
    expect(container.textContent).not.toContain('Saved on device');
    act(() => container.querySelector('button').click());
    expect(retry).toHaveBeenCalledOnce();
    rerender({ ...common, studentWorkStatus: 'saving' });
    expect(container.textContent).toContain('Unsaved');
    rerender({ ...common, saveChipHidden: false });
    expect(container.textContent).toContain('Saved on device');
  });
  it('preserves conflict warnings without offering a blind overwrite', () => {
    const { container } = mount(SaveChip, { ...common, studentWorkStatus: 'conflict', pendingSync: true });
    expect(container.textContent).toContain('review conflicting changes');
    expect(container.querySelector('button')).toBeNull();
    expect(container.textContent).not.toContain('Saved on device');
  });
  it('does not claim cloud success merely because cloud sync is enabled', () => {
    const { container, rerender } = mount(SaveChip, { ...common, isCloudSyncEnabled: true, saveChipHidden: false });
    expect(container.textContent).not.toContain('Saved to cloud');
    rerender({ ...common, isCloudSyncEnabled: true, cloudSyncStatus: 'error' });
    expect(container.textContent).toContain('Cloud sync failed');
    rerender({ ...common, isCloudSyncEnabled: true, cloudSyncStatus: 'saved', saveChipHidden: false });
    expect(container.textContent).toContain('Saved to cloud');
  });
  it('does not label learner answers with teacher catalog cloud status', () => {
    const { container, rerender } = mount(SaveChip, { ...common, isTeacherMode: false, isCloudSyncEnabled: true, cloudSyncStatus: 'saved', saveChipHidden: false });
    expect(container.textContent).toContain('Saved on device');
    expect(container.textContent).not.toContain('Saved to cloud');
    rerender({ ...common, isTeacherMode: false, isCloudSyncEnabled: true, cloudSyncStatus: 'error', saveChipHidden: false });
    expect(container.textContent).toContain('Saved on device');
    expect(container.textContent).not.toContain('Cloud sync failed');
    rerender({ ...common, isTeacherMode: false, isCloudSyncEnabled: true, cloudSyncStatus: 'saved', studentWorkStatus: 'error' });
    expect(container.textContent).toContain('Save failed');
  });
  it('passes the real learner save state and retry to Activities', () => {
    const host = read('AlloFlowANTI.txt');
    const block = host.slice(host.indexOf("{activeView === 'brainstorm'"), host.indexOf('{adventureState.isReviewingCharacters'));
    expect(block).toContain('studentWorkStatus');
    expect(block).toContain('onRetrySave: retryStudentWorkSave');
  });
});

function dbq(saved = {}) {
  const writes = [];
  const store = { current: saved };
  function Harness() {
    const [, tick] = React.useState(0);
    return React.createElement(DbqView, {
      generatedContent: { id: 'dbq', type: 'dbq', data: { title: 'Synthetic source comparison', documents: [{ id: 'A', title: 'A letter', excerpt: 'The river flows.' }], rubric: [], corroborationClaims: [] } },
      studentResponses: { dbq: store.current }, t, isTeacherMode: false,
      handleStudentInput: (id, key, value) => { writes.push([id, key, value]); store.current = { ...store.current, [key]: value }; tick(n => n + 1); }
    });
  }
  return { ...mount(Harness), writes, store };
}

describe('DBQ tab keyboard navigation', () => {
  it('moves focus and selection with arrows, wraps, and supports Home/End without losing answers', () => {
    const { container, store } = dbq({ _essayText: 'My existing answer' });
    const tabs = [...container.querySelectorAll('[role=tab]')];
    const key = (index, value, expected) => {
      act(() => { tabs[index].focus(); tabs[index].dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })); });
      expect(document.activeElement).toBe(tabs[expected]);
      expect(tabs[expected].getAttribute('aria-selected')).toBe('true');
      expect(tabs.map(tab => tab.tabIndex)).toEqual(tabs.map((_, i) => i === expected ? 0 : -1));
      const panel = container.querySelector('[role=tabpanel]');
      expect(panel.getAttribute('aria-labelledby')).toBe(tabs[expected].id);
      expect(tabs.every(tab => tab.getAttribute('aria-controls') === panel.id)).toBe(true);
    };
    key(0, 'ArrowRight', 1); key(1, 'End', 3); key(3, 'ArrowRight', 0); key(0, 'ArrowLeft', 3); key(3, 'Home', 0);
    expect(store.current._essayText).toBe('My existing answer');
  });
  it('restores a valid section and handles right-to-left navigation', () => {
    const { container } = dbq({ _dbqTab: 'essay' });
    const tabs = [...container.querySelectorAll('[role=tab]')];
    expect(tabs[2].tabIndex).toBe(0);
    container.querySelector('[role=tablist]').style.direction = 'rtl';
    act(() => tabs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(document.activeElement).toBe(tabs[1]);
  });
  it('falls back from unknown saved sections and gives each mounted DBQ unique associations', () => {
    const first = dbq({ _dbqTab: 'removed' });
    const second = dbq();
    expect(first.container.querySelector('[role=tab]').tabIndex).toBe(0);
    const ids = [...document.querySelectorAll('[role=tab], [role=tabpanel]')].map(el => el.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(second.container.querySelector('[role=tabpanel]').tabIndex).toBe(0);
  });
});

const imageProps = data => ({ generatedContent: { id: 'image', type: 'image', data: { imageUrl: 'data:image/png;base64,AA==', ...data } }, t, isTeacherMode: false, singleImageFileRef: React.createRef(), imageRefinementInput: '' });
describe('image description recovery', () => {
  it.each([undefined, '', '   '])('exposes missing description %s instead of silently hiding the picture', altText => {
    const { container } = mount(ImageView, imageProps({ altText }));
    const image = container.querySelector('img');
    expect(image.alt).toBe('Image description unavailable');
    expect(image.getAttribute('role')).not.toBe('presentation');
    expect(document.getElementById(image.getAttribute('aria-describedby')).textContent).toContain('Ask your teacher');
  });
  it('preserves valid descriptions and explicit decorative choices', () => {
    const { container, rerender } = mount(ImageView, imageProps({ altText: 'A river divides two towns.' }));
    expect(container.querySelector('img').alt).toBe('A river divides two towns.');
    expect(container.querySelector('[role=status]')).toBeNull();
    rerender(imageProps({ decorative: true }));
    expect(container.querySelector('img').alt).toBe('');
    expect(container.querySelector('img').getAttribute('role')).toBe('presentation');
    expect(container.querySelector('[role=status]')).toBeNull();
  });
  it('does not present a description for an earlier image as current', () => {
    window.AlloModules.AltText = { hashImage: () => 'new-picture' };
    const { container } = mount(ImageView, imageProps({ altText: 'An earlier picture.', altHash: 'old-picture' }));
    expect(container.querySelector('img').alt).toBe('Image description needs review');
    expect(container.textContent).toContain('Ask your teacher');
  });
  it('lets the teacher focus and repair the description when the rich editor is unavailable, scoped to the same picture', () => {
    const props = { ...imageProps({}), isTeacherMode: true };
    let apply;
    props.onUpdateResource = vi.fn((id, patch) => { apply = patch; });
    const { container } = mount(ImageView, props);
    const edit = [...container.querySelectorAll('button')].find(button => button.textContent === 'Edit image description');
    act(() => edit.click());
    const textarea = container.querySelector('textarea[id]');
    expect(document.activeElement).toBe(textarea);
    act(() => Simulate.change(textarea, { target: { value: 'Two towns beside a river.' } }));
    expect(apply(props.generatedContent).data).toMatchObject({ altText: 'Two towns beside a river.', altSource: 'author', altHash: '' });
    const later = { ...props.generatedContent, data: { imageUrl: 'different-picture' } };
    expect(apply(later)).toBe(later);
    const other = { ...props.generatedContent, id: 'other-resource' };
    expect(apply(other)).toBe(other);
  });
});

describe.each(['discussion', 'jigsaw'])('%s answer save feedback', kind => {
  const props = { t, generatedContent: { id: 'activity', data: [{ id: 'activity-1', kind, title: 'Synthetic discussion', questions: [], chunks: [], accountabilityCheck: [{ q: 'Explain.' }] }] }, isTeacherMode: false, studentResponses: {}, handleStudentInput: () => {}, renderFormattedText: text => text };
  it('shows pending, failed, conflicting, and confirmed states and retries only errors', () => {
    const retry = vi.fn();
    const { container, rerender } = mount(BrainstormView, { ...props, onRetrySave: retry, studentWorkStatus: 'error' });
    expect(container.textContent).toContain('could not be saved');
    act(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Try saving again').click());
    expect(retry).toHaveBeenCalledOnce();
    for (const [state, message] of [['saving', 'Saving your answers'], ['conflict', 'Review the conflicting changes'], ['saved', 'saved on this device'], ['idle', 'Write your answers below']]) {
      rerender({ ...props, studentWorkStatus: state });
      expect(container.textContent).toContain(message);
      if (state !== 'saved') expect(container.textContent).not.toContain('are saved');
    }
  });
});
