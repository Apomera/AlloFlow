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
  forward: {
    label: 'move forward',
    values: [{ input: 'distance', property: 'distance', check: 'Number', defaultValue: 50, label: 'distance' }],
    colour: '#6366f1'
  },
  backward: {
    label: 'move backward',
    values: [{ input: 'distance', property: 'distance', check: 'Number', defaultValue: 50, label: 'distance' }],
    colour: '#818cf8'
  },
  right: {
    label: 'turn right',
    values: [{ input: 'degrees', property: 'degrees', check: 'Number', defaultValue: 90, label: 'degrees' }],
    colour: '#d97706'
  },
  left: {
    label: 'turn left',
    values: [{ input: 'degrees', property: 'degrees', check: 'Number', defaultValue: 90, label: 'degrees' }],
    colour: '#d97706'
  },
  penup: { label: 'pen up', colour: '#64748b' },
  pendown: { label: 'pen down', colour: '#16a34a' },
  color: { label: 'set colour', fields: [['color', '#6366f1']], colour: '#db2777' },
  width: {
    label: 'set line width',
    values: [{ input: 'width', property: 'width', check: 'Number', defaultValue: 2, label: 'width' }],
    colour: '#0f766e'
  },
  circle: {
    label: 'draw circle',
    values: [{ input: 'radius', property: 'radius', check: 'Number', defaultValue: 30, label: 'radius' }],
    colour: '#0891b2'
  },
  goto: {
    label: 'go to',
    values: [
      { input: 'x', property: 'x', check: 'Number', defaultValue: 250, label: 'x' },
      { input: 'y', property: 'y', check: 'Number', defaultValue: 250, label: 'y' }
    ],
    colour: '#9333ea'
  },
  home: { label: 'go home', colour: '#57534e' },
  repeat: { label: 'repeat', fields: [['times', '4'], [null, 'times']], statements: ['children'], colour: '#7c3aed' },
  setVar: {
    label: 'set variable',
    fields: [['varName', 'size']],
    values: [{ input: 'varValue', property: 'varValue', check: 'Number', defaultValue: 50, label: 'to' }],
    colour: '#0284c7'
  },
  changeVar: {
    label: 'change variable',
    fields: [['varName', 'size']],
    values: [{ input: 'varDelta', property: 'varDelta', check: 'Number', defaultValue: 10, label: 'by' }],
    colour: '#0369a1'
  },
  ifelse: {
    label: 'if',
    values: [{ input: 'condition', property: 'condition', check: 'Boolean', defaultValue: 'x > 250', label: 'condition' }],
    statements: ['children', 'elseChildren'],
    statementLabels: ['do', 'else'],
    colour: '#c026d3'
  }
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

const VALUE_TYPES = {
  number: 'allo_value_number',
  variable: 'allo_value_variable',
  state: 'allo_value_state',
  boolean: 'allo_value_boolean',
  arithmetic: 'allo_value_arithmetic',
  compare: 'allo_value_compare',
  logic: 'allo_value_logic',
  not: 'allo_value_not'
};

export const WORKSPACE_STATE_VERSION = 2;
let definitionsInstalled = false;
let activeMessages = {};

