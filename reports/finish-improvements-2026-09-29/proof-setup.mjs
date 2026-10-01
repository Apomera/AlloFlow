import fs from 'node:fs';
import path from 'node:path';
import Module, { syncBuiltinESMExports } from 'node:module';
const root = process.cwd();
const mutation = process.env.ALLO_FINISH_PROOF_CASE;
const read = fs.readFileSync;
const load = Module._load;
const normalized = value => String(value).replace(/\\/g, '/').toLowerCase();
const matches = (value, file) => normalized(value) === normalized(path.join(root, file));
const replaceOne = (source, anchor, replacement) => {
  if (source.split(anchor).length !== 2) throw new Error('Mutation anchor is not unique: ' + anchor);
  return source.replace(anchor, replacement);
};
if (mutation === 'teacher' || mutation === 'all') {
  const FunctionBase = globalThis.Function;
  const mutate = args => args.map(value => typeof value === 'string' && value.includes('                  + mappingHtml')
    ? replaceOne(value, '                  + mappingHtml', '                  + ""') : value);
  globalThis.Function = new Proxy(FunctionBase, {
    construct(target, args, newTarget) { return Reflect.construct(target, mutate(args), newTarget); },
    apply(target, thisArg, args) { return Reflect.apply(target, thisArg, mutate(args)); },
  });
}
if (mutation === 'teacher' || mutation === 'theme' || mutation === 'all') {
  fs.readFileSync = function(file, ...args) {
    const value = read.call(this, file, ...args);
    if ((mutation === 'theme' || mutation === 'all') && matches(file, 'app_styles_source.jsx')) return replaceOne(value, '<style data-docsuite-theme="v1">{`', '<style data-docsuite-theme="v1">{`\n/* intentional stale-theme mutation */');
    return value;
  };
  syncBuiltinESMExports();
}
if (!['teacher', 'theme'].includes(mutation)) {
  const candidates = new Map();
  Module._load = function(request, parent, isMain) {
    const resolved = Module._resolveFilename(request, parent, isMain);
    return candidates.has(normalized(resolved)) ? candidates.get(normalized(resolved)).exports : load.call(this, request, parent, isMain);
  };
  const files = mutation === 'all' ? ['dev-tools/fixture_subprocess.cjs', 'dev-tools/build_document_at_fixture_suite.cjs']
    : [mutation === 'budget' ? 'dev-tools/build_document_at_fixture_suite.cjs' : 'dev-tools/fixture_subprocess.cjs'];
  for (const relative of files) {
    const file = path.join(root, relative);
    let source = read(file, 'utf8');
    if ((mutation === 'budget' || mutation === 'all') && relative.endsWith('build_document_at_fixture_suite.cjs')) source = replaceOne(source, 'PORTABLE_EXPORT_TIMEOUT_MS = 240000', 'PORTABLE_EXPORT_TIMEOUT_MS = 150000');
    if ((mutation === 'stderr' || mutation === 'all') && relative.endsWith('fixture_subprocess.cjs')) source = replaceOne(source, "[stdout.trim(), stderr.trim(), failure?.message]", '[stdout.trim(), failure?.message]');
    if ((mutation === 'cleanup' || mutation === 'all') && relative.endsWith('fixture_subprocess.cjs')) source = replaceOne(source, 'cleanup = stopTree(child);', "cleanup = Promise.resolve('terminated');");
    const candidate = new Module(file);
    candidate.filename = file;
    candidate.paths = Module._nodeModulePaths(path.dirname(file));
    candidate._compile(source, file);
    candidates.set(normalized(file), candidate);
  }
}
