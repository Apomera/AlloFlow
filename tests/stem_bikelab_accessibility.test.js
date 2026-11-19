import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'stem_lab/stem_tool_bikelab.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_bikelab.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Bike Lab accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('uses semantic headers and real buttons in the gearing matrix', () => {
    const text = source();
    expect(text).toContain("h('caption', { className: 'sr-only' }");
    expect(text).toContain("h('th', { scope: 'col'");
    expect(text).toContain("h('th', { key: j, scope: 'col'");
    expect(text).toContain("h('th', { scope: 'row'");
    expect(text).toContain("'aria-label': __alloAriaFill(__alloT('stem.bikelab.a11y_select_tooth_chainring_and_tooth_cog_gear_inches', 'Select {ct}-tooth chainring");
    expect(text).toContain("'aria-pressed': isCur ? 'true' : 'false'");
    expect(text).toContain('min-h-6');
    expect(text).not.toContain("return h('td', { key: j, onClick:");
  });

  it('names fit, signal, and parts visualizations', () => {
    const text = source();
    expect(text).toContain("role: 'img', 'aria-label': __alloAriaFill(__alloT('stem.bikelab.a11y_bike_fit_diagram_showing_saddle_height_centimeters_reach', 'Bike fit diagram showing saddle height {value1} centimeters");
    expect(text).toContain("var signalLabels = { left_straight:");
    // The pictures are named by what the arm is doing. A name like "for a right turn" would answer the question.
    expect(text).toContain("h('div', { role: 'img', 'aria-label': signalLabels[kind] || __alloT('stem.bikelab.a11y_rider_seen_from_behind', 'Rider seen from behind') }, armPoseSvg(kind))");
    expect(text.slice(text.indexOf('var signalLabels = {'), text.indexOf('armPoseSvg(kind))'))).not.toMatch(/for a (left|right) turn|slowing or stopping/);
    expect(text).toContain("role: 'img', 'aria-label': __alloAriaFill(__alloT('stem.bikelab.a11y_bicycle_parts_diagram_selected_part_use_the_parts_by', 'Bicycle parts diagram. Selected part: {name}.");
    expect(text).toContain('Use the Parts by category buttons to select a part.');
  });

  it('associates each Helmet Fit label with its range input', () => {
    const text = source();
    expect(text).toContain("var sliderRow = function(id, label");
    expect(text).toContain("h('label', { htmlFor: id");
    expect(text).toContain("id: id, type: 'range'");
    expect(text).toContain("sliderRow('bikelab-helmet-position'");
    expect(text).toContain("sliderRow('bikelab-strap-angle'");
    expect(text).toContain("sliderRow('bikelab-chin-slack'");
  });

  it('provides a semantic subview heading and a described, keyboard-discoverable ride canvas', () => {
    const text = source();
    expect(text).toContain("h('h1', { className: 'font-black text-slate-800 text-lg', tabIndex: -1, 'data-bikelab-view-title': 'true' }, props.title)"); // focus lands here on entering a view
    expect(text).toContain("id: 'bikelab-ride-canvas-description', className: 'sr-only'");
    expect(text).toContain("role: 'img', tabIndex: 0, 'data-bikelab-canvas': 'true'");
    expect(text).toContain("width: '100%', height: 'auto', aspectRatio: '900 / 440'");
    expect(text).toContain("'aria-describedby': 'bikelab-ride-canvas-description'");
    expect(text).toContain('focus-visible:ring-4 focus-visible:ring-cyan-300');
  });
});