function translated(key, fallback) {
  const value = activeMessages && activeMessages[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export function setMessages(messages) {
  activeMessages = messages && typeof messages === 'object'
    ? { ...messages }
    : {};
}

function blockLabel(domain, type, fallback) {
  return translated(`block.${domain}.${type}`, fallback);
}

function blocklyType(domain, programType) {
  return `allo_${domain}_${programType}`;
}

function programType(block) {
  return block.type.replace(/^allo_(?:turtle|robot)_/, '');
}

function installValueDefinitions() {
  Blockly.Blocks[VALUE_TYPES.number] = {
    init() {
      this.appendDummyInput()
        .appendField(new Blockly.FieldNumber(0), 'NUM');
      this.setOutput(true, 'Number');
      this.setColour('#0f766e');
      this.setTooltip(translated('value.number.tooltip', 'A number value'));
    }
  };
  Blockly.Blocks[VALUE_TYPES.variable] = {
    init() {
      this.appendDummyInput()
        .appendField(translated('value.variable.label', 'variable'))
        .appendField('$')
        .appendField(new Blockly.FieldTextInput('size'), 'NAME');
      this.setOutput(true);
      this.setColour('#0284c7');
      this.setTooltip(translated('value.variable.tooltip', 'The current value of a variable'));
    }
  };
  Blockly.Blocks[VALUE_TYPES.state] = {
    init() {
      this.appendDummyInput()
        .appendField(translated('value.state.label', 'turtle'))
        .appendField(new Blockly.FieldDropdown([
          ['x', 'x'],
          ['y', 'y'],
          [translated('value.state.angle', 'angle'), 'angle'],
          [translated('value.state.penDown', 'pen down'), 'penDown']
        ]), 'STATE');
      this.setOutput(true);
      this.setColour('#9333ea');
      this.setTooltip(translated('value.state.tooltip', 'A current turtle state value'));
    }
  };
  Blockly.Blocks[VALUE_TYPES.boolean] = {
    init() {
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          [translated('value.boolean.true', 'true'), 'true'],
          [translated('value.boolean.false', 'false'), 'false']
        ]), 'BOOL');
      this.setOutput(true, 'Boolean');
      this.setColour('#c026d3');
      this.setTooltip(translated('value.boolean.tooltip', 'A true or false value'));
    }
  };
  Blockly.Blocks[VALUE_TYPES.arithmetic] = {
    init() {
      this.appendValueInput('A').setCheck('Number');
      this.appendDummyInput().appendField(new Blockly.FieldDropdown([
        ['+', '+'], ['-', '-'], ['\u00d7', '*'], ['\u00f7', '/']
      ]), 'OP');
      this.appendValueInput('B').setCheck('Number');
      this.setInputsInline(true);
      this.setOutput(true, 'Number');
      this.setColour('#0f766e');
      this.setTooltip(translated('value.arithmetic.tooltip', 'Calculate with two number values'));
    }
  };
  Blockly.Blocks[VALUE_TYPES.compare] = {
    init() {
      this.appendValueInput('A');
      this.appendDummyInput().appendField(new Blockly.FieldDropdown([
        ['>', '>'], ['<', '<'], ['\u2265', '>='], ['\u2264', '<='], ['=', '=='], ['\u2260', '!=']
      ]), 'OP');
      this.appendValueInput('B');
      this.setInputsInline(true);
      this.setOutput(true, 'Boolean');
      this.setColour('#c026d3');
      this.setTooltip(translated('value.compare.tooltip', 'Compare two values'));
    }
  };
  Blockly.Blocks[VALUE_TYPES.logic] = {
    init() {
      this.appendValueInput('A').setCheck('Boolean');
      this.appendDummyInput().appendField(new Blockly.FieldDropdown([
        [translated('value.logic.and', 'and'), 'and'],
        [translated('value.logic.or', 'or'), 'or']
      ]), 'OP');
      this.appendValueInput('B').setCheck('Boolean');
      this.setInputsInline(true);
      this.setOutput(true, 'Boolean');
      this.setColour('#c026d3');
      this.setTooltip(translated('value.logic.tooltip', 'Combine two conditions'));
    }
  };
  Blockly.Blocks[VALUE_TYPES.not] = {
    init() {
      this.appendValueInput('VALUE')
        .setCheck('Boolean')
        .appendField(translated('value.not.label', 'not'));
      this.setOutput(true, 'Boolean');
      this.setColour('#c026d3');
      this.setTooltip(translated('value.not.tooltip', 'Reverse a condition'));
    }
  };
}

function installDefinitions() {
  if (definitionsInstalled) return;
  definitionsInstalled = true;
  installValueDefinitions();

  [['turtle', TURTLE_TYPES], ['robot', ROBOT_TYPES]].forEach(([domain, definitions]) => {
    Object.keys(definitions).forEach((type) => {
      const definition = definitions[type];
      Blockly.Blocks[blocklyType(domain, type)] = {
        init() {
          const label = blockLabel(domain, type, definition.label);
          const header = this.appendDummyInput().appendField(label);
          (definition.fields || []).forEach(([name, value]) => {
            if (name) header.appendField(new Blockly.FieldTextInput(value), name);
            else header.appendField(translated(`unit.${value}`, value));
          });
          (definition.values || []).forEach((valueDefinition) => {
            const input = this.appendValueInput(valueDefinition.input);
            if (valueDefinition.check) input.setCheck(valueDefinition.check);
            if (valueDefinition.label) {
              input.appendField(translated(`input.${valueDefinition.label}`, valueDefinition.label));
            }
          });
          (definition.statements || []).forEach((statement, index) => {
            const statementLabel = (definition.statementLabels || [])[index] || 'do';
            this.appendStatementInput(statement)
              .appendField(translated(`statement.${statementLabel}`, statementLabel));
          });
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.setColour(definition.colour);
          this.setTooltip(`${label} ${translated('codingBlock', 'coding block')}`);
        }
      };
    });
  });
}

