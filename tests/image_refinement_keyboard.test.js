import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const image = 'data:image/png;base64,aW1hZ2U=';
let fixtures;
beforeEach(() => {
  fixtures = [];
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = {};
  new Function('window', readFileSync(process.env.ALLO_IMAGE_REFINEMENT_MODULE || 'view_image_module.js', 'utf8'))(window);
});
afterEach(async () => {
  for (const fixture of fixtures) {
    await act(async () => fixture.root.unmount());
    fixture.host.remove();
  }
});
async function mount(overrides = {}) {
  const callback = vi.fn();
  let props = {
    t: key => key, isTeacherMode: true, leveledTextLanguage: 'English',
    generatedContent: { id: 'image-keyboard', type: 'image', data: { imageUrl: image, altText: 'Teacher picture', prompt: 'Picture' } },
    imageRefinementInput: '文字を消す', singleImageFileRef: React.createRef(),
    setImageRefinementInput() {}, setGeneratedContent() {}, setHistory() {},
    handleRefineImage: callback, ...overrides,
  };
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const fixture = { host, root, callback };
  fixtures.push(fixture);
  fixture.render = async changes => {
    props = { ...props, ...changes };
    await act(async () => root.render(React.createElement(window.AlloModules.ImageView, props)));
  };
  await fixture.render({});
  fixture.input = host.querySelector('[data-help-key="visuals_refiner"] input');
  fixture.input?.focus();
  return fixture;
}
async function key(fixture, options = {}) {
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...options });
  await act(async () => fixture.input.dispatchEvent(event));
  return event;
}
async function compose(fixture, type) {
  await act(async () => fixture.input.dispatchEvent(new CompositionEvent(type, { data: '文字', bubbles: true })));
}

describe('Image refinement keyboard actions', () => {
  it.each([{ isComposing: true }, { keyCode: 229 }])('preserves composing text for %j', async signal => {
    const fixture = await mount();
    expect((await key(fixture, signal)).defaultPrevented).toBe(false);
    expect(fixture.callback).not.toHaveBeenCalled();
    expect(fixture.input.value).toBe('文字を消す');
  });
  it('tracks composition until compositionend even without a native key flag', async () => {
    const fixture = await mount();
    await compose(fixture, 'compositionstart');
    expect((await key(fixture)).defaultPrevented).toBe(false);
    expect(fixture.callback).not.toHaveBeenCalled();
    await compose(fixture, 'compositionend');
    expect((await key(fixture)).defaultPrevented).toBe(true);
    expect(fixture.callback).toHaveBeenCalledOnce();
  });
  it('releases interrupted composition when focus leaves', async () => {
    const fixture = await mount();
    await compose(fixture, 'compositionstart');
    await act(async () => fixture.input.blur()); fixture.input.focus();
    await key(fixture);
    expect(fixture.callback).toHaveBeenCalledOnce();
  });
  it('applies ordinary Enter once and prevents implicit form submission', async () => {
    const fixture = await mount();
    expect((await key(fixture)).defaultPrevented).toBe(true);
    expect(fixture.callback).toHaveBeenCalledOnce();
  });
  it('leaves other keys available for editing', async () => {
    const fixture = await mount();
    expect((await key(fixture, { key: 'a' })).defaultPrevented).toBe(false);
    expect(fixture.callback).not.toHaveBeenCalled();
  });
  it('does not start another refinement for repeated Enter', async () => {
    const fixture = await mount(); await key(fixture, { repeat: true });
    expect(fixture.callback).not.toHaveBeenCalled();
  });
  it.each([{ isProcessing: true }, { imageRefinementInput: '   ' }])('matches the unavailable button state for %j', async overrides => {
    const fixture = await mount(overrides); await key(fixture);
    expect(fixture.callback).not.toHaveBeenCalled();
    expect(fixture.host.querySelector('[data-help-key="visuals_refiner"] button').disabled).toBe(true);
  });
  it('keeps the Apply button available for completed instructions', async () => {
    const fixture = await mount();
    await act(async () => fixture.host.querySelector('[data-help-key="visuals_refiner"] button').click());
    expect(fixture.callback).toHaveBeenCalledOnce();
  });
  it('does not carry composition into another image resource', async () => {
    const fixture = await mount(); await compose(fixture, 'compositionstart');
    await fixture.render({ generatedContent: { id: 'next-image', type: 'image', data: { imageUrl: image, altText: 'Next picture' } } });
    await key(fixture); expect(fixture.callback).toHaveBeenCalledOnce();
  });
  it('keeps composition through an unrelated rerender', async () => {
    const fixture = await mount(); await compose(fixture, 'compositionstart');
    await fixture.render({ imageRefinementInput: '文字を変える' });
    await key(fixture); expect(fixture.callback).not.toHaveBeenCalled();
  });
  it('keeps composition separate for two resource inputs', async () => {
    const first = await mount(), second = await mount({ generatedContent: { id: 'second-image', type: 'image', data: { imageUrl: image, altText: 'Second' } } });
    first.input.focus(); await compose(first, 'compositionstart'); await key(second);
    expect(first.callback).not.toHaveBeenCalled(); expect(second.callback).toHaveBeenCalledOnce();
  });
  it('keeps image refinement out of student mode', async () => {
    const fixture = await mount({ isTeacherMode: false }); expect(fixture.input).toBeNull();
  });
  it('shows a readable Find label when that translation key is absent', async () => {
    const fixture = await mount();
    expect(fixture.host.textContent).not.toContain('visuals.find_short');
    expect([...fixture.host.querySelectorAll('button')].some(button => button.textContent.trim() === '🔎 Find')).toBe(true);
  });
});
