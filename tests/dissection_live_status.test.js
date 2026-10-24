import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8'), bodies = new Map();
function body(name) {
  if (!bodies.has(name)) {
    const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
    if (matches.length !== 1) throw Error('Expected one production function: ' + name);
    const m = matches[0], start = m.index + m[1].length, ending = new RegExp('^' + m[1] + '}[ \\t]*\\r?$', 'gm');
    ending.lastIndex = start; const end = ending.exec(source);
    if (!end) throw Error('Missing standalone function ending: ' + name);
    bodies.set(name, source.slice(start, end.index + end[0].length));
  }
  return bodies.get(name);
}
const setLiveText = new Function('return (' + body('setDissectionLiveText') + ');')();
function selectedStatus(organ) {
  const node = document.createElement('p'); node.id = 'diss-canvas-status'; node.setAttribute('role', 'status'); node.setAttribute('aria-live', 'polite');
  const text = document.createTextNode('Observe: Select a visible structure.');
  const selection = document.createElement('span'); selection.dataset.selection = organ; selection.textContent = ' Selected ' + organ + ' in the Organs layer.';
  node.append(text, selection); return { node, text, selection };
}

describe('React-safe dissection live messages', () => {
  it.each(['Pancreas', 'Spleen'])('preserves the %s selection node through preview, deselection and reattachment', organ => {
    const { node, text, selection } = selectedStatus(organ), originalSelectionText = selection.firstChild;
    expect(setLiveText(node, 'Continue to the next available layer.')).toBe(true);
    expect(node.firstChild).toBe(text); expect(text.nodeValue).toBe('Continue to the next available layer.');
    expect(node.lastChild).toBe(selection); expect(selection.parentNode).toBe(node); expect(selection.firstChild).toBe(originalSelectionText);
    expect(selection.textContent).toBe(' Selected ' + organ + ' in the Organs layer.');
    // React's real commit failed here when parent.textContent had detached this span.
    expect(() => node.removeChild(selection)).not.toThrow(); expect(selection.parentNode).toBeNull();
    expect(setLiveText(node, 'Select a structure.')).toBe(true); expect(node.childNodes).toHaveLength(1); expect(node.firstChild).toBe(text);
    node.appendChild(selection); expect(setLiveText(node, 'Probe ready.')).toBe(true);
    expect(node.childNodes).toHaveLength(2); expect(node.lastChild).toBe(selection);
    expect(() => node.removeChild(selection)).not.toThrow();
    expect(node.getAttribute('role')).toBe('status'); expect(node.getAttribute('aria-live')).toBe('polite');
  });

  it('does not repeat DOM writes or replace the message leaf when the announcement is unchanged', () => {
    const { node, text, selection } = selectedStatus('Pancreas'), observer = new MutationObserver(() => {});
    observer.observe(node, { characterData: true, childList: true, subtree: true });
    try {
      expect(setLiveText(node, 'Continue to the next available layer.')).toBe(true);
      const changed = observer.takeRecords(); expect(changed).toHaveLength(1); expect(changed[0].type).toBe('characterData'); expect(changed[0].target).toBe(text);
      expect(setLiveText(node, 'Continue to the next available layer.')).toBe(false); expect(observer.takeRecords()).toEqual([]);
      expect(node.firstChild).toBe(text); expect(selection.parentNode).toBe(node);
    } finally { observer.disconnect(); }
  });

  it.each([
    ['a scalar message', 'Probe ready.', 'Probe ready.'], ['an empty message', '', ''], ['zero', 0, '0'],
    ['false', false, 'false'], ['null', null, ''], ['undefined', undefined, ''],
  ])('updates %s on a single-text host without replacing its owned node', (_label, message, expected) => {
    const node = document.createElement('p'), text = document.createTextNode('Previous message.'); node.appendChild(text);
    expect(setLiveText(node, message)).toBe(true); expect(node.childNodes).toHaveLength(1); expect(node.firstChild).toBe(text); expect(text.nodeValue).toBe(expected);
    expect(setLiveText(node, message)).toBe(false); expect(node.firstChild).toBe(text);
  });

  it('populates an empty host once and leaves an already-empty announcement untouched', () => {
    const node = document.createElement('p'), observer = new MutationObserver(() => {}); observer.observe(node, { childList: true, characterData: true, subtree: true });
    try {
      expect(setLiveText(node, '')).toBe(false); expect(node.firstChild).toBeNull(); expect(observer.takeRecords()).toEqual([]);
      expect(setLiveText(node, 'New live message.')).toBe(true); const text = node.firstChild;
      expect(text.nodeType).toBe(Node.TEXT_NODE); expect(node.textContent).toBe('New live message.'); expect(observer.takeRecords()).toHaveLength(1);
      expect(setLiveText(node, 'New live message.')).toBe(false); expect(observer.takeRecords()).toEqual([]); expect(node.firstChild).toBe(text);
    } finally { observer.disconnect(); }
  });

  it('inserts one message prefix ahead of structured children while preserving their identities and listeners', () => {
    const node = document.createElement('p'), comment = document.createComment('React boundary'), badge = document.createElement('span'), button = document.createElement('button');
    badge.textContent = 'Selected Spleen'; button.textContent = 'Review'; const clicked = vi.fn(); button.addEventListener('click', clicked);
    node.append(comment, badge, button); const before = [...node.childNodes], observer = new MutationObserver(() => {});
    observer.observe(node, { childList: true, characterData: true, subtree: true });
    try {
      expect(setLiveText(node, 'Probe ready.')).toBe(true); const prefix = node.firstChild;
      expect(prefix.nodeType).toBe(Node.TEXT_NODE); expect(prefix.nodeValue).toBe('Probe ready.'); expect([...node.childNodes].slice(1)).toEqual(before);
      const records = observer.takeRecords(); expect(records).toHaveLength(1); expect([...records[0].addedNodes]).toEqual([prefix]); expect([...records[0].removedNodes]).toEqual([]);
      expect(setLiveText(node, 'Probe ready.')).toBe(false); expect(observer.takeRecords()).toEqual([]);
      button.click(); expect(clicked).toHaveBeenCalledOnce(); expect(badge.parentNode).toBe(node); expect(comment.parentNode).toBe(node);
      expect(() => node.removeChild(badge)).not.toThrow(); node.insertBefore(badge, button);
      expect(setLiveText(node, 'Selection restored.')).toBe(true); expect(node.firstChild).toBe(prefix); expect([...node.childNodes].slice(1)).toEqual(before);
    } finally { observer.disconnect(); }
  });

  it('creates a structured host prefix in its own document rather than moving its existing children', () => {
    const owner = document.implementation.createHTMLDocument('Other document'), node = owner.createElement('p'), selection = owner.createElement('span');
    selection.textContent = 'Selected Pancreas'; node.appendChild(selection);
    const create = vi.spyOn(owner, 'createTextNode');
    try {
      expect(setLiveText(node, 'Inspect.')).toBe(true); expect(create).toHaveBeenCalledExactlyOnceWith('Inspect.');
      expect(node.firstChild.ownerDocument).toBe(owner); expect(node.lastChild).toBe(selection); expect(selection.ownerDocument).toBe(owner);
    } finally { create.mockRestore(); }
  });

  it('safely ignores a missing live-region node', () => {
    expect(setLiveText(null, 'Message.')).toBe(false); expect(setLiveText(undefined, 'Message.')).toBe(false);
  });

  it('retains the actual hover preview cache and tone updates while preserving the selected-span sibling', () => {
    const start = source.indexOf('var previewStateKey = previewTone'), ending = /\r?\n {12}\}\r?\n {12}syncCanvasPointerPresentation/g;
    ending.lastIndex = start; const end = ending.exec(source)?.index ?? -1;
    expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
    const publish = new Function('canvas', 'previewTone', 'previewMessage', 'queryDissectionNode', 'setDissectionLiveText', source.slice(start, end));
    const { node, text, selection } = selectedStatus('Pancreas'), canvas = {}, lookup = vi.fn(() => node), update = vi.fn(setLiveText);
    publish(canvas, 'caution', 'Continue to the next available layer.', lookup, update);
    expect(node.firstChild).toBe(text); expect(node.lastChild).toBe(selection); expect(node.getAttribute('data-tone')).toBe('caution');
    expect(lookup).toHaveBeenCalledExactlyOnceWith('#diss-canvas-status'); expect(update).toHaveBeenCalledExactlyOnceWith(node, 'Continue to the next available layer.');
    publish(canvas, 'caution', 'Continue to the next available layer.', lookup, update); expect(update).toHaveBeenCalledTimes(1); expect(lookup).toHaveBeenCalledTimes(1);
    publish(canvas, 'working', 'Probe ready.', lookup, update); expect(update).toHaveBeenCalledTimes(2); expect(node.getAttribute('data-tone')).toBe('working');
    expect(text.nodeValue).toBe('Probe ready.'); expect(() => node.removeChild(selection)).not.toThrow();
  });

  it('routes each canvas-status publisher through the shared leaf update while retaining single-string procedure feedback', () => {
    const publishers = [
      ['beginProcedureStroke', 1], ['appendProcedureStroke', 2], ['setForcepsDragStatus', 1], ['setPinDragStatus', 1],
      ['setProbeDragStatus', 1], ['setDropperDragStatus', 1], ['setWickDragStatus', 1],
    ];
    for (const [name, count] of publishers) {
      const fn = body(name); expect(fn.match(/setDissectionLiveText\(/g) || [], name).toHaveLength(count);
      expect(fn, name).not.toMatch(/(?:liveStatus|resistanceStatus|strokeSafetyStatus|status)\.textContent\s*=/);
    }
    expect(source).toContain('setDissectionLiveText(previewStatus, previewMessage);');
    expect(source).not.toContain('previewStatus.textContent = previewMessage;');
    expect(source).toContain('cuttingSafetyStatus.textContent = cuttingSafetyMessage;');
  });

  it('keeps the packaged helper and all publisher changes identical to canonical source', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js', 'utf8')).toBe(source);
  });
});
