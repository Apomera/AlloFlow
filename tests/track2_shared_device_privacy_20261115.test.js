import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();

function makeMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial).map(([k, v]) => [k, String(v)]));
  return {
    _map: map,
    get length() { return map.size; },
    key(i) { return Array.from(map.keys())[i] ?? null; },
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    clear() { map.clear(); }
  };
}

function makeReactStub() {
  const hooks = [];
  let hookIdx = 0;
  function resetHooks() { hookIdx = 0; }
  function useState(init) {
    const idx = hookIdx++;
    if (!(idx in hooks)) {
      hooks[idx] = typeof init === 'function' ? init() : init;
    }
    const set = (v) => {
      hooks[idx] = typeof v === 'function' ? v(hooks[idx]) : v;
    };
    return [hooks[idx], set];
  }
  function useEffect() {}
  function useRef(v) { return { current: v }; }
  function useMemo(fn) { return fn(); }
  function createElement(type, props, ...children) {
    return { type, props: props || {}, children };
  }
  return { createElement, useState, useEffect, useRef, useMemo, _resetHooks: resetHooks };
}

function findNodes(node, pred, out = []) {
  if (!node) return out;
  if (Array.isArray(node)) {
    for (const c of node) findNodes(c, pred, out);
    return out;
  }
  if (typeof node === 'object') {
    if (pred(node)) out.push(node);
    if (typeof node.type === 'function') {
      try {
        const rendered = node.type({ ...(node.props || {}), children: node.children });
        findNodes(rendered, pred, out);
      } catch (_) {}
    }
    if (node.children) findNodes(node.children, pred, out);
    if (node.props && node.props.children) findNodes(node.props.children, pred, out);
  }
  return out;
}

