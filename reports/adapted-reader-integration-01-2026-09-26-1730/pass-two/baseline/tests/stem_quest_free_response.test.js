import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// A reflection quest completes as soon as the response reaches minLength, and
// the textarea used to render only while `!disp.done`. So the moment the quest
// was marked complete the box the student had written in was removed from the
// page: they could not finish the sentence, reread what they had said, or fix
// a typo -- and nothing else on the row displayed the text, though it still
// went into the teacher's report verbatim.
//
// Separately, quest progress is the ONLY copy of that writing, and a failed
// localStorage write reached the console and nowhere else.

const HUB = 'stem_lab/stem_lab_module.js';
const source = () => readFileSync(HUB, 'utf8');

function extractBalanced(src, openAt, openChar, closeChar) {
  let depth = 0, quote = null, lineComment = false, blockComment = false;
  for (let i = openAt; i < src.length; i++) {
    const char = src[i], next = src[i + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote) { if (char === '\\') { i++; continue; } if (char === quote) quote = null; continue; }
    if (char === '/' && next === '/') { lineComment = true; i++; continue; }
    if (char === '/' && next === '*') { blockComment = true; i++; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === openChar) depth++;
    if (char === closeChar) { depth--; if (depth === 0) return src.slice(openAt, i + 1); }
  }
  throw new Error('Could not find balanced ' + openChar + closeChar);
}

function extractFunction(src, name) {
  const declaration = new RegExp('function ' + name + '\\s*\\(').exec(src);
  expect(declaration, 'hub no longer declares ' + name).not.toBeNull();
  const openAt = src.indexOf('{', declaration.index);
  return src.slice(declaration.index, openAt) + extractBalanced(src, openAt, '{', '}');
}

function loadQuestEngine() {
  const src = source();
  const sandbox = {
    window: { StemLab: { _registry: {} } },
    _questHookWarned: {},
    Object, Array, Date, Math, JSON, String, Number, isFinite,
    console: { warn: () => {} }
  };
  runInNewContext([
    extractFunction(src, '_getToolQuestHooks'),
    extractFunction(src, '_safeQuestHookCall'),
    extractFunction(src, '_getToolQuestState'),
    extractFunction(src, '_questPct'),
    extractFunction(src, '_getQuestDisplay'),
    extractFunction(src, '_evaluateQuests'),
    'this.display=_getQuestDisplay; this.evaluate=_evaluateQuests;'
  ].join('\n'), sandbox);
  return sandbox;
}

const REFLECTION = { qid: 'q1', type: 'freeResponse', toolId: null, label: 'Reflect', params: { minLength: 30 } };
const STATION = { id: 's1', quests: [REFLECTION] };
const progressWith = (text) => ({ s1: { q1: { response: text } } });
const LONG = 'I learned that water evaporates and then condenses';

describe('a completed reflection stays visible and editable', () => {
  it('no longer hides the textarea behind !disp.done', () => {
    const src = source();
    // The exact shape of the regression.
    expect(src).not.toContain("quest.type === 'freeResponse' && !disp.done && React.createElement(\"textarea\"");
  });

  it('renders the textarea for a completed reflection too', () => {
    const src = source();
    const at = src.indexOf("quest.type === 'freeResponse' && React.createElement(\"div\"");
    expect(at, 'free-response block moved').toBeGreaterThanOrEqual(0);
    const region = src.slice(at, at + 2000);
    expect(region).toContain('React.createElement("textarea"');
    // The textarea must NOT be gated on completion inside the block either.
    const textareaAt = region.indexOf('React.createElement("textarea"');
    expect(region.slice(0, textareaAt)).not.toContain('!disp.done &&');
  });

  it('labels the box once the quest is complete', () => {
    const src = source();
    const at = src.indexOf("quest.type === 'freeResponse' && React.createElement(\"div\"");
    const region = src.slice(at, at + 2000);
    expect(region).toContain('disp.done && React.createElement("label"');
    expect(region).toContain('you can still edit it');
  });

  it('ties that label to the textarea for assistive tech', () => {
    const src = source();
    const at = src.indexOf("quest.type === 'freeResponse' && React.createElement(\"div\"");
    const region = src.slice(at, at + 2000);
    // htmlFor / id must agree, or the label names nothing.
    expect(region).toContain("htmlFor: 'stem-quest-response-' + quest.qid");
    expect(region).toContain("id: 'stem-quest-response-' + quest.qid");
  });

  it('the quest really does complete at minLength, which is what hid the box', () => {
    const sb = loadQuestEngine();
    const out = sb.evaluate(STATION, {}, progressWith(LONG));
    expect(out.s1.q1.complete).toBe(true);
    expect(sb.display(REFLECTION, {}, out, 's1').done).toBe(true);
  });

  it('keeps the text the teacher report prints', () => {
    const sb = loadQuestEngine();
    const out = sb.evaluate(STATION, {}, progressWith(LONG));
    // The student must be able to see exactly what gets reported.
    expect(out.s1.q1.response).toBe(LONG);
    expect(source()).toContain("report += '\\n   Response: \"' + qp.response + '\"'");
  });

  it('does not complete a response below the threshold', () => {
    const sb = loadQuestEngine();
    const out = sb.evaluate(STATION, {}, progressWith('too short'));
    expect(((out.s1 || {}).q1 || {}).complete).toBeFalsy();
  });
});

describe('a failed save of student writing is surfaced', () => {
  const saveRegion = () => {
    const src = source();
    const at = src.indexOf('_questSaveFailedRef');
    expect(at, 'quest-save guard is gone').toBeGreaterThanOrEqual(0);
    return src.slice(at, at + 1600);
  };

  it('tells the student on screen and through the live region', () => {
    const region = saveRegion();
    expect(region).toContain('addToast(msg');
    expect(region).toContain('announceToSR(msg)');
  });

  it('names the action that preserves the work', () => {
    const region = saveRegion();
    // "It failed" is not actionable; the message must say what to do.
    expect(region).toMatch(/copy it somewhere before you close/i);
  });

  it('warns once per run of failures, not once per keystroke', () => {
    const region = saveRegion();
    // Every character typed re-runs this effect.
    expect(region).toContain('if (!_questSaveFailedRef.current)');
    expect(region).toContain('_questSaveFailedRef.current = true;');
  });

  it('re-arms after a successful save', () => {
    const region = saveRegion();
    expect(region).toContain('_questSaveFailedRef.current = false;');
  });

  it('still logs for the developer', () => {
    expect(saveRegion()).toContain('console.warn');
  });
});

describe('dead expansion state is gone', () => {
  it('no longer declares _questFreeResponseOpen', () => {
    const src = source();
    // Declared once, never read or set; the textarea is always present now.
    expect(src).not.toContain('var [_questFreeResponseOpen, _setQuestFreeResponseOpen]');
  });
});
