// Exercises deployment's generated-file selection in an isolated repository.
// No build, deployment, remote, hook or production repository mutation runs.
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { parse } from 'acorn';
import { sliceBetween } from './helpers/anchored_slice.js';

const deploy = readFileSync('deploy.sh', 'utf8').replace(/\r\n/g, '\n');
const build = readFileSync('build.js', 'utf8');
const tempRoots = [];
const bash = process.platform === 'win32'
  ? join(process.env.ProgramFiles || 'C:/Program Files', 'Git/bin/bash.exe')
  : 'bash';

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    if (!resolve(root).startsWith(resolve(tmpdir()) + sep) || !basename(root).startsWith('alloflow-deploy-modules-')) {
      throw new Error('Refusing to remove an unexpected fixture directory');
    }
    rmSync(root, { recursive: true, force: true });
  }
});

function compiledModuleNames() {
  const ast = parse(build, { ecmaVersion: 'latest' });
  const declaration = ast.body.flatMap(node => node.declarations || []).find(node => node.id.name === 'COMPILE_PAIRS');
  expect(declaration, 'the compile-pair declaration must be discoverable').toBeTruthy();
  const names = [];
  function value(node, env) {
    if (node.type === 'Literal') return node.value;
    if (node.type === 'Identifier' && Object.hasOwn(env, node.name)) return env[node.name];
    if (node.type === 'BinaryExpression' && node.operator === '+') return value(node.left, env) + value(node.right, env);
    throw new Error('Unrecognized compiled path expression: ' + node.type);
  }
  function visit(node, env = {}) {
    if (node.type === 'SpreadElement') return visit(node.argument, env);
    if (node.type === 'ArrayExpression') return node.elements.forEach(item => visit(item, env));
    if (node.type === 'ObjectExpression') {
      const output = node.properties.find(prop => prop.key.name === 'modPath');
      if (!output || output.value.type !== 'CallExpression' || output.value.callee.object?.name !== 'path' || output.value.callee.property?.name !== 'join') {
        throw new Error('Unrecognized compiled module declaration');
      }
      names.push(output.value.arguments.slice(1).map(arg => value(arg, env)).join('/'));
      return;
    }
    if (node.type === 'CallExpression' && node.callee.name === 'simplePureCompilePair') {
      names.push(value(node.arguments[1], env) + '_module.js');
      return;
    }
    if (node.type === 'CallExpression' && node.callee.property?.name === 'map' && node.callee.object.type === 'ArrayExpression') {
      const callback = node.arguments[0];
      node.callee.object.elements.forEach(item => visit(callback.body, { ...env, [callback.params[0].name]: value(item, env) }));
      return;
    }
    throw new Error('Unrecognized COMPILE_PAIRS entry: ' + node.type);
  }
  visit(declaration.init);
  return names.sort();
}

function between(start, end) {
  return sliceBetween(deploy, start, end, { file: 'deploy.sh', label: 'deployment fixture blocks' });
}

describe('deploy generated root modules', () => {
  it('covers every current build.js compile output exactly once', () => {
    const declared = deploy.match(/POST_MODULES=\(([\s\S]*?)\n\)/)?.[1].trim().split(/\s+/);
    expect(declared).toBeTruthy();
    expect(declared.length).toBe(new Set(declared).size);
    expect([...declared].sort()).toEqual(compiledModuleNames());
  });

  it('stages rebuilt roots while preserving untouched dirty files and unrelated staging', () => {
    if (process.platform === 'win32') expect(existsSync(bash), 'Git Bash is needed to validate deploy.sh').toBe(true);
    const root = mkdtempSync(join(tmpdir(), 'alloflow-deploy-modules-'));
    tempRoots.push(root);
    const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const put = (path, content) => {
      const full = join(root, path);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, content);
    };
    git('init', '--quiet');
    git('config', 'user.email', 'deploy-fixture@example.invalid');
    git('config', 'user.name', 'Deployment fixture');
    git('config', 'core.autocrlf', 'false');
    const files = ['allo_commands_module.js', 'live_aac_module.js', 'udl_chat_module.js', 'host_handlers_module.js', 'desktop/web-app/public/fixture_module.js', 'other-session.txt'];
    files.forEach(file => put(file, 'baseline\n'));
    git('add', '--', ...files);
    git('commit', '--quiet', '-m', 'Fixture baseline');
    put('live_aac_module.js', 'untouched work\n');
    put('udl_chat_module.js', 'rewritten same bytes\n');
    put('host_handlers_module.js', 'old generated work\n');
    put('desktop/web-app/public/fixture_module.js', 'untouched mirror work\n');
    put('other-session.txt', 'separately staged work\n');
    git('add', '--', 'other-session.txt');

    const snapshot = between('POST_MODULES=(', 'node build.js --mode=prod --force');
    const collection = between('_af_generated_dirty > "$DEPLOY_TMP/generated_post.tsv"', 'POST_COMMITTED=0');
    const script = [
      'set -euo pipefail',
      'DEPLOY_TMP=.deploy-fixture; mkdir "$DEPLOY_TMP"',
      '_af_names() { "$@" -z | tr "\\0" "\\n" | LC_ALL=C sort -u; }',
      'touch -t 200001010000 live_aac_module.js udl_chat_module.js host_handlers_module.js desktop/web-app/public/fixture_module.js',
      snapshot,
      'printf "new compiled command module\\n" > allo_commands_module.js',
      'printf "new generated handlers\\n" > host_handlers_module.js',
      // Emulate a builder that rewrites the same dirty bytes without a hash change.
      'touch -t 209901010000 udl_chat_module.js',
      'POST_NAMED=()',
      collection,
    ].join('\n');
    execFileSync(bash, ['-c', script], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    expect(readFileSync(join(root, '.deploy-fixture/post_commit.lst'), 'utf8').trim().split('\n').sort()).toEqual([
      'allo_commands_module.js', 'host_handlers_module.js', 'udl_chat_module.js',
    ]);
    expect(git('diff', '--cached', '--name-only').trim().split(/\r?\n/).sort()).toEqual([
      'allo_commands_module.js', 'host_handlers_module.js', 'other-session.txt', 'udl_chat_module.js',
    ]);
    expect(git('diff', '--name-only').trim().split(/\r?\n/).sort()).toEqual([
      'desktop/web-app/public/fixture_module.js', 'live_aac_module.js',
    ]);
  });
});
