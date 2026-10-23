'use strict';
const YAML = require('yaml');

function inspectImages(composeSource, dockerfiles) {
  const errors = [];
  const pinned = (image) => typeof image === 'string' && /^[^\s@]+@sha256:[a-f0-9]{64}$/.test(image);
  const compose = YAML.parse(composeSource, { maxAliasCount: 30 });
  for (const [name, service] of Object.entries(compose.services || {})) {
    if (service.image && !pinned(service.image)) errors.push(name + ': image requires an immutable SHA256 digest');
  }
  for (const [name, source] of Object.entries(dockerfiles)) {
    for (const line of source.split(/\r?\n/)) {
      const match = /^FROM\s+(\S+)/i.exec(line.trim());
      if (match && !pinned(match[1])) errors.push(name + ': base image requires an immutable SHA256 digest');
    }
  }
  return errors;
}

function inspectRequirements(source) {
  const errors = [];
  const lines = source.replace(/\\\r?\n/g, ' ').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
  if (!lines.length) return ['A dependency lock cannot be empty'];
  for (const line of lines) {
    if (!/^[a-z0-9][a-z0-9_.-]*==[a-z0-9][a-z0-9.+!-]*(?:\s*;\s*sys_platform\s*==\s*"win32")?(?:\s+--hash=sha256:[a-f0-9]{64})+$/i.test(line)) {
      errors.push('Every dependency must use an exact version and SHA256 wheel hashes: ' + line.split(/\s/)[0]);
    }
  }
  return errors;
}

module.exports = { inspectImages, inspectRequirements };
