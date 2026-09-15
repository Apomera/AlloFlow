// chemBalance Organic: the functional-group recognition drill.
//
// WHY THIS FILE EXISTS
// The Organic section listed 18 functional groups as reference cards. Reading a card is
// not the same skill as spotting the group in a structure, and the errors students make
// are not random - they are SPECIFIC confusions (aldehyde/ketone, acid/ester,
// alcohol/ether, amide/amine, alcohol/phenol). So each wrong option carries its own
// explanation of what that group would have looked like.
//
// The drill is tab-gated and its feedback only exists after a click, so neither
// dev-tools/check_stem_render.cjs (default state = the hub) nor the render goldens
// would ever build it.
//
// The chemistry in every item and every distractor note is checked here against the
// tool's own ORGANIC_CHEM.functionalGroups table, so the drill cannot drift away from
// the reference cards printed directly above it.

import { beforeAll, describe, expect, it } from 'vitest';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const CHEMBALANCE = 'stem_lab/stem_tool_chembalance.js';

function frag(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

function organic(state) {
  return frag(renderTool('chemBalance', {
    chemBalance: { subtool: 'organic', _everPicked: true, ...(state ? { fgDrill: state } : {}) },
  }));
}

const testid = (el, id) => {
  const node = el.querySelector(`[data-testid="${id}"]`);
  return node ? node.textContent.replace(/\s+/g, ' ') : null;
};

describe('Functional-group drill — the bank', () => {
  let bank;
  let groups;

  beforeAll(() => {
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
    bank = window.__alloChemPure.FG_DRILL;
    groups = window.__alloChemPure.ORGANIC_GROUP_NAMES;
  });

  it('is exposed and non-trivial', () => {
    expect(Array.isArray(bank)).toBe(true);
    expect(bank.length).toBeGreaterThanOrEqual(8);
  });

  it('every item is internally consistent', () => {
    for (const item of bank) {
      expect(item.prompt, 'prompt').toBeTruthy();
      expect(item.hint, `hint for ${item.prompt}`).toBeTruthy();
      expect(item.options.length, `options for ${item.prompt}`).toBe(4);
      expect(Number.isInteger(item.correct)).toBe(true);
      expect(item.correct).toBeGreaterThanOrEqual(0);
      expect(item.correct).toBeLessThan(item.options.length);
      expect(item.why, `why for ${item.prompt}`).toBeTruthy();
      // No duplicate options - a repeated option can make two answers "right".
      expect(new Set(item.options).size, `duplicate options in ${item.prompt}`)
        .toBe(item.options.length);
    }
  });

  it('EVERY wrong option has its own explanation', () => {
    // The whole point of the drill. A missing distractor note silently falls back
    // to the generic "why", which teaches nothing about the specific confusion.
    const missing = [];
    for (const item of bank) {
      for (let i = 0; i < item.options.length; i += 1) {
        if (i === item.correct) continue;
        const note = item.distractors && item.distractors[i];
        if (!note || !String(note).trim()) {
          missing.push(`${item.prompt} -> ${item.options[i]}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('distractor notes explain the OTHER group, not just say "wrong"', () => {
    for (const item of bank) {
      for (const [i, note] of Object.entries(item.distractors || {})) {
        const optionName = item.options[Number(i)];
        // The note has to be substantive and mention what was actually picked.
        expect(String(note).length, `${item.prompt} -> ${optionName}`).toBeGreaterThan(40);
        const head = optionName.split(' ')[0].toLowerCase();
        expect(
          String(note).toLowerCase(),
          `${item.prompt} -> ${optionName} should name the group picked`
        ).toContain(head);
      }
    }
  });

  it('never marks the correct answer as a distractor', () => {
    for (const item of bank) {
      expect(
        item.distractors && item.distractors[item.correct],
        `${item.prompt} has a distractor note on its CORRECT option`
      ).toBeFalsy();
    }
  });

  it('only uses group names the reference cards actually teach', () => {
    // If the drill invented a group the cards above never mention, a student
    // would have no way to learn it. Checked against the tool's own table.
    expect(groups.length).toBeGreaterThanOrEqual(15);
    const known = new Set(groups.map((n) => n.toLowerCase()));
    const unknown = [];
    for (const item of bank) {
      for (const option of item.options) {
        if (!known.has(option.toLowerCase())) unknown.push(option);
      }
    }
    expect([...new Set(unknown)]).toEqual([]);
  });

  it('covers the classic confusable pairs', () => {
    // These are the pairs the drill exists for. Each must appear together as
    // options on at least one item, or that confusion is never exercised.
    const pairs = [
      ['Aldehyde', 'Ketone'],
      ['Carboxylic acid', 'Ester'],
      ['Alcohol', 'Ether'],
      ['Amine', 'Amide'],
      ['Alcohol', 'Phenol'],
      ['Alkene', 'Alkyne'],
    ];
    for (const [a, b] of pairs) {
      const found = bank.some((item) => item.options.includes(a) && item.options.includes(b));
      expect(found, `no item contrasts ${a} with ${b}`).toBe(true);
    }
  });
});

describe('Organic section — the drill renders and grades', () => {
  beforeAll(() => {
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
  });

  it('opens on the first structure with four choices and no feedback', () => {
    const el = organic();
    expect(testid(el, 'chem-fg-prompt')).toContain('CHO');
    expect(el.querySelectorAll('[data-fg-option]').length).toBe(4);
    // Nothing is revealed before the student answers.
    expect(el.querySelector('[data-testid="chem-fg-feedback"]')).toBeNull();
    expect(el.querySelector('[data-testid="chem-fg-next"]')).toBeNull();
  });

  it('explains the specific confusion on a wrong answer', () => {
    // Picking "Ketone" for an aldehyde must say what a ketone would look like.
    const el = organic({ idx: 0, picked: 1, score: 0, seen: 1 });
    const fb = testid(el, 'chem-fg-feedback');
    expect(fb).toContain('Not quite');
    expect(fb).toContain('MIDDLE');
    expect(fb).toContain('R–CO–R′');
  });

  it('gives a DIFFERENT explanation for a different wrong answer', () => {
    // The distractor notes must not collapse to one generic message.
    const asKetone = testid(organic({ idx: 0, picked: 1, score: 0, seen: 1 }), 'chem-fg-feedback');
    const asAcid = testid(organic({ idx: 0, picked: 2, score: 0, seen: 1 }), 'chem-fg-feedback');
    const asAlcohol = testid(organic({ idx: 0, picked: 3, score: 0, seen: 1 }), 'chem-fg-feedback');
    expect(asKetone).not.toBe(asAcid);
    expect(asAcid).not.toBe(asAlcohol);
    expect(asAcid).toContain('OH');
  });

  it('confirms and explains a correct answer', () => {
    const el = organic({ idx: 0, picked: 0, score: 1, seen: 1 });
    const fb = testid(el, 'chem-fg-feedback');
    expect(fb).toContain('Correct');
    expect(fb).toContain('aldehyde');
  });

  it('teaches the alcohol/phenol distinction rather than just failing it', () => {
    // Picking "Alcohol" for phenol is the near-miss worth explaining well.
    const el = organic({ idx: 5, picked: 0, score: 0, seen: 1 });
    const fb = testid(el, 'chem-fg-feedback');
    expect(fb).toContain('ring');
    expect(fb).toContain('acidic');
  });

  it('locks the options once answered, and marks both right and chosen', () => {
    const el = organic({ idx: 0, picked: 1, score: 0, seen: 1 });
    const options = [...el.querySelectorAll('[data-fg-option]')];
    for (const option of options) {
      expect(option.getAttribute('aria-disabled')).toBe('true');
      expect(option.hasAttribute('disabled')).toBe(true);
    }
    // aria-pressed marks what the STUDENT chose, so a screen reader can tell.
    expect(options[1].getAttribute('aria-pressed')).toBe('true');
    expect(options[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('offers Next until the last item, then reports the score', () => {
    const mid = organic({ idx: 0, picked: 0, score: 1, seen: 1 });
    expect(mid.querySelector('[data-testid="chem-fg-next"]')).toBeTruthy();
    expect(mid.querySelector('[data-testid="chem-fg-done"]')).toBeNull();

    const end = organic({ idx: 7, picked: 2, score: 6, seen: 8 });
    expect(end.querySelector('[data-testid="chem-fg-next"]')).toBeNull();
    expect(testid(end, 'chem-fg-done')).toContain('6/8');
  });

  it('announces the question and the verdict to screen readers', () => {
    const unanswered = organic().querySelector('[role="status"]').textContent;
    expect(unanswered).toContain('Question 1 of');

    const answered = organic({ idx: 0, picked: 1, score: 0, seen: 1 })
      .querySelector('[role="status"]').textContent;
    expect(answered).toContain('Not quite');
  });

  it('keeps the reference cards that were already there', () => {
    const el = organic();
    expect(el.textContent).toContain('Functional Groups');
    expect(el.textContent).toContain('IUPAC Naming Rules');
  });

  it('survives every item and every pick without leaking a placeholder', () => {
    const bank = window.__alloChemPure.FG_DRILL;
    for (let idx = 0; idx < bank.length; idx += 1) {
      for (let picked = 0; picked < 4; picked += 1) {
        const text = organic({ idx, picked, score: 0, seen: 1 }).textContent;
        expect(text, `item ${idx} pick ${picked}`).not.toMatch(/(^|[\s>(:,=])NaN([\s<),;%]|$)/);
        expect(text, `item ${idx} pick ${picked}`).not.toContain('undefined');
      }
    }
  });
});
