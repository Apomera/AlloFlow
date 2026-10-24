'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../..');
const canonical = require('./skyschool_finish_20261017_keys_en.json');
const keys = Object.keys(canonical);
const excluded = new Set(['acholi','chin_falam','chin_hakha','karen','lingala','marshallese','maay_maay']);
const unchangedAllowed = new Set(['stem.flightsim.panel_dial_asi','stem.flightsim.panel_dial_alt','stem.flightsim.panel_dial_hdg','stem.flightsim.panel_dial_turn','stem.flightsim.minus_key','stem.flightsim.oat_normal']);
const slots = value => (value.match(/\{[^{}]+\}/g) || []).sort();

function validateOverlay(slug, overlay) {
  if (excluded.has(slug)) throw new Error('Native review or wrong-language exclusion: '+slug);
  assert.deepEqual(Object.keys(overlay).sort(), [...keys].sort(), slug+': incorrect key set');
  for (const key of keys) {
    const value = overlay[key];
    assert.equal(typeof value, 'string', slug+': non-string '+key);
    assert.ok(value.trim(), slug+': empty '+key);
    assert.ok(!value.includes('\uFFFD'), slug+': invalid Unicode '+key);
    assert.deepEqual(slots(value), slots(canonical[key]), slug+': placeholders '+key);
    assert.ok(value !== canonical[key] || unchangedAllowed.has(key), slug+': English filler '+key);
    for (const token of ['W/S','A/D','Q/E']) if (canonical[key].includes(token)) assert.ok(value.includes(token),slug+': missing control '+token+' in '+key);
  }
}

function mergedPack(slug, raw, overlay) {
  const pack = JSON.parse(raw);
  assert.equal(raw.trimEnd(), JSON.stringify(pack,null,2).trimEnd(), slug+': unrelated reformat refused');
  pack.stem ||= {};
  pack.stem.flightsim ||= {};
  const existingCoaching = pack.stem.flightsim.coaching_challenge !== undefined;
  let changed = 0;
  for (const key of keys) {
    const leaf = key.slice('stem.flightsim.'.length);
    const current = pack.stem.flightsim[leaf];
    if (current !== undefined && current !== overlay[key] && current !== canonical[key]) {
      throw new Error(slug+': preserve existing translation / concurrent edit: '+key);
    }
    if (current !== overlay[key]) { pack.stem.flightsim[leaf] = overlay[key]; changed++; }
  }
  return {raw: JSON.stringify(pack,null,2)+(raw.endsWith('\n')?'\n':''), changed, existingCoaching};
}

