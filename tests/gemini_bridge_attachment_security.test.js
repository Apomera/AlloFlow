import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const IMAGE_DATA = 'data:image/png;base64,aW1hZ2U=';

// Keep the production event callbacks while avoiding unrelated dialog effects.
// Both distributed modules must render untrusted filenames as literal text.
function attachmentHarness(modulePath) {
  const moduleWindow = {
    AlloModules: {},
    React: {
      createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
      useState: value => [typeof value === 'function' ? value() : value, () => {}],
      useEffect: () => {},
      useRef: value => ({ current: value }),
      useMemo: callback => callback(),
      useCallback: callback => callback,
      Fragment: 'fragment',
    },
  };
  new Function('window', readFileSync(modulePath, 'utf8'))(moduleWindow);
  const addToast = vi.fn();
  const tree = moduleWindow.AlloModules.BridgeSendModal({
    bridgeSendOpen: true, isTeacherMode: true, theme: 'light',
    bridgeHistory: [], bridgeChatMessages: [], bridgeOverrideGroups: [],
    t: key => key, addToast,
  });
  function find(node, id) {
    if (!node || typeof node !== 'object') return null;
    if (node.props?.id === id) return node;
    for (const child of (node.children || []).flat(Infinity)) {
      const match = find(child, id);
      if (match) return match;
    }
    return null;
  }
  document.body.innerHTML = '<button id="bridge-attach-image-btn"></button>'
    + '<button id="bridge-remove-image-btn" style="display:none"></button>';
  vi.stubGlobal('FileReader', class {
    readAsDataURL(file) {
      this.onload({ target: { result: IMAGE_DATA } });
    }
  });
  return {
    moduleWindow, addToast,
    label: document.getElementById('bridge-attach-image-btn'),
    removeButton: document.getElementById('bridge-remove-image-btn'),
    attach(name) {
      const target = { files: [new File(['image'], name, { type: 'image/png' })], value: 'selected' };
      find(tree, 'bridge-image-file-input').props.onChange({ target });
      expect(target.value).toBe('');
    },
    remove() { find(tree, 'bridge-remove-image-btn').props.onClick(); },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe.each(['view_gemini_bridge_module.js', 'desktop/web-app/public/view_gemini_bridge_module.js'])('%s image attachment', modulePath => {
  it('does not interpret image filenames as HTML, including an event-bearing SVG within the truncation limit', () => {
    const harness = attachmentHarness(modulePath);
    for (const name of ['<svg onload=alert()>.png', '<b>photo</b>.png']) {
      harness.attach(name);
      expect(harness.label.textContent).toBe('✅ ' + name.substring(0, 20) + (name.length > 20 ? '…' : ''));
      expect(harness.label.querySelector('*')).toBeNull();
      expect(harness.moduleWindow.__bridgeAttachedImage).toBe(IMAGE_DATA);
      expect(harness.removeButton.style.display).toBe('flex');
    }
  });

  it('preserves normal attachment, filename truncation, removal, and reattachment', () => {
    const harness = attachmentHarness(modulePath);
    harness.attach('classroom.png');
    expect(harness.label.textContent).toBe('✅ classroom.png');
    expect(harness.addToast).toHaveBeenLastCalledWith('Image attached: classroom.png', 'success');
    harness.remove();
    expect(harness.moduleWindow.__bridgeAttachedImage).toBeNull();
    expect(harness.label.textContent).toBe('🖼️ Attach Image');
    expect(harness.removeButton.style.display).toBe('none');
    const name = 'classroom-photo-with-a-long-name.png';
    harness.attach(name);
    expect(harness.label.textContent).toBe('✅ ' + name.substring(0, 20) + '…');
    expect(harness.moduleWindow.__bridgeAttachedImage).toBe(IMAGE_DATA);
    expect(harness.removeButton.style.display).toBe('flex');
  });
});
