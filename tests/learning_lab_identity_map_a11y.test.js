import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal Identity Map accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalIdentityMap(props) {');
  const end = source.indexOf('  function PersonalCareerExplorer(props) {', start);
  const map = source.slice(start, end);

  it('preserves unrelated section data during automatic saves', () => {
    expect(map).toContain("setData(Object.assign({}, data, { map: Object.assign({}, m, patch) }))");
    expect(map).not.toContain('setData({ map:');
  });

  it('uses a named semantic section and list for the identity dimensions', () => {
    expect(map).toContain("hh('section', { 'aria-labelledby': 'learning-lab-identity-dimensions-heading'");
    expect(map).toContain("hh('ul', { 'aria-label': 'Identity map dimensions'");
    expect(map).toContain("return hh('li', { key: 'id-' + d.id");
  });

  it('associates each visible dimension label with its textarea', () => {
    expect(map).toContain("var fieldId = 'learning-lab-identity-' + d.id");
    expect(map).toContain("hh('label', { htmlFor: fieldId");
    expect(map).toContain("hh('textarea', { id: fieldId");
    expect(map).not.toContain('tkTextarea(');
  });

  it('programmatically associates each prompt and the save note', () => {
    expect(map).toContain("var promptId = fieldId + '-prompt'");
    expect(map).toContain("'aria-describedby': promptId + ' learning-lab-identity-save-note'");
    expect(map).toContain("id: 'learning-lab-identity-save-note'");
  });

  it('identifies every identity response as optional', () => {
    expect(map).toContain("d.label, ' (optional)'");
    expect(map).not.toContain('required: true');
  });

  it('discloses automatic saving and privacy considerations', () => {
    expect(map).toContain('Each response is optional and saves automatically in this browser; saving does not send or show your map to anyone.');
    expect(map).toContain('Identity information can be personal');
    expect(map).toContain('use a device and account you trust');
  });

  it('announces a completed automatic save when a field loses focus', () => {
    expect(map).toContain("onBlur: function() { llAnnounce(d.label + ' saved automatically.'); }");
    expect(map).not.toContain('llAnnounce(event.target.value');
  });

  it('provides comfortably sized multiline response fields', () => {
    expect(map).toContain("width: '100%', minHeight: 104");
    expect(map).toContain("resize: 'vertical'");
    expect(map).toContain("maxLength: 4000");
  });

  it('uses lighter text colors for small dimension labels', () => {
    for (const color of ['#ddd6fe', '#a7f3d0', '#fde68a', '#bfdbfe', '#a5f3fc', '#fbcfe8', '#fed7aa']) {
      expect(map).toContain(`textColor: '${color}'`);
    }
  });

  it('uses a native 44-pixel print button with an accessible text name', () => {
    expect(map).toContain("hh('button', { type: 'button', onClick: print");
    expect(map).toContain("'Print identity map'");
    expect(map).toContain("minHeight: 44, padding: '9px 14px'");
    expect(map).not.toContain("tkBtn('🖨 Print map'");
  });

  it('announces print success and failure states', () => {
    expect(map).toContain("llAnnounce('Opening the browser print dialog for your identity map.')");
    expect(map).toContain("llAnnounce('The print dialog could not be opened in this browser.')");
  });

  it('hides decorative icons from assistive technology', () => {
    expect(map).toContain("hh('span', { 'aria-hidden': 'true' }, d.icon + ' ')");
    expect(map).toContain("hh('span', { 'aria-hidden': 'true' }, '🖨 ')");
  });

  it('labels introductory and usage guidance as complementary regions', () => {
    expect(map).toContain("hh('aside', { 'aria-labelledby': 'learning-lab-identity-intro-heading'");
    expect(map).toContain("hh('aside', { 'aria-labelledby': 'learning-lab-identity-use-heading'");
    expect(map).toContain('You control whether and with whom you share this map.');
  });

  it('handles malformed legacy map data without crashing or corrupting saves', () => {
    expect(map).toContain("var data = props.data && typeof props.data === 'object' ? props.data : { map: {} };");
    expect(map).toContain("var m = data.map && typeof data.map === 'object' && !Array.isArray(data.map) ? data.map : {};");
    expect(map).toContain("function fieldText(value) { return typeof value === 'string' ? value : ''; }");
    expect(map).toContain('value: fieldText(m[d.id])');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
