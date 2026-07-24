import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab shared Toolkit accessibility foundation', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function tkCard(border, children) {');
  const end = source.indexOf('  // ── A. PERSONAL GOAL TRACKER', start);
  const helpers = source.slice(start, end);

  it('renders shared action controls as explicit non-submit buttons', () => {
    expect(helpers).toContain("type: 'button', onClick: onClick, 'data-ll-focusable': true");
  });

  it('derives display dates from local time, not UTC (regression: evening entries shifted a day)', () => {
    expect(source).toContain('function localISODate(d) {');
    expect(source).toContain('function todayISO() {\n    return localISODate(new Date());\n  }');
    expect(source).toContain('relDate(localISODate(createdDate))');
    expect(source).toContain('var nextDueISO = localISODate(nextDate);');
    // The only remaining toISOString().slice(0, 10) uses are verified UTC round-trips
    // on local ISO strings (isoFromDayNumber pairs and the routine streak cursor).
    expect(source.match(/toISOString\(\)\.slice\(0, ?10\)/g)).toHaveLength(3);
  });

  it('gives shared buttons a minimum 44 by 44 pixel target', () => {
    expect(helpers).toContain("minWidth: 44, minHeight: 44, padding: '8px 16px'");
  });

  it('connects shared buttons to the Learning Lab focus-visible treatment', () => {
    expect(source).toContain("[data-ll-focusable]:focus-visible{outline:3px solid #fbbf24!important");
    expect(helpers).toContain("'data-ll-focusable': true");
  });

  it('connects shared text inputs to the focus-visible treatment', () => {
    expect(helpers).toContain("type: 'text', value: value || '', placeholder: placeholder || '', 'data-ll-focusable': true");
  });

  it('connects shared textareas to the focus-visible treatment', () => {
    expect(helpers).toContain("rows: rows || 3, 'data-ll-focusable': true");
  });

  it('gives shared input controls a minimum 44-pixel height', () => {
    expect(helpers.match(/width: '100%', minHeight: 44, padding: '10px 12px'/g)).toHaveLength(2);
  });

  it('separates DOM attributes from visual style options', () => {
    expect(helpers).toContain('function tkFieldOptions(extra)');
    expect(helpers).toContain("var attributeNames = ['id', 'name', 'type', 'role', 'required', 'disabled', 'readOnly', 'maxLength', 'minLength', 'autoComplete', 'inputMode', 'pattern', 'title', 'tabIndex']");
    expect(helpers).toContain("key.indexOf('aria-') === 0 || key.indexOf('data-') === 0");
    expect(helpers).toContain('else style[key] = extra[key]');
  });

  it('applies extracted attributes to both native field elements', () => {
    expect(helpers.match(/}, options\.props\)\);/g)).toHaveLength(2);
  });

  it('keeps extracted visual options in the style object', () => {
    expect(helpers.match(/}, options\.style\)/g)).toHaveLength(2);
    const fields = helpers.slice(helpers.indexOf('  function tkFieldOptions'), helpers.indexOf('  function tkSectionHeader'));
    expect(fields).not.toContain('}, extra || {})');
  });

  it('uses a semantic level-two heading for each Toolkit section title', () => {
    expect(helpers).toContain("hh('h2', { id: headingId || undefined, tabIndex: headingId ? -1 : undefined, style: { margin: 0");
    expect(helpers).not.toContain("hh('div', { style: { fontSize: 15, fontWeight: 900");
  });

  it('hides shared header and empty-state icons from assistive technology', () => {
    expect(helpers.match(/'aria-hidden': 'true'/g).length).toBeGreaterThanOrEqual(2);
    expect(helpers).toContain("hh('div', { 'aria-hidden': 'true', style: { fontSize: 36");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
