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

      // Host-like t(): unknown keys are undefined, so English fallbacks show. A
      // pack that translates only ONE string must change only that string (the old
      // list-wide replacement left stale packs with an outdated, title-keyed list).
      const partialPack = { 'about.fg.glossary.title': 'Glosario' };
      const t = (key) => partialPack[key];
      const noop = () => {};
      const render = (isTeacherMode) => JSON.stringify(InfoModal({
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
        isTeacherMode,
      }));

      const teacher = render(true);
      expect(teacher).toContain('Feature Guide');
      expect(teacher).toContain('Search the guides');
      for (const label of ['Plan & Create', 'Learn & Play', 'Assess & Support', 'Access & Manage']) expect(teacher).toContain(label);
      expect(teacher).toContain('Glosario');
      expect(teacher).not.toContain('"Glossary"');
      expect(teacher).toContain('Text Adaptation');
      expect(teacher).toContain('Report Writer');

      // Staff tools are not listed in the learner view.
      const learner = render(false);
      expect(learner).not.toContain('Report Writer');
      expect(learner).not.toContain('BehaviorLens');
      expect(learner).toContain('Reading Library');
    } finally {
      if (previousReact === undefined) delete host.React;
      else host.React = previousReact;
      if (previousModules === undefined) delete host.AlloModules;
      else host.AlloModules = previousModules;
    }
  });
});
