// Host source for text-pin and slice-and-eval tests, with the moved code put back.
//
// Since 2026-09-13 most AlloFlowContent handler closures live in
// host_handlers_source.jsx (createHostHandlers(__d), waves 3-5) and the AlloBot
// command context in allo_command_context_source.js (buildAlloCommandContext(deps)).
// AlloFlowANTI.txt keeps one-line shims in their place:
//
//     const X = (...__a) => _alloHostHandlers().X(...__a);
//     const Y = React.useCallback(async (...__a) => _alloHostHandlers().Y(...__a), [deps]);
//     function Z(...__a) { return _alloHostHandlers().Z(...__a); }
//
// and the moved bodies read host bindings as `__d.name` (command context: plain
// names, plus `__live.name` for boot-upgraded module bindings).
//
// readHostSource() returns the host with every shim replaced, IN PLACE, by the
// body it forwards to, written back in the host's own spelling (`__d.x` -> `x`,
// `x: __d.x` -> `x`, `__live.x` -> `x`). So:
//   - a text pin on a moved body is found at its original position;
//   - a slice between two host anchors still spans the moved code between them;
//   - a slice that is eval'd gets the real body, not a shim that needs
//     _alloHostHandlers (which only exists inside AlloFlowContent).
// It reads the CURRENT module files, so the pins still fail when the pinned
// code is removed from the module that now owns it.
//
// A shim whose body cannot be found throws (it would otherwise pin nothing).
//
// API
//   readFileSync(file, enc)       drop-in for fs.readFileSync: HOST_FILES come back via
//                                 readHostSource, anything else is read unchanged
//   readHostSource(file, opts)    host with moved bodies inlined + MOVED_VIEW_FILES appended
//                                 (opts: { extras: [paths], commandContext: false, views: false })
//   inlineMovedHostCode(text)     the inlining step alone, for any host text
//   hostHandlerBody(name)         one moved handler, host-spelled
//   commandContextBody()          the _alloCmdCtx body, host-spelled
//   hostSpelling(text)            `__d.x` / `x: __d.x` / `__live.x` -> host spelling
//   loadHostHandlersFactory()     the real createHostHandlers, for tests that RUN moved handlers
//   hostDeps(...scopes)           a live-lookup `__d` over test scopes (with the factory)
//   sliceTopLevelBlock(src, a)    anchor through its column-0 closing line (no `/**` end marker)
//   sliceBetween, indexOfOrThrow  re-exported from anchored_slice.js
// Mutation checks: HOST_SOURCE_OVERRIDES='{"<repo-relative path>":"<scratch copy>"}' makes every
// read through this helper use the scratch copy, so no shared repo file is ever edited.