function definitionsFor(domain) {
  return domain === 'robot' ? ROBOT_TYPES : TURTLE_TYPES;
}

function numberShadow(value) {
  return {
    shadow: {
      type: VALUE_TYPES.number,
      fields: { NUM: Number(value) }
    }
  };
}

function booleanShadow(value) {
  return {
    shadow: {
      type: VALUE_TYPES.boolean,
      fields: { BOOL: value === false ? 'false' : 'true' }
    }
  };
}

function toolboxBlock(domain, type) {
  const definition = definitionsFor(domain)[type];
  const inputs = {};
  (definition.values || []).forEach((valueDefinition) => {
    inputs[valueDefinition.input] = valueDefinition.check === 'Boolean'
      ? booleanShadow(true)
      : numberShadow(valueDefinition.defaultValue);
  });
  const item = { kind: 'block', type: blocklyType(domain, type) };
  if (Object.keys(inputs).length) item.inputs = inputs;
  return item;
}

function valueToolboxBlock(type, inputs) {
  const item = { kind: 'block', type };
  if (inputs) item.inputs = inputs;
  return item;
}

function toolboxFor(domain) {
  const defs = definitionsFor(domain);
  const categories = domain === 'robot'
    ? [
        ['movement', 'Movement', '#6366f1', ['moveForward', 'turnRight', 'turnLeft']],
        ['actions', 'Actions', '#059669', ['collectGem', 'paintCell']],
        ['control', 'Control', '#7c3aed', ['repeatR', 'whileNotGoal', 'ifWall', 'ifGem']]
      ]
    : [
        ['movement', 'Movement', '#6366f1', ['forward', 'backward', 'right', 'left', 'goto', 'home']],
        ['drawing', 'Drawing', '#db2777', ['penup', 'pendown', 'color', 'width', 'circle']],
        ['control', 'Control', '#7c3aed', ['repeat', 'ifelse']],
        ['variables', 'Variables', '#0284c7', ['setVar', 'changeVar']]
      ];
  const contents = categories.map(([key, name, colour, types]) => ({
    kind: 'category',
    name: translated(`category.${key}`, name),
    colour,
    contents: types.filter((type) => defs[type]).map((type) => toolboxBlock(domain, type))
  }));
  if (domain === 'turtle') {
    contents.push({
      kind: 'category',
      name: translated('category.values', 'Values'),
      colour: '#0f766e',
      contents: [
        valueToolboxBlock(VALUE_TYPES.number),
        valueToolboxBlock(VALUE_TYPES.variable),
        valueToolboxBlock(VALUE_TYPES.state),
        valueToolboxBlock(VALUE_TYPES.arithmetic, {
          A: numberShadow(10),
          B: numberShadow(5)
        })
      ]
    });
    contents.push({
      kind: 'category',
      name: translated('category.logic', 'Logic'),
      colour: '#c026d3',
      contents: [
        valueToolboxBlock(VALUE_TYPES.compare, {
          A: numberShadow(10),
          B: numberShadow(5)
        }),
        valueToolboxBlock(VALUE_TYPES.logic, {
          A: booleanShadow(true),
          B: booleanShadow(false)
        }),
        valueToolboxBlock(VALUE_TYPES.not, { VALUE: booleanShadow(true) }),
        valueToolboxBlock(VALUE_TYPES.boolean)
      ]
    });
  }
  return { kind: 'categoryToolbox', contents };
}

