#!/usr/bin/env node
// scan_silent_announcer.cjs — gate for the "announcer that announces nothing" class.
//
// The bug shape, found twice:
//     function announceToSR(msg) { upd('srMsg', msg); }
// The tool builds a polite live region at load and never writes to it, and
// nothing renders `srMsg`, so EVERY screen-reader announcement is discarded.
// lifeskills lost 67 of them (fixed a576162a7); epidemic had the same before it.
//
// ★ Nothing else can catch this. Dead state renders fine, the live region
// genuinely exists so an axe scan PASSES, and every test is written against
// what IS shown. The state write also forces a React re-render per
// announcement, so it costs something in order to do nothing.
//
// ★★ Scope it before reporting it. The original pass flagged 22 tools and ~700
// "lost" announcements; almost all were FALSE. Those tools do
// `var announceToSR = ctx.announceToSR` and use the HOST announcer, which
// works (writes #stem-a11y-live, then clears). An unused local live region is
// untidy, not broken. The real defect is narrower: a tool that defines its OWN
// announcer whose body never touches the DOM and never delegates to ctx.
//
// Promoted to dev-tools 2026-08-11 from a session scratchpad, where it was one
// temp-dir cleanup from being lost — the same "a gate nobody runs is not a
// gate" problem this repo has shipped bugs behind twice.
//
// ★★★ 2026-08-16 — it HAD become that gate, three times over. It had no runner
// (absent from package.json, deploy.sh, and .github), its file glob was
// `^stem_tool_*.js` under stem_lab/ so every non-STEM tool was invisible, and
// it recognised an announcer only if it was literally named announceToSR /
// srSay / announce. The codebase has 35 announcers; this gate could see NONE
// of them — 21 sit inside stem_lab/, i.e. files it did glob, under names like
// rhAnnounce and klAnnounce. It reported "0 silent tool(s)" and would have
// reported that no matter what regressed. Widened below: discover announcers
// by name SHAPE, scan every tool root, and classify the two shapes that made
// the naive widening produce 4/4 false positives (see BUILDER / DELEGATES).
//
// Usage: node dev-tools/scan_silent_announcer.cjs [dir] [--quiet]

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let acorn;
for (const location of [path.join(ROOT, 'node_modules', 'acorn'), path.join(ROOT, 'desktop/web-app/node_modules/acorn'), 'acorn']) {
  try { acorn = require(location); break; } catch (_) {}
}
if (!acorn) { console.error('scan_silent_announcer: acorn not found; cannot scan.'); process.exit(2); }
const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
// Optional directory argument so the gate can be pointed at a fixture — a
// scanner that has only ever been run against a clean tree is not known to
// work. Calibrate against the pre-fix lifeskills (a576162a7^) and it must FLAG.
const DIR = args.find((a) => !a.startsWith('--')) || null;

// Every surface that ships a tool, not just stem_lab. A named dir still wins so
// the gate stays calibratable against a pre-fix fixture.
function collectFiles() {
  if (DIR) {
    return fs.readdirSync(DIR)
      .filter((n) => /\.jsx?$/.test(n))
      .map((n) => ({ label: n.replace(/^stem_tool_/, '').replace(/\.jsx?$/, ''), full: path.join(DIR, n) }));
  }
  const out = [];
  for (const sub of ['stem_lab', 'sel_hub']) {
    const d = path.join(ROOT, sub);
    if (!fs.existsSync(d)) continue;
    for (const n of fs.readdirSync(d).filter((x) => /^(stem|sel)_tool_.*\.js$/.test(x))) {
      out.push({ label: n.replace(/^(stem|sel)_tool_/, '').replace('.js', ''), full: path.join(d, n) });
    }
  }
  // Root-level tool modules — StoryForge, LitLab, PoetTree, MathFluency, the
  // walkthrough copilot and friends all live here and were never scanned.
  for (const n of fs.readdirSync(ROOT).filter((x) => /_module\.js$/.test(x) && !/^(view_|_build)/.test(x))) {
    out.push({ label: n.replace('_module.js', ''), full: path.join(ROOT, n) });
  }
  return out;
}

