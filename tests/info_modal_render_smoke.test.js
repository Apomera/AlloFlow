import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';

function createReactStub() {
  return {
    Fragment: 'fragment',
    createElement(type, props, ...children) {
      return {
        type: typeof type === 'function' ? (type.name || 'component') : type,
        props: {
          ...(props || {}),
          children: children.length <= 1 ? children[0] : children,
        },
      };
    },
    useState(initialValue) {
      return [typeof initialValue === 'function' ? initialValue() : initialValue, () => {}];
    },
    useRef(initialValue) {
      return { current: initialValue };
    },
    useEffect() {},
    useMemo(factory) {
      return factory();
    },
  };
}

describe('Info modal executable render smoke', () => {
  it('renders the Feature Guide from the generated module without scope errors', () => {
    const host = globalThis.window || globalThis;
    const previousReact = host.React;
    const previousModules = host.AlloModules;

    try {
      host.React = createReactStub();
      host.AlloModules = {};
      runInThisContext(readFileSync('view_info_modal_module.js', 'utf8'), {
        filename: 'view_info_modal_module.js',
      });

      const InfoModal = host.AlloModules?.InfoModal?.InfoModal;
      expect(typeof InfoModal).toBe('function');

      const featuresList = {
        categories: { creation: 'Create', activities: 'Activities', assessment: 'Assess', platform: 'Platform' },
        items: [
          { title: 'STEM Lab', icon: 'Layers', desc: 'Old count text', category: 'platform', color: 'teal' },
          { title: 'SEL Hub', icon: 'Heart', desc: 'Old count text', category: 'activities', color: 'rose' },
        ],
      };
      const t = (key) => key === 'about.features_list' ? featuresList : key;
      const noop = () => {};

      const tree = InfoModal({
        handleSetInfoModalTabToAbout: noop,
        handleSetInfoModalTabToAtlas: noop,
        handleSetInfoModalTabToFeatures: noop,
        handleSetInfoModalTabToPrivacy: noop,
        handleSetInfoModalTabToOpenSource: noop,
        handleSetShowInfoModalToFalse: noop,
        infoModalTab: 'features',
        safeRemoveItem: noop,
        setShowInfoModal: noop,
        setShowWizard: noop,
        t,
      });

      const rendered = JSON.stringify(tree);
      expect(rendered).toContain('Feature Guide');
      expect(rendered).toContain('Search guided workflows');
      // Count-agnostic (2026-07-20): exact counts staled every time a session
      // registered a tool; the invariant is that LIVE derived counts render.
      expect(rendered).toMatch(/\d+ current STEM catalog entries/);
      expect(rendered).toMatch(/\d+ current SEL catalog entries/);
    } finally {
      if (previousReact === undefined) delete host.React;
      else host.React = previousReact;
      if (previousModules === undefined) delete host.AlloModules;
      else host.AlloModules = previousModules;
    }
  });
});
