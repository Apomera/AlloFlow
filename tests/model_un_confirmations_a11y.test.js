import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('arcade_mode_modelun.js', 'utf8');
const count = value => source.split(value).length - 1;

function expectApprovalBefore(prompt, action) {
  const promptIndex = source.indexOf(prompt);
  const approvalIndex = source.indexOf('if (!approved) return;', promptIndex);
  const actionIndex = source.indexOf(action, approvalIndex);

  expect(promptIndex).toBeGreaterThan(-1);
  expect(approvalIndex).toBeGreaterThan(promptIndex);
  expect(actionIndex).toBeGreaterThan(approvalIndex);
}

describe('Model UN accessible confirmations', () => {
  it('routes all four consequential decisions through the accessible confirmation service', () => {
    expect(source).toContain('function requestModelUNConfirmation');
    expect(source).toContain('window.AlloFlowUX');
    expect(count('await requestModelUNConfirmation')).toBe(4);
    expect(count('confirm(')).toBe(1);
    expect(source).toContain('ux.confirm(');
    expect(source).not.toContain('window.confirm(');
  });

  it('fails closed when the accessible confirmation service is unavailable', () => {
    expect(source).toContain('Accessible confirmation service is unavailable; action cancelled.');
    expect(source).toContain('return Promise.resolve(false);');
    expect(source).toContain('return result === true;');
  });

  it('uses descriptive labels and appropriate warning or danger treatments', () => {
    expect(source).toContain("title: 'Skip remaining speeches?'");
    expect(source).toContain("cancelText: 'Keep debating'");
    expect(source).toContain("title: 'Proceed without adopted clauses?'");
    expect(source).toContain("cancelText: 'Return to drafting'");
    expect(source).toContain("title: 'Remove clause?'");
    expect(source).toContain("cancelText: 'Keep clause'");
    expect(source).toContain("title: 'Clear session notes?'");
    expect(source).toContain("cancelText: 'Keep notes'");
    expect(count("tone: 'warning'")).toBe(2);
    expect(count("tone: 'danger'")).toBe(2);
  });

  it('awaits approval before each state-changing action', () => {
    expect(source).toContain('async function advanceToVote()');
    expectApprovalBefore('Skip to Resolution Drafting anyway?', 'phase: PHASES.DRAFT');
    expectApprovalBefore('Proceed to a vote on the full draft anyway?', 'phase: PHASES.VOTE');
    expectApprovalBefore('Remove this clause from the resolution draft?', 'removeClause(c.id)');
    expectApprovalBefore('Clear all notes for this Model UN session?', "setNotes('')");
  });
});
