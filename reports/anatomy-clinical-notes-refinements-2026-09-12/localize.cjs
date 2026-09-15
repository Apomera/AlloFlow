const fs = require('node:fs'), assert = require('node:assert/strict'), crypto = require('node:crypto'), parser = require('@babel/parser'), traverse = require('@babel/traverse').default;
const english = JSON.parse(fs.readFileSync(__dirname + '/english.json', 'utf8'));
const ui = {
  notes_ref_title: ['Contexte clinique', 'Contexto clínico', 'السياق السريري'],
  notes_ref_source: ['Source clinique : {source}', 'Fuente clínica: {source}', 'المصدر السريري: {source}'],
  notes_ref_reason: ['Raisonne à partir de l’anatomie', 'Razona a partir de la anatomía', 'فكر في المسألة'],
  notes_ref_read_prompt: ['Lire la question de réflexion à voix haute', 'Leer la pregunta de reflexión en voz alta', 'قراءة سؤال التفكير بصوت عالٍ']
};
const keys = Object.keys(english).filter(key => !ui[key]), table = {};
for (const [index, lang] of ['french', 'spanish_latin_america', 'arabic'].entries()) {
  const lines = fs.readFileSync(__dirname + '/' + lang + '.txt', 'utf8').trim().split(/\r?\n/);
  assert.equal(lines.length, keys.length, lang);
  const dict = table[lang] = Object.fromEntries(keys.map((key, i) => [key, lines[i]]));
  for (const [key, values] of Object.entries(ui)) dict[key] = values[index];
  assert.deepEqual(Object.keys(dict).sort(), Object.keys(english).sort());
  for (const prefix of ['', 'desktop/web-app/public/']) {
    const file = prefix + 'lang/' + lang + '.js', pack = JSON.parse(fs.readFileSync(file, 'utf8'));
    Object.assign(pack.stem.anatomy, dict);
    fs.writeFileSync(file, JSON.stringify(pack, null, 2) + '\n');
  }
}
fs.writeFileSync('dev-tools/i18n/handtl_anatomy_clinical_notes_20260912.json', JSON.stringify(table, null, 2) + '\n');
const registryFile = 'dev-tools/i18n/stem_anatomy_en.json', registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
Object.assign(registry, english); fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2) + '\n');
const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
assert.equal(source, fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_anatomy.js', 'utf8'));
const seen = new Set(), vars = s => (s.match(/\{\w+\}/g) || []).sort();
traverse(parser.parse(source, {sourceType:'script'}), {CallExpression(p) {
  const key = p.node.arguments[0]?.value;
  if (typeof key === 'string' && key.startsWith('stem.anatomy.notes_ref_')) {
    assert.equal(p.node.arguments[1]?.value, english[key.slice(13)]); seen.add(key.slice(13));
  }
}});
assert.equal(seen.size, Object.keys(english).length);
for (const [lang, dict] of Object.entries(table)) {
  const packs = ['', 'desktop/web-app/public/'].map(prefix => JSON.parse(fs.readFileSync(prefix + 'lang/' + lang + '.js', 'utf8')).stem.anatomy);
  for (const [key, value] of Object.entries(dict)) {
    assert.ok(value && value !== english[key]); assert.deepEqual(vars(value), vars(english[key]));
    for (const pack of packs) assert.equal(pack[key], value);
  }
}
const v = {syntax:'pass', sha256:crypto.createHash('sha256').update(source).digest('hex'), mirrorIdentical:true, localizedStrings:seen.size, validatedPacks:6, clinicalNotes:13};
fs.writeFileSync(__dirname + '/validation-summary.json', JSON.stringify(v, null, 2) + '\n'); console.log(JSON.stringify(v));
