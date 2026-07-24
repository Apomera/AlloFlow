#!/usr/bin/env node
/**
 * Pipeline integrity checker.
 *
 * Scans the UI for every `_docPipeline.XXX` call and cross-references against
 * the exports in doc_pipeline_source.jsx + doc_pipeline_module.js. Any UI call
 * that doesn't map to an export is a "dangling reference" — at runtime it will
 * throw "X is not a function" when the user clicks the button.
 *
 * This is the class of bug that bit us twice:
 *   - 1542fc8 silently dropped Expert Workbench (processExpertCommand)
 *   - 1ce8054 silently dropped Multi-session + Tier 2/2.5/3 (7 functions)
 * Both times the commit message was bland and unrelated.
 *
 * Usage:
 *   node check-pipeline-integrity.js          # exits non-zero if dangling refs found
 *   node check-pipeline-integrity.js --quiet  # only print on failure
 *
 * Install as a pre-commit hook:
 *   cp check-pipeline-integrity.js .git/hooks/pre-commit
 *   chmod +x .git/hooks/pre-commit
 *
 * …or add to package.json scripts: "precommit": "node check-pipeline-integrity.js"
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverseModule = require('@babel/traverse');
const traverse = traverseModule.default || traverseModule;

// ROOT = repo root (parent of dev-tools/)
const ROOT = path.resolve(__dirname, '..');
const UI_FILES = [
  path.join(ROOT, 'AlloFlowANTI.txt'),
  path.join(ROOT, 'prismflow-deploy', 'src', 'App.jsx'),
];
const PIPELINE_FILES = [
  path.join(ROOT, 'doc_pipeline_source.jsx'),
  path.join(ROOT, 'doc_pipeline_module.js'),
];
const REMEDIATION_RUNTIME_FILES = [
  path.join(ROOT, 'doc_pipeline_source.jsx'),
  path.join(ROOT, 'view_pdf_audit_source.jsx'),
  path.join(ROOT, 'gemini_api_source.jsx'),
];
// Application-owned resources are deployed and versioned with AlloFlow rather
// than resolved from a mutable third-party package tag. Loopback endpoints are
// likewise local runtime services, not remote executable dependencies.
const SELF_HOSTED_RUNTIME_HOSTS = new Set([
  'alloflow-cdn.pages.dev', '127.0.0.1', 'localhost', '[::1]',
]);

const quiet = process.argv.includes('--quiet');

function read(file) {
  try { return fs.readFileSync(file, 'utf-8'); }
  catch (e) { console.error('Cannot read ' + file + ': ' + e.message); return ''; }
}

// Every identifier the UI tries to call on the pipeline object.
function uiCalls(src) {
  const re = /_docPipeline\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
  const found = new Set();
  let m;
  while ((m = re.exec(src)) !== null) found.add(m[1]);
  return found;
}

function parseSource(src, filename) {
  return parser.parse(src, {
    sourceType: 'unambiguous',
    sourceFilename: filename || '<inline>',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    plugins: [
      'jsx',
      'dynamicImport',
      'optionalChaining',
      'nullishCoalescingOperator',
      'objectRestSpread',
      'classProperties',
    ],
  });
}

function docPipelineFactoryPath(ast) {
  let factory = null;
  traverse(ast, {
    VariableDeclarator(p) {
      if (factory || !p.get('id').isIdentifier({ name: 'createDocPipeline' })) return;
      const init = p.get('init');
      if (init.isFunctionExpression() || init.isArrowFunctionExpression()) {
        factory = init;
        p.stop();
      }
    },
    FunctionDeclaration(p) {
      if (factory || !p.get('id').isIdentifier({ name: 'createDocPipeline' })) return;
      factory = p;
      p.stop();
    },
    AssignmentExpression(p) {
      if (factory || !p.get('left').isIdentifier({ name: 'createDocPipeline' })) return;
      const right = p.get('right');
      if (right.isFunctionExpression() || right.isArrowFunctionExpression()) {
        factory = right;
        p.stop();
      }
    },
  });
  return factory;
}

function returnedObjectPath(returnPath) {
  const argument = returnPath.get('argument');
  if (argument.isObjectExpression()) return argument;
  if (!argument.isIdentifier()) return null;

  const binding = returnPath.scope.getBinding(argument.node.name);
  if (!binding) return null;
  const declaration = binding.path.isVariableDeclarator()
    ? binding.path
    : binding.path.parentPath;
  if (!declaration || !declaration.isVariableDeclarator()) return null;
  const init = declaration.get('init');
  return init.isObjectExpression() ? init : null;
}

function objectPropertyName(propertyPath) {
  if (!(propertyPath.isObjectProperty() || propertyPath.isObjectMethod())) return null;
  const key = propertyPath.get('key');
  if (key.isIdentifier() && !propertyPath.node.computed) return key.node.name;
  if (key.isStringLiteral() || key.isNumericLiteral()) return String(key.node.value);
  return null;
}

function collectObjectKeys(objectPath, found, seen) {
  if (!objectPath || !objectPath.node || seen.has(objectPath.node)) return;
  seen.add(objectPath.node);

  objectPath.get('properties').forEach(propertyPath => {
    const name = objectPropertyName(propertyPath);
    if (name) {
      found.add(name);
      return;
    }
    if (!propertyPath.isSpreadElement()) return;
    const argument = propertyPath.get('argument');
    if (!argument.isIdentifier()) return;
    const binding = argument.scope.getBinding(argument.node.name);
    if (!binding) return;
    const declaration = binding.path.isVariableDeclarator()
      ? binding.path
      : binding.path.parentPath;
    if (!declaration || !declaration.isVariableDeclarator()) return;
    const init = declaration.get('init');
    if (init.isObjectExpression()) collectObjectKeys(init, found, seen);
  });
}

// Every identifier exported from createDocPipeline's own returned object. AST
// ownership prevents top-level and nested helper returns from masquerading as
// the factory export, regardless of indentation or formatting.
function exportsIn(src, filename) {
  const ast = parseSource(src, filename);
  const factory = docPipelineFactoryPath(ast);
  if (!factory) return new Set();

  const candidates = [];
  factory.traverse({
    ReturnStatement(p) {
      const owner = p.getFunctionParent();
      if (!owner || owner.node !== factory.node) return;
      const objectPath = returnedObjectPath(p);
      if (objectPath) candidates.push({ at: p.node.start || 0, objectPath });
    },
  });
  if (candidates.length === 0) return new Set();

  candidates.sort((a, b) => a.at - b.at);
  const found = new Set();
  collectObjectKeys(candidates[candidates.length - 1].objectPath, found, new Set());
  return found;
}

function expressionLabel(node, depth) {
  if (!node || depth > 6) return 'expression';
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'ThisExpression') return 'this';
  if (node.type === 'StringLiteral' || node.type === 'NumericLiteral') return String(node.value);
  if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
    const object = expressionLabel(node.object, depth + 1);
    const property = node.computed
      ? expressionLabel(node.property, depth + 1)
      : (node.property && node.property.name) || 'property';
    return object + '.' + property;
  }
  if (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') {
    return expressionLabel(node.callee, depth + 1) + '(...)';
  }
  return node.type || 'expression';
}

function stringExpressionShape(node, depth) {
  if (!node || depth > 20) return '${expression}';
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral') {
    let value = '';
    node.quasis.forEach((quasi, index) => {
      value += quasi.value.cooked == null ? quasi.value.raw : quasi.value.cooked;
      if (index < node.expressions.length) {
        value += '${' + expressionLabel(node.expressions[index], 0) + '}';
      }
    });
    return value;
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return stringExpressionShape(node.left, depth + 1) + stringExpressionShape(node.right, depth + 1);
  }
  return '${' + expressionLabel(node, 0) + '}';
}

function urlStringsIn(src, filename) {
  const ast = parseSource(src, filename);
  const references = [];
  const seen = new Set();

  function addShape(shape, line) {
    const re = /https?:\/\/[^\s"'`<>\\]+/gi;
    let match;
    while ((match = re.exec(shape)) !== null) {
      const url = match[0].replace(/[),.;\]}]+$/, '');
      const key = line + '\u0000' + url;
      if (seen.has(key)) continue;
      seen.add(key);
      references.push({ url, line });
    }
  }

  traverse(ast, {
    StringLiteral(p) {
      if (p.parentPath.isBinaryExpression({ operator: '+' }) || p.parentPath.isTemplateLiteral()) return;
      addShape(p.node.value, p.node.loc ? p.node.loc.start.line : 1);
    },
    TemplateLiteral(p) {
      if (p.parentPath.isBinaryExpression({ operator: '+' })) return;
      addShape(stringExpressionShape(p.node, 0), p.node.loc ? p.node.loc.start.line : 1);
    },
    BinaryExpression(p) {
      if (p.node.operator !== '+') return;
      if (p.parentPath.isBinaryExpression({ operator: '+' })) return;
      addShape(stringExpressionShape(p.node, 0), p.node.loc ? p.node.loc.start.line : 1);
    },
  });
  return references;
}

function runtimeUrlHost(url) {
  const match = /^https?:\/\/(\[[^\]]+\]|[^/:?#]+)/i.exec(url);
  return match ? match[1].toLowerCase() : '';
}

function runtimeUrlPath(url) {
  return url.replace(/^https?:\/\/[^/]+/i, '');
}

function hasExactRuntimeVersion(url) {
  const pathAndQuery = runtimeUrlPath(url).replace(/\$\{[^}]*\}/g, 'expression');
  return /(?:@|[\/_-])v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?(?=[\/_.?#)-]|$)/.test(pathAndQuery)
    || /[?&](?:v|version)=\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?(?:[&#]|$)/i.test(pathAndQuery);
}

function isRemoteExecutable(url) {
  const host = runtimeUrlHost(url);
  const pathAndQuery = runtimeUrlPath(url);
  if (/\.(?:m?js|cjs|wasm)(?:[?#)]|$)/i.test(pathAndQuery)) return true;
  if (/\/\+esm(?:[/?#)]|$)/i.test(pathAndQuery)) return true;
  return host === 'esm.sh' || host === 'cdn.skypack.dev' || host === 'jspm.dev';
}

function redactRuntimeUrl(url) {
  return url
    .replace(/([?&](?:key|api[-_]?key|x-goog-api-key)=)[^&#\s]*/gi, '$1[redacted]')
    .replace(/\$\{[^}]*(?:api[-_.]?key|x[-_.]?goog[-_.]?api[-_.]?key)[^}]*\}/gi, '${REDACTED_API_KEY}');
}

