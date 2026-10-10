const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const before = "button('Select clips with another voice or language', () => setSelected(inventory.filter(row => row.mismatch).map(row => row.key)), !inventory.some(row => row.mismatch)),";
const after = "button('Select clips with another voice or language', () => setSelected(inventory.filter(row => row.mismatch && row.regeneratable).map(row => row.key)), !inventory.some(row => row.mismatch && row.regeneratable)),";
const oldEffect = '      React.useEffect(() => setSelected([]), [words, voice]);';
const newEffect = `      React.useEffect(() => {
        const eligible = new Set(inventory.filter(row => row.regeneratable).map(row => row.key));
        setSelected(previous => previous.filter(key => eligible.has(key)));
      }, [words, activities, voice, language]);
      React.useEffect(() => setSelected([]), [voice, language]);`;
function transformRuntime(source) {
  if (source.split(before).length !== 2) throw new Error('Voice selection guard: expected exactly one original button');
  if (source.split(oldEffect).length !== 2) throw new Error('Selection retention guard: expected exactly one original effect');
  return source.replace(before, after).replace(oldEffect, newEffect);
}
function test(source) {
  const start = source.indexOf('    const WordSoundsPackMaintenance = (');
  const end = source.indexOf('    const resolveWordSoundsReplacement =', start);
  assert(start >= 0 && end > start, 'Current maintenance component must exist');
  const component = source.slice(start, end);
  function mount(initialInventory) {
    const state = { values: [], effects: [], inventory: initialInventory };
    let stateIndex = 0, effectIndex = 0, pendingEffects = [];
    const props = { words: [], voice: 'af_bella', language: 'English', activities: [], busy: false, notice: '', onAction: () => {}, onCancel: () => {}, onPlayAudio: () => {}, onReviewSyllables: () => {} };
    const context = {
      React: {
        useState: initial => {
          const index = stateIndex++;
          if (!(index in state.values)) state.values[index] = typeof initial === 'function' ? initial() : initial;
          return [state.values[index], value => { state.values[index] = typeof value === 'function' ? value(state.values[index]) : value; }];
        },
        useEffect: (effect, dependencies) => {
          const index = effectIndex++, previous = state.effects[index];
          if (!previous || !dependencies || dependencies.some((value, position) => !Object.is(value, previous[position]))) pendingEffects.push(effect);
          state.effects[index] = dependencies;
        },
        createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
      },
      wordSoundsPackInventory: () => state.inventory,
      WS_CORE: { planPackRepair: () => ({ upgraded: [], missing: [], issues: [] }) },
    };
    vm.runInNewContext(component + '\nthis.renderComponent = WordSoundsPackMaintenance;', context);
    function find(node) {
      if (!node || typeof node !== 'object') return null;
      if (node.type === 'button' && node.children[0] === 'Select clips with another voice or language') return node;
      for (const child of node.children || []) { const found = Array.isArray(child) ? child.map(find).find(Boolean) : find(child); if (found) return found; }
      return null;
    }
    const api = {
      render(inventory = state.inventory, nextProps = {}) {
        state.inventory = inventory; Object.assign(props, nextProps);
        stateIndex = 0; effectIndex = 0; pendingEffects = [];
        api.button = find(context.renderComponent(props));
        pendingEffects.forEach(effect => effect());
        return api;
      },
      selected: () => Array.from(state.values[0]),
    };
    return api.render();
  }
  const eligible = { key: 'word', mismatch: true, regeneratable: true };
  const mixed = mount([eligible, { key: 'legacy-fragment', mismatch: true, regeneratable: false }, { key: 'matching-word', mismatch: false, regeneratable: true }]);
  assert.equal(mixed.button.props.disabled, false); mixed.button.props.onClick();
  assert.deepEqual(mixed.selected(), ['word']);
  console.log('PASS mismatched clip selection excludes non-regeneratable clips');
  const blocked = mount([{ key: 'legacy-fragment', mismatch: true, regeneratable: false }]);
  assert.equal(blocked.button.props.disabled, true);
  console.log('PASS selection disabled when only non-regeneratable clips differ');
  const matching = mount([{ key: 'word', mismatch: false, regeneratable: true }]);
  assert.equal(matching.button.props.disabled, true);
  console.log('PASS matching voices do not enable mismatch selection');
  const lifecycle = mount([eligible, { key: 'other-word', mismatch: true, regeneratable: true }]);
  lifecycle.button.props.onClick();
  lifecycle.render(undefined, { words: [{ _audioRequested: true }] });
  lifecycle.render(undefined, { words: [{ _audioRequested: true, ttsReady: true }] });
  assert.deepEqual(lifecycle.selected(), ['word', 'other-word']);
  console.log('PASS incidental readiness word revisions preserve selected eligible keys');
  lifecycle.render([eligible], { words: [{ ttsReady: true, revised: true }] });
  assert.deepEqual(lifecycle.selected(), ['word']);
  lifecycle.render([{ ...eligible, regeneratable: false }], { words: [{ revised: 2 }] });
  assert.deepEqual(lifecycle.selected(), []);
  console.log('PASS removed and newly non-regeneratable clips are pruned');
  lifecycle.render([eligible], { words: [{ revised: 3 }] }); lifecycle.button.props.onClick();
  lifecycle.render(undefined, { voice: 'af_heart' });
  assert.deepEqual(lifecycle.selected(), []);
  console.log('PASS changing voice clears selection');
  lifecycle.button.props.onClick(); lifecycle.render(undefined, { language: 'Spanish' });
  assert.deepEqual(lifecycle.selected(), []);
  console.log('PASS changing language clears selection');
}
module.exports = { transformRuntime, test };
if (require.main === module) {
  const source = fs.readFileSync(require('path').join(process.cwd(), 'word_sounds_module.js'), 'utf8');
  test(process.argv.includes('--repo') ? source : transformRuntime(source));
}