// Brace-match the named function so the check reads its real body rather than
// a fixed window (announcers sit near other helpers).
function bodyOf(src, name) {
  const i = src.search(new RegExp('function\\s+' + name.replace(/\$/g, '\\$') + '\\s*\\('));
  if (i === -1) return null;
  let depth = 0, started = false;
  for (let j = i; j < src.length && j < i + 4000; j++) {
    if (src[j] === '{') { depth++; started = true; }
    else if (src[j] === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  return null;
}

// Prove helper delegation and the exact state rendered by a live region.
// An unrelated aria-live node elsewhere in a large tool is not evidence.
function liveDelegations(src) {
  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script' }); }
  catch (_) { return new Set(); }
  const fnTypes = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
  function walk(node, visit, ancestors = []) {
    if (!node || typeof node.type !== 'string' || visit(node, ancestors) === false) return;
    const next = ancestors.concat(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach((child) => walk(child, visit, next));
      else if (value && typeof value.type === 'string') walk(value, visit, next);
    }
  }
  const functions = new Map(), duplicate = new Set(), functionContexts = new Map(), functionIds = new Map(), functionVariants = new Map();
  const reassigned = new Set();
  // Sibling components can reuse hook names without sharing the same state.
  const pairs = new Set(), setters = new Map(), liveStates = new Set(), bindings = new Map();
  const isScope = (node) => fnTypes.has(node.type) || ['Program', 'BlockStatement', 'CatchClause'].includes(node.type);
  const scopeOf = (ancestors, kind) => ancestors.slice().reverse().find((node) => kind === 'var'
    ? fnTypes.has(node.type) || node.type === 'Program' : isScope(node)) || ast;
  function declare(pattern, scope) {
    if (!pattern) return;
    if (pattern.type === 'Identifier') {
      if (!bindings.has(scope)) bindings.set(scope, new Map());
      const names = bindings.get(scope), prior = names.get(pattern.name);
      if (prior && prior.id !== pattern) prior.ambiguous = true;
      else if (!prior) names.set(pattern.name, { id: pattern });
    } else if (pattern.type === 'ArrayPattern') pattern.elements.forEach((part) => declare(part, scope));
    else if (pattern.type === 'ObjectPattern') pattern.properties.forEach((part) => declare(part.value || part.argument, scope));
    else if (pattern.type === 'RestElement') declare(pattern.argument, scope);
    else if (pattern.type === 'AssignmentPattern') declare(pattern.left, scope);
  }
  function resolve(name, ancestors) {
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const names = bindings.get(ancestors[i]);
      if (names && names.has(name)) {
        const binding = names.get(name);
        return binding.ambiguous ? null : binding;
      }
    }
    return null;
  }
  const stateHook = (node) => node && node.type === 'CallExpression'
    && node.callee.type === 'MemberExpression' && node.callee.property.name === 'useState';
  const bindFunction = (name, node, id) => {
    if (!functionVariants.has(name)) functionVariants.set(name, []);
    functionVariants.get(name).push(node);
    if (functions.has(name)) duplicate.add(name);
    else { functions.set(name, node); functionIds.set(name, id); }
  };
  walk(ast, (node, ancestors) => {
    if (fnTypes.has(node.type)) {
      functionContexts.set(node, ancestors);
      node.params.forEach((parameter) => declare(parameter, node));
      if (node.id) declare(node.id, node.type === 'FunctionDeclaration' ? scopeOf(ancestors) : node);
    }
    if (node.type === 'CatchClause') declare(node.param, node);
    if (node.type === 'FunctionDeclaration' && node.id) bindFunction(node.id.name, node, node.id);
    if (node.type === 'VariableDeclarator' && node.init) {
      if (node.id.type === 'Identifier' && fnTypes.has(node.init.type)) bindFunction(node.id.name, node.init, node.id);
    }
    if (node.type === 'VariableDeclarator') {
      const declaration = ancestors[ancestors.length - 1];
      declare(node.id, scopeOf(ancestors, declaration.kind));
    }
  });
  walk(ast, (node, ancestors) => {
    const written = node.type === 'AssignmentExpression' ? node.left : node.type === 'UpdateExpression' ? node.argument : null;
    if (written && written.type === 'Identifier') {
      const binding = resolve(written.name, ancestors);
      if (binding) reassigned.add(binding.id);
    }
    if (node.type === 'VariableDeclarator' && node.init) {
      if (node.id.type === 'Identifier' && stateHook(node.init)) {
        const pair = resolve(node.id.name, ancestors);
        if (pair) pairs.add(pair);
      }
      if (node.id.type === 'ArrayPattern' && stateHook(node.init)) {
        const [state, setter] = node.id.elements;
        if (state && setter && state.type === 'Identifier' && setter.type === 'Identifier') {
          const stateBinding = resolve(state.name, ancestors), setterBinding = resolve(setter.name, ancestors);
          if (stateBinding && setterBinding) setters.set(setterBinding, stateBinding);
        }
      }
    }
  });
  const keyName = (node) => node?.type === 'Property' && !node.computed
    ? String(node.key.type === 'Identifier' ? node.key.name : node.key.value) : null;
  // Unknown spreads, computed keys, accessors, or duplicate keys can replace the
  // writer/ref/live-region property after the apparently healthy declaration.
  function knownProps(node) {
    if (node?.type !== 'ObjectExpression') return false;
    const keys = new Set();
    return node.properties.every((property) => {
      const key = keyName(property);
      if (key === null || property.kind !== 'init' || keys.has(key)) return false;
      keys.add(key);
      return true;
    });
  }
  const returnedElement = (ancestors) => {
    for (let index = ancestors.length - 1; index >= 0; index--) {
      if (ancestors[index].type === 'ReturnStatement') return true;
      if (fnTypes.has(ancestors[index].type)) return false;
    }
    return false;
  };
  const pairStates = new Map(), pairSetters = new Map();
  walk(ast, (node, ancestors) => {
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init && node.init.type === 'MemberExpression'
        && node.init.computed && node.init.object.type === 'Identifier') {
      const pair = resolve(node.init.object.name, ancestors), binding = resolve(node.id.name, ancestors);
      if (pairs.has(pair) && binding) {
        if (node.init.property.value === 0) pairStates.set(pair, binding);
        if (node.init.property.value === 1) pairSetters.set(pair, binding);
      }
    }
    if (node.type !== 'CallExpression') return;
    const callee = node.callee, name = callee.type === 'Identifier' ? callee.name : callee.type === 'MemberExpression' && callee.property.name;
    if (!['createElement', 'h', 'H', 'el', 'e'].includes(name)) return;
    const props = node.arguments[1];
    if (!knownProps(props) || !props.properties.some((p) => p.type === 'Property'
        && (p.key.value || p.key.name) === 'aria-live' && p.value.type === 'Literal' && ['polite', 'assertive'].includes(p.value.value))) return;
    for (const child of node.arguments.slice(2)) walk(child, (n, chain) => {
      if (fnTypes.has(n.type)) return false;
      if (n.type !== 'Identifier') return;
      const parent = chain[chain.length - 1];
      if (parent && ((parent.type === 'MemberExpression' && !parent.computed && parent.property === n)
          || (parent.type === 'Property' && !parent.computed && !parent.shorthand && parent.key === n))) return;
      const binding = resolve(n.name, chain);
      if (binding) liveStates.add(binding);
    }, ancestors.concat(node));
  });
  for (const [pair, setter] of pairSetters) if (pairStates.has(pair)) setters.set(setter, pairStates.get(pair));
  // Some components publish a writer through an owner ref. Prove the complete
  // chain: the method updates rendered live state, that live node publishes the
  // writer, and the caller mounts that component with the very same ref.
  const initializers = new Map(), refHooks = new Set(), publishedMethods = new Map(), changedMembers = new Map();
  const propertyName = (node) => node?.type === 'MemberExpression' && (node.computed ? node.property.value : node.property.name);
  const changedMember = (binding, property) => changedMembers.get(binding)?.has(property) || changedMembers.get(binding)?.has(null);
  const member = (node, property) => node && node.type === 'MemberExpression' && propertyName(node) === property;
  walk(ast, (node, ancestors) => {
    if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier' || !node.init) return;
    const binding = resolve(node.id.name, ancestors);
    if (!binding || reassigned.has(binding.id)) return;
    initializers.set(binding, { node: node.init, ancestors });
    if (node.init.type === 'CallExpression' && member(node.init.callee, 'useRef')) refHooks.add(binding);
  });
  for (const [binding, init] of initializers) {
    if (init.node.type !== 'CallExpression' || init.node.callee.type !== 'Identifier') continue;
    const alias = initializers.get(resolve(init.node.callee.name, init.ancestors));
    if (alias && member(alias.node, 'useRef')) refHooks.add(binding);
  }
  walk(ast, (node, ancestors) => {
    const written = node.type === 'AssignmentExpression' ? node.left : node.type === 'UpdateExpression' ? node.argument : null;
    if (written?.type !== 'MemberExpression' || written.object.type !== 'Identifier') return;
    const binding = resolve(written.object.name, ancestors);
    if (!binding) return;
    if (!changedMembers.has(binding)) changedMembers.set(binding, new Set());
    changedMembers.get(binding).add(propertyName(written) ?? null);
  });
  for (const [componentName, component] of functions) {
    if (duplicate.has(componentName) || component.params[0]?.type !== 'Identifier') continue;
    const context = functionContexts.get(component).concat(component);
    const propsBinding = resolve(component.params[0].name, context), candidates = [];
    walk(component.body, (node, ancestors) => {
      if (fnTypes.has(node.type)) return false;
      if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier' || !knownProps(node.init)) return;
      const writer = resolve(node.id.name, ancestors);
      if (!writer || reassigned.has(writer.id)) return;
      for (const prop of node.init.properties) {
        if (prop.type !== 'Property' || prop.computed || !fnTypes.has(prop.value.type)) continue;
        let writesLive = false;
        walk(prop.value.body, (call, chain) => {
          if (fnTypes.has(call.type)) return false;
          if (call.type !== 'CallExpression') return;
          if (call.callee.type === 'Identifier') {
            const setter = resolve(call.callee.name, chain);
            if (setters.has(setter) && liveStates.has(setters.get(setter))) writesLive = true;
          } else if (member(call.callee, 1) && call.callee.object.type === 'Identifier') {
            const pair = resolve(call.callee.object.name, chain);
            if (pairs.has(pair) && liveStates.has(pair)) writesLive = true;
          }
        }, ancestors.concat(node, node.init, prop, prop.value));
        const method = prop.key.name || prop.key.value;
        if (writesLive && !changedMember(writer, method)) candidates.push({ writer, method });
      }
    }, context);
    if (!candidates.length) continue;
    walk(component.body, (node, ancestors) => {
      if (fnTypes.has(node.type)) return false;
      if (node.type !== 'CallExpression' || !returnedElement(ancestors)) return;
      const props = node.arguments[1];
      if (!knownProps(props) || !props.properties.some(p => keyName(p) === 'aria-live'
          && p.value.type === 'Literal' && ['polite', 'assertive'].includes(p.value.value))) return;
      const ref = props.properties.find(p => keyName(p) === 'ref');
      if (!ref || !fnTypes.has(ref.value.type)) return;
      walk(ref.value.body, (assignment, chain) => {
        if (fnTypes.has(assignment.type)) return false;
        if (assignment.type !== 'AssignmentExpression' || assignment.operator !== '=' || !member(assignment.left, 'current')
            || assignment.left.object.type !== 'Identifier' || assignment.right.type !== 'Identifier') return;
        const writer = resolve(assignment.right.name, chain), owner = initializers.get(resolve(assignment.left.object.name, chain));
        if (!owner || owner.node.type !== 'MemberExpression' || owner.node.object.type !== 'Identifier'
            || resolve(owner.node.object.name, owner.ancestors) !== propsBinding) return;
        for (const candidate of candidates) if (candidate.writer === writer) {
          if (!publishedMethods.has(component)) publishedMethods.set(component, []);
          publishedMethods.get(component).push({ ownerProp: propertyName(owner.node), method: candidate.method });
        }
      }, ancestors.concat(node, props, ref, ref.value));
    }, context);
  }
  const mountedRefMethods = new Map();
  walk(ast, (node, ancestors) => {
    if (node.type !== 'CallExpression' || node.arguments[0]?.type !== 'Identifier' || !knownProps(node.arguments[1]) || !returnedElement(ancestors)) return;
    const calleeName = node.callee.type === 'Identifier' ? node.callee.name : propertyName(node.callee);
    if (!['h', 'H', 'el', 'e', 'createElement'].includes(calleeName)) return;
    const component = functions.get(node.arguments[0].name), binding = resolve(node.arguments[0].name, ancestors);
    if (!publishedMethods.has(component) || !binding || binding.id !== functionIds.get(node.arguments[0].name) || reassigned.has(binding.id)) return;
    for (const proof of publishedMethods.get(component)) {
      const prop = node.arguments[1].properties.find(p => keyName(p) === proof.ownerProp);
      if (!prop || prop.value.type !== 'Identifier') continue;
      const ref = resolve(prop.value.name, ancestors);
      if (!refHooks.has(ref) || changedMember(ref, 'current')) continue;
      if (!mountedRefMethods.has(ref)) mountedRefMethods.set(ref, new Set());
      mountedRefMethods.get(ref).add(proof.method);
    }
  });
  function writesThroughMountedRef(call, ancestors) {
    if (call.object.type !== 'Identifier') return false;
    const binding = resolve(call.object.name, ancestors);
    if (changedMember(binding, propertyName(call))) return false;
    const alias = initializers.get(binding);
    if (!alias || !member(alias.node, 'current') || alias.node.object.type !== 'Identifier') return false;
    const ref = resolve(alias.node.object.name, alias.ancestors);
    return mountedRefMethods.get(ref)?.has(propertyName(call)) || false;
  }
  const healthy = new Set(), calls = new Map();
  for (const name of duplicate) {
    // The final report is by name, so every same-named local function must be
    // proven separately. One working sibling must not hide a silent sibling.
    if (functionVariants.get(name).every(fn => {
      let reachesLive = false;
      walk(fn.body, (node, ancestors) => {
        if (fnTypes.has(node.type)) return false;
        if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression'
            && writesThroughMountedRef(node.callee, ancestors)) reachesLive = true;
      }, functionContexts.get(fn).concat(fn));
      return reachesLive;
    })) healthy.add(name);
  }
  for (const [name, fn] of functions) {
    if (duplicate.has(name)) continue;
    const dependencies = new Set();
    walk(fn.body, (node, ancestors) => {
      if (fnTypes.has(node.type)) {
        // A scheduled callback runs; an unused nested function proves nothing.
        const parent = ancestors[ancestors.length - 1];
        if (!parent || parent.type !== 'CallExpression' || parent.callee.type !== 'Identifier'
            || parent.callee.name !== 'setTimeout' || parent.arguments[0] !== node
            || resolve('setTimeout', ancestors)) return false;
      }
      if (node.type === 'AssignmentExpression' && node.operator === '=' && node.left.type === 'MemberExpression'
          && ['textContent', 'innerText'].includes(node.left.property.name || node.left.property.value)
          && !(node.right.type === 'Literal' && !node.right.value)) healthy.add(name);
      if (node.type !== 'CallExpression') return;
      const call = node.callee;
      if (call.type === 'Identifier') {
        const setter = resolve(call.name, ancestors);
        if (setter && setter.id === functionIds.get(call.name) && !reassigned.has(setter.id)) dependencies.add(call.name);
        if (['announceToSR', 'srSay', 'alloAnnounce', 'addToast'].includes(call.name)
            || (setters.has(setter) && liveStates.has(setters.get(setter)))) healthy.add(name);
      } else if (call.type === 'MemberExpression') {
        const object = call.object, property = call.property.name || call.property.value;
        if (writesThroughMountedRef(call, ancestors)) healthy.add(name);
        if (object.type === 'Identifier' && ((object.name === 'document' && ['getElementById', 'querySelector'].includes(property))
            || (['ctx', 'props'].includes(object.name) && ['announceToSR', 'srSay'].includes(property))
            || (object.name === 'window' && /announce/i.test(property)))) healthy.add(name);
      }
    }, functionContexts.get(fn).concat(fn));
    calls.set(name, dependencies);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, dependencies] of calls) {
      if (!healthy.has(name) && [...dependencies].some((dependency) => healthy.has(dependency))) { healthy.add(name); changed = true; }
    }
  }
  return healthy;
}

