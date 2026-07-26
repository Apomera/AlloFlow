/*
 * AlloFlow Blockly bridge.
 *
 * Blockly is bundled locally and loaded only when a learner opens Visual Blocks.
 * The bridge converts Blockly's workspace graph to the Coding Playground's
 * existing, compact program arrays; the existing interpreter remains authoritative.
 */
import * as BlocklyNamespace from 'blockly/core';
import * as EnglishMessages from 'blockly/msg/en';

const Blockly = BlocklyNamespace.Workspace
  ? BlocklyNamespace
  : Object.keys(BlocklyNamespace).map((key) => BlocklyNamespace[key]).find((value) => value && value.Workspace);

Blockly.setLocale(EnglishMessages);

const TURTLE_TYPES = {
  forward: { label: 'move forward', fields: [['distance', '50'], [null, 'px']], colour: '#6366f1' },
  backward: { label: 'move backward', fields: [['distance', '50'], [null, 'px']], colour: '#818cf8' },
  right: { label: 'turn right', fields: [['degrees', '90'], [null, '°']], colour: '#d97706' },
  left: { label: 'turn left', fields: [['degrees', '90'], [null, '°']], colour: '#d97706' },
  penup: { label: 'pen up', colour: '#64748b' },
  pendown: { label: 'pen down', colour: '#16a34a' },
  color: { label: 'set colour', fields: [['color', '#6366f1']], colour: '#db2777' },
  width: { label: 'set line width', fields: [['width', '2'], [null, 'px']], colour: '#0f766e' },
  circle: { label: 'draw circle', fields: [['radius', '30'], [null, 'px']], colour: '#0891b2' },
  goto: { label: 'go to x', fields: [['x', '250'], [null, 'y'], ['y', '250']], colour: '#9333ea' },
  home: { label: 'go home', colour: '#57534e' },
  repeat: { label: 'repeat', fields: [['times', '4'], [null, 'times']], statements: ['children'], colour: '#7c3aed' },
  setVar: { label: 'set variable', fields: [['varName', 'size'], [null, 'to'], ['value', '50']], colour: '#0284c7' },
  changeVar: { label: 'change variable', fields: [['varName', 'size'], [null, 'by'], ['amount', '10']], colour: '#0369a1' },
  ifelse: { label: 'if', fields: [['condition', 'x > 250']], statements: ['children', 'elseChildren'], statementLabels: ['do', 'else'], colour: '#c026d3' }
};

const ROBOT_TYPES = {
  moveForward: { label: 'move forward', colour: '#6366f1' },
  turnRight: { label: 'turn right', colour: '#d97706' },
  turnLeft: { label: 'turn left', colour: '#d97706' },
  collectGem: { label: 'collect gem', colour: '#059669' },
  paintCell: { label: 'paint cell', colour: '#db2777' },
  repeatR: { label: 'repeat', fields: [['times', '3'], [null, 'times']], statements: ['children'], colour: '#7c3aed' },
  whileNotGoal: { label: 'while not at goal', statements: ['children'], colour: '#0891b2' },
  ifWall: { label: 'if wall ahead', statements: ['children', 'elseChildren'], statementLabels: ['do', 'else'], colour: '#dc2626' },
  ifGem: { label: 'if standing on gem', statements: ['children', 'elseChildren'], statementLabels: ['do', 'else'], colour: '#059669' }
};

let definitionsInstalled = false;

function blocklyType(domain, programType) {
  return `allo_${domain}_${programType}`;
}

function programType(block) {
  return block.type.replace(/^allo_(?:turtle|robot)_/, '');
}

function installDefinitions() {
  if (definitionsInstalled) return;
  definitionsInstalled = true;

  [['turtle', TURTLE_TYPES], ['robot', ROBOT_TYPES]].forEach(([domain, definitions]) => {
    Object.keys(definitions).forEach((type) => {
      const definition = definitions[type];
      Blockly.Blocks[blocklyType(domain, type)] = {
        init() {
          const header = this.appendDummyInput().appendField(definition.label);
          (definition.fields || []).forEach(([name, value]) => {
            if (name) header.appendField(new Blockly.FieldTextInput(value), name);
            else header.appendField(value);
          });
          (definition.statements || []).forEach((statement, index) => {
            this.appendStatementInput(statement)
              .appendField((definition.statementLabels || [])[index] || 'do');
          });
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.setColour(definition.colour);
          this.setTooltip(`${definition.label} coding block`);
        }
      };
    });
  });
}

function definitionsFor(domain) {
  return domain === 'robot' ? ROBOT_TYPES : TURTLE_TYPES;
}

