import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const fixtures = [];
afterEach(() => {
  for (const directory of fixtures.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});
function scan(scanner, source) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-gate-fixture-'));
  fixtures.push(directory);
  const file = path.join(directory, 'stem_tool_fixture.js');
  fs.writeFileSync(file, source);
  const result = spawnSync(process.execPath, [path.join(root, 'dev-tools', scanner), '--quiet',
    scanner === 'scan_canvas_stale_reads.cjs' ? file : directory], { encoding: 'utf8', timeout: 10000 });
  expect(result.error).toBeUndefined();
  return result;
}
function keyedRef(key = "'sky-' + retry", dependencies = 'retry') {
  return `function render(ctx) {
    var d = ctx.toolData.fixture || {};
    var retry = d.retry || 0;
    var ref = React.useCallback(function(el) {
      if (el._init) return;
      el._init = true;
      setTimeout(function later() { consume(retry); }, 0);
    }, [${dependencies}]);
    return React.createElement('canvas', {key: ${key}, ref: ref});
  }`;
}

describe('guarded canvas ref classification', () => {
  it('recognizes a named useCallback linked to its state-dependent element key', () => {
    expect(scan('scan_canvas_stale_reads.cjs', keyedRef()).status).toBe(0);
  });
  it.each([
    ['constant key', "'sky'", 'retry'],
    ['missing callback dependency', "'sky-' + retry", ''],
    ['missing retry in key', "'sky-' + d.other", 'retry'],
  ])('still rejects a frozen value with %s', (_, key, dependencies) => {
    const result = scan('scan_canvas_stale_reads.cjs', keyedRef(key, dependencies));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('reads frozen: retry');
  });
  it('parses modern logical assignment rather than reporting a clean tool as invalid syntax', () => {
    expect(scan('scan_canvas_stale_reads.cjs', keyedRef().replace('el._init = true;', 'el._init ??= true;')).status).toBe(0);
  });
});

describe('live announcer classification', () => {
  it('proves delegation through a ordinary DOM-writing helper', () => {
    expect(scan('scan_silent_announcer.cjs', `function setText(message) { var live = document.getElementById('live'); if (live) live.textContent = message; }
      function announce(message) { setText(message); } announce('ready');`).status).toBe(0);
  });
  it('proves the exact React pair state is rendered into the live region', () => {
    expect(scan('scan_silent_announcer.cjs', `function render() {
      var pair = React.useState(''), message = pair[0], setMessage = pair[1];
      function announce(text) { setMessage(text); } announce('ready');
      return h('div', {'aria-live': 'polite'}, h('p', null, message));
    }`).status).toBe(0);
  });
  it('does not accept an unrelated live region next to discarded state', () => {
    expect(scan('scan_silent_announcer.cjs', `function render() {
      var pair = React.useState(''), srMsg = pair[0], setSrMsg = pair[1];
      function announce(text) { setSrMsg(text); } announce('ready');
      return h('div', {'aria-live': 'polite'}, 'Unrelated status');
    }`).status).toBe(1);
  });
  it.each([
    "var pair = React.useState(''), message = pair[0], setMessage = pair[1];",
    "var [message, setMessage] = React.useState('');",
  ])('does not borrow a sibling component live region for shadowed state: %s', (binding) => {
    expect(scan('scan_silent_announcer.cjs', `function broken() {
      ${binding}
      function announce(text) { setMessage(text); } announce('ready');
      return h('p', null, message);
    }
    function working() {
      ${binding}
      return h('p', {'aria-live': 'polite'}, message);
    }`).status).toBe(1);
  });
  it('does not treat a shadowing setter parameter as the live state setter', () => {
    expect(scan('scan_silent_announcer.cjs', `function render() {
      var [message, setMessage] = React.useState('');
      function announce(text, setMessage) { setMessage(text); } announce('ready', discard);
      return h('p', {'aria-live': 'polite'}, message);
    }`).status).toBe(1);
  });
  it('keeps the original dead-state announcer and circular delegation failures visible', () => {
    expect(scan('scan_silent_announcer.cjs', `function announce(msg) { upd('srMsg', msg); } announce('ready');`).status).toBe(1);
    expect(scan('scan_silent_announcer.cjs', `function announce(msg) { retryAnnounce(msg); }
      function retryAnnounce(msg) { announce(msg); } announce('ready');`).status).toBe(1);
  });
});

describe('serialized function classification', () => {
  it('distinguishes a helper API from a data record', () => {
    expect(scan('scan_fn_in_tool_state.cjs', `var lens = (function() {
      function read() { return {}; }
      return { choices: function() { return []; }, answer: read, read: read };
    })(); lens.read();`).status).toBe(0);
  });
  it('accepts a nonescaping view descriptor whose callback is called locally', () => {
    expect(scan('scan_fn_in_tool_state.cjs', `function specimen() { return { id: 'rock', label: 'Rock', pic: function() { return h('img', null); } }; }
      function byLabel() { return specimen(); }
      function render() { var view = byLabel(); return view ? h('figure', null, view.pic(), view.label) : null; }`).status).toBe(0);
  });
  it.each([
    "function make() { return {n: 1, d: 2, labelOf: function() { return 'half'; }}; } var record = make(); upd('question', record);",
    "function make() { return {n: 1, d: 2, labelOf: function() { return 'half'; }}; } var record = make(); upd('formatter', record.labelOf);",
    "upd('question', {n: 1, d: 2, labelOf: function() { return 'half'; }});",
    "var question = {}; question._checkFn = function(answer) { return answer === 1; };",
    "upd('question', {id: 'quiz', choices: function() { return []; }});",
    "function make() { return {id: 'quiz', choices: function() { return []; }}; } var record = make(); upd('question', record);",
    "function make() { return {n: 1, d: 2, labelOf: function() { return 'half'; }}; } var record = make(); upd('formatter', record[field]);",
    "var lens = (function() { return {choices: function() { return []; }, answer: function() { return 1; }}; })(); upd('question', lens);",
    "function makeCard() { return {id: 'card', label: 'Card', pic: function() { return h('img', null); }}; } var card = makeCard(); card.pic(); const alias = makeCard; setToolData('fixture', {cards: [alias()]});",
  ])('still rejects a genuinely serialized callback: %s', (source) => {
    expect(scan('scan_fn_in_tool_state.cjs', source).status).toBe(1);
  });
});
