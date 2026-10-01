import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { parse } from '@babel/parser';
import babel from '@babel/core';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const renderer = readFileSync('view_renderers_source.jsx', 'utf8');
const names = ['STYLE_POINTER_EVENTS_NONE', 'renderFlowShape', 'getElbowPath'];
const nodes = parse(renderer, { sourceType: 'script', plugins: ['jsx'] }).program.body.filter(node => node.type === 'VariableDeclaration' && node.declarations.some(d => names.includes(d.id.name)));
const compiled = babel.transformSync(nodes.map(n => renderer.slice(n.start, n.end)).join('\n'), { plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false }).code;
const { renderFlowShape, getElbowPath } = new Function('React', compiled + '\nreturn {renderFlowShape,getElbowPath};')(React);
function fixture(overrides = {}) {
  let items = [{ id: 'n1', type: 'flow-process', text: 'Check evidence', x: 790, y: 580, custom: 'preserved' }, { id: 'n2', x: 10, y: 20 }];
  const deps = { isMapLocked: false, isChallengeActive: false, isTeacherMode: true, handleNodeMouseDown: vi.fn(), handleNodeClick: vi.fn(), handleDeleteNode: vi.fn(), mapContainerRef: { current: { offsetWidth: 800, offsetHeight: 600 } }, setConceptMapNodes: vi.fn(update => { items = update(items); }), t: key => key, ...overrides };
  return { deps, getItems: () => items, shape: (node = items[0], selected = true) => renderFlowShape(node, selected, deps) };
}
function key(key, extra = {}) { return { key, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...extra }; }
describe('flow helpers colocated with their CDN consumers', () => {
  it('preserves selection, naming, and pointer actions with the current host callbacks', () => {
    const f = fixture(), shape = f.shape();
    expect(shape.props).toMatchObject({ role: 'button', tabIndex: 0, 'aria-label': 'Check evidence', 'aria-pressed': true, transform: 'translate(790,580)' });
    const event = key('Enter'); shape.props.onKeyDown(event);
    expect(f.deps.handleNodeClick).toHaveBeenCalledWith(event, 'n1'); expect(event.preventDefault).toHaveBeenCalled();
    shape.props.onMouseDown(event); expect(f.deps.handleNodeMouseDown).toHaveBeenCalledWith(event, 'n1');
  });
  it('keeps arrow/Shift movement bounded and leaves other nodes and metadata unchanged', () => {
    const f = fixture(), original = f.getItems(), shape = f.shape();
    shape.props.onKeyDown(key('ArrowRight', { shiftKey: true })); shape.props.onKeyDown(key('ArrowDown', { shiftKey: true }));
    expect(f.getItems()[0]).toMatchObject({ x: 800, y: 600, custom: 'preserved' });
    expect(original[0]).toMatchObject({ x: 790, y: 580 }); expect(f.getItems()[1]).toBe(original[1]);
    shape.props.onKeyDown(key('ArrowLeft')); expect(f.getItems()[0].x).toBe(790);
    expect(f.deps.setConceptMapNodes).toHaveBeenCalledTimes(3);
  });
  it.each([{ isMapLocked: true }, { isChallengeActive: true }, { isTeacherMode: false }])('preserves deletion restrictions: %j', flags => {
    const f = fixture(flags); f.shape().props.onKeyDown(key('Delete')); f.shape().props.onKeyDown(key('Backspace'));
    expect(f.deps.handleDeleteNode).not.toHaveBeenCalled(); expect(f.shape().props.children[1]).toBe(false);
  });
  it('allows teacher deletion and ignores movement and drag in locked maps', () => {
    const editable = fixture(); editable.shape().props.onKeyDown(key('Delete')); expect(editable.deps.handleDeleteNode).toHaveBeenCalledWith('n1');
    const locked = fixture({ isMapLocked: true }); const shape = locked.shape();
    shape.props.onKeyDown(key('ArrowRight')); shape.props.onMouseDown({});
    expect(locked.deps.setConceptMapNodes).not.toHaveBeenCalled(); expect(locked.deps.handleNodeMouseDown).not.toHaveBeenCalled();
    shape.props.onKeyDown(key(' ')); expect(locked.deps.handleNodeClick).toHaveBeenCalledTimes(1);
  });
  it.each([['flow-start', 'ellipse'], ['flow-end', 'ellipse'], ['flow-decision', 'polygon'], ['flow-note', 'path'], ['flow-process', 'rect'], ['unknown', 'rect']])('keeps %s shape geometry', (type, element) => {
    const f = fixture(); const shape = f.shape({ id: 'shape', x: 1, y: 2, type, text: 'Node' }, false);
    const geometry = shape.props.children[0].props.children[0];
    expect(geometry.type).toBe(element); expect(geometry.props.stroke).toBe('#94a3b8');
    const selected = f.shape({ id: 'shape', x: 1, y: 2, type, text: 'Node' }, true);
    expect(selected.props.children[0].props.children[0].props.stroke).toBe('#6366f1');
  });
  it('retains the precise connector offsets and empty-node behavior', () => {
    expect(getElbowPath(null, {})).toBe('');
    expect(getElbowPath({ x: 100, y: 100, type: 'flow-process' }, { x: 200, y: 300, type: 'flow-decision' })).toBe('M 100 130 L 100 190 L 200 190 L 200 250');
  });
  it.each(['Flow Chart', 'Process Flow / Sequence'])('uses local deterministic layout for %s without AI or the old host helper', async structureType => {
    const win = { AlloModules: {}, innerWidth: 1000, innerHeight: 800 };
    vm.runInNewContext(readFileSync('concept_map_handlers_module.js', 'utf8'), { window: win });
    const original = ['flow-start', 'flow-process', 'flow-decision', 'flow-note', 'flow-end'].map((type, i) => ({ id: String(i), type, x: 9, y: 8, metadata: 'kept' }));
    const setNodes = vi.fn(), callGemini = vi.fn(), warnLog = vi.fn();
    await win.AlloModules.CmapHandlers.handleAutoLayout(original, [], { generatedContent: { data: { structureType } }, conceptMapNodes: [], conceptMapEdges: [], isTeacherMode: true, mapContainerRef: { current: { offsetWidth: 800, offsetHeight: 600 } }, setConceptMapNodes: setNodes, callGemini, warnLog, t: key => key, addToast: vi.fn(), calculateFlowLayout: () => { throw Error('Legacy host helper must not be called'); } });
    expect(warnLog).not.toHaveBeenCalled(); expect(callGemini).not.toHaveBeenCalled();
    expect(Array.from(setNodes.mock.calls[0][0], n => [n.x, n.y])).toEqual([[400, 50], [400, 150], [400, 270], [600, 310], [400, 440]]);
    expect(original.every(n => n.x === 9 && n.y === 8)).toBe(true);
    expect(setNodes.mock.calls[0][0].every(n => n.metadata === 'kept')).toBe(true);
  });
  it('removes only helper ownership from the shells and keeps actual renderer/handler wiring', () => {
    for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const source = readFileSync(file, 'utf8');
      for (const name of [...names, 'calculateFlowLayout']) expect(source.includes('const ' + name + ' =')).toBe(false);
      expect(source.includes('_m.renderInteractiveMap(_alloViewRenderersDeps())')).toBe(true);
      expect(source.includes('handleNodeMouseDown,')).toBe(true); expect(source.includes('setConceptMapNodes,')).toBe(true);
    }
    expect(renderer).toContain('renderFlowShape(node, connectingSourceId === node.id, deps)');
    for (const name of ['view_renderers_module.js', 'concept_map_handlers_module.js']) expect(readFileSync('desktop/web-app/public/' + name, 'utf8')).toBe(readFileSync(name, 'utf8'));
  });
});


describe('interactive SVG container regression', () => {
  it.each(['Flow Chart', 'Venn Diagram'])('exposes flow controls while leaving Venn decoration hidden: %s', structureType => {
    const win = { AlloModules: {} };
    vm.runInNewContext(readFileSync('view_renderers_module.js', 'utf8'), { window: win, React });
    const tree = win.AlloModules.ViewRenderers.renderInteractiveMap({ generatedContent: { data: { structureType } }, nodeInputText: '', conceptMapNodes: [], conceptMapEdges: [], VENN_ZONES: { A: {}, B: {}, shared: {} }, t: key => key });
    const findSvg = node => {
      if (!React.isValidElement(node)) return null;
      if (node.type === 'svg' && node.props.className?.includes('absolute inset-0 w-full h-full')) return node;
      return React.Children.toArray(node.props.children).map(findSvg).find(Boolean);
    };
    const svg = findSvg(tree);
    expect(svg).toBeTruthy();
    expect(svg.props['aria-hidden']).toBe(structureType === 'Venn Diagram' ? true : undefined);
  });
  it('allows flow shape pointer events through the decorative SVG layer', () => {
    expect(fixture().shape().props.className.split(/\s+/)).toContain('pointer-events-auto');
  });
});