function toolboxFor(domain) {
  const defs = definitionsFor(domain);
  const categories = domain === 'robot'
    ? [
        ['Movement', '#6366f1', ['moveForward', 'turnRight', 'turnLeft']],
        ['Actions', '#059669', ['collectGem', 'paintCell']],
        ['Control', '#7c3aed', ['repeatR', 'whileNotGoal', 'ifWall', 'ifGem']]
      ]
    : [
        ['Movement', '#6366f1', ['forward', 'backward', 'right', 'left', 'goto', 'home']],
        ['Drawing', '#db2777', ['penup', 'pendown', 'color', 'width', 'circle']],
        ['Control', '#7c3aed', ['repeat', 'ifelse']],
        ['Variables', '#0284c7', ['setVar', 'changeVar']]
      ];
  return {
    kind: 'categoryToolbox',
    contents: categories.map(([name, colour, types]) => ({
      kind: 'category',
      name,
      colour,
      contents: types.filter((type) => defs[type]).map((type) => ({
        kind: 'block',
        type: blocklyType(domain, type)
      }))
    }))
  };
}

function connectChain(workspace, domain, programs) {
  let previous = null;
  let first = null;
  (programs || []).forEach((node) => {
    if (!node || !definitionsFor(domain)[node.type]) return;
    const block = workspace.newBlock(blocklyType(domain, node.type));
    const definition = definitionsFor(domain)[node.type];
    (definition.fields || []).forEach(([name, defaultValue]) => {
      if (!name) return;
      const value = node[name] == null ? defaultValue : node[name];
      block.setFieldValue(String(value), name);
    });
    (definition.statements || []).forEach((statement) => {
      const child = connectChain(workspace, domain, node[statement] || []);
      if (child && block.getInput(statement)) {
        block.getInput(statement).connection.connect(child.previousConnection);
      }
    });
    if (previous) previous.nextConnection.connect(block.previousConnection);
    else first = block;
    previous = block;
  });
  return first;
}

export function loadProgram(workspace, domain, program) {
  installDefinitions();
  Blockly.Events.disable();
  try {
    workspace.clear();
    const first = connectChain(workspace, domain, program);
    if (first && typeof first.moveBy === 'function') first.moveBy(32, 32);
  } finally {
    Blockly.Events.enable();
  }
}

function readChain(block, domain) {
  const result = [];
  const definitions = definitionsFor(domain);
  let cursor = block;
  while (cursor) {
    const type = programType(cursor);
    const definition = definitions[type];
    if (definition) {
      const node = { type };
      (definition.fields || []).forEach(([name, defaultValue]) => {
        if (!name) return;
        const raw = cursor.getFieldValue(name);
        const numericFields = ['distance', 'degrees', 'width', 'radius', 'x', 'y', 'times', 'value', 'amount'];
        const number = Number(raw);
        node[name] = numericFields.includes(name) && raw !== '' && Number.isFinite(number) ? number : (raw == null ? defaultValue : raw);
      });
      (definition.statements || []).forEach((statement) => {
        const input = cursor.getInputTargetBlock(statement);
        node[statement] = input ? readChain(input, domain) : [];
      });
      result.push(node);
    }
    cursor = cursor.getNextBlock();
  }
  return result;
}

export function readProgram(workspace, domain) {
  installDefinitions();
  return workspace.getTopBlocks(true).reduce((program, block) => {
    return program.concat(readChain(block, domain));
  }, []);
}

export function createHeadlessWorkspace(domain, program) {
  installDefinitions();
  const workspace = new Blockly.Workspace();
  loadProgram(workspace, domain, program || []);
  return workspace;
}

export function mount(container, options = {}) {
  installDefinitions();
  const domain = options.domain === 'robot' ? 'robot' : 'turtle';
  const workspace = Blockly.inject(container, {
    toolbox: toolboxFor(domain),
    renderer: 'zelos',
    sounds: false,
    trashcan: true,
    move: { scrollbars: true, drag: true, wheel: true },
    zoom: { controls: true, wheel: true, startScale: 0.82, maxScale: 1.5, minScale: 0.45, scaleSpeed: 1.1 },
    grid: { spacing: 20, length: 3, colour: '#475569', snap: false },
    theme: Blockly.Theme.defineTheme('alloflowCoding', {
      base: Blockly.Themes.Classic,
      componentStyles: {
        workspaceBackgroundColour: '#0f172a',
        toolboxBackgroundColour: '#1e293b',
        toolboxForegroundColour: '#f8fafc',
        flyoutBackgroundColour: '#111827',
        flyoutForegroundColour: '#f8fafc',
        flyoutOpacity: 0.98,
        scrollbarColour: '#64748b',
        insertionMarkerColour: '#fbbf24',
        insertionMarkerOpacity: 0.4,
        cursorColour: '#fbbf24'
      }
    })
  });
  loadProgram(workspace, domain, options.program || []);
  return workspace;
}

export function isProgramChange(event) {
  return !!event && !event.isUiEvent && event.type !== Blockly.Events.FINISHED_LOADING;
}

export function resize(workspace) {
  Blockly.svgResize(workspace);
}

export const VERSION = Blockly.VERSION;
export { Blockly };

const publicRuntime = {
  VERSION,
  Blockly,
  mount,
  resize,
  loadProgram,
  readProgram,
  isProgramChange,
  createHeadlessWorkspace
};

if (typeof window !== 'undefined') {
  window.AlloBlocklyRuntime = publicRuntime;
}

export default publicRuntime;