function tokenizeExpression(source) {
  const text = String(source == null ? '' : source);
  const tokens = [];
  let index = 0;
  while (index < text.length) {
    const rest = text.slice(index);
    const whitespace = rest.match(/^\s+/);
    if (whitespace) {
      index += whitespace[0].length;
      continue;
    }
    const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (number) {
      tokens.push({ type: 'number', value: Number(number[0]) });
      index += number[0].length;
      continue;
    }
    const variable = rest.match(/^\$[A-Za-z_][A-Za-z0-9_]*/);
    if (variable) {
      tokens.push({ type: 'variable', value: variable[0].slice(1) });
      index += variable[0].length;
      continue;
    }
    const identifier = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (identifier) {
      const value = identifier[0];
      tokens.push({
        type: ['and', 'or', 'not'].includes(value) ? 'operator' : 'identifier',
        value
      });
      index += value.length;
      continue;
    }
    const pair = rest.slice(0, 2);
    if (['>=', '<=', '==', '!='].includes(pair)) {
      tokens.push({ type: 'operator', value: pair });
      index += 2;
      continue;
    }
    const char = rest.charAt(0);
    if ('+-*/><()'.includes(char)) {
      tokens.push({ type: char === '(' || char === ')' ? 'paren' : 'operator', value: char });
      index += 1;
      continue;
    }
    return null;
  }
  tokens.push({ type: 'eof', value: '' });
  return tokens;
}

export function parseExpressionSource(source) {
  const tokens = tokenizeExpression(source);
  if (!tokens) return null;
  let index = 0;
  const current = () => tokens[index];
  const take = () => tokens[index++];
  function primary() {
    const token = current();
    if (token.type === 'number') {
      take();
      return { kind: 'number', value: token.value };
    }
    if (token.type === 'variable') {
      take();
      return { kind: 'variable', name: token.value };
    }
    if (token.type === 'identifier') {
      take();
      if (token.value === 'true' || token.value === 'false') {
        return { kind: 'boolean', value: token.value === 'true' };
      }
      if (['x', 'y', 'angle', 'penDown'].includes(token.value)) {
        return { kind: 'state', value: token.value };
      }
      return null;
    }
    if (token.type === 'paren' && token.value === '(') {
      take();
      const expression = logicalOr();
      if (!expression || current().type !== 'paren' || current().value !== ')') return null;
      take();
      return expression;
    }
    return null;
  }
  function unary() {
    if (current().type === 'operator' && ['-', 'not'].includes(current().value)) {
      const operator = take().value;
      const value = unary();
      return value ? { kind: operator === 'not' ? 'not' : 'negate', value } : null;
    }
    return primary();
  }
  function multiplicative() {
    let left = unary();
    while (left && current().type === 'operator' && ['*', '/'].includes(current().value)) {
      const operator = take().value;
      const right = unary();
      if (!right) return null;
      left = { kind: 'arithmetic', operator, left, right };
    }
    return left;
  }
  function additive() {
    let left = multiplicative();
    while (left && current().type === 'operator' && ['+', '-'].includes(current().value)) {
      const operator = take().value;
      const right = multiplicative();
      if (!right) return null;
      left = { kind: 'arithmetic', operator, left, right };
    }
    return left;
  }
  function comparison() {
    const left = additive();
    if (!left) return null;
    if (current().type === 'operator' && ['>', '<', '>=', '<=', '==', '!='].includes(current().value)) {
      const operator = take().value;
      const right = additive();
      return right ? { kind: 'compare', operator, left, right } : null;
    }
    return left;
  }
  function logicalAnd() {
    let left = comparison();
    while (left && current().type === 'operator' && current().value === 'and') {
      take();
      const right = comparison();
      if (!right) return null;
      left = { kind: 'logic', operator: 'and', left, right };
    }
    return left;
  }
  function logicalOr() {
    let left = logicalAnd();
    while (left && current().type === 'operator' && current().value === 'or') {
      take();
      const right = logicalAnd();
      if (!right) return null;
      left = { kind: 'logic', operator: 'or', left, right };
    }
    return left;
  }
  const expression = logicalOr();
  return expression && current().type === 'eof' ? expression : null;
}

