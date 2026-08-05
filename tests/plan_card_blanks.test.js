// A plan step with nothing filled in must SAY so.
//
// _commandWorkflowPlanCard filtered out params with no value, so a step the
// planner could not fill rendered as a bare label and the blank was invisible.
// That matters because the chat proposes rather than executes, and the plan is
// editable in plain language ("set step 1 grade to 4") -- but only if you can
// see there is something to set.
//
// It is deliberately NOT a required-param check: contract.requires is
// capabilities and contract.params is only an allow-list, so nothing in the
// system knows which param a command actually needs. The card can say a step is
// blank; it cannot say which blank matters.
//
// The function is module-internal (UdlChat exports only planAndSendUdlMessage
// and handleSendUDLMessage), so we lift it out of the BUILT module by brace
// matching and exercise the shipped text directly.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

let planCard;
beforeAll(() => {
  const src = readFileSync('udl_chat_module.js', 'utf8');
  const start = src.indexOf('function _commandWorkflowPlanCard(');
  if (start < 0) throw new Error('_commandWorkflowPlanCard not found in the built module');
  let depth = 0, end = -1, seen = false;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') { depth++; seen = true; }
    else if (src[i] === '}') { depth--; if (seen && depth === 0) { end = i + 1; break; } }
  }
  if (end < 0) throw new Error('could not brace-match the function');
  // eslint-disable-next-line no-new-func
  planCard = new Function(src.slice(start, end) + '; return _commandWorkflowPlanCard;')();
});

const t = (_k, fb) => fb;

// Minimal AlloCommands stand-in: the card only needs the registry, contracts
// and the audience resolver.
const makeAC = (params) => ({
  buildAlloCommands: () => [{ id: 'create_lesson', label: 'Create a lesson' }],
  getCommandContract: () => ({ params, requires: [], produces: [] }),
  getCommandAudience: () => 'teacher',
});

const cardFor = (step, params) =>
  planCard({ steps: [step], dryRun: { steps: [{ readiness: { status: 'ready', detail: '' } }] } }, makeAC(params), {}, t).text;

describe('an unfilled plan step names its blank', () => {
  it('says nothing is set, and shows the phrasing that sets it', () => {
    const text = cardFor({ commandId: 'create_lesson', params: {} }, ['topic', 'grade']);
    expect(text, 'the blank is visible').toContain('nothing set');
    // The hint has to match the edit grammar the chat already accepts:
    // "set step 1 topic to ...".
    expect(text).toContain('set step 1 topic to');
  });

  it('treats blank-string params as unset, not as values', () => {
    const text = cardFor({ commandId: 'create_lesson', params: { topic: '', grade: null } }, ['topic', 'grade']);
    expect(text).toContain('nothing set');
  });
});

describe('it stays quiet when there is nothing useful to say', () => {
  it('says nothing when the step already has a param', () => {
    const text = cardFor({ commandId: 'create_lesson', params: { topic: 'volcanoes' } }, ['topic', 'grade']);
    expect(text, 'a filled step is left alone').not.toContain('nothing set');
    expect(text, 'and still shows its value').toContain('topic: volcanoes');
  });

  it('says nothing for a command that takes no params at all', () => {
    // Most commands declare no params. Telling the user "nothing set" about
    // open_stem_lab would be noise on nearly every card.
    const text = cardFor({ commandId: 'create_lesson', params: {} }, []);
    expect(text).not.toContain('nothing set');
  });

  it('does not break on a host without getCommandContract', () => {
    const AC = { buildAlloCommands: () => [], getCommandAudience: () => 'teacher' };
    const card = planCard({ steps: [{ commandId: 'create_lesson', params: {} }], dryRun: { steps: [] } }, AC, {}, t);
    expect(card && card.text, 'card still rendered').toBeTruthy();
  });
});
