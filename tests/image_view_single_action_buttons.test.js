import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// The image view used to draw Upload and Find twice (labelled buttons laid over
// the picture and icon buttons in the bottom toolbar) and Regenerate twice on a
// picture that was not saved. Each action now has ONE button per state: the
// toolbar under the picture owns Upload, Find and Regenerate; only "Restore AI
// image", which the toolbar never had, stays on the picture.

const require = createRequire(import.meta.url);
let React, createRoot, act, root, host, ImageView;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('alt_text_module.js');
  // A scratch copy can stand in (absolute path), e.g. to show this suite fails on the old layout.
  loadAlloModule(process.env.ALLO_VIEW_IMAGE_CANDIDATE || 'view_image_module.js');
  ImageView = window.AlloModules.ImageView;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; vi.restoreAllMocks(); });

const picture = { id: 'image-a', type: 'image', data: { imageUrl: 'data:image/png;base64,b2xk', altText: 'AI diagram', altSource: 'vision', altHash: 'h', decorative: false, prompt: 'Water cycle', imageSource: 'ai-generated' } };
const replaced = { ...picture, data: { ...picture.data, originalImage: { imageUrl: 'data:image/png;base64,b3JpZw==', altText: 'Original' } } };
const stripped = { id: 'image-s', type: 'image', data: { prompt: 'Volcano' } };
const panels = { ...picture, id: 'image-p', data: { ...picture.data, visualPlan: { title: 'Cycle', panels: [{ imageUrl: 'data:image/png;base64,QQ==' }, { imageUrl: 'data:image/png;base64,Qg==' }] } } };

const UPLOAD = 'button[aria-label="Upload your own image"]';
const FIND = 'button[aria-label="Find a symbol or photo"]';
const REGENERATE = '[data-help-key="visuals_regenerate"]';
const RESTORE = 'button[aria-label="Restore AI image"]';

function mount(resource, overrides = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const props = {
    t: () => '', generatedContent: resource, isTeacherMode: true, leveledTextLanguage: 'English',
    singleImageFileRef: React.createRef(), onUpdateResource: vi.fn(), imageRefinementInput: '', addToast: () => {},
    handleRestoreImage: vi.fn(), handleDownloadImage: vi.fn(), VisualPanelGrid: () => React.createElement('div', { 'data-panel-grid': '' }),
    ...overrides,
  };
  act(() => root.render(React.createElement(ImageView, props)));
  return props;
}
const count = (selector) => host.querySelectorAll(selector).length;
const toolbar = () => host.querySelector('[data-image-actions]');

describe('image view: one button per action', () => {
  it('a saved picture has one Upload, one Find and one Regenerate, all in the toolbar and all wired', () => {
    const props = mount(picture);
    expect(toolbar(), 'toolbar').toBeTruthy();
    for (const selector of [UPLOAD, FIND, REGENERATE]) {
      expect(count(selector), selector).toBe(1);
      expect(toolbar().querySelector(selector), selector + ' in toolbar').toBeTruthy();
    }
    // The words the on-picture buttons used to carry moved with the action.
    expect(host.querySelector(UPLOAD).textContent).toContain('Replace');
    expect(host.querySelector(FIND).textContent).toContain('Find');

    // The view attaches the ref to its own hidden file input; Upload opens that chooser.
    const fileInput = props.singleImageFileRef.current;
    expect(fileInput.tagName).toBe('INPUT');
    const openChooser = vi.spyOn(fileInput, 'click').mockImplementation(() => {});
    act(() => host.querySelector(UPLOAD).click());
    expect(openChooser).toHaveBeenCalledOnce();
    act(() => host.querySelector(REGENERATE).click());
    expect(props.handleRestoreImage).toHaveBeenCalledOnce();
    expect(host.querySelector(FIND).getAttribute('aria-expanded')).toBe('false');
    act(() => host.querySelector(FIND).click());
    expect(host.querySelector(FIND).getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('section[aria-label="Find a symbol or photo"]'), 'find panel opens').toBeTruthy();
  });

  it('nothing is laid over a picture that has no original to restore', () => {
    mount(picture);
    expect(host.querySelector('[data-image-overlay-actions]')).toBeNull();
    expect(count(RESTORE)).toBe(0);
  });

  it('keeps Restore AI image on a replaced picture, as the only button over it', () => {
    const props = mount(replaced);
    const overlay = host.querySelector('[data-image-overlay-actions]');
    expect(overlay).toBeTruthy();
    expect(overlay.querySelectorAll('button')).toHaveLength(1);
    expect(overlay.querySelector(RESTORE)).toBeTruthy();
    expect(toolbar().querySelector(RESTORE)).toBeNull();
    act(() => overlay.querySelector(RESTORE).click());
    expect(props.onUpdateResource).toHaveBeenCalled();
    expect(count(UPLOAD)).toBe(1);
    expect(count(FIND)).toBe(1);
  });

  it('a picture that was not saved has one Regenerate: the labelled button in the empty state', () => {
    const props = mount(stripped);
    expect(count(REGENERATE)).toBe(1);
    expect(toolbar().querySelector(REGENERATE)).toBeNull();
    act(() => host.querySelector(REGENERATE).click());
    expect(props.handleRestoreImage).toHaveBeenCalledOnce();
    // Upload and Find are still one click away in the toolbar.
    expect(count(UPLOAD)).toBe(1);
    expect(count(FIND)).toBe(1);
    expect(toolbar().querySelector(UPLOAD)).toBeTruthy();
    expect(toolbar().querySelector(FIND)).toBeTruthy();
  });

  it('a multi-panel visual keeps Upload and Regenerate in the toolbar and offers no Find', () => {
    mount(panels);
    expect(host.querySelector('[data-panel-grid]')).toBeTruthy();
    expect(count(UPLOAD)).toBe(1);
    expect(count(REGENERATE)).toBe(1);
    expect(toolbar().querySelector(REGENERATE)).toBeTruthy();
    expect(count(FIND)).toBe(0);
  });

  it('shows none of these to a learner', () => {
    mount(replaced, { isTeacherMode: false });
    for (const selector of [UPLOAD, FIND, REGENERATE, RESTORE, '[data-image-actions]', '[data-image-overlay-actions]']) {
      expect(count(selector), selector).toBe(0);
    }
  });
});