function selftest() {
  const valid = Object.fromEntries(keys.map(key=>[key,'Traduction '+canonical[key]]));
  validateOverlay('french',valid);
  for (const mutate of [
    obj=>delete obj[keys[0]],
    obj=>obj.extra='inattendu',
    obj=>obj[keys[0]]='',
    obj=>obj[keys[0]]=canonical[keys[0]],
    obj=>obj[keys[0]]=obj[keys[0]].replace('{name}','{wrong}'),
    obj=>obj[keys[0]]+=' {extra}',
    obj=>obj['stem.flightsim.rotor_cockpit_label_v2']=obj['stem.flightsim.rotor_cockpit_label_v2'].replace('Q/E','Q/Z'),
    obj=>obj[keys[0]]+='\uFFFD'
  ]) {
    const mutated = {...valid}; mutate(mutated);
    assert.throws(()=>validateOverlay('french',mutated));
  }
  assert.throws(()=>validateOverlay('karen',valid));
  const before = JSON.stringify({other:{preserve:'untouched'},stem:{flightsim:{prior:'keep'}}},null,2)+'\n';
  const result = mergedPack('french',before,valid);
  assert.equal(JSON.parse(result.raw).other.preserve,'untouched');
  assert.equal(JSON.parse(result.raw).stem.flightsim.prior,'keep');
  assert.equal(result.changed,keys.length);
  assert.equal(mergedPack('french',result.raw,valid).changed,0);
  const conflicting = JSON.parse(before);
  conflicting.stem.flightsim.toast_challenge_complete='Autre traduction';
  assert.throws(()=>mergedPack('french',JSON.stringify(conflicting,null,2),valid));
  console.log('PASS: missing/extra keys, empty strings, English filler, placeholder mutations, held locales, concurrent translation conflicts, unrelated data preservation, and idempotence.');
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) { selftest(); process.exit(0); }
  const apply = argv.includes('--apply');
  const check = argv.includes('--check');
  const preflight = argv.includes('--preflight');
  const reportArg = argv.find(arg=>arg.startsWith('--report='));
  if (reportArg) assert.ok(check,'--report requires --check');
  const dir = path.join(__dirname, 'skyschool_finish_20261017_translations');
  const slugs = fs.readdirSync(path.join(root,'lang')).filter(file=>file.endsWith('.js')).map(file=>file.slice(0,-3)).filter(slug=>!excluded.has(slug));
  const missing = slugs.filter(slug=>!fs.existsSync(path.join(dir,slug+'.json')));
  if (argv.includes('--require-complete')) assert.equal(missing.length,0,'Missing locale overlays: '+missing.join(', '));
  const ready = slugs.filter(slug=>!missing.includes(slug));
  const overlays = Object.fromEntries(ready.map(slug=>[slug,JSON.parse(fs.readFileSync(path.join(dir,slug+'.json'),'utf8'))]));
  for (const [slug,overlay] of Object.entries(overlays)) validateOverlay(slug,overlay);
  for (const registryPath of ['ui_strings.js','desktop/web-app/public/ui_strings.js']) {
    const registry = JSON.parse(fs.readFileSync(path.join(root,registryPath),'utf8'));
    for (const key of keys) assert.equal(registry.stem.flightsim[key.slice('stem.flightsim.'.length)],canonical[key],registryPath+': English drift '+key);
  }
  const simulator = fs.readFileSync(path.join(root,'stem_lab/stem_tool_flightsim.js'),'utf8');
  for(const key of keys) assert.ok(simulator.includes(key),'Unreferenced key: '+key);
  let count = 0;
  let existingCoachingEntries = 0;
  const records = [];
  if (apply || check || preflight) for (const slug of ready) {
    const paths = ['lang','desktop/web-app/public/lang'].map(dir=>path.join(root,dir,slug+'.js'));
    const original = paths.map(file=>fs.readFileSync(file,'utf8'));
    // Process each mirror independently: destination-only unrelated edits survive.
    const rootMerge = mergedPack(slug,original[0],overlays[slug]);
    const merged = [rootMerge, original[1]===original[0]?rootMerge:mergedPack(slug,original[1],overlays[slug])];
    existingCoachingEntries += merged.filter(item=>item.existingCoaching).length;
    if (check) assert.ok(merged.every(item=>item.changed===0),slug+': pack does not match reviewed overlay');
    if (check) records.push({locale:slug,verifiedKeys:keys.length,mirrorEqual:original[0]===original[1],rootSha256:crypto.createHash('sha256').update(original[0]).digest('hex'),publicSha256:crypto.createHash('sha256').update(original[1]).digest('hex')});
    if (apply) for (let i=0;i<paths.length;i++) {
      assert.equal(fs.readFileSync(paths[i],'utf8'),original[i],slug+': file changed during merge');
      if (merged[i].changed) fs.writeFileSync(paths[i],merged[i].raw,'utf8');
      const actual = JSON.parse(fs.readFileSync(paths[i],'utf8'));
      for (const key of keys) assert.equal(actual.stem.flightsim[key.slice('stem.flightsim.'.length)],overlays[slug][key],slug+': write verification '+key);
      count += merged[i].changed;
    }
    console.log((check?'Checked ':apply?'Merged ':'Preflight ')+slug+': '+keys.length+' keys');
  }
  const summary={mode:apply?'apply':check?'check':preflight?'preflight':'validate',activeKeys:keys.length,readyLocales:ready.length,remainingLocales:missing,heldLocales:[...excluded],existingCoachingEntries,changedEntries:count};
  if (reportArg) {
    const report=path.resolve(root,reportArg.slice('--report='.length));
    fs.mkdirSync(path.dirname(report),{recursive:true});
    fs.writeFileSync(report,JSON.stringify({...summary,method:'Agent-authored translations with key, placeholder, keyboard-token, Unicode, English-filler and mirrored-pack validation; not a native-speaker review.',coveredLocaleEntries:keys.length*ready.length,identicalEnglishAllowed:[...unchangedAllowed],nativeReviewHolds:[...excluded].filter(slug=>slug!=='maay_maay'),wrongLanguageExclusion:'maay_maay',checks:{canonicalRegistries:true,sourceReferences:true,exactKeys:true,exactPlaceholders:true,keyboardTokens:true,unicode:true,nonempty:true,englishFiller:true,packValues:true,mirrorParity:records.every(record=>record.mirrorEqual)},records},null,2)+'\n');
  }
  console.log(JSON.stringify(summary,null,2));
}
module.exports = {validateOverlay, mergedPack};