const broken = [], fine = [], usesHost = [], skipped = [];
for (const { label: tool, full } of collectFiles()) {
  let src;
  try { src = fs.readFileSync(full, 'utf8'); } catch (_) { continue; }
  const provenLive = liveDelegations(src);

  // Discover by SHAPE, not by allowlist. Every real announcer in this repo is
  // `function <prefix>Announce<suffix>(` — sfAnnounce, rhAnnounce, klAnnounce,
  // _mfAnnounce, frAnnounceUrgent. The old three-name allowlist matched none.
  const names = [];
  const declRe = /function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  let m;
  while ((m = declRe.exec(src))) {
    const n = m[1];
    if ((/announce/i.test(n) || n === 'srSay') && !names.includes(n)) names.push(n);
  }

  const hostCalls = (src.match(/\b(ctx|props)\.(announceToSR|srSay)\s*\(/g) || []).length;
  if (!names.length) {
    if (hostCalls) usesHost.push({ tool, callCount: hostCalls });
    continue;
  }

  for (const localName of names) {
    const decl = bodyOf(src, localName) || '';
    // ★★★ Strip the signature before testing. bodyOf() slices from `function
    // <name>(`, so the text it returns CONTAINS the declaration — and a
    // delegation test like /\bannounceToSR\s*\(/ then matches the announcer's
    // OWN name and pronounces it healthy. That self-match made this gate pass
    // the pre-fix lifeskills fixture (a576162a7^), the one bug it was written
    // to catch. Everything below must read the braces only.
    const body = decl.slice(Math.max(0, decl.indexOf('{')));
    const callCount = (src.match(new RegExp('\\b' + localName.replace(/\$/g, '\\$') + '\\s*\\(', 'g')) || []).length - 1;
    // Never called — an unused helper discards nothing.
    if (callCount < 1) { skipped.push({ tool, localName, why: 'unused' }); continue; }

    const touchesDom = /getElementById|textContent|innerText|document\.|setAttribute|liveRegion|ariaLive/i.test(body);

    // ★ BUILDER — returns its text instead of speaking it. fpAnnounceText and
    // composeAnnouncement build a string; typingPracticeMistakeAnnouncement
    // returns {shouldAnnounce,message,next}. The CALLER announces. Flagging
    // these was 3 of the 4 false positives a naive widening produced.
    if (!touchesDom && /\breturn\s+[^;\s}]/.test(body)) { skipped.push({ tool, localName, why: 'builder' }); continue; }

    // ★ Delegation is not always a member expression. Widening the file set
    // surfaced three more shapes, all of which reach a real live region and all
    // of which a `ctx.|props.` test calls silent:
    //   • bare `announceToSR(...)` — the host global (anatomy, artstudio)
    //   • `window.alloAnnounce(...)` — AlloFlowANTI.txt:15236 (research lanes)
    //   • `addToast(...)` — toasts render aria-live polite/assertive, :46666
    const delegatesToHost = /(?:ctx|props)\.(?:announceToSR|srSay)\s*\(|window\.\w*[Aa]nnounce|\b(announceToSR|srSay|alloAnnounce|addToast)\s*\(/.test(body);
    // ★ DELEGATES — a throttle/dedupe wrapper around a sibling announcer that
    // does reach the DOM. roadready's tryAnnounce calls rrAnnounce; it is not
    // silent. This was the 4th false positive.
    const delegatesToSibling = provenLive.has(localName);

    // ★ REACT-STATE live region (math_create, 2026-08-17): the announcer only
    // calls a state setter (setSrMsg / setA11yAnnouncement), and the component
    // renders that state into a role="status" aria-live element. The DOM write
    // happens in the render, so none of the tests above can see it. Accept the
    // shape only when the body calls the exact hook setter whose lexical
    // state binding is rendered into aria-live. A sibling component's state
    // with the same name cannot prove it. A setter with no live region stays
    // broken, precisely the original lifeskills defect.
    const reactStateLiveRegion = provenLive.has(localName);

    if (touchesDom || delegatesToHost || delegatesToSibling || reactStateLiveRegion) fine.push({ tool, localName, callCount });
    else broken.push({ tool, localName, callCount, body: body.replace(/\s+/g, ' ').slice(0, 110) });
  }
}

broken.sort((a, b) => b.callCount - a.callCount);
const lost = broken.reduce((a, b) => a + b.callCount, 0);

if (broken.length) {
  console.log('FLAG — tool defines its own announcer that never reaches the DOM:');
  for (const b of broken) {
    console.log('  ' + b.tool.padEnd(18) + String(b.callCount).padStart(4) + ' announcement(s) discarded  [' + b.localName + ']');
    console.log('        ' + b.body);
  }
  console.log('  Fix: write the live region, and CLEAR IT FIRST on a ~30ms timeout (a screen');
  console.log('  reader will not repeat identical text, so two same messages would speak once).');
  console.log('  Wrap in try/catch: the render smoke harness has no DOM and renderTool()');
  console.log('  swallows throws, so an unguarded announcer blanks the tool in silence.');
}
if (!quiet || broken.length) {
  console.log('---');
  console.log('scan_silent_announcer: ' + broken.length + ' silent tool(s), ' + lost + ' announcement(s) lost; '
    + fine.length + ' working local announcer(s), ' + usesHost.length + ' using the host announcer, '
    + skipped.length + ' skipped (' + skipped.filter((s) => s.why === 'builder').length + ' builder, '
    + skipped.filter((s) => s.why === 'unused').length + ' unused).');
}
process.exit(broken.length ? 1 : 0);
