import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, newStore } from './stem_widgets_smoke_harness.js';

export const candidatePath = 'stem_lab/stem_tool_brainatlas.js';
export const selectedKey = 'Allen_body_of_hippocampus_L';
export const selectionSelector = '[data-brainatlas-selection-explanation]';
export const genericSelector = '[data-brainatlas-explanation]';
export const functionSelector = '[data-brainatlas-selection-explanation-function]';
export const connectionsSelector = '[data-brainatlas-selection-explanation-connections]';

const baselineSource = readFileSync('stem_lab/stem_tool_brainatlas.js', 'utf8');
const profileBlock = baselineSource.split('// BEGIN BRAIN ATLAS STRUCTURE PROFILES')[1].split('// END BRAIN ATLAS STRUCTURE PROFILES')[0];
export const baselineProfiles = Function(profileBlock + ';return {profiles:BRAIN_ATLAS_STRUCTURE_PROFILES,references:BRAIN_ATLAS_PROFILE_SOURCES};')();
export const canonical = key => key.replace(/_[LR]$/i, '');
export const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];

export async function mountExplanations(initial = {}, context = {}) {
  const tool = loadTool(candidatePath, 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'medial', atlasDisplayMode: '3d', selected3DStructure: selectedKey, selectedRegion: 'hippocampus', ...initial } });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let latest;
  const render = async (changes = {}) => {
    Object.assign(store.toolData.brainAtlas, changes);
    const nodes = flatten(tool.render(makeCtx(context, store)));
    const shell = nodes.find(node => node.props?.['data-brainatlas-canvas-shell'] === 'true');
    if (!shell) throw new Error('The real Atlas canvas shell must render');
    const generic = flatten(shell).find(node => node.props?.['data-brainatlas-explanation'] !== undefined);
    const selected = flatten(shell).find(node => node.props?.['data-brainatlas-selection-explanation'] !== undefined);
    if (!generic || !shell.props.children.includes(generic)) throw new Error('Generic reading must remain a direct child of the real fullscreen shell');
    if (selected && !shell.props.children.includes(selected)) throw new Error('Selected reading must be a direct child of the real fullscreen shell');
    const guide = nodes.find(node => node.props?.['data-brainatlas-3d-guide'] === 'true');
    // Keep real shell child positions and both actual disclosures. Omit
    // canvases so these native-disclosure checks do not start a WebGL scene.
    const children = shell.props.children.map(child => child === generic || child === selected ? child : null);
    await React.act(async () => root.render(React.createElement(React.Fragment, null, React.cloneElement(shell, {}, children), guide || null)));
    latest = { nodes, shell, selected, generic, guide };
    return latest;
  };
  await render();
  return {
    host, store, render,
    get latest() { return latest; },
    get shell() { return host.querySelector('[data-brainatlas-canvas-shell]'); },
    get selected() { return host.querySelector(selectionSelector); },
    get generic() { return host.querySelector(genericSelector); },
    get guide() { return host.querySelector('[data-brainatlas-3d-guide]'); },
    async open(detail) {
      if (!detail) throw new Error('Cannot open an absent disclosure');
      if (!detail.open) await React.act(async () => detail.querySelector(':scope > summary').click());
    },
    async dispose() { await React.act(async () => root.unmount()); host.remove(); }
  };
}