import { readFileSync as fsReadFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { sliceBetween, indexOfOrThrow } from './anchored_slice.js';

export { sliceBetween, indexOfOrThrow };

export const HOST_FILE = 'AlloFlowANTI.txt';
export const HOST_HANDLERS_FILE = 'host_handlers_source.jsx';
export const COMMAND_CONTEXT_FILE = 'allo_command_context_source.js';

const root = () => process.cwd();
// HOST_SOURCE_OVERRIDES='{"host_handlers_source.jsx":"/tmp/mutant.jsx"}' reads a scratch copy
// instead, so a mutation check never has to edit a shared repo file.
const overrides = (() => { try { return JSON.parse(process.env.HOST_SOURCE_OVERRIDES || '{}'); } catch (_) { return {}; } })();
const readText = (file) => fsReadFileSync(overrides[file] || resolve(root(), file), 'utf8').replace(/\r\n/g, '\n');

// `x: __d.x` was a shorthand `{ x }` before extraction; `__d.x` was a bare `x`.
// A `.` before the prefix is a property access (kept) unless it ends a spread `...`.
export function hostSpelling(text) {
  return String(text)
    .replace(/(?<![\w$.])([A-Za-z_$][\w$]*): __d\.\1(?![\w$])/g, '$1')
    .replace(/(?<![\w$])(?<!(?:^|[^.])\.)__d\./g, '')
    .replace(/(?<![\w$])(?<!(?:^|[^.])\.)__live\./g, '');
}

const DECL = /^(?:const|let|var|async function|function)\s+([A-Za-z_$][\w$]*)/;

// name -> statement text (module spelling) for every top-level handler in createHostHandlers(__d).
export function parseHostHandlerModule(moduleText) {
  const lines = moduleText.split('\n');
  const open = lines.findIndex((l) => /^function createHostHandlers\(__d\) \{/.test(l));
  if (open < 0) throw new Error(`${HOST_HANDLERS_FILE}: createHostHandlers(__d) not found`);
  let close = lines.length - 1;
  while (close > open && !/^ {2}return \{/.test(lines[close])) close -= 1;
  if (close <= open) throw new Error(`${HOST_HANDLERS_FILE}: the handler return list was not found`);
  const bodies = new Map();
  let name = null;
  let buf = [];
  const flush = () => {
    if (name) bodies.set(name, buf.join('\n').replace(/\s+$/, ''));
    name = null; buf = [];
  };
  for (let i = open + 1; i < close; i += 1) {
    const m = DECL.exec(lines[i]);
    if (m) { flush(); name = m[1]; }
    if (name) buf.push(lines[i]);
  }
  flush();
  return bodies;
}

let handlerCache = null;
function handlerBodies() {
  if (!handlerCache) handlerCache = parseHostHandlerModule(readText(HOST_HANDLERS_FILE));
  return handlerCache;
}

/** Host-spelled text of one moved handler (throws if it is not in host_handlers_source.jsx). */
export function hostHandlerBody(name) {
  const body = handlerBodies().get(name);
  if (!body) throw new Error(`${HOST_HANDLERS_FILE}: no handler named ${name}`);
  return hostSpelling(body);
}

// The function expression a `const name = <expr>;` statement binds.
function expressionOf(name, statement) {
  const m = /^(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*/.exec(statement);
  if (m) return statement.slice(m[0].length).replace(/;\s*$/, '');
  return statement; // a function declaration is also a valid function expression
}

/** Host-spelled body of buildAlloCommandContext (the original _alloCmdCtx body). */
export function commandContextBody() {
  const text = readText(COMMAND_CONTEXT_FILE);
  const marker = '  const __live = deps.__live;\n';
  const start = text.indexOf(marker);
  const end = text.lastIndexOf('\n}');
  if (start < 0 || end < start) throw new Error(`${COMMAND_CONTEXT_FILE}: buildAlloCommandContext body not found`);
  return hostSpelling(text.slice(start + marker.length, end));
}

const SHIM_FN = /(async )?function ([A-Za-z_$][\w$]*)\(\.\.\.__a\) \{ return _alloHostHandlers\(\)\.\2\(\.\.\.__a\); \}/g;
const SHIM_ARROW = /(async )?\(\.\.\.__a\) => _alloHostHandlers\(\)\.([A-Za-z_$][\w$]*)\(\.\.\.__a\)/g;
// Wrapper shims (`(...__a) => { markX(); return _alloHostHandlers().N(...__a); }`): call the body in place.
const SHIM_CALL = /_alloHostHandlers\(\)\.([A-Za-z_$][\w$]*)\(/g;
// Housekeeping shims that no-op until the module lands (_alloHostHandlersOptional).
const SHIM_OPTIONAL = /const ([A-Za-z_$][\w$]*) = \(\.\.\.__a\) => \{\n[ \t]*const handlers = _alloHostHandlersOptional\(\);\n[ \t]*return handlers \? handlers\.\1\(\.\.\.__a\) : undefined;\n[ \t]*\};/g;
const CMD_CTX_SHIM = /const _alloCmdCtx = \(\) => \{\n[\s\S]*?\n {2}\};\n/;
export const UNSHIMMED_MARKER = '\n// ---- host_handlers_source.jsx statements no host shim forwards to ----\n';

/**
 * Put the moved code back into a host text.
 * @param {string} hostText  AlloFlowANTI.txt (or a mirror / built App.jsx)
 * @param {object} [options] { commandContext: true }
 * @returns {string}
 */
export function inlineMovedHostCode(hostText, options = {}) {
  const bodies = handlerBodies();
  const missing = new Set();
  const used = new Set();
  const take = (name) => {
    const body = bodies.get(name);
    if (!body) { missing.add(name); return null; }
    used.add(name);
    return body;
  };
  let out = String(hostText).replace(/\r\n/g, '\n');
  out = out.replace(SHIM_OPTIONAL, (whole, name) => {
    const body = take(name);
    return body == null ? whole : hostSpelling(body);
  });
  out = out.replace(SHIM_FN, (whole, _async, name) => {
    const body = take(name);
    return body == null ? whole : hostSpelling(body);
  });
  out = out.replace(SHIM_ARROW, (whole, _async, name) => {
    const body = take(name);
    return body == null ? whole : hostSpelling(expressionOf(name, body));
  });
  out = out.replace(SHIM_CALL, (whole, name) => {
    const body = take(name);
    return body == null ? whole : '(' + hostSpelling(expressionOf(name, body)) + ')(';
  });
  if (missing.size) throw new Error(`host shims forward to handlers missing from ${HOST_HANDLERS_FILE}: ${[...missing].join(', ')}`);
  if (options.commandContext !== false && CMD_CTX_SHIM.test(out)) {
    const body = commandContextBody();
    out = out.replace(CMD_CTX_SHIM, () => `const _alloCmdCtx = () => {\n${body}\n  };\n`);
  }
  // Module-private helpers moved alongside the handlers (no shim of their own).
  const rest = [...bodies.keys()].filter((name) => !used.has(name));
  if (rest.length) out += UNSHIMMED_MARKER + rest.map((name) => hostSpelling(bodies.get(name))).join('\n') + '\n';
  return out;
}

const hostCache = new Map();

// JSX the host now mounts as CDN view components: wave 2 (74cbea9c9, 09-13) moved four cold-path
// surfaces, and the sidebar tool panels (incl. the Generator/Source shells) live in the sidebar
// bundle. Appended, not inlined, since the host renders them through <CDNModuleGate>/lazy views.
export const MOVED_VIEW_FILES = ['view_canvas_recovery_dialog_source.jsx', 'view_cold_path_surfaces_source.jsx', 'view_sidebar_panels_source.jsx'];
export const VIEWS_MARKER = '\n// ---- host views now in CDN view modules (appended) ----\n';

/**
 * The host file with moved handler and command-context bodies inlined at their shims, and the
 * MOVED_VIEW_FILES sources appended.
 * @param {string} [file]     host path relative to the repo root (default AlloFlowANTI.txt)
 * @param {object} [options]  { extras: [more paths appended], commandContext: true, views: true }
 */
export function readHostSource(file = HOST_FILE, options = {}) {
  const key = file + '|' + (options.commandContext === false ? 0 : 1) + (options.views === false ? 0 : 1);
  if (!hostCache.has(key)) {
    let text = inlineMovedHostCode(readText(file), options);
    if (options.views !== false) text += VIEWS_MARKER + MOVED_VIEW_FILES.map(readText).join('\n');
    hostCache.set(key, text);
  }
  const extras = options.extras || [];
  return extras.length ? [hostCache.get(key), ...extras.map(readText)].join('\n') : hostCache.get(key);
}

/**
 * The real createHostHandlers factory from host_handlers_source.jsx, for tests that RUN moved
 * handlers: evaluate the host slice as-is and pass `() => createHostHandlers(hostDeps(...))`
 * as its `_alloHostHandlers`, so every shim calls the module body.
 */
export function loadHostHandlersFactory() {
  return new Function(readText(HOST_HANDLERS_FILE) + '\nreturn createHostHandlers;')();
}

/**
 * A `__d` like the host's __alloHostDeps getter object: each read looks the name up, live, in
 * the given sources (objects, or functions returning one), first hit wins; otherwise it falls
 * back to the global, as a free identifier in the old eval'd host slice did.
 */
export function hostDeps(...sources) {
  const find = (key) => {
    for (const source of sources) {
      const scope = typeof source === 'function' ? source() : source;
      if (scope && Object.prototype.hasOwnProperty.call(scope, key)) return { hit: true, value: scope[key] };
    }
    return { hit: false };
  };
  return new Proxy({}, {
    get: (_, key) => { const r = find(key); return r.hit ? r.value : globalThis[key]; },
    has: (_, key) => find(key).hit || key in globalThis,
  });
}

/** The host copies tests pin: source, deploy mirror, built app. */
export const HOST_FILES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];

const hostKey = (file) => {
  const rel = relative(root(), resolve(root(), String(file))).split(sep).join('/');
  return HOST_FILES.includes(rel) ? rel : null;
};

/** True when `file` (relative or absolute) is one of HOST_FILES. */
export const isHostFile = (file) => hostKey(file) !== null;

/**
 * Drop-in for fs.readFileSync in pin tests: a host file comes back with the moved code
 * inlined (readHostSource); any other file is read unchanged (or from its
 * HOST_SOURCE_OVERRIDES scratch copy, keyed by repo-relative path).
 */
export function readFileSync(file, ...rest) {
  if (typeof file !== 'string') return fsReadFileSync(file, ...rest);
  const key = hostKey(file);
  if (key) return readHostSource(key);
  const rel = relative(root(), resolve(root(), file)).split(sep).join('/');
  return fsReadFileSync(overrides[rel] || file, ...rest);
}

/** Plain read (CRLF-normalized) of any repo file, e.g. a view_*_source.jsx that now owns JSX. */
export const readSource = (file) => readText(file);

/**
 * Slice a top-level block: from the start anchor through the first later line that
 * closes a column-0 block (`}`, `};`, `})();` ...). Replaces slices that ended at
 * the next `/**` doc comment, which the ANTI comment ratchet (8dce94eed) removed.
 */
export function sliceTopLevelBlock(source, startAnchor, options = {}) {
  const start = indexOfOrThrow(source, startAnchor, options);
  const close = /\n\}[^\n]*(\n|$)/g;
  close.lastIndex = start + startAnchor.length;
  const m = close.exec(source);
  if (!m) throw new Error(`No column-0 closing line after: ${startAnchor}`);
  return source.slice(start, m.index + m[0].length);
}