function runtimeUrlIssues(src, filename) {
  const issues = [];
  urlStringsIn(src, filename).forEach(reference => {
    const { url, line } = reference;
    const host = runtimeUrlHost(url);
    if (!host) return;
    const displayUrl = redactRuntimeUrl(url);
    const add = (code, message) => issues.push({ code, message, url: displayUrl, line });
    if (/[?&](?:key|api[-_]?key|x-goog-api-key)=/i.test(url)
        || /\$\{[^}]*(?:api[-_.]?key|x[-_.]?goog[-_.]?api[-_.]?key)[^}]*\}/i.test(url)) {
      add('api-key-in-url', 'API keys must be sent in headers or request bodies, never runtime URLs.');
    }
    if (SELF_HOSTED_RUNTIME_HOSTS.has(host)) return;

    const pathAndQuery = runtimeUrlPath(url);
    const majorOnly = /@\d+(?=\/|[?#]|$)/i.test(pathAndQuery);
    const unversionedEsm = /\/\+esm(?:[/?#)]|$)/i.test(pathAndQuery) && !hasExactRuntimeVersion(url);
    if (majorOnly) {
      add('major-only-package-version', 'Third-party package URLs must use an exact semantic version, not a major-only range.');
    }
    if (unversionedEsm) {
      add('unversioned-esm', 'ES module CDN URLs must include an exact semantic version.');
    }
    if (isRemoteExecutable(url) && !hasExactRuntimeVersion(url) && !majorOnly && !unversionedEsm) {
      add('unversioned-remote-executable', 'Remote executable resources must include an exact semantic version.');
    }
  });
  return issues;
}

function runIntegrityCheck() {
  const allUiCalls = new Set();
  UI_FILES.forEach(f => {
    const src = read(f);
    uiCalls(src).forEach(c => allUiCalls.add(c));
  });

  const scanErrors = [];
  const pipelineExports = {};
  PIPELINE_FILES.forEach(f => {
    try {
      pipelineExports[path.basename(f)] = exportsIn(read(f), f);
    } catch (error) {
      pipelineExports[path.basename(f)] = new Set();
      scanErrors.push({ file: f, message: error.message });
    }
  });

  // A call is "dangling" if at least one pipeline file is missing it.
  const dangling = {};
  allUiCalls.forEach(call => {
    Object.keys(pipelineExports).forEach(fileName => {
      if (!pipelineExports[fileName].has(call)) {
        (dangling[fileName] = dangling[fileName] || []).push(call);
      }
    });
  });

  const runtimeProblems = [];
  REMEDIATION_RUNTIME_FILES.forEach(f => {
    try {
      runtimeUrlIssues(read(f), f).forEach(issue => {
        runtimeProblems.push({ ...issue, file: path.relative(ROOT, f).replace(/\\/g, '/') });
      });
    } catch (error) {
      scanErrors.push({ file: f, message: error.message });
    }
  });

  const hasDangling = Object.values(dangling).some(arr => arr.length > 0);
  const hasIssues = hasDangling || runtimeProblems.length > 0 || scanErrors.length > 0;

  if (hasIssues) {
    console.error('\n❌ Pipeline integrity check FAILED\n');
    if (scanErrors.length > 0) {
      console.error('Source parsing errors:');
      scanErrors.forEach(error => {
        console.error('  ' + path.relative(ROOT, error.file).replace(/\\/g, '/') + ': ' + error.message);
      });
      console.error('');
    }
    if (hasDangling) {
      console.error('The UI calls these _docPipeline methods that are not exported. At runtime,');
      console.error('calling them will throw "X is not a function" — exactly the class of regression');
      console.error('that hit us in 1542fc8 (Expert Workbench) and 1ce8054 (Multi-session).\n');
      Object.keys(dangling).forEach(fileName => {
        if (dangling[fileName].length === 0) return;
        console.error('  ' + fileName + ' is missing ' + dangling[fileName].length + ' export(s):');
        dangling[fileName].sort().forEach(name => console.error('    • ' + name));
        console.error('');
      });
      console.error('Fix: either add the missing exports to the factory return block, or remove');
      console.error('the UI call sites. If you are seeing this after a rebase/merge, an earlier');
      console.error('commit likely dropped code accidentally — check `git log -S "<name>" -- <file>`.');
    }
    if (runtimeProblems.length > 0) {
      console.error(hasDangling ? '\nRemediation runtime URL policy violations:\n' : 'Remediation runtime URL policy violations:\n');
      runtimeProblems.forEach(issue => {
        console.error('  ' + issue.file + ':' + issue.line + ' [' + issue.code + ']');
        console.error('    ' + issue.message);
        console.error('    URL: ' + issue.url);
      });
      console.error('\nFix: pin third-party executable resources to exact versions and pass API');
      console.error('keys in headers or request bodies. Add only reviewed application-owned hosts');
      console.error('to SELF_HOSTED_RUNTIME_HOSTS, with a comment documenting their ownership.');
    }
    return 1;
  }

  if (!quiet) {
    console.log('✓ Pipeline integrity OK');
    console.log('  UI calls: ' + allUiCalls.size);
    Object.keys(pipelineExports).forEach(f => {
      console.log('  ' + f + ' exports: ' + pipelineExports[f].size);
    });
  }
  return 0;
}

if (require.main === module) {
  process.exit(runIntegrityCheck());
}

module.exports = {
  exportsIn,
  runtimeUrlIssues,
  runIntegrityCheck,
};
