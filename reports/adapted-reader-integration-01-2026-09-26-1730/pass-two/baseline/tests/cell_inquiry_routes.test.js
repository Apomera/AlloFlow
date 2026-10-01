import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let C;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_cell.js', 'cell'); C = window.__alloCellPure; });
describe('Cell inquiry learning routes', () => {
  it('connects three real activities around each question', () => {
    expect(C.CELL_INQUIRY_ROUTES).toHaveLength(3);
    for (const route of C.CELL_INQUIRY_ROUTES) {
      expect(route.steps).toHaveLength(3);
      for (const step of route.steps) {
        expect(C.CELL_ACTIVITY_META[step.mode]).toBeTruthy();
        expect(step.prompt.length).toBeGreaterThan(40);
      }
    }
  });
  it('does not count blank or merely typed responses as recorded evidence', () => {
    const state = C.cellInquiryState({ _cellInquiryRecords: { balance: { step: 2, observations: ['   ', 'Typed draft', 'A recorded observation'], recorded: [true, false, true] } } }, 'balance');
    expect(state.count).toBe(1);
    expect(state.finished).toBe(false);
    expect(state.recorded).toEqual([false, false, true]);
  });
  it('normalizes saved state and safely isolates routes', () => {
    expect(C.cellInquiryState({}, 'toString')).toBeNull();
    for (const step of [99, -1, 1.5, 'broken']) expect(C.cellInquiryState({ _cellInquiryRecords: { balance: { step } } }, 'balance').step).toBe(0);
    const raw = { _cellInquiryRecords: { balance: { observations: ['Membrane observation'], recorded: [true] } } };
    expect(C.cellInquiryState(raw, 'balance').count).toBe(1);
    expect(C.cellInquiryState(raw, 'movement').count).toBe(0);
  });
  it('exports prompts and evidence without claiming assessed mastery', () => {
    const report = C.cellInquiryReport({ _cellInquiryRecords: { balance: { observations: ['My membrane evidence'] } } }, 'balance');
    expect(report).toContain('My membrane evidence');
    expect(report).toContain('Test one variable');
    expect(report).toContain('does not assess its accuracy or award mastery');
  });
});
describe('Activity discovery and orientation', () => {
  it('searches ideas as well as titles while respecting allowed activities', () => {
    expect(C.cellActivitySearch(' water ', ['observe', 'processes', 'osmoHunt'])).toEqual(['osmoHunt']);
    expect(C.cellActivitySearch('mitochondria', ['interior'])).toEqual(['interior']);
    expect(C.cellActivitySearch('infection', ['observe', 'interior'])).toEqual([]);
    expect(C.cellActivitySearch({}, ['observe'])).toEqual(['observe']);
  });
  it('shows accurate labels and keeps dashboards out of research activities', () => {
    for (const mode of ['osmoHunt', 'compare', 'library', 'processes']) {
      const html = renderTool('cell', { cell: { mode, _cellPicked: true } });
      expect(html).toContain('data-cell-current-activity="true"');
      expect(html).toContain(C.CELL_ACTIVITY_META[mode][0]);
      expect(html).not.toContain('data-cell-mission="true"');
      expect(html).toContain('Optional quests and progress');
    }
  });
  it('renders the route chooser and safe recovery from malformed search', () => {
    const html = renderTool('cell', { cell: { mode: 'observe', paused: true } });
    expect(html).toContain('What would you like to find out?');
    expect(html).toContain('data-cell-start-inquiry="balance"');
    expect(() => renderTool('cell', { cell: { mode: 'compare', _cellSearch: 25 } })).not.toThrow();
  });
  it('keeps source and deployment mirror identical', () => {
    expect(readFileSync('stem_lab/stem_tool_cell.js','utf8')).toBe(readFileSync('desktop/web-app/public/stem_lab/stem_tool_cell.js','utf8'));
  });
});
