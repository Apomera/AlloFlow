#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const DEPLOY_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const UI_FILES = [
  path.join(ROOT, 'ui_strings.js'),
  path.join(ROOT, 'desktop', 'web-app', 'public', 'ui_strings.js')
];
const EXPECTED_KEYS = ['label', 'role_description', 'dashboard_title', 'progress_label', 'guide_action'];
const UI_USAGE = [
  ['view_header_source.jsx', ['parent_mode.label', 'parent_mode.dashboard_title', 'parent_mode.progress_label']],
  ['ui_modals_source.jsx', ['parent_mode.role_description']],
  ['view_sidebar_panels_source.jsx', ['parent_mode.guide_action']]
];

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [];
for (const [relativeFile, references] of UI_USAGE) {
  const source = fs.readFileSync(path.join(ROOT, relativeFile), 'utf8');
  for (const reference of references) {
    if (!source.includes(reference)) errors.push(`${relativeFile} does not use ${reference}`);
  }
}
const checkNamespace = (file, namespace) => {
  const value = readJson(file)[namespace];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${path.relative(ROOT, file)} is missing ${namespace}`);
    return null;
  }
  const keys = Object.keys(value).sort();
  const expected = [...EXPECTED_KEYS].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    errors.push(`${path.relative(ROOT, file)}.${namespace} keys: ${keys.join(', ')}`);
  }
  for (const key of EXPECTED_KEYS) {
    if (typeof value[key] !== 'string' || !value[key].trim()) {
      errors.push(`${path.relative(ROOT, file)}.${namespace}.${key} is empty`);
    }
    if (/\{\w+\}/.test(value[key] || '')) {
      errors.push(`${path.relative(ROOT, file)}.${namespace}.${key} has an unexpected placeholder`);
    }
  }
  return value;
};

const uiNamespaces = UI_FILES.map(file => checkNamespace(file, 'parent_mode'));
if (uiNamespaces[0] && uiNamespaces[1] && JSON.stringify(uiNamespaces[0]) !== JSON.stringify(uiNamespaces[1])) {
  errors.push('ui_strings.js and deployed ui_strings.js parent_mode values differ');
}

const files = fs.readdirSync(LANG_DIR).filter(file => file.endsWith('.js')).sort();
if (files.length !== 63) errors.push(`Expected 63 language packs, found ${files.length}`);
for (const file of files) {
  const canonicalFile = path.join(LANG_DIR, file);
  const deployedFile = path.join(DEPLOY_DIR, file);
  if (!fs.existsSync(deployedFile)) {
    errors.push(`Missing deployed mirror for ${file}`);
    continue;
  }
  const canonical = checkNamespace(canonicalFile, 'parent_mode');
  const deployed = checkNamespace(deployedFile, 'parent_mode');
  if (canonical && deployed && JSON.stringify(canonical) !== JSON.stringify(deployed)) {
    errors.push(`${file} canonical/deployed parent_mode values differ`);
  }
}

if (errors.length) {
  console.error(`Parent-mode i18n coverage failed (${errors.length} issue(s))`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Parent-mode i18n coverage passed: ${files.length} language packs × ${EXPECTED_KEYS.length} keys, with canonical/deployed mirrors in sync.`);
