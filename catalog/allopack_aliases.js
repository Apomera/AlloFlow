'use strict';

// Historical files stay available, while every old catalog/link id opens its
// explicitly named current edition. Aliases never add browse entries.
const ID = /^[a-z0-9][a-z0-9_-]{0,127}$/i;
const SHARE = /^[a-z0-9][a-z0-9-]{0,127}$/;
const PACK = /^allopacks\/(?:illustrated\/)?[a-z0-9_-]+\.allopack\.json$/i;

function legacyAliases(entry) {
  if (entry.legacy_aliases === undefined) return [];
  if (!Array.isArray(entry.legacy_aliases) || entry.legacy_aliases.length > 128) {
    throw new Error('Invalid legacy aliases: ' + entry.path);
  }
  return entry.legacy_aliases.map(alias => {
    if (!alias || typeof alias !== 'object' || Array.isArray(alias) ||
        typeof alias.slug !== 'string' || typeof alias.share_slug !== 'string' || typeof alias.path !== 'string' ||
        !ID.test(alias.slug) || !SHARE.test(alias.share_slug) || !PACK.test(alias.path)) {
      throw new Error('Invalid legacy alias: ' + entry.path);
    }
    return alias;
  });
}

function validateAliases(entries) {
  const slugs = new Set(), paths = new Set(), shares = new Set();
  function reserve(record) {
    if (record.slug !== undefined && slugs.has(record.slug)) throw new Error('duplicate catalog slug: ' + record.slug);
    if (paths.has(record.path)) throw new Error('duplicate catalog path: ' + record.path);
    if (record.share_slug && shares.has(record.share_slug)) throw new Error('Duplicate share alias: ' + record.share_slug);
    if (record.slug !== undefined) slugs.add(record.slug);
    paths.add(record.path);
    if (record.share_slug) shares.add(record.share_slug);
  }
  entries.forEach(reserve);
  for (const entry of entries) {
    const aliases = legacyAliases(entry);
    if (aliases.length && !PACK.test(entry.path)) throw new Error('Only AlloPacks can have legacy aliases: ' + entry.path);
    aliases.forEach(reserve);
  }
  return entries;
}

module.exports = { legacyAliases, validateAliases };
