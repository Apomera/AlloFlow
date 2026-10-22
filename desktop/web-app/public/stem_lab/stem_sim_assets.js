/* Small shared asset catalog. This file describes and dispatches to existing
 * providers; it does not load scripts, transform models, own resources, advance
 * a clock, or assign ecological behavior. Each consumer owns the native result.
 *
 * Entry versions describe a maintained asset contract, not a content-addressed
 * snapshot of a provider. Changes to providers still require consumer regression
 * checks; loading this catalog cannot pin an older provider implementation.
 */
(function (global) {
  'use strict';
  if (global.StemSimAssets) return;

  function freeze(value) {
    if (value && typeof value === 'object') {
      Object.keys(value).forEach(function (key) { freeze(value[key]); });
      Object.freeze(value);
    }
    return value;
  }

  var VERSION = '1.0.0';
  var entries = [{
    id: 'animal.mourning-dove', version: VERSION, name: 'Mourning dove', kind: 'animal',
    representation: 'three-object', style: 'procedural naturalistic',
    units: 'metres', up: '+Y', forward: '+Z', origin: 'Ground at y=0 in the resting pose',
    dimensions: 'Authored in metres; proportions and cadence are illustrative, not calibrated measurements.',
    quality: ['high', 'low'],
    contract: 'avian-woodland-native-v1',
    handle: ['root', 'body', 'head', 'wings', 'tail', 'feet', 'profile', 'update', 'dispose'],
    pose: 'Caller supplies the existing AvianWoodlandBirds.update pose; no catalog animation clock.',
    ownership: 'Each create call owns its native model and disposable resources. Caller owns root placement.',
    dependencies: [{ global: 'AvianWoodlandBirds', version: VERSION }, { argument: 'THREE', revision: '128' }],
    source: 'stem_lab/avian_woodland_birds.js', providerKey: 'mourningDove',
    limits: [
      'No biological behavior, collision shape, mass, vision model, or learning activity is supplied.',
      'Host lighting and deliberate display scale remain consumer decisions.',
      'The native profile.sizeM is an illustrative provider tuning value, not a measured bounding length.',
      'Version identifies the maintained adapter contract, not an immutable provider file.'
    ]
  }];
  ['shrub', 'grass', 'reed', 'seed'].forEach(function (kind) {
    entries.push({
      id: 'plant.meadow-' + kind, version: VERSION, name: 'Meadow ' + kind, kind: 'plant',
      representation: 'triangle-data', style: 'procedural meadow',
      units: 'authored-relative', up: '+Y', forward: null,
      origin: kind === 'shrub' || kind === 'seed' ? 'Authored center; geometry extends below y=0' : 'Blade base at y=0',
      dimensions: 'Relative geometry units; the host supplies physical or display scale.',
      quality: ['native'], contract: 'stem-meadow-vegetation-native-v1',
      handle: ['positions', 'colors', 'smoothVertices'], pose: null,
      ownership: 'Each createData call returns fresh mutable arrays. Caller owns geometry, material, placement, and disposal.',
      dependencies: [{ global: 'StemMeadow', method: 'vegetation' }],
      source: 'stem_lab/stem_sim_meadow.js', providerKey: kind,
      limits: [
        'A decorative primitive, not an identified botanical species or calibrated physical plant.',
        'No habitat, navigation, food, shelter, collision, wind, or learning effects are assigned.',
        'Colors are native vertex shade factors; the host supplies material and lighting.',
        'Version identifies the maintained adapter contract, not an immutable provider file.'
      ]
    });
  });
  freeze(entries);

  function get(id, version) {
    if (typeof id !== 'string' || version !== VERSION) return null;
    for (var i = 0; i < entries.length; i++) if (entries[i].id === id) return entries[i];
    return null;
  }
  function provider(entry) {
    if (!entry) return null;
    if (entry.representation === 'three-object') {
      var birds = global.AvianWoodlandBirds;
      if (!birds || birds.version !== VERSION || typeof birds.create !== 'function' || typeof birds.supports !== 'function') return null;
      // A damaged or incompatible provider must not enable a catalog entry.
      try { return birds.supports(entry.providerKey) === true ? birds : null; } catch (error) { return null; }
    }
    var meadow = global.StemMeadow;
    return meadow && typeof meadow.vegetation === 'function' ? meadow : null;
  }
  function requireEntry(id, version, representation) {
    var entry = get(id, version);
    if (!entry) throw new RangeError('Unknown shared asset or version: ' + String(id) + '@' + String(version));
    if (entry.representation !== representation) throw new RangeError('Shared asset requires ' + entry.representation + ': ' + entry.id);
    return entry;
  }
  function requireProvider(entry) {
    var implementation = provider(entry);
    if (!implementation) throw new Error('Shared asset provider unavailable: ' + entry.id + '@' + entry.version);
    return implementation;
  }
  function create(THREE, id, version, options) {
    var entry = requireEntry(id, version, 'three-object');
    // Pass every argument and the result through without a wrapper or transforms.
    return requireProvider(entry).create(THREE, entry.providerKey, options);
  }
  function createData(id, version) {
    var entry = requireEntry(id, version, 'triangle-data');
    return requireProvider(entry).vegetation(entry.providerKey);
  }
  global.StemSimAssets = Object.freeze({
    version: VERSION,
    list: function () { return entries; },
    get: get,
    available: function (id, version) { return !!provider(get(id, version)); },
    create: create,
    createData: createData
  });
})(typeof window !== 'undefined' ? window : globalThis);