describe('Track 2 shared-device privacy defaults and Model UN copy', () => {
  it('CrisisCompanion defaults unauthenticated solo mode to sessionStorage and purges localStorage', () => {
    const code = fs.readFileSync(path.join(ROOT, 'sel_hub/sel_tool_crisiscompanion.js'), 'utf8');
    const local = makeMemoryStorage({
      'crisisCompanion.safetyPlan.v1': JSON.stringify({ warning: 'legacy global' }),
      'crisisCompanion.safetyPlan.v1::student': JSON.stringify({ coping: 'walk outside' }),
      'crisisCompanion.toolkit.v1::student': JSON.stringify(['breathe']),
      'crisisCompanion.badges.v1::student': JSON.stringify(['first-step'])
    });
    const session = makeMemoryStorage();
    const React = makeReactStub();
    const registered = {};
    const createdLinks = [];
    const docStub = {
      getElementById: () => null,
      querySelector: () => null,
      createElement: (tag) => {
        const el = { tag, style: {}, href: '', download: '', setAttribute() {}, appendChild() {}, clickCalled: false, click() { this.clickCalled = true; } };
        if (tag === 'a') createdLinks.push(el);
        return el;
      },
      createTextNode: (t) => ({ textContent: t }),
      head: { appendChild() {} },
      body: { appendChild() {}, removeChild() {} }
    };
    const win = {
      React,
      SEL_TOOLS: registered,
      SelTools: registered,
      SelHub: { registerTool: (id, def) => { registered[id] = def; } },
      registerSelTool: (id, def) => { registered[id] = def; },
      __alloT: (_k, fb) => fb,
      document: docStub,
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {}
    };
    const ctx = {
      window: win,
      globalThis: win,
      React,
      localStorage: local,
      sessionStorage: session,
      document: docStub,
      CustomEvent: class CustomEvent { constructor(n, d) { this.type = n; this.detail = d?.detail; } },
      __alloT: (_k, fb) => fb,
      Blob,
      URL: {
        createObjectURL: () => 'blob:mock-safety-plan',
        revokeObjectURL: () => {}
      },
      setTimeout,
      clearTimeout,
      console
    };
    win.localStorage = local;
    win.sessionStorage = session;
    vm.runInNewContext(code, ctx, { filename: 'sel_tool_crisiscompanion.js' });

    const cc = registered.crisiscompanion || win.SEL_TOOLS.crisiscompanion || win.SelTools.crisiscompanion || Object.values(registered)[0];
    expect(cc).toBeTruthy();

    React._resetHooks();
    const treeSolo = cc.render({
      React,
      activeSessionCode: null,
      studentCodename: 'student',
      toolData: {
        crisiscompanion: {
          consented: true,
          _hydrated: true,
          section: 'selfCare',
          careSubtab: 'safety',
          safetyPlan: { warning: 'tight shoulders' }
        }
      },
      update: () => {},
      updateMulti: () => {},
      t: (_k, fb) => fb
    });

    // Legacy unauthenticated localStorage keys should be migrated to sessionStorage & purged from localStorage
    expect(local.getItem('crisisCompanion.safetyPlan.v1')).toBeNull();
    expect(local.getItem('crisisCompanion.safetyPlan.v1::student')).toBeNull();
    expect(local.getItem('crisisCompanion.toolkit.v1::student')).toBeNull();
    expect(local.getItem('crisisCompanion.badges.v1::student')).toBeNull();
    expect(session.getItem('crisisCompanion.safetyPlan.v1::student')).toContain('legacy global');
    expect(session.getItem('crisisCompanion.toolkit.v1::student')).toContain('breathe');
    expect(session.getItem('crisisCompanion.badges.v1::student')).toContain('first-step');

    const bannerNodes = findNodes(treeSolo, (n) => n.props && n.props.id === 'cc-shared-device-privacy-banner');
    const downloadBtns = findNodes(treeSolo, (n) => n.props && n.props.id === 'cc-download-safety-plan');
    expect(bannerNodes.length).toBeGreaterThanOrEqual(1);
    expect(downloadBtns.length).toBeGreaterThanOrEqual(1);

    // Invoke Download text copy button handler and confirm my-safety-plan.txt download triggers
    downloadBtns[0].props.onClick();
    expect(createdLinks.length).toBe(1);
    expect(createdLinks[0].download).toBe('my-safety-plan.txt');
    expect(createdLinks[0].clickCalled).toBe(true);

    // Scoped learner identity re-enables persistent localStorage without polluting ::student
    win.__alloActiveLearnerKey = 'learner_42';
    React._resetHooks();
    const treeScoped = cc.render({
      React,
      activeSessionCode: 'ROOM7',
      studentCodename: 'otter',
      toolData: {
        crisiscompanion: {
          consented: true,
          _hydrated: true,
          section: 'selfCare',
          careSubtab: 'safety'
        }
      },
      update: () => {},
      updateMulti: () => {},
      t: (_k, fb) => fb
    });
    const scopedBanners = findNodes(treeScoped, (n) => n.props && n.props.id === 'cc-shared-device-privacy-banner');
    expect(scopedBanners.length).toBe(0);

    expect(code).toContain('cc-shared-device-privacy-banner');
    expect(code).toContain('cc-download-safety-plan');
    expect(code).toContain('my-safety-plan.txt');
    expect(code).toMatch(/function lsSet\(key, val\)[^\n]*localStorage/);
  });

  it('SelHub routes snapshots and artifacts to sessionStorage in unauthenticated Student Mode', () => {
    const hubCode = fs.readFileSync(path.join(ROOT, 'sel_hub/sel_hub_module.js'), 'utf8');
    expect(hubCode).toContain('var _selUnauthStudentEphemeral = !selTeacherView && !activeSessionCode && (!studentCodename || studentCodename === \'student\') && !_selLearnerKey;');
    expect(hubCode).toContain('function _selTargetStorage(key)');
    expect(hubCode).toContain("key === 'alloflow_sel_snapshots' || key === 'alloflow_student_artifacts'");

    const m = hubCode.match(/var _selUnauthStudentEphemeral =[^;]+;\s*function _selTargetStorage\(key\)\s*\{[\s\S]*?\n      \}/);
    expect(m).toBeTruthy();

    const makeHarness = ({ selTeacherView, activeSessionCode, studentCodename, learnerKey }) => {
      const local = makeMemoryStorage();
      const session = makeMemoryStorage();
      const fn = new Function(
        'selTeacherView', 'activeSessionCode', 'studentCodename', '_selLearnerKey', 'localStorage', 'sessionStorage',
        `${m[0]}; return { _selUnauthStudentEphemeral, _selTargetStorage };`
      );
      return { local, session, ...fn(selTeacherView, activeSessionCode, studentCodename, learnerKey, local, session) };
    };

    const unauthStudent = makeHarness({ selTeacherView: false, activeSessionCode: null, studentCodename: 'student', learnerKey: '' });
    expect(unauthStudent._selUnauthStudentEphemeral).toBe(true);
    expect(unauthStudent._selTargetStorage('alloflow_sel_snapshots')).toBe(unauthStudent.session);
    expect(unauthStudent._selTargetStorage('alloflow_student_artifacts')).toBe(unauthStudent.session);

    const signedInStudent = makeHarness({ selTeacherView: false, activeSessionCode: null, studentCodename: 'student', learnerKey: 'uid_abc' });
    expect(signedInStudent._selUnauthStudentEphemeral).toBe(false);
    expect(signedInStudent._selTargetStorage('alloflow_sel_snapshots')).toBe(signedInStudent.local);
    expect(signedInStudent._selTargetStorage('alloflow_student_artifacts')).toBe(signedInStudent.local);

    const teacherMode = makeHarness({ selTeacherView: true, activeSessionCode: null, studentCodename: 'student', learnerKey: '' });
    expect(teacherMode._selUnauthStudentEphemeral).toBe(false);
    expect(teacherMode._selTargetStorage('alloflow_student_artifacts')).toBe(teacherMode.local);
  });

  it('VoiceDetective uses sessionStorage and purges unauthenticated localStorage in Student Mode, and scopes by learnerKey when signed in', () => {
    const vdCode = fs.readFileSync(path.join(ROOT, 'sel_hub/sel_tool_voicedetective.js'), 'utf8');
    const fnMatch = vdCode.match(/var STORAGE_KEY = 'alloSelVoiceDetective';\s*function _vdActiveScope\(\)[\s\S]*?function saveData\(data\)[\s\S]*?\n  \}/);
    expect(fnMatch).toBeTruthy();

    const runVdHarness = ({ studentView, learnerKey, preLocal = {} }) => {
      const local = makeMemoryStorage(preLocal);
      const session = makeMemoryStorage();
      const windowObj = {
        __alloStudentView: studentView,
        __alloActiveLearnerKey: learnerKey
      };
      const fn = new Function(
        'window', 'localStorage', 'sessionStorage',
        `${fnMatch[0]}; return { _vdActiveScope, _vdResolveStore, loadData, saveData };`
      );
      return { local, session, ...fn(windowObj, local, session) };
    };

    const anonStudent = runVdHarness({
      studentView: true,
      learnerKey: '',
      preLocal: { alloSelVoiceDetective: JSON.stringify({ entries: ['calm'] }) }
    });
    const loadedAnon = anonStudent.loadData();
    expect(loadedAnon).toEqual({ entries: ['calm'] });
    expect(anonStudent.local.getItem('alloSelVoiceDetective')).toBeNull();
    anonStudent.saveData({ entries: ['calm', 'focused'] });
    expect(JSON.parse(anonStudent.session.getItem('alloSelVoiceDetective'))).toEqual({ entries: ['calm', 'focused'] });
    expect(anonStudent.local.getItem('alloSelVoiceDetective')).toBeNull();

    const scopedStudent = runVdHarness({
      studentView: true,
      learnerKey: 'stu_99',
      preLocal: { alloSelVoiceDetective: JSON.stringify({ entries: ['migrated'] }) }
    });
    expect(scopedStudent.loadData()).toEqual({ entries: ['migrated'] });
    expect(scopedStudent.local.getItem('alloSelVoiceDetective')).toBeNull();
    expect(JSON.parse(scopedStudent.local.getItem('alloSelVoiceDetective::stu_99'))).toEqual({ entries: ['migrated'] });
  });

  it('Model UN BackchannelPanel uses accurate moderated committee-session copy', () => {
    const munCode = fs.readFileSync(path.join(ROOT, 'arcade_mode_modelun.js'), 'utf8');
    expect(munCode).not.toContain('Private 1:1 notes between delegations');
    expect(munCode).not.toContain('you see ALL private notes');
    expect(munCode).not.toContain('Pass a private backchannel note');
    expect(munCode).not.toContain('Pass a private 1:1 note during a moderated caucus.');
    expect(munCode).not.toContain('Private note to the selected delegation');
    expect(munCode).not.toContain('passed you this PRIVATE backchannel note');

    expect(munCode).toContain('Diplomatic note to the selected delegation');
    expect(munCode).toContain('Send a diplomatic backchannel note');
    expect(munCode).toContain('Moderator view: you see all committee-session backchannel notes.');
    expect(munCode).toContain('Committee-session notes: visible to you, the selected delegation, and the Chair (host). Keep personal drafts in device-local Private Notes.');
  });
});