function expressionNodeToBlock(workspace, node) {
  if (!node) return null;
  let block;
  if (node.kind === 'number') {
    block = workspace.newBlock(VALUE_TYPES.number);
    block.setFieldValue(String(node.value), 'NUM');
    return block;
  }
  if (node.kind === 'variable') {
    block = workspace.newBlock(VALUE_TYPES.variable);
    block.setFieldValue(node.name || 'size', 'NAME');
    return block;
  }
  if (node.kind === 'state') {
    block = workspace.newBlock(VALUE_TYPES.state);
    block.setFieldValue(node.value, 'STATE');
    return block;
  }
  if (node.kind === 'boolean') {
    block = workspace.newBlock(VALUE_TYPES.boolean);
    block.setFieldValue(node.value ? 'true' : 'false', 'BOOL');
    return block;
  }
  if (node.kind === 'negate') {
    if (node.value.kind === 'number') {
      block = workspace.newBlock(VALUE_TYPES.number);
      block.setFieldValue(String(-node.value.value), 'NUM');
      return block;
    }
    node = {
      kind: 'arithmetic',
      operator: '-',
      left: { kind: 'number', value: 0 },
      right: node.value
    };
  }
  if (node.kind === 'not') {
    block = workspace.newBlock(VALUE_TYPES.not);
    const child = expressionNodeToBlock(workspace, node.value);
    if (child) block.getInput('VALUE').connection.connect(child.outputConnection);
    return block;
  }
  const type = node.kind === 'arithmetic'
    ? VALUE_TYPES.arithmetic
    : node.kind === 'compare'
      ? VALUE_TYPES.compare
      : node.kind === 'logic'
        ? VALUE_TYPES.logic
        : '';
  if (!type) return null;
  block = workspace.newBlock(type);
  block.setFieldValue(node.operator, 'OP');
  const left = expressionNodeToBlock(workspace, node.left);
  const right = expressionNodeToBlock(workspace, node.right);
  if (left) block.getInput('A').connection.connect(left.outputConnection);
  if (right) block.getInput('B').connection.connect(right.outputConnection);
  return block;
}

function defaultExpressionNode(valueDefinition) {
  const parsed = parseExpressionSource(valueDefinition.defaultValue);
  if (parsed) return parsed;
  return valueDefinition.check === 'Boolean'
    ? { kind: 'boolean', value: true }
    : { kind: 'number', value: 0 };
}

function sourceValue(node, valueDefinition) {
  if (node[valueDefinition.property] != null) return node[valueDefinition.property];
  if (valueDefinition.property === 'varValue' && node.value != null) return node.value;
  if (valueDefinition.property === 'varDelta' && node.amount != null) return node.amount;
  return valueDefinition.defaultValue;
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
    (definition.values || []).forEach((valueDefinition) => {
      const source = sourceValue(node, valueDefinition);
      const expressionNode = parseExpressionSource(source) || defaultExpressionNode(valueDefinition);
      const valueBlock = expressionNodeToBlock(workspace, expressionNode);
      const input = block.getInput(valueDefinition.input);
      if (valueBlock && input) input.connection.connect(valueBlock.outputConnection);
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

function expressionPrecedence(block) {
  if (!block) return 99;
  if (block.type === VALUE_TYPES.logic) return block.getFieldValue('OP') === 'or' ? 1 : 2;
  if (block.type === VALUE_TYPES.compare) return 3;
  if (block.type === VALUE_TYPES.arithmetic) {
    return ['*', '/'].includes(block.getFieldValue('OP')) ? 5 : 4;
  }
  if (block.type === VALUE_TYPES.not) return 6;
  return 7;
}

function expressionBlockToSource(block, parentPrecedence = 0, rightSide = false) {
  if (!block) return '0';
  if (block.type === VALUE_TYPES.number) {
    const number = Number(block.getFieldValue('NUM'));
    return Number.isFinite(number) ? String(number) : '0';
  }
  if (block.type === VALUE_TYPES.variable) {
    const name = String(block.getFieldValue('NAME') || 'size').replace(/[^A-Za-z0-9_]/g, '');
    return `$${name || 'size'}`;
  }
  if (block.type === VALUE_TYPES.state) return block.getFieldValue('STATE') || 'x';
  if (block.type === VALUE_TYPES.boolean) return block.getFieldValue('BOOL') === 'false' ? 'false' : 'true';
  if (block.type === VALUE_TYPES.not) {
    const child = block.getInputTargetBlock('VALUE');
    const source = `not ${expressionBlockToSource(child, 6)}`;
    return 6 < parentPrecedence ? `(${source})` : source;
  }
  if ([VALUE_TYPES.arithmetic, VALUE_TYPES.compare, VALUE_TYPES.logic].includes(block.type)) {
    const precedence = expressionPrecedence(block);
    const operator = block.getFieldValue('OP') || '+';
    const left = expressionBlockToSource(block.getInputTargetBlock('A'), precedence, false);
    const needsStrictRight = operator === '-' || operator === '/' || block.type === VALUE_TYPES.compare;
    const right = expressionBlockToSource(
      block.getInputTargetBlock('B'),
      needsStrictRight ? precedence + 1 : precedence,
      true
    );
    const source = `${left} ${operator} ${right}`;
    return precedence < parentPrecedence || (rightSide && precedence === parentPrecedence && needsStrictRight)
      ? `(${source})`
      : source;
  }
  return '0';
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
        const numericFields = ['distance', 'degrees', 'width', 'radius', 'x', 'y', 'times'];
        const number = Number(raw);
        node[name] = numericFields.includes(name) && raw !== '' && Number.isFinite(number)
          ? number
          : (raw == null ? defaultValue : raw);
      });
      (definition.values || []).forEach((valueDefinition) => {
        const valueBlock = cursor.getInputTargetBlock(valueDefinition.input);
        const source = valueBlock
          ? expressionBlockToSource(valueBlock)
          : String(valueDefinition.defaultValue);
        const number = Number(source);
        node[valueDefinition.property] = valueDefinition.check === 'Number' &&
          source !== '' &&
          Number.isFinite(number)
          ? number
          : source;
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

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableValue(value[key]);
      return result;
    }, {});
  }
  return value;
}

