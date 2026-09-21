// A tool's quest counters must land where the host looks for them.
//
// The host resolves quest state in _getToolQuestState (stem_lab_module.js):
//
//     questDataKeys -> merge each of those keys
//     questDataKey  -> toolData[thatKey]
//     otherwise     -> toolData[toolId] || toolData['_' + toolId]
//
// Timeline Studio wrote its counters to toolData._timeline via bumpSlice() and
// declared no questDataKey, so the host read toolData['timelineStudio'] — a key
// the tool never writes. Every check() received {} and all three of its quests
// ("Open a timeline", "Turn a reading into a timeline", "Add a timeline event
// by hand") could never complete, no matter what a student did.
//
// Nothing caught it: the tool is absent from `var stemToolModules`, so the
// hostile-toolData gate reports "--tool=timeline matches no registered tool"
// and skips it entirely. Unreachable and untested at once.
//
// This runs the host's REAL lookup against the tool's REAL hooks rather than
// pinning the source line, so a rename of the key on either side still passes
// as long as the two agree.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const HOST = readFileSync(resolve(ROOT, 'stem_lab/stem_lab_module.js'), 'utf8');
const TOOL = readFileSync(resolve(ROOT, 'stem_lab/stem_tool_timeline.js'), 'utf8');

/** Lift a brace-matched function body out of source. */
function liftFunction(src, name) {
  const at = src.indexOf('function ' + name);
  if (at < 0) return null;
  let depth = 0;
  for (let i = src.indexOf('{', at); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(at, i + 1);
    }
  }
  return null;
}

/** Lift a bracket-matched array literal that follows `label`. */
function liftArray(src, label) {
  const at = src.indexOf(label);
  if (at < 0) return null;
  const start = src.indexOf('[', at);
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

const questDataKey = (/questDataKey:\s*'([^']+)'/.exec(TOOL) || [])[1] || null;
const registry = { timelineStudio: questDataKey ? { questDataKey } : {} };

const lookupSrc = liftFunction(HOST, '_getToolQuestState');
// eslint-disable-next-line no-new-func
const getToolQuestState = new Function('window', `${lookupSrc}; return _getToolQuestState;`)({
  StemLab: { _registry: registry },
});

const hooksSrc = liftArray(TOOL, 'questHooks:');
// eslint-disable-next-line no-new-func
const hooks = new Function(`return ${hooksSrc};`)();

/** What bumpSlice() actually writes, mirrored from the tool's own shape. */
function saveAfterDoingEverything() {
  const counters = {};
  ['openedCount', 'generatedCount', 'manualCount'].forEach((key) => {
    counters[key] = (counters[key] || 0) + 1;
    if (key === 'openedCount') counters.opened = true;
  });
  return { _timeline: counters };
}

describe('Timeline Studio quest state reaches the host', () => {
  it('the harness lifted both sides', () => {
    // Without this, a failed lift would make every assertion below vacuous.
    expect(lookupSrc, '_getToolQuestState not found in the host').toBeTruthy();
    expect(hooks, 'questHooks not parsed from the tool').toHaveLength(3);
    expect(typeof getToolQuestState).toBe('function');
  });

  it('every quest completes once the student has done the work', () => {
    const state = getToolQuestState('timelineStudio', saveAfterDoingEverything());
    const unreachable = hooks.filter((hook) => !hook.check(state)).map((hook) => hook.id);
    expect(
      unreachable,
      `quests that can never complete: ${unreachable.join(', ')}. The tool writes its ` +
        'counters to toolData._timeline; check questDataKey still names that key.',
    ).toHaveLength(0);
  });

  it('no quest fires on an empty save', () => {
    // Guards the opposite failure: a lookup that returns everything would make
    // the test above pass while quests complete themselves for free.
    const state = getToolQuestState('timelineStudio', {});
    const firing = hooks.filter((hook) => hook.check(state)).map((hook) => hook.id);
    expect(firing, `quests completing with no student work: ${firing.join(', ')}`).toHaveLength(0);
  });

  it('the declared key matches where the tool writes', () => {
    // bumpSlice is the only writer; if it moves, the key must move with it.
    expect(TOOL).toMatch(/next\._timeline\s*=\s*cur/);
    expect(questDataKey, 'questDataKey must name the key bumpSlice() writes').toBe('_timeline');
  });
});
