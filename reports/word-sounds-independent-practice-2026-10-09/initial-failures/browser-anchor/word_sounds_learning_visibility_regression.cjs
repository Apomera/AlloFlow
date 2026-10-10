// Small, dependency-free checks of production text policy, prompt rendering,
// reveal events and response evidence. No browser or synthetic duplicate policy.
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const repo = process.env.WORD_SOUNDS_REPO || process.env.WORD_SOUNDS_TEST_ROOT || path.resolve(__dirname, '..');
const sourceArg = process.argv.find(value => value.startsWith('--source='));
const source = fs.readFileSync(sourceArg ? path.resolve(sourceArg.slice(9)) : path.join(repo, 'word_sounds_module.js'), 'utf8');
function between(first, last) {
  const start = source.indexOf(first), end = source.indexOf(last, start + first.length);
  assert.ok(start >= 0 && end > start, 'Production extraction boundaries: ' + first);
  return source.slice(start, end);
}
const policies = between('      const SMART_IMAGE_VISIBILITY = {', '      const [elkoninBoxes, setElkoninBoxes]');
const promptSource = between('      const renderPrompt = () =>', '      const playSegmentationSequence = async () => {');
const supportRegion = between('      const supportSeenRef = React.useRef({});', '      const [draggedItem, setDraggedItem]');
const supportStart = supportRegion.indexOf('      React.useEffect(() => {');
const supportEnd = supportRegion.indexOf('      }, [showWordText, showLetterHints, wordSoundsActivity, currentWordSoundsWord]);', supportStart);
assert.ok(supportStart >= 0 && supportEnd > supportStart, 'Actual support-memory effect is available');
const supportSource = supportRegion.slice(supportStart, supportEnd) + '      }, [showWordText, showLetterHints, wordSoundsActivity, currentWordSoundsWord]);';
const evidenceSource = between('            const _seen = supportSeenRef.current.key ===', '            const _masteryEvidence = {');
const core = new Function(fs.readFileSync(path.join(repo, 'word_sounds_core.js'), 'utf8') + '\nreturn createWordSoundsCore();')();
function nodes(tree, match, into = []) {
  if (Array.isArray(tree)) tree.forEach(child => nodes(child, match, into));
  else if (tree && typeof tree === 'object') {
    if (match(tree)) into.push(tree);
    nodes(tree.children, match, into);
  }
  return into;
}
function texts(tree, into = []) {
  if (Array.isArray(tree)) tree.forEach(child => texts(child, into));
  else if (typeof tree === 'string') into.push(tree);
  else if (tree && typeof tree === 'object') texts(tree.children, into);
  return into;
}
function harness(changes = {}) {
  const effects = [], audio = [];
  const env = {
    React: { createElement(type, props, ...children) { return { type, props: props || {}, children }; }, useEffect(fn) { effects.push(fn); } },
    WS_CORE: core, wordSoundsActivity: 'missing_letter', imageVisibilityMode: 'smart',
    currentWordSoundsWord: 'cat', wordSoundsPhonemes: { phonemeCount: 3 }, currentWordImage: 'data:image/png;base64,fixture',
    showImageForCurrentWord: false, showWordText: false, showLetterHints: false, isProbeMode: false, isPlayingAudio: false,
    submissionLockRef: { current: false }, advanceEpochRef: { current: 1 }, supportSeenRef: { current: {} },
    setShowWordText(value) { env.showWordText = typeof value === 'function' ? value(env.showWordText) : value; },
    ts() { return ''; }, t(key) { return key; }, Volume2: 'volume-icon', Ear: 'ear-icon', opts: {},
    handleAudio(value) { audio.push(value); }, playBlending() { audio.push('blend'); },
  };
  Object.assign(env, changes);
  function evaluate(body) { return new Function(...Object.keys(env), policies + '\n' + body)(...Object.values(env)); }
  function render(changes = {}) {
    Object.assign(env, changes);
    return evaluate(promptSource + '\nreturn renderPrompt();');
  }
  function effect() {
    effects.length = 0; evaluate(supportSource); assert.equal(effects.length, 1); effects[0]();
  }
  function evidence() { return evaluate(evidenceSource + '\nreturn _responseEvidence;'); }
  function revealButton(tree = render()) {
    return nodes(tree, node => node.props['data-testid'] === 'word-sounds-word-reveal')[0];
  }
  return { env, render, effect, evidence, audio, revealButton,
    mode(activity) { return evaluate('return getEffectiveTextMode(' + JSON.stringify(activity) + ');'); } };
}
let passed = 0;
function group(name, fn) { fn(); passed++; console.log('PASS ' + name); }
group('Missing Letter and Word Scramble hide their complete target under every image policy', () => {
  for (const activity of ['missing_letter', 'word_scramble']) {
    for (const imageVisibilityMode of ['smart', 'alwaysOn', 'alwaysOff', 'progressive', 'afterCompletion']) {
      for (const currentWordImage of [null, 'data:image/png;base64,fixture']) {
        const h = harness({ wordSoundsActivity: activity, imageVisibilityMode, currentWordImage });
        assert.equal(h.mode(activity), 'afterAnswer');
        assert.equal(texts(h.render()).includes('cat'), false, activity + '/' + imageVisibilityMode);
        assert.equal(h.revealButton().props['aria-label'], 'Show word');
        assert.equal(h.revealButton().props['aria-pressed'], false);
      }
    }
  }
});
group('image always-on and always-off affect pictures without changing answer text', () => {
  const h = harness();
  let tree = h.render({ imageVisibilityMode: 'alwaysOn' });
  assert.equal(nodes(tree, node => node.type === 'img').length, 1);
  assert.equal(texts(tree).includes('cat'), false);
  tree = h.render({ imageVisibilityMode: 'alwaysOff', showImageForCurrentWord: true });
  assert.equal(nodes(tree, node => node.type === 'img').length, 0);
  assert.equal(texts(tree).includes('cat'), false);
  tree = h.render({ imageVisibilityMode: 'progressive', showImageForCurrentWord: true });
  assert.equal(nodes(tree, node => node.type === 'img').length, 1);
  assert.equal(texts(tree).includes('cat'), false);
});
group('explicit reveal shows the target in both picture and audio prompts and records support synchronously', () => {
  for (const activity of ['missing_letter', 'word_scramble']) for (const imageVisibilityMode of ['alwaysOn', 'alwaysOff']) {
    const h = harness({ wordSoundsActivity: activity, imageVisibilityMode });
    h.revealButton().props.onClick(); // No effect flush before the response.
    assert.equal(h.env.supportSeenRef.current.showWordText, true);
    assert.equal(h.env.supportSeenRef.current.key, '1|' + activity + '|cat');
    const tree = h.render(); assert.equal(texts(tree).includes('cat'), true);
    const button = h.revealButton(tree); assert.equal(button.props['aria-label'], 'Hide word');
    assert.equal(button.props['aria-pressed'], true);
    assert.equal(button.props['aria-label'].includes('cat'), false, 'The control label does not leak the target');
    assert.equal(h.evidence().cluesShown.includes('printed_word'), true);
  }
});
group('hiding a revealed word cannot remove printed-word evidence or unrelated hint metadata', () => {
  const h = harness(); h.env.supportSeenRef.current = { key: '1|missing_letter|cat', otherHint: 'retained' };
  h.revealButton().props.onClick(); h.revealButton(h.render()).props.onClick();
  assert.equal(texts(h.render()).includes('cat'), false);
  assert.equal(h.env.supportSeenRef.current.showWordText, true);
  assert.equal(h.env.supportSeenRef.current.otherHint, 'retained');
  const result = h.evidence(); assert.equal(result.textSupported, true);
  assert.equal(result.cluesShown.includes('printed_word'), true);
});
group('independent responses do not gain word support from picture settings or later feedback reveals', () => {
  for (const imageVisibilityMode of ['alwaysOn', 'alwaysOff', 'smart']) {
    const h = harness({ imageVisibilityMode }); h.effect();
    const result = h.evidence(); assert.equal(result.textSupported, false);
    assert.equal(result.cluesShown.includes('printed_word'), false);
    h.env.submissionLockRef.current = true; h.env.showWordText = true; h.effect();
    assert.deepEqual(h.env.supportSeenRef.current, {}, 'Post-answer feedback does not add prior support');
    assert.equal(texts(h.render()).includes('cat'), true, 'Completed answer remains visible');
    assert.equal(h.revealButton().props.disabled, true);
  }
});
group('Show Letters retains its phoneme-hint role without revealing the complete target', () => {
  for (const activity of ['missing_letter', 'word_scramble']) {
    const h = harness({ wordSoundsActivity: activity, showLetterHints: true }); h.effect();
    assert.equal(texts(h.render()).includes('cat'), false);
    const result = h.evidence(); assert.equal(result.textSupported, true);
    assert.equal(result.cluesShown.includes('printed_sound_labels'), true);
    assert.equal(result.cluesShown.includes('printed_word'), false);
  }
});
group('permanent teaching text remains for mapping and tracing while probes expose no reveal control', () => {
  for (const activity of ['mapping', 'letter_tracing']) {
    const h = harness({ wordSoundsActivity: activity, imageVisibilityMode: 'alwaysOff' });
    assert.equal(h.mode(activity), 'alwaysOn'); assert.equal(texts(h.render()).includes('cat'), true);
    assert.equal(h.revealButton(), undefined); h.effect();
    assert.equal(h.evidence().cluesShown.includes('printed_word'), true);
  }
  for (const activity of ['missing_letter', 'word_scramble']) {
    const h = harness({ wordSoundsActivity: activity, isProbeMode: true, imageVisibilityMode: 'alwaysOff' });
    assert.equal(h.revealButton(), undefined); assert.equal(texts(h.render()).includes('cat'), false);
  }
});
group('support memory belongs to one presentation and does not transfer to a new item', () => {
  const h = harness(); h.revealButton().props.onClick();
  h.env.advanceEpochRef.current = 2;
  h.render({ currentWordSoundsWord: 'dog', showWordText: false }); h.effect();
  const result = h.evidence(); assert.equal(result.textSupported, false);
  assert.equal(result.cluesShown.includes('printed_word'), false);
  assert.equal(texts(h.render()).includes('dog'), false);
});
console.log('PASS learning visibility: ' + passed + ' regression groups');