function stableProgramSource(program) {
  return JSON.stringify(stableValue(program || []));
}

export function programHash(program) {
  const source = stableProgramSource(program);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `p2-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function saveWorkspaceState(workspace, domain, program) {
  const canonicalProgram = program || readProgram(workspace, domain);
  return {
    version: WORKSPACE_STATE_VERSION,
    domain: domain === 'robot' ? 'robot' : 'turtle',
    programHash: programHash(canonicalProgram),
    workspace: Blockly.serialization.workspaces.save(workspace)
  };
}

function workspaceStateReason(state, domain, program) {
  if (!state || typeof state !== 'object') return 'missing';
  if (state.version !== WORKSPACE_STATE_VERSION) return 'version_mismatch';
  if (state.domain !== domain) return 'domain_mismatch';
  if (!state.workspace || typeof state.workspace !== 'object') return 'missing_workspace';
  if (state.programHash !== programHash(program)) return 'program_mismatch';
  return '';
}

export function restoreWorkspaceState(workspace, domain, program, state) {
  installDefinitions();
  const safeDomain = domain === 'robot' ? 'robot' : 'turtle';
  const canonicalProgram = program || [];
  const reason = workspaceStateReason(state, safeDomain, canonicalProgram);
  if (reason) {
    loadProgram(workspace, safeDomain, canonicalProgram);
    return { restored: false, reason };
  }

  let loaded = false;
  Blockly.Events.disable();
  try {
    workspace.clear();
    Blockly.serialization.workspaces.load(state.workspace, workspace);
    loaded = true;
  } catch (error) {
    loaded = false;
  } finally {
    Blockly.Events.enable();
  }
  if (!loaded) {
    loadProgram(workspace, safeDomain, canonicalProgram);
    return { restored: false, reason: 'invalid_workspace' };
  }

  try {
    if (stableProgramSource(readProgram(workspace, safeDomain)) !== stableProgramSource(canonicalProgram)) {
      loadProgram(workspace, safeDomain, canonicalProgram);
      return { restored: false, reason: 'content_mismatch' };
    }
  } catch (error) {
    loadProgram(workspace, safeDomain, canonicalProgram);
    return { restored: false, reason: 'invalid_workspace' };
  }
  return { restored: true, reason: 'restored' };
}

export function createHeadlessWorkspace(domain, program) {
  installDefinitions();
  const workspace = new Blockly.Workspace();
  loadProgram(workspace, domain, program || []);
  return workspace;
}

export function mount(container, options = {}) {
  setMessages(options.messages);
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
  restoreWorkspaceState(workspace, domain, options.program || [], options.workspaceState);
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
  programHash,
  saveWorkspaceState,
  restoreWorkspaceState,
  setMessages,
  isProgramChange,
  createHeadlessWorkspace,
  parseExpressionSource,
  WORKSPACE_STATE_VERSION
};

if (typeof window !== 'undefined') {
  window.AlloBlocklyRuntime = publicRuntime;
}

export default publicRuntime;
